/**
 * 增强版结果验证器
 * 实现多重验证和自动错误修复
 */

import { ImportQuestionData, DifficultyLevel } from '../../types';

export interface ValidationResult {
  isValid: boolean;
  fixedQuestions: ImportQuestionData[];
  statistics: {
    totalQuestions: number;
    validQuestions: number;
    fixedQuestions: number;
    invalidQuestions: number;
  };
  errors: string[];
  warnings: string[];
  fixes: string[];
}

export class EnhancedValidator {
  
  /**
   * 验证并修复题目数据
   */
  static validate(questions: ImportQuestionData[]): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      fixedQuestions: [],
      statistics: {
        totalQuestions: questions.length,
        validQuestions: 0,
        fixedQuestions: 0,
        invalidQuestions: 0
      },
      errors: [],
      warnings: [],
      fixes: []
    };

    for (const question of questions) {
      const validationResult = this.validateAndFixSingle(question);
      
      if (validationResult.isValid) {
        result.fixedQuestions.push(validationResult.question);
        result.statistics.validQuestions++;
        
        if (validationResult.wasFixed) {
          result.statistics.fixedQuestions++;
          result.fixes.push(...validationResult.fixes);
        }
      } else {
        result.statistics.invalidQuestions++;
        result.errors.push(...validationResult.errors);
      }
      
      result.warnings.push(...validationResult.warnings);
    }

    result.isValid = result.statistics.validQuestions > 0;
    return result;
  }

  /**
   * 验证并修复单个题目
   */
  private static validateAndFixSingle(question: ImportQuestionData): {
    isValid: boolean;
    question: ImportQuestionData;
    wasFixed: boolean;
    errors: string[];
    warnings: string[];
    fixes: string[];
  } {
    const result = {
      isValid: false,
      question: { ...question },
      wasFixed: false,
      errors: [] as string[],
      warnings: [] as string[],
      fixes: [] as string[]
    };

    // 1. 修复题目标题
    const titleFix = this.fixTitle(result.question.title);
    if (titleFix.wasFixed) {
      result.question.title = titleFix.fixed;
      result.wasFixed = true;
      result.fixes.push(`修复题目标题: ${titleFix.description}`);
    }

    // 2. 验证题目标题
    if (!result.question.title || result.question.title.trim().length === 0) {
      result.errors.push('题目内容为空');
      return result;
    }

    if (result.question.title.trim().length < 5) {
      result.warnings.push('题目内容过短，可能不完整');
    }

    // 3. 修复和验证选项
    const optionsFix = this.fixOptions(result.question.options);
    if (optionsFix.wasFixed) {
      result.question.options = optionsFix.fixed;
      result.wasFixed = true;
      result.fixes.push(`修复选项: ${optionsFix.description}`);
    }

    if (!result.question.options || !Array.isArray(result.question.options)) {
      result.errors.push('选项格式错误');
      return result;
    }

    if (result.question.options.length < 2) {
      result.errors.push('选项数量不足（至少需要2个）');
      return result;
    }

    if (result.question.options.length > 6) {
      result.warnings.push('选项数量过多，建议不超过6个');
    }

    // 4. 修复和验证正确答案
    const answerFix = this.fixCorrectAnswer(result.question.correctAnswer, result.question.options.length);
    if (answerFix.wasFixed) {
      result.question.correctAnswer = answerFix.fixed;
      result.wasFixed = true;
      result.fixes.push(`修复正确答案: ${answerFix.description}`);
    }

    if (typeof result.question.correctAnswer !== 'number' || 
        result.question.correctAnswer < 0 || 
        result.question.correctAnswer >= result.question.options.length) {
      result.errors.push('正确答案索引超出范围');
      return result;
    }

    // 5. 修复解析内容
    if (result.question.explanation) {
      const explanationFix = this.fixExplanation(result.question.explanation);
      if (explanationFix.wasFixed) {
        result.question.explanation = explanationFix.fixed;
        result.wasFixed = true;
        result.fixes.push(`修复解析内容: ${explanationFix.description}`);
      }
    }

    // 6. 修复难度等级
    const difficultyFix = this.fixDifficulty(result.question.difficulty);
    if (difficultyFix.wasFixed) {
      result.question.difficulty = difficultyFix.fixed as DifficultyLevel;
      result.wasFixed = true;
      result.fixes.push(`修复难度等级: ${difficultyFix.description}`);
    }

    // 7. 修复标签
    const tagsFix = this.fixTags(result.question.tags);
    if (tagsFix.wasFixed) {
      result.question.tags = tagsFix.fixed;
      result.wasFixed = true;
      result.fixes.push(`修复标签: ${tagsFix.description}`);
    }

    result.isValid = true;
    return result;
  }

  /**
   * 修复题目标题
   */
  private static fixTitle(title: string): { fixed: string; wasFixed: boolean; description: string } {
    if (!title) return { fixed: '', wasFixed: false, description: '' };

    let fixed = title.trim();
    let wasFixed = false;
    const fixes: string[] = [];

    // 移除题目编号
    const numberPattern = /^(\d+[.、]|\d+\s*[.、]|第\d+题[.、]?|\(\d+\)|【\d+】)/;
    if (numberPattern.test(fixed)) {
      fixed = fixed.replace(numberPattern, '').trim();
      wasFixed = true;
      fixes.push('移除题目编号');
    }

    // 修复常见OCR错误
    const ocrFixes = [
      { pattern: /[0O](?=\d)/g, replacement: '0', desc: '修正数字0' },
      { pattern: /[1l](?=\d)/g, replacement: '1', desc: '修正数字1' },
      { pattern: /[5S](?=\d)/g, replacement: '5', desc: '修正数字5' },
      { pattern: /\s+/g, replacement: ' ', desc: '规范化空格' }
    ];

    for (const fix of ocrFixes) {
      if (fix.pattern.test(fixed)) {
        fixed = fixed.replace(fix.pattern, fix.replacement);
        wasFixed = true;
        fixes.push(fix.desc);
      }
    }

    return {
      fixed,
      wasFixed,
      description: fixes.join(', ')
    };
  }

  /**
   * 修复选项
   */
  private static fixOptions(options: any): { fixed: string[]; wasFixed: boolean; description: string } {
    if (!Array.isArray(options)) {
      return { fixed: [], wasFixed: false, description: '选项不是数组' };
    }

    const fixed: string[] = [];
    let wasFixed = false;
    const fixes: string[] = [];

    for (let i = 0; i < options.length; i++) {
      let option = String(options[i]).trim();

      // 移除选项标识符
      const optionPattern = /^([A-Z][.、)]|[①②③④⑤⑥][.、)]?|\(\d+\)|【[A-Z]】)/;
      if (optionPattern.test(option)) {
        option = option.replace(optionPattern, '').trim();
        wasFixed = true;
        fixes.push(`移除选项${i + 1}的标识符`);
      }

      if (option.length > 0) {
        fixed.push(option);
      }
    }

    return {
      fixed,
      wasFixed,
      description: fixes.join(', ')
    };
  }

  /**
   * 修复正确答案
   */
  private static fixCorrectAnswer(answer: any, optionCount: number): { fixed: number; wasFixed: boolean; description: string } {
    let fixed = 0;
    let wasFixed = false;
    let description = '';

    if (typeof answer === 'number') {
      fixed = answer;
    } else if (typeof answer === 'string') {
      const upperAnswer = answer.toUpperCase().trim();
      
      // 匹配字母答案
      const letterMatch = upperAnswer.match(/([A-Z])/);
      if (letterMatch) {
        fixed = letterMatch[1].charCodeAt(0) - 'A'.charCodeAt(0);
        wasFixed = true;
        description = `将字母答案${letterMatch[1]}转换为索引${fixed}`;
      } else {
        // 匹配数字答案
        const numberMatch = upperAnswer.match(/(\d+)/);
        if (numberMatch) {
          fixed = parseInt(numberMatch[1]) - 1; // 转换为0-based索引
          wasFixed = true;
          description = `将数字答案${numberMatch[1]}转换为索引${fixed}`;
        }
      }
    }

    // 确保答案在有效范围内
    if (fixed < 0 || fixed >= optionCount) {
      fixed = 0;
      wasFixed = true;
      description += (description ? ', ' : '') + '答案超出范围，重置为0';
    }

    return { fixed, wasFixed, description };
  }

  /**
   * 修复解析内容
   */
  private static fixExplanation(explanation: string): { fixed: string; wasFixed: boolean; description: string } {
    if (!explanation) return { fixed: '', wasFixed: false, description: '' };

    let fixed = explanation.trim();
    let wasFixed = false;
    const fixes: string[] = [];

    // 移除"解析："前缀
    if (fixed.startsWith('解析：') || fixed.startsWith('解析:')) {
      fixed = fixed.replace(/^解析[：:]/, '').trim();
      wasFixed = true;
      fixes.push('移除解析前缀');
    }

    return {
      fixed,
      wasFixed,
      description: fixes.join(', ')
    };
  }

  /**
   * 修复难度等级
   */
  private static fixDifficulty(difficulty: any): { fixed: string; wasFixed: boolean; description: string } {
    const validDifficulties = ['easy', 'medium', 'hard'];
    
    if (validDifficulties.includes(difficulty)) {
      return { fixed: difficulty, wasFixed: false, description: '' };
    }

    // 默认设置为medium
    return {
      fixed: 'medium',
      wasFixed: true,
      description: '设置默认难度为medium'
    };
  }

  /**
   * 修复标签
   */
  private static fixTags(tags: any): { fixed: string[]; wasFixed: boolean; description: string } {
    if (!Array.isArray(tags)) {
      return {
        fixed: [],
        wasFixed: true,
        description: '初始化空标签数组'
      };
    }

    const fixed = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0)
                     .map(tag => tag.trim());

    return {
      fixed,
      wasFixed: fixed.length !== tags.length,
      description: fixed.length !== tags.length ? '清理无效标签' : ''
    };
  }
}
