/**
 * AI提示词构建器
 * 负责根据输入内容和上下文构建优化的提示词
 */

import { PromptTemplate, getPromptTemplate, FewShotExample } from './PromptTemplates';
import { FormatDetector } from '../rule/FormatDetector';

export interface PromptContext {
  inputType: 'text' | 'ocr' | 'pdf' | 'file';
  textLength: number;
  hasMultipleQuestions: boolean;
  hasOCRErrors: boolean;
  language: 'zh' | 'en' | 'mixed';
  confidence?: number;
  detectedFormat?: string;
  formatConfidence?: number;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens?: number;
  metadata: {
    template: string;
    strategy: string;
    fewShotCount: number;
    confidence: number;
    detectedFormat?: string;
    formatConfidence?: number;
  };
}

export class PromptBuilder {
  
  /**
   * 构建优化的提示词
   */
  static buildPrompt(inputText: string, context?: Partial<PromptContext>): BuiltPrompt {
    // 检测格式
    const formatResult = FormatDetector.detectFormat(inputText);

    // 分析输入文本
    const analyzedContext = this.analyzeInput(inputText, context, formatResult);

    // 选择最适合的模板
    const template = this.selectTemplate(analyzedContext);

    // 构建提示词
    const systemPrompt = this.buildSystemPrompt(template, analyzedContext);
    const userPrompt = this.buildUserPrompt(template, inputText, analyzedContext);

    // 确定参数
    const temperature = this.calculateTemperature(analyzedContext);
    const maxTokens = this.calculateMaxTokens(analyzedContext);

    return {
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens,
      metadata: {
        template: template.name,
        strategy: this.getStrategy(analyzedContext),
        fewShotCount: this.selectFewShotExamples(template, analyzedContext).length,
        confidence: analyzedContext.confidence || 0.8,
        detectedFormat: formatResult.detectedFormat,
        formatConfidence: formatResult.confidence
      }
    };
  }

  /**
   * 分析输入文本特征
   */
  private static analyzeInput(inputText: string, context?: Partial<PromptContext>, formatResult?: any): PromptContext {
    const textLength = inputText.length;

    // 检测是否包含多道题目
    const questionNumbers = inputText.match(/\d+[.、]/g) || [];
    const hasMultipleQuestions = questionNumbers.length > 1;

    // 检测OCR错误
    const hasOCRErrors = this.detectOCRErrors(inputText);

    // 检测语言
    const language = this.detectLanguage(inputText);

    return {
      inputType: context?.inputType || 'text',
      textLength,
      hasMultipleQuestions,
      hasOCRErrors,
      language,
      confidence: context?.confidence || 0.8,
      detectedFormat: formatResult?.detectedFormat,
      formatConfidence: formatResult?.confidence,
      ...context
    };
  }

  /**
   * 检测OCR错误
   */
  private static detectOCRErrors(text: string): boolean {
    const ocrErrorPatterns = [
      /[0O]{2,}/, // 连续的0或O
      /[Il1]{2,}/, // 连续的I、l、1
      /[^\w\s\u4e00-\u9fff.,;:!?()[\]{}""'']/g, // 异常字符
      /\s{3,}/, // 异常空格
      /[A-Z][a-z]*[A-Z]/, // 异常大小写混合
    ];
    
    return ocrErrorPatterns.some(pattern => pattern.test(text));
  }

  /**
   * 检测文本语言
   */
  private static detectLanguage(text: string): 'zh' | 'en' | 'mixed' {
    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
    const englishChars = text.match(/[a-zA-Z]/g) || [];
    
    const chineseRatio = chineseChars.length / text.length;
    const englishRatio = englishChars.length / text.length;
    
    if (chineseRatio > 0.3) {
      return englishRatio > 0.2 ? 'mixed' : 'zh';
    } else if (englishRatio > 0.3) {
      return 'en';
    } else {
      return 'mixed';
    }
  }

  /**
   * 选择最适合的模板
   */
  private static selectTemplate(context: PromptContext): PromptTemplate {
    // 优先根据检测到的格式选择模板
    if (context.detectedFormat) {
      if (context.detectedFormat === 'ocr_format' || context.hasOCRErrors) {
        return getPromptTemplate('ocr_repair')!;
      } else if (context.hasMultipleQuestions || context.detectedFormat.includes('batch')) {
        return getPromptTemplate('batch_question')!;
      }
    }

    // 后备选择逻辑
    if (context.hasOCRErrors) {
      return getPromptTemplate('ocr_repair')!;
    } else if (context.hasMultipleQuestions) {
      return getPromptTemplate('batch_question')!;
    } else {
      return getPromptTemplate('standard_question')!;
    }
  }

  /**
   * 构建系统提示词
   */
  private static buildSystemPrompt(template: PromptTemplate, context: PromptContext): string {
    let systemPrompt = template.systemPrompt;
    
    // 根据上下文添加特定指令
    if (context.hasOCRErrors) {
      systemPrompt += '\n\n特别注意：输入文本可能包含OCR识别错误，请仔细分析并修正。';
    }
    
    if (context.language === 'zh') {
      systemPrompt += '\n\n语言要求：请使用中文进行解析和输出。';
    } else if (context.language === 'en') {
      systemPrompt += '\n\nLanguage requirement: Please parse and output in English.';
    }
    
    if (context.confidence && context.confidence < 0.7) {
      systemPrompt += '\n\n质量要求：输入质量可能较低，请特别仔细地分析和推断。';
    }
    
    return systemPrompt;
  }

  /**
   * 构建用户提示词
   */
  private static buildUserPrompt(template: PromptTemplate, inputText: string, context: PromptContext): string {
    let userPrompt = template.userPromptTemplate.replace('{input_text}', inputText);
    
    // 添加few-shot示例
    const examples = this.selectFewShotExamples(template, context);
    if (examples.length > 0) {
      const exampleText = examples.map(example => 
        `示例输入：\n${example.input}\n\n示例输出：\n${example.output}`
      ).join('\n\n---\n\n');
      
      userPrompt = `参考示例：\n\n${exampleText}\n\n---\n\n${userPrompt}`;
    }
    
    // 添加错误恢复提示
    if (context.confidence && context.confidence < 0.8) {
      const recoveryPrompts = template.errorRecoveryPrompts.slice(0, 2);
      userPrompt += '\n\n错误处理指导：\n' + recoveryPrompts.map(prompt => `- ${prompt}`).join('\n');
    }
    
    return userPrompt;
  }

  /**
   * 选择few-shot示例
   */
  private static selectFewShotExamples(template: PromptTemplate, context: PromptContext): FewShotExample[] {
    const maxExamples = context.textLength > 1000 ? 1 : 2;
    
    // 根据上下文选择最相关的示例
    let examples = template.fewShotExamples;
    
    if (context.hasMultipleQuestions) {
      examples = examples.filter(ex => ex.description.includes('多道') || ex.description.includes('批量'));
    }
    
    if (context.hasOCRErrors) {
      examples = examples.filter(ex => ex.description.includes('OCR') || ex.description.includes('修复'));
    }
    
    return examples.slice(0, maxExamples);
  }

  /**
   * 计算温度参数
   */
  private static calculateTemperature(context: PromptContext): number {
    let temperature = 0.1; // 基础温度，保证输出稳定性
    
    // 根据输入质量调整
    if (context.confidence && context.confidence < 0.7) {
      temperature += 0.1; // 低质量输入需要更多创造性
    }
    
    if (context.hasOCRErrors) {
      temperature += 0.05; // OCR错误需要一定的推理能力
    }
    
    if (context.hasMultipleQuestions) {
      temperature -= 0.05; // 批量处理需要更高的一致性
    }
    
    return Math.max(0.0, Math.min(0.3, temperature));
  }

  /**
   * 计算最大token数
   */
  private static calculateMaxTokens(context: PromptContext): number | undefined {
    const baseTokens = 1000;
    
    if (context.hasMultipleQuestions) {
      // 多题目需要更多token
      const estimatedQuestions = Math.ceil(context.textLength / 200);
      return baseTokens + estimatedQuestions * 300;
    }
    
    if (context.textLength > 2000) {
      return baseTokens + 500;
    }
    
    return baseTokens;
  }

  /**
   * 获取解析策略描述
   */
  private static getStrategy(context: PromptContext): string {
    const strategies = [];

    if (context.detectedFormat) {
      strategies.push(`格式:${context.detectedFormat}`);
    }

    if (context.hasOCRErrors) {
      strategies.push('OCR修复');
    }

    if (context.hasMultipleQuestions) {
      strategies.push('批量解析');
    }

    if (context.confidence && context.confidence < 0.7) {
      strategies.push('低质量增强');
    }

    if (context.formatConfidence && context.formatConfidence < 0.6) {
      strategies.push('格式不确定');
    }

    return strategies.length > 0 ? strategies.join('+') : '标准解析';
  }

  /**
   * 构建错误恢复提示词
   */
  static buildErrorRecoveryPrompt(originalText: string, error: string, attempt: number): BuiltPrompt {
    const template = getPromptTemplate('standard_question')!;
    
    const systemPrompt = `你是一个题目解析专家。之前的解析尝试失败了，请重新分析并解析题目。

错误信息：${error}
尝试次数：${attempt}

请特别注意：
1. 严格按照JSON格式输出
2. 确保所有字段都存在且类型正确
3. 正确答案索引必须是有效数字
4. 如果信息不完整，请进行合理推断`;

    const userPrompt = `请重新解析以下题目文本，确保输出格式正确：

${originalText}

要求：
- 必须返回有效的JSON数组
- 每个题目包含完整的字段
- 正确答案索引从0开始
- 不要包含任何解释文字，只返回JSON`;

    return {
      systemPrompt,
      userPrompt,
      temperature: 0.05, // 降低温度提高稳定性
      maxTokens: 1000,
      metadata: {
        template: 'error_recovery',
        strategy: '错误恢复',
        fewShotCount: 0,
        confidence: 0.6
      }
    };
  }
}
