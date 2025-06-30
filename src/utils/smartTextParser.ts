import { ImportQuestionData, ImportResult, Question } from '../types';
import { RuleBasedParser } from '../parsers/rule/RuleBasedParser';

/**
 * 智能文本解析器
 * 支持多种格式的题目文本自动识别和转换
 */
export class SmartTextParser {
  
  /**
   * 解析各种格式的题目文本
   */
  static async parseText(text: string): Promise<ImportResult> {
    const cleanText = this.cleanText(text);

    try {
      // 首先尝试使用新的规则解析器
      const ruleParser = new RuleBasedParser({
        strictMode: false,
        autoFix: true,
        maxQuestions: 50,
        timeout: 3000
      });

      const ruleResult = await ruleParser.parse({
        type: 'text',
        content: cleanText
      });

      if (ruleResult.success && ruleResult.questions.length > 0) {
        return {
          success: true,
          totalCount: ruleResult.questions.length,
          successCount: ruleResult.questions.length,
          failedCount: 0,
          errors: ruleResult.errors || [],
          questions: ruleResult.questions
        };
      }

      // 如果规则解析失败，回退到传统策略
      console.log('规则解析失败，使用传统策略...');
      return this.parseWithTraditionalStrategies(cleanText);

    } catch (error) {
      console.error('智能解析失败:', error);
      return this.parseWithTraditionalStrategies(cleanText);
    }
  }

  /**
   * 使用传统策略解析
   */
  private static parseWithTraditionalStrategies(cleanText: string): ImportResult {
    const questions: ImportQuestionData[] = [];
    const errors: string[] = [];

    try {
      // 尝试不同的解析策略
      const strategies = [
        this.parseStandardFormat,
        this.parseNumberedFormat,
        this.parseSimpleFormat,
        this.parseWordCopyFormat,
        this.parsePDFCopyFormat
      ];

      for (const strategy of strategies) {
        const result = strategy.call(this, cleanText);
        if (result.length > 0) {
          questions.push(...result);
          break;
        }
      }

      if (questions.length === 0) {
        // 如果所有策略都失败，尝试智能分割
        const intelligentResult = this.parseIntelligentSplit(cleanText);
        questions.push(...intelligentResult);
      }

    } catch (error) {
      errors.push(`解析错误: ${error}`);
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
   * 清理文本，移除多余的空白和特殊字符
   */
  private static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }
  
  /**
   * 解析标准格式：题目 + A.B.C.D + 答案 + 解析
   */
  private static parseStandardFormat(text: string): ImportQuestionData[] {
    const questions: ImportQuestionData[] = [];
    const questionBlocks = this.splitIntoQuestionBlocks(text);
    
    for (const block of questionBlocks) {
      const question = this.parseStandardBlock(block);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }
  
  /**
   * 解析编号格式：1. 题目...
   */
  private static parseNumberedFormat(text: string): ImportQuestionData[] {
    const questions: ImportQuestionData[] = [];
    const numberedPattern = /(\d+\.?\s*)(.*?)(?=\d+\.?\s*|$)/gs;
    const matches = Array.from(text.matchAll(numberedPattern));
    
    for (const match of matches) {
      const questionText = match[2].trim();
      const question = this.parseQuestionContent(questionText);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }
  
  /**
   * 解析简单格式：题目直接跟选项
   */
  private static parseSimpleFormat(text: string): ImportQuestionData[] {
    const questions: ImportQuestionData[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentQuestion: Partial<ImportQuestionData> = {};
    let options: string[] = [];
    let collectingOptions = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 检测选项行
      if (this.isOptionLine(trimmedLine)) {
        if (!collectingOptions && currentQuestion.title) {
          collectingOptions = true;
          options = [];
        }
        if (collectingOptions) {
          options.push(this.extractOptionText(trimmedLine));
        }
      }
      // 检测答案行
      else if (this.isAnswerLine(trimmedLine)) {
        const answer = this.extractAnswer(trimmedLine);
        if (currentQuestion.title && options.length > 0 && answer !== null) {
          currentQuestion.options = options;
          currentQuestion.correctAnswer = answer;
          questions.push(currentQuestion as ImportQuestionData);
          currentQuestion = {};
          options = [];
          collectingOptions = false;
        }
      }
      // 检测解析行
      else if (this.isExplanationLine(trimmedLine)) {
        if (questions.length > 0) {
          questions[questions.length - 1].explanation = this.extractExplanation(trimmedLine);
        }
      }
      // 题目行
      else if (!collectingOptions && trimmedLine.length > 10) {
        if (currentQuestion.title && options.length > 0) {
          // 保存前一个题目
          questions.push(currentQuestion as ImportQuestionData);
        }
        currentQuestion = { title: trimmedLine };
        options = [];
        collectingOptions = false;
      }
    }
    
    return questions;
  }
  
  /**
   * 解析Word复制格式
   */
  private static parseWordCopyFormat(text: string): ImportQuestionData[] {
    // Word复制通常会有特殊的格式标记
    const cleanedText = text
      .replace(/[\u2022\u25CF\u25CB]/g, '') // 移除项目符号
      .replace(/\t/g, ' ') // 制表符转空格
      .replace(/\f/g, '\n'); // 换页符转换行
    
    return this.parseStandardFormat(cleanedText);
  }
  
  /**
   * 解析PDF复制格式
   */
  private static parsePDFCopyFormat(text: string): ImportQuestionData[] {
    // PDF复制可能会有断行问题
    const cleanedText = text
      .replace(/([a-z])\n([a-z])/g, '$1 $2') // 修复单词断行
      .replace(/([。！？])\n([A-Z])/g, '$1\n\n$2') // 保持句子分隔
      .replace(/\n([A-D]\.)/g, '\n$1'); // 确保选项换行
    
    return this.parseStandardFormat(cleanedText);
  }
  
  /**
   * 智能分割解析
   */
  private static parseIntelligentSplit(text: string): ImportQuestionData[] {
    const questions: ImportQuestionData[] = [];
    
    // 使用多种分隔符尝试分割
    const separators = [
      /\n\s*\n\s*\d+[\.、]/g, // 数字编号
      /\n\s*\n\s*[一二三四五六七八九十]+[\.、]/g, // 中文编号
      /\n\s*\n\s*[（(]\d+[）)]/g, // 括号编号
      /\n\s*\n\s*第\d+题/g, // "第X题"
    ];
    
    for (const separator of separators) {
      const parts = text.split(separator);
      if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
          const question = this.parseQuestionContent(parts[i]);
          if (question) {
            questions.push(question);
          }
        }
        break;
      }
    }
    
    return questions;
  }
  
  /**
   * 分割文本为题目块
   */
  private static splitIntoQuestionBlocks(text: string): string[] {
    // 尝试多种分割方式
    const patterns = [
      /\n\s*\d+[\.、]\s*/g,
      /\n\s*[（(]\d+[）)]\s*/g,
      /\n\s*第\d+题\s*/g,
      /\n\s*\d+\s*、\s*/g
    ];
    
    for (const pattern of patterns) {
      const parts = text.split(pattern);
      if (parts.length > 1) {
        return parts.slice(1); // 移除第一个空部分
      }
    }
    
    return [text];
  }
  
  /**
   * 解析标准题目块
   */
  private static parseStandardBlock(block: string): ImportQuestionData | null {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 3) return null;
    
    let title = '';
    const options: string[] = [];
    let correctAnswer: number | null = null;
    let explanation = '';
    
    let currentSection = 'title';
    
    for (const line of lines) {
      if (this.isOptionLine(line)) {
        currentSection = 'options';
        options.push(this.extractOptionText(line));
      } else if (this.isAnswerLine(line)) {
        currentSection = 'answer';
        correctAnswer = this.extractAnswer(line);
      } else if (this.isExplanationLine(line)) {
        currentSection = 'explanation';
        explanation = this.extractExplanation(line);
      } else {
        if (currentSection === 'title') {
          title += (title ? ' ' : '') + line;
        } else if (currentSection === 'explanation') {
          explanation += (explanation ? ' ' : '') + line;
        }
      }
    }
    
    if (title && options.length >= 2 && correctAnswer !== null) {
      return {
        title,
        options,
        correctAnswer,
        explanation: explanation || undefined
      };
    }
    
    return null;
  }
  
  /**
   * 解析题目内容
   */
  private static parseQuestionContent(content: string): ImportQuestionData | null {
    return this.parseStandardBlock(content);
  }
  
  /**
   * 检测是否为选项行
   */
  private static isOptionLine(line: string): boolean {
    return /^[A-Z][\.、）)]\s*/.test(line) || /^[（(][A-Z][）)]\s*/.test(line);
  }
  
  /**
   * 检测是否为答案行
   */
  private static isAnswerLine(line: string): boolean {
    return /^(答案|正确答案|参考答案)[：:]\s*[A-Z]/i.test(line) || 
           /^[A-Z]$/.test(line.trim());
  }
  
  /**
   * 检测是否为解析行
   */
  private static isExplanationLine(line: string): boolean {
    return /^(解析|分析|说明|解释)[：:]/i.test(line);
  }
  
  /**
   * 提取选项文本
   */
  private static extractOptionText(line: string): string {
    return line.replace(/^[A-Z][\.、）)]\s*/, '').replace(/^[（(][A-Z][）)]\s*/, '').trim();
  }
  
  /**
   * 提取答案
   */
  private static extractAnswer(line: string): number | null {
    const match = line.match(/[A-Z]/);
    if (match) {
      return match[0].charCodeAt(0) - 'A'.charCodeAt(0);
    }
    return null;
  }
  
  /**
   * 提取解析
   */
  private static extractExplanation(line: string): string {
    return line.replace(/^(解析|分析|说明|解释)[：:]\s*/i, '').trim();
  }
}
