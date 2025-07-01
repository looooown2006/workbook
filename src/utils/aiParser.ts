import { ImportQuestionData, ImportResult, Question } from '../types';
import { AIConfig, AIConfigManager } from './aiConfig';
import { PromptBuilder, PromptContext } from '../parsers/ai/PromptBuilder';
import { ResultValidator } from '../parsers/validation/ResultValidator';
import { EnhancedValidator } from '../parsers/validation/EnhancedValidator';
import { convertImportDataArrayToQuestions } from './questionConverter';
import { TextSplitter, TextChunk } from './textSplitter';
import { ParseProgressManager } from '../components/Common/ParseProgressBar';
import { ErrorRecovery, ErrorContext } from '../parsers/ai/ErrorRecovery';

/**
 * AI智能解析服务
 * 集成硅基流动等AI服务进行题目解析
 */
export class AIParser {
  
  /**
   * 使用AI解析题目文本
   */
  static async parseWithAI(text: string, chapterId: string, context?: Partial<PromptContext>): Promise<ImportResult> {
    const config = AIConfigManager.getConfig();

    if (!config.enabled || config.provider === 'local') {
      throw new Error('AI解析未启用或使用本地解析');
    }

    const validation = AIConfigManager.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`AI配置无效: ${validation.errors.join(', ')}`);
    }

    // 构建优化的提示词
    const builtPrompt = PromptBuilder.buildPrompt(text, context);
    console.log('使用解析策略:', builtPrompt.metadata.strategy);

    try {
      let result: ImportResult;

      switch (config.provider) {
        case 'siliconflow':
          result = await this.parseWithSiliconFlow(builtPrompt, config);
          break;
        case 'openai':
          result = await this.parseWithOpenAI(builtPrompt, config);
          break;
        default:
          throw new Error(`不支持的AI服务提供商: ${config.provider}`);
      }

      // 验证和修复解析结果
      if (result.success && result.questions.length > 0) {
        console.log('验证解析结果...');

        // 使用增强验证器进行多重验证和自动修复
        const enhancedValidation = EnhancedValidator.validate(result.questions);

        console.log('验证统计:', enhancedValidation.statistics);
        if (enhancedValidation.fixes.length > 0) {
          console.log('自动修复:', enhancedValidation.fixes);
        }
        if (enhancedValidation.warnings.length > 0) {
          console.warn('验证警告:', enhancedValidation.warnings);
        }

        // 转换ImportQuestionData为Question并使用修复后的题目
        const convertedQuestions = convertImportDataArrayToQuestions(enhancedValidation.fixedQuestions, chapterId);
        result.questions = convertedQuestions;

        // 更新成功状态和统计
        result.success = enhancedValidation.isValid;
        result.totalCount = enhancedValidation.statistics.totalQuestions;
        result.successCount = enhancedValidation.statistics.validQuestions;
        result.failedCount = enhancedValidation.statistics.invalidQuestions;

        // 如果有验证错误，添加到错误列表
        if (enhancedValidation.errors.length > 0) {
          result.errors = [...(result.errors || []), ...enhancedValidation.errors];
        }
      }

      // 如果解析失败，尝试错误恢复
      if (!result.success && result.errors && result.errors.length > 0) {
        console.log('尝试错误恢复...');

        const errorContext: ErrorContext = {
          originalText: text,
          errorType: 'ai_error',
          errorMessage: result.errors[0],
          attemptCount: 1
        };

        try {
          const recoveryResult = await ErrorRecovery.attemptRecovery(errorContext);

          if (recoveryResult.success && recoveryResult.questions.length > 0) {
            // 转换恢复结果为ImportResult格式
            const convertedQuestions = convertImportDataArrayToQuestions(recoveryResult.questions, chapterId);

            result = {
              success: true,
              questions: convertedQuestions,
              totalCount: convertedQuestions.length,
              successCount: convertedQuestions.length,
              failedCount: 0,
              errors: []
            };

            console.log('错误恢复成功，获得题目数量:', convertedQuestions.length);
          }
        } catch (recoveryError) {
          console.error('错误恢复失败:', recoveryError);
        }
      }

      return result;
    } catch (error) {
      console.error('AI解析失败:', error);
      throw new Error(`AI解析失败: ${error}`);
    }
  }

  /**
   * 使用硅基流动API解析
   */
  private static async parseWithSiliconFlow(builtPrompt: any, config: AIConfig): Promise<ImportResult> {

    // 确定实际使用的模型名称
    const actualModel = config.model === 'custom' ? config.customModel : config.model;
    if (!actualModel) {
      throw new Error('未指定模型名称');
    }

    // 构建请求体，添加硅基流动最佳实践参数
    const requestBody: any = {
      model: actualModel,
      messages: [
        {
          role: 'system',
          content: builtPrompt.systemPrompt
        },
        {
          role: 'user',
          content: builtPrompt.userPrompt
        }
      ],
      temperature: builtPrompt.temperature || 0.7,
      top_p: 0.9,
      top_k: 50,
      frequency_penalty: 0,
      response_format: { type: "json_object" }, // 强制JSON输出
      stream: false // 暂时不使用流式输出，后续优化
    };

    // 使用优化的maxTokens设置
    const maxTokens = builtPrompt.maxTokens || config.maxTokens;
    if (maxTokens !== null && maxTokens > 0) {
      requestBody.max_tokens = maxTokens;
    }

    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000); // 60秒超时

    try {
      console.log('发送AI解析请求...', { model: actualModel, textLength: builtPrompt.userPrompt.length });

      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = this.getDetailedErrorMessage(response.status, errorData);
        console.error('API请求失败:', { status: response.status, errorData });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('AI API响应:', { hasChoices: !!data.choices, choicesLength: data.choices?.length });

      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('AI返回内容为空，请检查模型配置或稍后重试');
      }

      console.log('AI返回内容长度:', content.length);
      return this.parseAIResponse(content);

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('AI解析超时，请尝试减少文本长度或稍后重试');
      }

      console.error('硅基流动API调用失败:', error);
      throw error;
    }
  }

  /**
   * 获取详细的错误信息
   */
  private static getDetailedErrorMessage(status: number, errorData: any): string {
    switch (status) {
      case 400:
        return `请求参数错误: ${errorData.error?.message || '请检查输入格式'}`;
      case 401:
        return 'API密钥无效，请检查AI配置中的API密钥';
      case 403:
        return `权限不足: ${errorData.error?.message || '该模型可能需要实名认证'}`;
      case 429:
        return `请求频率限制: ${errorData.error?.message || '请稍后重试'}`;
      case 504:
      case 503:
        return '服务暂时不可用，建议使用流式输出或稍后重试';
      case 500:
        return '服务内部错误，请稍后重试或联系技术支持';
      default:
        return `API请求失败 (${status}): ${errorData.error?.message || '未知错误'}`;
    }
  }

  /**
   * 使用OpenAI API解析
   */
  private static async parseWithOpenAI(builtPrompt: any, config: AIConfig): Promise<ImportResult> {

    // 确定实际使用的模型名称
    const actualModel = config.model === 'custom' ? config.customModel : config.model;
    if (!actualModel) {
      throw new Error('未指定模型名称');
    }

    // 构建请求体
    const requestBody: any = {
      model: actualModel,
      messages: [
        {
          role: 'system',
          content: builtPrompt.systemPrompt
        },
        {
          role: 'user',
          content: builtPrompt.userPrompt
        }
      ],
      temperature: builtPrompt.temperature
    };

    // 使用优化的maxTokens设置
    const maxTokens = builtPrompt.maxTokens || config.maxTokens;
    if (maxTokens !== null && maxTokens > 0) {
      requestBody.max_tokens = maxTokens;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API请求失败: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('AI返回内容为空');
    }

    return this.parseAIResponse(content);
  }



  /**
   * 解析AI返回的内容
   */
  private static parseAIResponse(content: string): ImportResult {
    const errors: string[] = [];
    const questions: ImportQuestionData[] = [];

    try {
      console.log('开始解析AI响应内容...');

      // 清理内容，移除可能的markdown标记
      let cleanContent = content.trim();

      // 移除可能的代码块标记
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');

      // 检查是否为空内容
      if (!cleanContent) {
        throw new Error('AI返回的内容为空');
      }

      console.log('清理后的内容长度:', cleanContent.length);

      // 尝试多种JSON提取方式
      let parsed;
      try {
        // 方式1：直接解析
        parsed = JSON.parse(cleanContent);
      } catch (directError) {
        try {
          // 方式2：提取JSON数组
          const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            // 方式3：提取JSON对象
            const objMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (objMatch) {
              parsed = JSON.parse(objMatch[0]);
            } else {
              throw new Error('未找到有效的JSON格式内容');
            }
          }
        } catch (extractError) {
          console.error('JSON解析失败，原始内容:', cleanContent.substring(0, 500));
          throw new Error(`JSON格式错误: ${directError.message}`);
        }
      }

      // 确保解析结果是数组
      const questionsArray = Array.isArray(parsed) ? parsed : [parsed];
      console.log('解析到题目数量:', questionsArray.length);

      if (questionsArray.length === 0) {
        throw new Error('AI未识别到任何题目，请检查输入格式是否包含完整的题目信息');
      }

      questionsArray.forEach((item, index) => {
        try {
          const questionErrors = this.validateQuestionData(item, index + 1);
          if (questionErrors.length > 0) {
            errors.push(...questionErrors);
            return;
          }

          // 构建题目对象
          const question: ImportQuestionData = {
            title: item.title.trim(),
            options: item.options.map((opt: any) => String(opt).trim()),
            correctAnswer: item.correctAnswer,
            explanation: item.explanation ? String(item.explanation).trim() : '',
            difficulty: item.difficulty || 'medium',
            tags: Array.isArray(item.tags) ? item.tags.map((tag: any) => String(tag).trim()) : []
          };

          questions.push(question);
          console.log(`第${index + 1}题解析成功:`, question.title.substring(0, 50));

        } catch (itemError) {
          const errorMsg = `第${index + 1}题解析失败: ${itemError.message}`;
          console.error(errorMsg, item);
          errors.push(errorMsg);
        }
      });

    } catch (parseError) {
      console.error('AI响应解析失败:', parseError);
      errors.push(`AI返回内容解析失败: ${parseError.message}`);
    }

    // 严格的成功判断：必须有题目且没有错误
    const isSuccess = questions.length > 0 && errors.length === 0;

    const result = {
      success: isSuccess,
      questions: questions as Question[],
      totalCount: questions.length,
      successCount: questions.length,
      failedCount: errors.length,
      errors
    };

    console.log('AI解析结果:', {
      success: result.success,
      totalCount: result.totalCount,
      successCount: result.successCount,
      failedCount: result.failedCount,
      errorCount: errors.length
    });

    // 如果没有成功解析任何题目，提供更详细的错误信息
    if (!isSuccess && questions.length === 0) {
      result.errors.unshift('未能解析出任何有效题目。请确保输入包含：1) 题目内容 2) 至少2个选项 3) 明确的正确答案');
    }

    return result;
  }

  /**
   * 验证题目数据的完整性和正确性
   */
  private static validateQuestionData(item: any, questionNumber: number): string[] {
    const errors: string[] = [];

    // 检查题目标题
    if (!item.title || typeof item.title !== 'string' || item.title.trim().length === 0) {
      errors.push(`第${questionNumber}题：缺少有效的题目标题`);
    }

    // 检查选项
    if (!Array.isArray(item.options)) {
      errors.push(`第${questionNumber}题：选项必须是数组格式`);
    } else if (item.options.length < 2) {
      errors.push(`第${questionNumber}题：至少需要2个选项，当前只有${item.options.length}个`);
    } else {
      // 检查选项内容
      const emptyOptions = item.options.filter((opt: any, idx: number) =>
        !opt || typeof opt !== 'string' || opt.trim().length === 0
      );
      if (emptyOptions.length > 0) {
        errors.push(`第${questionNumber}题：存在空的选项内容`);
      }
    }

    // 严格检查正确答案
    if (item.correctAnswer === undefined || item.correctAnswer === null) {
      errors.push(`第${questionNumber}题：缺少正确答案。请确保题目包含明确的答案标识（如"答案：A"或"正确答案：A"）`);
    } else if (typeof item.correctAnswer !== 'number') {
      errors.push(`第${questionNumber}题：正确答案必须是数字索引（0表示A选项，1表示B选项，以此类推）`);
    } else if (Array.isArray(item.options)) {
      if (item.correctAnswer < 0 || item.correctAnswer >= item.options.length) {
        errors.push(`第${questionNumber}题：正确答案索引(${item.correctAnswer})超出选项范围(0-${item.options.length - 1})`);
      }
    }

    return errors;
  }

  /**
   * 估算解析成本
   */
  static estimateCost(text: string, config: AIConfig): number {
    if (config.provider === 'local') {
      return 0;
    }

    const model = AIConfigManager.getModel(config.provider, config.model);
    if (!model) {
      return 0;
    }

    // 简单估算token数量（中文字符 * 1.5 + 英文单词数）
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const estimatedTokens = Math.ceil(chineseChars * 1.5 + englishWords + 500); // 加上prompt的token

    return Math.ceil((estimatedTokens / 1000) * model.costPer1kTokens);
  }

  /**
   * 使用AI解析题目文本（支持大文本分片处理和进度显示）
   */
  static async parseWithAIEnhanced(
    text: string,
    chapterId: string,
    context?: Partial<PromptContext>,
    progressManager?: ParseProgressManager
  ): Promise<ImportResult> {
    const config = AIConfigManager.getConfig();

    if (!config.enabled || config.provider === 'local') {
      throw new Error('AI解析未启用或使用本地解析');
    }

    const validation = AIConfigManager.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`AI配置无效: ${validation.errors.join(', ')}`);
    }

    // 检查是否需要分片处理
    const needsSplitting = TextSplitter.needsSplitting(text, 10000);

    if (needsSplitting) {
      console.log('文本较大，使用分片处理...');
      return await this.parseWithChunks(text, chapterId, context, progressManager);
    } else {
      console.log('文本较小，使用单次处理...');
      return await this.parseSingleTextEnhanced(text, chapterId, context, progressManager);
    }
  }

  /**
   * 分片处理大文本
   */
  private static async parseWithChunks(
    text: string,
    chapterId: string,
    context?: Partial<PromptContext>,
    progressManager?: ParseProgressManager
  ): Promise<ImportResult> {
    const estimatedQuestions = TextSplitter.estimateQuestionCount(text);
    const splitOptions = TextSplitter.getRecommendedOptions(text.length, estimatedQuestions);
    const chunks = TextSplitter.splitText(text, splitOptions);

    console.log(`文本分为 ${chunks.length} 个分片，预估 ${estimatedQuestions} 道题目`);

    // 更新进度
    progressManager?.updateProgress({
      totalChunks: chunks.length,
      totalEstimatedQuestions: estimatedQuestions,
      message: `文本已分为 ${chunks.length} 个分片，开始解析...`
    });

    const chunkResults: ImportResult[] = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        progressManager?.setChunkProgress(i + 1, chunks.length);
        progressManager?.updateProgress({
          message: `正在解析第 ${i + 1}/${chunks.length} 个分片 (约${chunk.estimatedQuestions}题)...`
        });

        try {
          const chunkResult = await this.parseSingleTextEnhanced(
            chunk.content,
            chapterId,
            { ...context, chunkIndex: i, totalChunks: chunks.length }
          );

          chunkResults.push(chunkResult);

          if (chunkResult.questions.length > 0) {
            progressManager?.addProcessedQuestions(chunkResult.questions.length);
          }

          console.log(`分片 ${i + 1} 解析完成，获得 ${chunkResult.questions.length} 道题目`);

        } catch (chunkError) {
          console.error(`分片 ${i + 1} 解析失败:`, chunkError);
          progressManager?.addError(`分片 ${i + 1} 解析失败: ${chunkError.message}`);

          // 继续处理下一个分片，不中断整个流程
          chunkResults.push({
            success: false,
            questions: [],
            totalCount: 0,
            successCount: 0,
            failedCount: 1,
            errors: [chunkError.message]
          });
        }

        // 添加延迟避免API限流
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 合并所有分片结果
      progressManager?.setStage('validating', '正在合并和验证解析结果...');
      const mergedResult = TextSplitter.mergeResults(chunkResults);

      // 最终验证
      if (mergedResult.success && mergedResult.questions.length > 0) {
        const enhancedValidation = EnhancedValidator.validate(mergedResult.questions);
        const convertedQuestions = convertImportDataArrayToQuestions(enhancedValidation.fixedQuestions, chapterId);

        mergedResult.questions = convertedQuestions;
        mergedResult.success = enhancedValidation.isValid;
        mergedResult.totalCount = enhancedValidation.statistics.totalQuestions;
        mergedResult.successCount = enhancedValidation.statistics.validQuestions;
        mergedResult.failedCount = enhancedValidation.statistics.invalidQuestions;

        if (enhancedValidation.warnings.length > 0) {
          mergedResult.errors = [...(mergedResult.errors || []), ...enhancedValidation.warnings];
        }
      }

      progressManager?.setStage('completed', `解析完成！共获得 ${mergedResult.questions.length} 道有效题目`);
      return mergedResult;

    } catch (error) {
      progressManager?.setStage('error', `解析失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理单个文本（不分片）- 增强版
   */
  private static async parseSingleTextEnhanced(
    text: string,
    chapterId: string,
    context?: Partial<PromptContext>,
    progressManager?: ParseProgressManager
  ): Promise<ImportResult> {
    progressManager?.setStage('parsing', '正在调用AI服务解析...');

    // 直接调用现有的parseWithAI方法
    return await this.parseWithAI(text, chapterId, context);
  }
}
