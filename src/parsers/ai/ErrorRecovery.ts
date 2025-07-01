/**
 * AI解析错误恢复机制
 * 处理解析失败、格式错误、内容不完整等问题
 */

import { PromptBuilder, PromptContext } from './PromptBuilder';
import { AIParser } from '../../utils/aiParser';
import { ParseResult } from '../interfaces/IQuestionParser';

export interface ErrorContext {
  originalText: string;
  errorType: 'parse_failed' | 'format_error' | 'incomplete_data' | 'ai_error' | 'validation_error';
  errorMessage: string;
  attemptCount: number;
  previousResults?: ParseResult[];
  confidence?: number;
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  maxAttempts: number;
  canHandle: (error: ErrorContext) => boolean;
  recover: (error: ErrorContext) => Promise<ParseResult>;
}

export class ErrorRecovery {
  private static strategies: RecoveryStrategy[] = [];

  static {
    // 注册默认恢复策略
    this.registerStrategy(new FormatCleanupStrategy());
    this.registerStrategy(new PromptOptimizationStrategy());
    this.registerStrategy(new ChunkingStrategy());
    this.registerStrategy(new FallbackParsingStrategy());
  }

  /**
   * 注册错误恢复策略
   */
  static registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * 尝试恢复解析错误
   */
  static async attemptRecovery(error: ErrorContext): Promise<ParseResult> {
    console.log(`开始错误恢复，错误类型: ${error.errorType}, 尝试次数: ${error.attemptCount}`);

    // 查找适用的恢复策略
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.canHandle(error) && error.attemptCount < strategy.maxAttempts
    );

    if (applicableStrategies.length === 0) {
      console.log('没有可用的恢复策略');
      return {
        success: false,
        questions: [],
        errors: [`无法恢复的错误: ${error.errorMessage}`],
        metadata: {
          processingTime: 0,
          confidence: 0,
          strategy: 'none'
        }
      };
    }

    // 按优先级尝试恢复策略
    for (const strategy of applicableStrategies) {
      try {
        console.log(`尝试恢复策略: ${strategy.name}`);
        const result = await strategy.recover(error);
        
        if (result.success && result.questions.length > 0) {
          console.log(`恢复成功，使用策略: ${strategy.name}`);
          return result;
        }
      } catch (recoveryError) {
        console.error(`恢复策略 ${strategy.name} 失败:`, recoveryError);
      }
    }

    // 所有策略都失败
    return {
      success: false,
      questions: [],
      errors: [`所有恢复策略都失败: ${error.errorMessage}`],
      metadata: {
        processingTime: 0,
        confidence: 0,
        strategy: 'failed'
      }
    };
  }

  /**
   * 分析错误类型
   */
  static analyzeError(text: string, error: any): ErrorContext {
    let errorType: ErrorContext['errorType'] = 'parse_failed';
    let errorMessage = String(error);

    if (error?.message?.includes('JSON')) {
      errorType = 'format_error';
    } else if (error?.message?.includes('incomplete') || error?.message?.includes('missing')) {
      errorType = 'incomplete_data';
    } else if (error?.message?.includes('AI') || error?.message?.includes('API')) {
      errorType = 'ai_error';
    } else if (error?.message?.includes('validation')) {
      errorType = 'validation_error';
    }

    return {
      originalText: text,
      errorType,
      errorMessage,
      attemptCount: 1
    };
  }
}

/**
 * 格式清理策略
 * 清理文本中的格式问题，重新尝试解析
 */
class FormatCleanupStrategy implements RecoveryStrategy {
  name = 'format_cleanup';
  description = '清理文本格式问题';
  maxAttempts = 2;

  canHandle(error: ErrorContext): boolean {
    return error.errorType === 'format_error' || error.errorType === 'parse_failed';
  }

  async recover(error: ErrorContext): Promise<ParseResult> {
    // 清理文本
    let cleanedText = error.originalText
      .replace(/[^\u4e00-\u9fa5\u0020-\u007E\n\r]/g, '') // 移除特殊字符
      .replace(/\s+/g, ' ') // 标准化空格
      .replace(/\n\s*\n/g, '\n') // 移除多余换行
      .trim();

    // 修复常见OCR错误
    cleanedText = this.fixOCRErrors(cleanedText);

    // 重新解析
    const result = await AIParser.parseWithAI(cleanedText, 'temp-chapter');

    return {
      success: result.success,
      questions: result.questions,
      errors: result.errors || [],
      metadata: {
        processingTime: 0,
        confidence: result.success ? 0.8 : 0,
        strategy: 'format_cleanup'
      }
    };
  }

  private fixOCRErrors(text: string): string {
    return text
      .replace(/0/g, 'O') // 数字0可能是字母O
      .replace(/1/g, 'l') // 数字1可能是字母l
      .replace(/5/g, 'S') // 数字5可能是字母S
      .replace(/\|/g, 'I') // 竖线可能是字母I
      .replace(/rn/g, 'm') // rn组合可能是m
      .replace(/\. /g, '.\n') // 句号后应该换行
      .replace(/([A-D])\s*[\.、]/g, '$1. '); // 标准化选项格式
  }
}

/**
 * 提示词优化策略
 * 使用更详细的提示词重新尝试
 */
class PromptOptimizationStrategy implements RecoveryStrategy {
  name = 'prompt_optimization';
  description = '优化AI提示词';
  maxAttempts = 2;

  canHandle(error: ErrorContext): boolean {
    return error.errorType === 'ai_error' || error.errorType === 'incomplete_data';
  }

  async recover(error: ErrorContext): Promise<ParseResult> {
    // 构建更详细的上下文
    const context: PromptContext = {
      inputType: 'text',
      textLength: error.originalText.length,
      hasMultipleQuestions: error.originalText.split(/\d+[\.\)、]/).length > 2,
      hasOCRErrors: true,
      language: /[\u4e00-\u9fa5]/.test(error.originalText) ? 'zh' : 'en',
      confidence: 0.5
    };

    // 使用优化的提示词重新解析
    const result = await AIParser.parseWithAI(error.originalText, 'temp-chapter', context);

    return {
      success: result.success,
      questions: result.questions,
      errors: result.errors || [],
      metadata: {
        processingTime: 0,
        confidence: result.success ? 0.7 : 0,
        strategy: 'prompt_optimization'
      }
    };
  }
}

/**
 * 分块处理策略
 * 将长文本分块处理
 */
class ChunkingStrategy implements RecoveryStrategy {
  name = 'chunking';
  description = '分块处理长文本';
  maxAttempts = 1;

  canHandle(error: ErrorContext): boolean {
    return error.originalText.length > 2000 && 
           (error.errorType === 'parse_failed' || error.errorType === 'ai_error');
  }

  async recover(error: ErrorContext): Promise<ParseResult> {
    const chunks = this.splitIntoChunks(error.originalText);
    const allQuestions: any[] = [];
    const allErrors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const result = await AIParser.parseWithAI(chunks[i], 'temp-chapter');

        if (result.success) {
          allQuestions.push(...result.questions);
        } else {
          allErrors.push(...(result.errors || []));
        }
      } catch (chunkError) {
        allErrors.push(`块 ${i + 1} 解析失败: ${chunkError}`);
      }
    }

    return {
      success: allQuestions.length > 0,
      questions: allQuestions,
      errors: allErrors,
      metadata: {
        processingTime: 0,
        confidence: allQuestions.length / chunks.length,
        strategy: 'chunking'
      }
    };
  }

  private splitIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

/**
 * 后备解析策略
 * 使用简化的规则解析
 */
class FallbackParsingStrategy implements RecoveryStrategy {
  name = 'fallback_parsing';
  description = '后备规则解析';
  maxAttempts = 1;

  canHandle(error: ErrorContext): boolean {
    return true; // 可以处理所有错误类型
  }

  async recover(error: ErrorContext): Promise<ParseResult> {
    // 使用简单的正则表达式提取题目
    const questions = this.extractQuestionsWithRegex(error.originalText);

    return {
      success: questions.length > 0,
      questions,
      errors: questions.length === 0 ? ['无法提取任何题目'] : [],
      metadata: {
        processingTime: 0,
        confidence: 0.3,
        strategy: 'fallback'
      }
    };
  }

  private extractQuestionsWithRegex(text: string): any[] {
    const questions: any[] = [];
    
    // 简单的题目匹配模式
    const questionPattern = /(\d+[\.\)、]?\s*)(.*?)(?=\d+[\.\)、]|$)/gs;
    const matches = text.match(questionPattern);

    if (matches) {
      matches.forEach((match, index) => {
        const cleanMatch = match.trim();
        if (cleanMatch.length > 10) { // 过滤太短的内容
          questions.push({
            id: `fallback-${index + 1}`,
            question: cleanMatch,
            options: [],
            correctAnswer: 0,
            explanation: '',
            difficulty: 'medium',
            tags: ['未分类']
          });
        }
      });
    }

    return questions;
  }
}

export default ErrorRecovery;
