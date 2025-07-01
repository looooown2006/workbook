import mammoth from 'mammoth';
import { ImportQuestionData, ImportResult } from '../types';
import type { DifficultyLevel } from '../types';
import { processImportData } from './helpers';

// 文档解析器类
export class DocumentParser {
  // 解析docx文件
  static async parseDocx(file: File, chapterId: string): Promise<ImportResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      return this.parseTextContent(text, chapterId);
    } catch (error) {
      return {
        success: false,
        totalCount: 0,
        successCount: 0,
        failedCount: 1,
        errors: [`解析docx文件失败: ${error}`],
        questions: []
      };
    }
  }

  // 解析文本内容
  static parseTextContent(text: string, chapterId: string): ImportResult {
    try {
      // 尝试解析JSON格式
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        return this.parseJsonContent(text, chapterId);
      }
      
      // 解析普通文本格式
      return this.parseTextFormat(text, chapterId);
    } catch (error) {
      return {
        success: false,
        totalCount: 0,
        successCount: 0,
        failedCount: 1,
        errors: [`解析文本内容失败: ${error}`],
        questions: []
      };
    }
  }

  // 解析JSON格式
  static parseJsonContent(jsonText: string, chapterId: string): ImportResult {
    try {
      const data = JSON.parse(jsonText);
      const questions = Array.isArray(data) ? data : [data];
      
      return processImportData(questions, chapterId);
    } catch (error) {
      return {
        success: false,
        totalCount: 0,
        successCount: 0,
        failedCount: 1,
        errors: [`JSON格式错误: ${error}`],
        questions: []
      };
    }
  }

  // 解析文本格式
  static parseTextFormat(text: string, chapterId: string): ImportResult {
    const questions: ImportQuestionData[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentQuestion: Partial<ImportQuestionData> = {};
    let currentOptions: string[] = [];
    let questionCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检测题目开始（数字开头或"题目"关键字）
      if (this.isQuestionStart(line)) {
        // 保存上一题
        if (currentQuestion.title) {
          this.finalizeQuestion(currentQuestion, currentOptions, questions);
          questionCount++;
        }
        
        // 开始新题
        currentQuestion = {
          title: this.extractQuestionTitle(line)
        };
        currentOptions = [];
      }
      // 检测选项（A、B、C、D开头）
      else if (this.isOption(line)) {
        const option = this.extractOptionText(line);
        if (option) {
          currentOptions.push(option);
        }
      }
      // 检测答案
      else if (this.isAnswer(line)) {
        const answer = this.extractAnswer(line);
        if (answer !== null) {
          currentQuestion.correctAnswer = answer;
        }
      }
      // 检测解析
      else if (this.isExplanation(line)) {
        const explanation = this.extractExplanation(line);
        if (explanation) {
          currentQuestion.explanation = explanation;
        }
      }
      // 检测难度
      else if (this.isDifficulty(line)) {
        const difficulty = this.extractDifficulty(line);
        if (difficulty) {
          currentQuestion.difficulty = difficulty as DifficultyLevel;
        }
      }
      // 如果当前有题目但没有匹配到特定格式，可能是题目内容的延续
      else if (currentQuestion.title && !this.isSpecialLine(line)) {
        currentQuestion.title += ' ' + line;
      }
    }
    
    // 保存最后一题
    if (currentQuestion.title) {
      this.finalizeQuestion(currentQuestion, currentOptions, questions);
    }
    
    return processImportData(questions, chapterId);
  }

  // 判断是否为题目开始
  private static isQuestionStart(line: string): boolean {
    // 匹配数字开头：1. 1、 （1） 第1题 等
    const patterns = [
      /^\d+[.、\s]/,
      /^（\d+）/,
      /^第\d+题/,
      /^题目\d*/,
      /^\d+\s*[:：]/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  // 提取题目标题
  private static extractQuestionTitle(line: string): string {
    // 移除题目编号，保留题目内容
    return line
      .replace(/^\d+[.、\s]*/, '')
      .replace(/^（\d+）\s*/, '')
      .replace(/^第\d+题\s*[:：]?\s*/, '')
      .replace(/^题目\d*\s*[:：]?\s*/, '')
      .replace(/^\d+\s*[:：]\s*/, '')
      .trim();
  }

  // 判断是否为选项
  private static isOption(line: string): boolean {
    return /^[A-Za-z][.、\s)]/.test(line);
  }

  // 提取选项文本
  private static extractOptionText(line: string): string {
    return line.replace(/^[A-Za-z][.、\s)]*/, '').trim();
  }

  // 判断是否为答案
  private static isAnswer(line: string): boolean {
    const patterns = [
      /^答案\s*[:：]\s*[A-Za-z\d]/,
      /^正确答案\s*[:：]\s*[A-Za-z\d]/,
      /^答\s*[:：]\s*[A-Za-z\d]/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  // 提取答案
  private static extractAnswer(line: string): number | string | null {
    const match = line.match(/[:：]\s*([A-Za-z\d])/);
    if (match) {
      const answer = match[1].toUpperCase();
      // 如果是字母，转换为数字索引
      if (/[A-Z]/.test(answer)) {
        return answer.charCodeAt(0) - 'A'.charCodeAt(0);
      }
      // 如果是数字，直接返回（需要减1转为0-based索引）
      const num = parseInt(answer);
      return isNaN(num) ? null : num - 1;
    }
    return null;
  }

  // 判断是否为解析
  private static isExplanation(line: string): boolean {
    const patterns = [
      /^解析\s*[:：]/,
      /^解释\s*[:：]/,
      /^说明\s*[:：]/,
      /^解答\s*[:：]/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  // 提取解析
  private static extractExplanation(line: string): string {
    return line.replace(/^(解析|解释|说明|解答)\s*[:：]\s*/, '').trim();
  }

  // 判断是否为难度
  private static isDifficulty(line: string): boolean {
    return /^难度\s*[:：]\s*(简单|容易|中等|困难|hard|medium|easy)/i.test(line);
  }

  // 提取难度
  private static extractDifficulty(line: string): string | null {
    const match = line.match(/[:：]\s*(简单|容易|中等|困难|hard|medium|easy)/i);
    if (match) {
      const difficulty = match[1].toLowerCase();
      switch (difficulty) {
        case '简单':
        case '容易':
        case 'easy':
          return 'easy';
        case '中等':
        case 'medium':
          return 'medium';
        case '困难':
        case 'hard':
          return 'hard';
        default:
          return null;
      }
    }
    return null;
  }

  // 判断是否为特殊行（答案、解析等）
  private static isSpecialLine(line: string): boolean {
    return this.isAnswer(line) || 
           this.isExplanation(line) || 
           this.isDifficulty(line) ||
           this.isOption(line);
  }

  // 完成题目构建
  private static finalizeQuestion(
    questionData: Partial<ImportQuestionData>,
    options: string[],
    questions: ImportQuestionData[]
  ): void {
    if (questionData.title && options.length >= 2) {
      questions.push({
        title: questionData.title,
        options: [...options],
        correctAnswer: questionData.correctAnswer ?? 0,
        explanation: questionData.explanation,
        difficulty: questionData.difficulty as DifficultyLevel,
        tags: questionData.tags
      });
    }
  }

  // 批量解析文件
  static async parseFiles(files: FileList, chapterId: string): Promise<ImportResult> {
    const allResults: ImportResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let result: ImportResult;
      
      if (file.name.endsWith('.docx')) {
        result = await this.parseDocx(file, chapterId);
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.text')) {
        const text = await file.text();
        result = this.parseTextContent(text, chapterId);
      } else {
        result = {
          success: false,
          totalCount: 0,
          successCount: 0,
          failedCount: 1,
          errors: [`不支持的文件格式: ${file.name}`],
          questions: []
        };
      }
      
      allResults.push(result);
    }
    
    // 合并所有结果
    return this.mergeResults(allResults);
  }

  // 合并多个解析结果
  private static mergeResults(results: ImportResult[]): ImportResult {
    const merged: ImportResult = {
      success: false,
      totalCount: 0,
      successCount: 0,
      failedCount: 0,
      errors: [],
      questions: []
    };
    
    results.forEach(result => {
      merged.totalCount += result.totalCount;
      merged.successCount += result.successCount;
      merged.failedCount += result.failedCount;
      merged.errors.push(...result.errors);
      merged.questions.push(...result.questions);
    });
    
    merged.success = merged.successCount > 0;
    
    return merged;
  }
}
