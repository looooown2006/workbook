/**
 * 智能结果验证器
 * 验证和修复解析结果，提高数据质量
 */

import { ImportQuestionData } from '../../types';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  fixedQuestions: ImportQuestionData[];
  statistics: ValidationStatistics;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  questionIndex?: number;
  field?: string;
  suggestion?: string;
  autoFixed?: boolean;
}

export interface ValidationStatistics {
  totalQuestions: number;
  validQuestions: number;
  fixedQuestions: number;
  errorCount: number;
  warningCount: number;
  averageConfidence: number;
}

export interface ValidationRule {
  name: string;
  description: string;
  check: (question: ImportQuestionData, index: number) => ValidationIssue[];
  fix?: (question: ImportQuestionData, issues: ValidationIssue[]) => ImportQuestionData;
  priority: number;
}

export class ResultValidator {
  
  private static rules: ValidationRule[] = [
    {
      name: 'title_required',
      description: '题目标题必须存在且非空',
      priority: 1,
      check: (question, index) => {
        const issues: ValidationIssue[] = [];
        if (!question.title || question.title.trim().length === 0) {
          issues.push({
            type: 'error',
            code: 'TITLE_EMPTY',
            message: '题目标题为空',
            questionIndex: index,
            field: 'title',
            suggestion: '请提供有效的题目内容'
          });
        } else if (question.title.trim().length < 5) {
          issues.push({
            type: 'warning',
            code: 'TITLE_TOO_SHORT',
            message: '题目标题过短',
            questionIndex: index,
            field: 'title',
            suggestion: '题目标题建议至少5个字符'
          });
        }
        return issues;
      },
      fix: (question, issues) => {
        const titleIssue = issues.find(i => i.code === 'TITLE_EMPTY');
        if (titleIssue) {
          return {
            ...question,
            title: `题目 ${(titleIssue.questionIndex || 0) + 1}`
          };
        }
        return question;
      }
    },
    
    {
      name: 'options_validation',
      description: '选项必须存在且数量合理',
      priority: 1,
      check: (question, index) => {
        const issues: ValidationIssue[] = [];
        
        if (!question.options || !Array.isArray(question.options)) {
          issues.push({
            type: 'error',
            code: 'OPTIONS_MISSING',
            message: '选项缺失',
            questionIndex: index,
            field: 'options',
            suggestion: '请提供选项数组'
          });
        } else {
          if (question.options.length < 2) {
            issues.push({
              type: 'error',
              code: 'OPTIONS_TOO_FEW',
              message: '选项数量不足',
              questionIndex: index,
              field: 'options',
              suggestion: '至少需要2个选项'
            });
          } else if (question.options.length > 6) {
            issues.push({
              type: 'warning',
              code: 'OPTIONS_TOO_MANY',
              message: '选项数量过多',
              questionIndex: index,
              field: 'options',
              suggestion: '建议选项数量不超过6个'
            });
          }
          
          // 检查空选项
          const emptyOptions = question.options.filter(opt => !opt || opt.trim().length === 0);
          if (emptyOptions.length > 0) {
            issues.push({
              type: 'error',
              code: 'OPTIONS_EMPTY',
              message: `存在${emptyOptions.length}个空选项`,
              questionIndex: index,
              field: 'options',
              suggestion: '请填写所有选项内容'
            });
          }
          
          // 检查重复选项
          const uniqueOptions = new Set(question.options.map(opt => opt.trim().toLowerCase()));
          if (uniqueOptions.size < question.options.length) {
            issues.push({
              type: 'warning',
              code: 'OPTIONS_DUPLICATE',
              message: '存在重复选项',
              questionIndex: index,
              field: 'options',
              suggestion: '请确保选项内容不重复'
            });
          }
        }
        
        return issues;
      },
      fix: (question, issues) => {
        let fixedOptions = [...(question.options || [])];
        
        // 修复空选项
        const emptyIssue = issues.find(i => i.code === 'OPTIONS_EMPTY');
        if (emptyIssue) {
          fixedOptions = fixedOptions.map((opt, i) => 
            opt && opt.trim() ? opt : `选项 ${String.fromCharCode(65 + i)}`
          );
        }
        
        // 确保至少有2个选项
        if (fixedOptions.length < 2) {
          while (fixedOptions.length < 4) {
            fixedOptions.push(`选项 ${String.fromCharCode(65 + fixedOptions.length)}`);
          }
        }
        
        return { ...question, options: fixedOptions };
      }
    },
    
    {
      name: 'answer_validation',
      description: '正确答案索引必须有效',
      priority: 1,
      check: (question, index) => {
        const issues: ValidationIssue[] = [];
        
        if (typeof question.correctAnswer !== 'number') {
          issues.push({
            type: 'error',
            code: 'ANSWER_INVALID_TYPE',
            message: '正确答案类型无效',
            questionIndex: index,
            field: 'correctAnswer',
            suggestion: '正确答案必须是数字索引'
          });
        } else if (question.correctAnswer < 0) {
          issues.push({
            type: 'error',
            code: 'ANSWER_NEGATIVE',
            message: '正确答案索引为负数',
            questionIndex: index,
            field: 'correctAnswer',
            suggestion: '正确答案索引必须大于等于0'
          });
        } else if (question.options && question.correctAnswer >= question.options.length) {
          issues.push({
            type: 'error',
            code: 'ANSWER_OUT_OF_RANGE',
            message: '正确答案索引超出选项范围',
            questionIndex: index,
            field: 'correctAnswer',
            suggestion: `正确答案索引应在0-${question.options.length - 1}之间`
          });
        }
        
        return issues;
      },
      fix: (question, issues) => {
        const answerIssue = issues.find(i => i.code.startsWith('ANSWER_'));
        if (answerIssue) {
          const maxIndex = (question.options?.length || 4) - 1;
          return {
            ...question,
            correctAnswer: Math.max(0, Math.min(maxIndex, 0))
          };
        }
        return question;
      }
    },
    
    {
      name: 'content_quality',
      description: '内容质量检查',
      priority: 2,
      check: (question, index) => {
        const issues: ValidationIssue[] = [];
        
        // 检查题目长度
        if (question.title && question.title.length > 500) {
          issues.push({
            type: 'warning',
            code: 'TITLE_TOO_LONG',
            message: '题目内容过长',
            questionIndex: index,
            field: 'title',
            suggestion: '建议题目长度不超过500字符'
          });
        }
        
        // 检查选项长度
        if (question.options) {
          const longOptions = question.options.filter(opt => opt && opt.length > 200);
          if (longOptions.length > 0) {
            issues.push({
              type: 'warning',
              code: 'OPTIONS_TOO_LONG',
              message: `存在${longOptions.length}个过长选项`,
              questionIndex: index,
              field: 'options',
              suggestion: '建议选项长度不超过200字符'
            });
          }
        }
        
        // 检查解析长度
        if (question.explanation && question.explanation.length > 1000) {
          issues.push({
            type: 'info',
            code: 'EXPLANATION_LONG',
            message: '解析内容较长',
            questionIndex: index,
            field: 'explanation',
            suggestion: '考虑简化解析内容'
          });
        }
        
        return issues;
      }
    }
  ];

  /**
   * 验证题目数组
   */
  static validate(questions: ImportQuestionData[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    const fixedQuestions: ImportQuestionData[] = [];
    let totalConfidence = 0;
    let validQuestions = 0;
    let fixedCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionIssues: ValidationIssue[] = [];
      
      // 运行所有验证规则
      for (const rule of this.rules) {
        const ruleIssues = rule.check(question, i);
        questionIssues.push(...ruleIssues);
      }
      
      // 尝试修复问题
      let fixedQuestion = { ...question };
      let wasFixed = false;
      
      for (const rule of this.rules) {
        if (rule.fix) {
          const relevantIssues = questionIssues.filter(issue => 
            issue.questionIndex === i
          );
          
          if (relevantIssues.length > 0) {
            const newQuestion = rule.fix(fixedQuestion, relevantIssues);
            if (JSON.stringify(newQuestion) !== JSON.stringify(fixedQuestion)) {
              fixedQuestion = newQuestion;
              wasFixed = true;
              
              // 标记已修复的问题
              relevantIssues.forEach(issue => {
                issue.autoFixed = true;
              });
            }
          }
        }
      }
      
      if (wasFixed) {
        fixedCount++;
      }
      
      fixedQuestions.push(fixedQuestion);
      issues.push(...questionIssues);
      
      // 计算题目置信度
      const errorCount = questionIssues.filter(i => i.type === 'error').length;
      const warningCount = questionIssues.filter(i => i.type === 'warning').length;
      
      let questionConfidence = 1.0;
      questionConfidence -= errorCount * 0.3;
      questionConfidence -= warningCount * 0.1;
      questionConfidence = Math.max(0, questionConfidence);
      
      totalConfidence += questionConfidence;
      
      if (errorCount === 0) {
        validQuestions++;
      }
    }

    const averageConfidence = questions.length > 0 ? totalConfidence / questions.length : 0;
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    return {
      isValid: errorCount === 0,
      confidence: averageConfidence,
      issues,
      fixedQuestions,
      statistics: {
        totalQuestions: questions.length,
        validQuestions,
        fixedQuestions: fixedCount,
        errorCount,
        warningCount,
        averageConfidence
      }
    };
  }

  /**
   * 快速验证单个题目
   */
  static validateSingle(question: ImportQuestionData): boolean {
    return !!question.title &&
           question.title.trim().length > 0 &&
           question.options &&
           Array.isArray(question.options) &&
           question.options.length >= 2 &&
           typeof question.correctAnswer === 'number' &&
           question.correctAnswer >= 0 &&
           question.correctAnswer < question.options.length;
  }

  /**
   * 获取验证摘要
   */
  static getSummary(result: ValidationResult): string {
    const { statistics } = result;
    
    if (statistics.totalQuestions === 0) {
      return '没有题目需要验证';
    }
    
    const validRate = (statistics.validQuestions / statistics.totalQuestions * 100).toFixed(1);
    const confidencePercent = (statistics.averageConfidence * 100).toFixed(1);
    
    let summary = `验证完成：${statistics.totalQuestions}道题目，${statistics.validQuestions}道有效（${validRate}%）`;
    
    if (statistics.fixedQuestions > 0) {
      summary += `，${statistics.fixedQuestions}道已自动修复`;
    }
    
    summary += `，平均置信度${confidencePercent}%`;
    
    if (statistics.errorCount > 0) {
      summary += `，发现${statistics.errorCount}个错误`;
    }
    
    if (statistics.warningCount > 0) {
      summary += `，${statistics.warningCount}个警告`;
    }
    
    return summary;
  }
}
