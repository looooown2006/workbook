import { ImportQuestionData, ImportResult, Question } from '../types';
import { AIConfig, AIConfigManager } from './aiConfig';
import { PromptBuilder, PromptContext } from '../parsers/ai/PromptBuilder';
import { ResultValidator } from '../parsers/validation/ResultValidator';

/**
 * AI智能解析服务
 * 集成硅基流动等AI服务进行题目解析
 */
export class AIParser {
  
  /**
   * 使用AI解析题目文本
   */
  static async parseWithAI(text: string, context?: Partial<PromptContext>): Promise<ImportResult> {
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
        const validation = ResultValidator.validate(result.questions);

        // 使用修复后的题目
        result.questions = validation.fixedQuestions;

        // 更新成功状态和统计
        result.success = validation.isValid || validation.statistics.validQuestions > 0;
        result.totalCount = validation.statistics.totalQuestions;
        result.successCount = validation.statistics.validQuestions;
        result.failedCount = validation.statistics.totalQuestions - validation.statistics.validQuestions;

        // 添加验证信息到错误列表
        if (validation.issues.length > 0) {
          const validationErrors = validation.issues
            .filter(issue => issue.type === 'error' && !issue.autoFixed)
            .map(issue => `题目${(issue.questionIndex || 0) + 1}: ${issue.message}`);

          result.errors = [...(result.errors || []), ...validationErrors];
        }

        console.log(ResultValidator.getSummary(validation));
      }

      // 如果解析失败，尝试错误恢复
      if (!result.success && result.errors && result.errors.length > 0) {
        console.log('尝试错误恢复...');
        const recoveryPrompt = PromptBuilder.buildErrorRecoveryPrompt(text, result.errors[0], 1);

        switch (config.provider) {
          case 'siliconflow':
            result = await this.parseWithSiliconFlow(recoveryPrompt, config);
            break;
          case 'openai':
            result = await this.parseWithOpenAI(recoveryPrompt, config);
            break;
        }

        // 再次验证恢复后的结果
        if (result.success && result.questions.length > 0) {
          const validation = ResultValidator.validate(result.questions);
          result.questions = validation.fixedQuestions;
          result.success = validation.isValid || validation.statistics.validQuestions > 0;
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

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
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
      // 尝试提取JSON内容
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('AI返回内容中未找到有效的JSON数组');
      }

      const parsedQuestions = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsedQuestions)) {
        throw new Error('AI返回的不是数组格式');
      }

      for (let i = 0; i < parsedQuestions.length; i++) {
        const q = parsedQuestions[i];
        
        try {
          // 验证题目格式
          if (!q.title || typeof q.title !== 'string') {
            throw new Error('题目内容无效');
          }

          if (!Array.isArray(q.options) || q.options.length < 2) {
            throw new Error('选项数量不足');
          }

          if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
            throw new Error('正确答案索引无效');
          }

          questions.push({
            title: q.title.trim(),
            options: q.options.map((opt: any) => String(opt).trim()),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ? String(q.explanation).trim() : undefined
          });
        } catch (error) {
          errors.push(`第${i + 1}题解析失败: ${error}`);
        }
      }

    } catch (error) {
      errors.push(`JSON解析失败: ${error}`);
    }

    return {
      success: questions.length > 0,
      totalCount: questions.length,
      successCount: questions.length,
      failedCount: errors.length,
      errors,
      questions: questions as Question[]
    };
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
}
