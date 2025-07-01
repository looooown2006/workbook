/**
 * 规则解析器
 * 创建高效的规则解析器处理标准格式题目
 */

import { IQuestionParser, ParseInput, ParseResult } from '../interfaces/IQuestionParser';
import { ImportQuestionData } from '../../types';
import { FormatDetector } from './FormatDetector';
import { ResultValidator } from '../validation/ResultValidator';

export interface RuleParserConfig {
  strictMode: boolean;
  autoFix: boolean;
  maxQuestions: number;
  timeout: number;
}

export interface ParsingRule {
  name: string;
  description: string;
  pattern: RegExp;
  extractor: (match: RegExpMatchArray, text: string) => Partial<ImportQuestionData> | null;
  priority: number;
  formats: string[];
}

export class RuleBasedParser implements IQuestionParser {
  name = 'RuleBased';
  supportedTypes: ('text' | 'image' | 'pdf')[] = ['text'];
  
  private config: RuleParserConfig = {
    strictMode: false,
    autoFix: true,
    maxQuestions: 100,
    timeout: 5000
  };

  private rules: ParsingRule[] = [
    {
      name: 'standard_choice',
      description: '标准选择题格式',
      pattern: /(\d+)[.、]\s*(.+?)\n(?:[A-D][.、]\s*(.+?)\n){2,4}(?:答案[：:]\s*([A-D]))?/gs,
      priority: 1,
      formats: ['standard_choice'],
      extractor: (match, text) => {
        const [, questionNum, title] = match;
        
        // 提取选项
        const optionPattern = /[A-D][.、]\s*(.+?)(?=\n|$)/g;
        const options: string[] = [];
        let optionMatch;
        
        while ((optionMatch = optionPattern.exec(match[0])) !== null) {
          options.push(optionMatch[1].trim());
        }
        
        // 提取答案
        const answerMatch = match[0].match(/答案[：:]\s*([A-D])/);
        const correctAnswer = answerMatch ? answerMatch[1].charCodeAt(0) - 'A'.charCodeAt(0) : 0;
        
        // 提取解析
        const explanationMatch = match[0].match(/解析[：:]\s*(.+?)(?=\n\d+[.、]|$)/s);
        const explanation = explanationMatch ? explanationMatch[1].trim() : '';
        
        return {
          title: title.trim(),
          options,
          correctAnswer,
          explanation,
          difficulty: 'medium',
          tags: []
        };
      }
    },
    
    {
      name: 'simple_choice',
      description: '简化选择题格式',
      pattern: /(.+?)\n(?:[A-D][.、]\s*(.+?)\n){2,4}/gs,
      priority: 2,
      formats: ['simple_choice'],
      extractor: (match, text) => {
        const lines = match[0].split('\n').filter(line => line.trim());
        const title = lines[0].trim();
        
        const options: string[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          const optionMatch = line.match(/^[A-D][.、]\s*(.+)$/);
          if (optionMatch) {
            options.push(optionMatch[1].trim());
          }
        }
        
        return {
          title,
          options,
          correctAnswer: 0, // 默认第一个选项
          explanation: '',
          difficulty: 'medium',
          tags: []
        };
      }
    },
    
    {
      name: 'numeric_choice',
      description: '数字选项格式',
      pattern: /(\d+)[.、]\s*(.+?)\n(?:[1-4][.、]\s*(.+?)\n){2,4}(?:答案[：:]\s*([1-4]))?/gs,
      priority: 3,
      formats: ['numeric_choice'],
      extractor: (match, text) => {
        const [, questionNum, title] = match;
        
        const optionPattern = /[1-4][.、]\s*(.+?)(?=\n|$)/g;
        const options: string[] = [];
        let optionMatch;
        
        while ((optionMatch = optionPattern.exec(match[0])) !== null) {
          options.push(optionMatch[1].trim());
        }
        
        const answerMatch = match[0].match(/答案[：:]\s*([1-4])/);
        const correctAnswer = answerMatch ? parseInt(answerMatch[1]) - 1 : 0;
        
        return {
          title: title.trim(),
          options,
          correctAnswer,
          explanation: '',
          difficulty: 'medium',
          tags: []
        };
      }
    },
    
    {
      name: 'parenthesis_choice',
      description: '括号选项格式',
      pattern: /(.+?)\n(?:\([A-D]\)\s*(.+?)\n){2,4}/gs,
      priority: 4,
      formats: ['parenthesis_choice'],
      extractor: (match, text) => {
        const lines = match[0].split('\n').filter(line => line.trim());
        const title = lines[0].trim();
        
        const options: string[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          const optionMatch = line.match(/^\([A-D]\)\s*(.+)$/);
          if (optionMatch) {
            options.push(optionMatch[1].trim());
          }
        }
        
        return {
          title,
          options,
          correctAnswer: 0,
          explanation: '',
          difficulty: 'medium',
          tags: []
        };
      }
    }
  ];

  constructor(config?: Partial<RuleParserConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * 解析文本
   */
  async parse(input: ParseInput): Promise<ParseResult> {
    const startTime = Date.now();

    if (!this.supports(input)) {
      return {
        success: false,
        questions: [],
        confidence: 0,
        errors: ['不支持的输入类型'],
        metadata: {
          parser: this.name,
          processingTime: Date.now() - startTime
        }
      };
    }

    try {
      const text = input.content as string;
      console.log('开始规则解析，文本长度:', text.length);

      // 检测格式
      const formatResult = FormatDetector.detectFormat(text);
      console.log('检测到格式:', formatResult.detectedFormat, '置信度:', formatResult.confidence);

      // 选择合适的规则
      const selectedRules = this.selectRules(formatResult.detectedFormat);
      
      // 解析题目
      const questions = await this.parseWithRules(text, selectedRules);
      
      // 验证结果
      let finalQuestions = questions;
      let confidence = formatResult.confidence;
      
      if (this.config.autoFix && questions.length > 0) {
        const validation = ResultValidator.validate(questions);
        finalQuestions = validation.fixedQuestions;
        confidence = Math.min(confidence, validation.confidence);
        
        console.log('规则解析验证:', ResultValidator.getSummary(validation));
      }

      return {
        success: finalQuestions.length > 0,
        questions: finalQuestions,
        confidence,
        metadata: {
          parser: this.name,
          processingTime: Date.now() - startTime,
          detectedFormat: formatResult.detectedFormat,
          formatConfidence: formatResult.confidence,
          rulesUsed: selectedRules.map(r => r.name)
        }
      };

    } catch (error) {
      console.error('规则解析失败:', error);
      return {
        success: false,
        questions: [],
        confidence: 0,
        errors: [`规则解析失败: ${error instanceof Error ? error.message : String(error)}`],
        metadata: {
          parser: this.name,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * 检查是否支持输入类型
   */
  supports(input: ParseInput): boolean {
    return input.type === 'text' && typeof input.content === 'string';
  }

  /**
   * 选择合适的解析规则
   */
  private selectRules(detectedFormat: string): ParsingRule[] {
    // 根据检测到的格式选择规则
    const formatRules = this.rules.filter(rule => 
      rule.formats.includes(detectedFormat)
    );

    if (formatRules.length > 0) {
      return formatRules.sort((a, b) => a.priority - b.priority);
    }

    // 如果没有匹配的格式规则，返回所有规则按优先级排序
    return this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 使用规则解析文本
   */
  private async parseWithRules(text: string, rules: ParsingRule[]): Promise<ImportQuestionData[]> {
    const questions: ImportQuestionData[] = [];
    const processedRanges: Array<[number, number]> = [];

    for (const rule of rules) {
      console.log(`尝试规则: ${rule.name}`);
      
      const matches = Array.from(text.matchAll(rule.pattern));
      
      for (const match of matches) {
        if (questions.length >= this.config.maxQuestions) {
          break;
        }

        const matchStart = match.index || 0;
        const matchEnd = matchStart + match[0].length;

        // 检查是否与已处理的范围重叠
        const isOverlapping = processedRanges.some(([start, end]) => 
          (matchStart >= start && matchStart < end) || 
          (matchEnd > start && matchEnd <= end)
        );

        if (isOverlapping) {
          continue;
        }

        try {
          const questionData = rule.extractor(match, text);
          
          if (questionData && questionData.title && questionData.options) {
            const questionItem: ImportQuestionData = {
              title: questionData.title,
              options: questionData.options,
              correctAnswer: questionData.correctAnswer || 0,
              explanation: questionData.explanation || '',
              difficulty: questionData.difficulty || 'medium',
              tags: questionData.tags || []
            };

            // 基本验证
            if (ResultValidator.validateSingle(questionItem)) {
              questions.push(questionItem);
              processedRanges.push([matchStart, matchEnd]);
            }
          }
        } catch (error) {
          console.warn(`规则 ${rule.name} 提取失败:`, error);
        }
      }

      // 如果已经找到题目，且不是严格模式，可以停止
      if (questions.length > 0 && !this.config.strictMode) {
        break;
      }
    }

    return questions;
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<RuleParserConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): RuleParserConfig {
    return { ...this.config };
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: ParsingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取所有规则
   */
  getRules(): ParsingRule[] {
    return [...this.rules];
  }
}
