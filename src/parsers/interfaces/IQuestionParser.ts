/**
 * 题目解析器接口
 */

import { ImportQuestionData } from '../../types';

export interface ParseInput {
  type: 'text' | 'image' | 'pdf';
  content: string | File;
  options?: ParseOptions;
}

export interface ParseOptions {
  language?: string;
  format?: string;
  strictMode?: boolean;
  maxQuestions?: number;
}

export interface ParseResult {
  success: boolean;
  questions: ImportQuestionData[];
  confidence: number;
  errors?: string[];
  metadata?: {
    parser: string;
    processingTime: number;
    cost?: number;
    ocrConfidence?: number;
    detectedFormat?: string;
    [key: string]: any;
  };
}

export interface IQuestionParser {
  name: string;
  supportedTypes: ('text' | 'image' | 'pdf')[];
  
  /**
   * 解析输入内容
   */
  parse(input: ParseInput): Promise<ParseResult>;
  
  /**
   * 检查是否支持该输入类型
   */
  supports(input: ParseInput): boolean;
  
  /**
   * 获取解析器配置
   */
  getConfig(): any;
  
  /**
   * 设置解析器配置
   */
  setConfig(config: any): void;
}

export interface ParserMetrics {
  totalCalls: number;
  totalTime: number;
  averageTime: number;
  averageConfidence: number;
  successRate: number;
  errors: number;
}

export interface PerformanceReport {
  parsers: Record<string, ParserMetrics>;
  overall: {
    totalCalls: number;
    averageTime: number;
    averageConfidence: number;
    successRate: number;
  };
}

export type ParseStrategy = 'auto' | 'ai_only' | 'ocr_only' | 'rule_only' | 'hybrid';

export interface QuestionFormat {
  type: QuestionFormatType;
  confidence: number;
  patterns?: RegExp;
}

export type QuestionFormatType = 'standard' | 'numbered' | 'bullet' | 'parentheses' | 'chinese' | 'unknown';
