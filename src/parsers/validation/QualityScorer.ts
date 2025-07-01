/**
 * 质量评分器
 * 评估解析结果的质量并提供改进建议
 */

import { ImportQuestionData } from '../../types';

export interface QualityScore {
  overall: number; // 总体质量分数 (0-100)
  breakdown: {
    completeness: number; // 完整性分数
    accuracy: number; // 准确性分数
    consistency: number; // 一致性分数
    clarity: number; // 清晰度分数
  };
  issues: QualityIssue[];
  suggestions: string[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface QualityIssue {
  type: 'completeness' | 'accuracy' | 'consistency' | 'clarity';
  severity: 'low' | 'medium' | 'high';
  description: string;
  questionIndex?: number;
  impact: number; // 对总分的影响 (0-10)
}

export interface QualityMetrics {
  hasQuestion: boolean;
  hasOptions: boolean;
  hasAnswer: boolean;
  hasExplanation: boolean;
  optionCount: number;
  questionLength: number;
  explanationLength: number;
  answerValid: boolean;
  difficultySet: boolean;
  tagsSet: boolean;
}

export class QualityScorer {
  
  /**
   * 评估题目集合的质量
   */
  static evaluateQuestions(questions: ImportQuestionData[]): QualityScore {
    if (questions.length === 0) {
      return {
        overall: 0,
        breakdown: {
          completeness: 0,
          accuracy: 0,
          consistency: 0,
          clarity: 0
        },
        issues: [{
          type: 'completeness',
          severity: 'high',
          description: '没有找到任何题目',
          impact: 10
        }],
        suggestions: ['请检查输入内容是否包含有效的题目格式'],
        grade: 'F'
      };
    }

    const scores = questions.map((q, index) => this.evaluateSingleQuestion(q, index));
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];

    // 计算平均分数
    const avgCompleteness = scores.reduce((sum, s) => sum + s.completeness, 0) / scores.length;
    const avgAccuracy = scores.reduce((sum, s) => sum + s.accuracy, 0) / scores.length;
    const avgConsistency = this.evaluateConsistency(questions);
    const avgClarity = scores.reduce((sum, s) => sum + s.clarity, 0) / scores.length;

    // 收集所有问题
    scores.forEach(score => {
      issues.push(...score.issues);
    });

    // 生成建议
    suggestions.push(...this.generateSuggestions(questions, issues));

    // 计算总体分数
    const overall = (avgCompleteness + avgAccuracy + avgConsistency + avgClarity) / 4;

    return {
      overall,
      breakdown: {
        completeness: avgCompleteness,
        accuracy: avgAccuracy,
        consistency: avgConsistency,
        clarity: avgClarity
      },
      issues,
      suggestions,
      grade: this.calculateGrade(overall)
    };
  }

  /**
   * 评估单个题目的质量
   */
  private static evaluateSingleQuestion(question: ImportQuestionData, index: number): {
    completeness: number;
    accuracy: number;
    clarity: number;
    issues: QualityIssue[];
  } {
    const metrics = this.extractMetrics(question);
    const issues: QualityIssue[] = [];

    // 完整性评分 (0-100)
    let completeness = 0;
    if (metrics.hasQuestion) completeness += 30;
    if (metrics.hasOptions && metrics.optionCount >= 2) completeness += 25;
    if (metrics.hasAnswer && metrics.answerValid) completeness += 25;
    if (metrics.hasExplanation) completeness += 10;
    if (metrics.difficultySet) completeness += 5;
    if (metrics.tagsSet) completeness += 5;

    // 准确性评分 (0-100)
    let accuracy = 80; // 基础分
    if (!metrics.answerValid) {
      accuracy -= 30;
      issues.push({
        type: 'accuracy',
        severity: 'high',
        description: '答案索引无效或超出选项范围',
        questionIndex: index,
        impact: 8
      });
    }
    if (metrics.optionCount < 2) {
      accuracy -= 20;
      issues.push({
        type: 'accuracy',
        severity: 'medium',
        description: '选项数量不足',
        questionIndex: index,
        impact: 6
      });
    }

    // 清晰度评分 (0-100)
    let clarity = 70; // 基础分
    if (metrics.questionLength < 10) {
      clarity -= 15;
      issues.push({
        type: 'clarity',
        severity: 'medium',
        description: '题目描述过短，可能不够清晰',
        questionIndex: index,
        impact: 4
      });
    }
    if (metrics.questionLength > 500) {
      clarity -= 10;
      issues.push({
        type: 'clarity',
        severity: 'low',
        description: '题目描述过长，可能影响阅读',
        questionIndex: index,
        impact: 3
      });
    }
    if (metrics.hasExplanation && metrics.explanationLength > 0) {
      clarity += 20;
    }
    if (metrics.explanationLength > 1000) {
      clarity -= 5;
      issues.push({
        type: 'clarity',
        severity: 'low',
        description: '解析过长，建议简化',
        questionIndex: index,
        impact: 2
      });
    }

    return {
      completeness: Math.max(0, Math.min(100, completeness)),
      accuracy: Math.max(0, Math.min(100, accuracy)),
      clarity: Math.max(0, Math.min(100, clarity)),
      issues
    };
  }

  /**
   * 评估一致性
   */
  private static evaluateConsistency(questions: ImportQuestionData[]): number {
    if (questions.length <= 1) return 100;

    let consistency = 100;
    const optionCounts = questions.map(q => q.options?.length || 0);
    const difficulties = questions.map(q => q.difficulty);
    
    // 检查选项数量一致性
    const uniqueOptionCounts = new Set(optionCounts);
    if (uniqueOptionCounts.size > 2) {
      consistency -= 15; // 选项数量变化过大
    }

    // 检查难度分布
    const difficultyDistribution = difficulties.reduce((acc, diff) => {
      acc[diff || 'unknown'] = (acc[diff || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const difficultyVariance = Object.keys(difficultyDistribution).length;
    if (difficultyVariance === 1) {
      consistency -= 10; // 难度过于单一
    }

    // 检查格式一致性
    const hasExplanationCount = questions.filter(q => q.explanation && q.explanation.trim()).length;
    const explanationRatio = hasExplanationCount / questions.length;
    if (explanationRatio > 0.1 && explanationRatio < 0.9) {
      consistency -= 10; // 解析不一致
    }

    return Math.max(0, Math.min(100, consistency));
  }

  /**
   * 提取题目指标
   */
  private static extractMetrics(question: ImportQuestionData): QualityMetrics {
    const hasQuestion = !!(question.question && question.question.trim());
    const hasOptions = !!(question.options && question.options.length > 0);
    const hasAnswer = question.correctAnswer !== undefined && question.correctAnswer !== null;
    const hasExplanation = !!(question.explanation && question.explanation.trim());
    const optionCount = question.options?.length || 0;
    const questionLength = question.question?.length || 0;
    const explanationLength = question.explanation?.length || 0;
    const answerValid = hasAnswer && hasOptions && 
      question.correctAnswer >= 0 && question.correctAnswer < optionCount;
    const difficultySet = !!(question.difficulty && question.difficulty !== 'unknown');
    const tagsSet = !!(question.tags && question.tags.length > 0);

    return {
      hasQuestion,
      hasOptions,
      hasAnswer,
      hasExplanation,
      optionCount,
      questionLength,
      explanationLength,
      answerValid,
      difficultySet,
      tagsSet
    };
  }

  /**
   * 生成改进建议
   */
  private static generateSuggestions(questions: ImportQuestionData[], issues: QualityIssue[]): string[] {
    const suggestions: string[] = [];
    const issueTypes = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (issueTypes.completeness > 0) {
      suggestions.push('建议补充缺失的题目信息，如选项、答案或解析');
    }

    if (issueTypes.accuracy > 0) {
      suggestions.push('请检查答案的正确性和选项的有效性');
    }

    if (issueTypes.consistency > 0) {
      suggestions.push('建议统一题目格式，保持选项数量和解析风格的一致性');
    }

    if (issueTypes.clarity > 0) {
      suggestions.push('建议优化题目描述的长度和清晰度');
    }

    // 基于题目数量的建议
    if (questions.length < 5) {
      suggestions.push('题目数量较少，建议增加更多题目以提高练习效果');
    }

    // 基于难度分布的建议
    const difficulties = questions.map(q => q.difficulty).filter(Boolean);
    const uniqueDifficulties = new Set(difficulties);
    if (uniqueDifficulties.size === 1) {
      suggestions.push('建议增加不同难度的题目，提供更好的学习梯度');
    }

    return suggestions;
  }

  /**
   * 计算等级
   */
  private static calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取质量报告
   */
  static generateQualityReport(questions: ImportQuestionData[]): string {
    const score = this.evaluateQuestions(questions);
    
    let report = `题目质量评估报告\n`;
    report += `==================\n\n`;
    report += `总体评分: ${score.overall.toFixed(1)}/100 (${score.grade}级)\n\n`;
    
    report += `详细评分:\n`;
    report += `- 完整性: ${score.breakdown.completeness.toFixed(1)}/100\n`;
    report += `- 准确性: ${score.breakdown.accuracy.toFixed(1)}/100\n`;
    report += `- 一致性: ${score.breakdown.consistency.toFixed(1)}/100\n`;
    report += `- 清晰度: ${score.breakdown.clarity.toFixed(1)}/100\n\n`;
    
    if (score.issues.length > 0) {
      report += `发现的问题 (${score.issues.length}个):\n`;
      score.issues.forEach((issue, index) => {
        report += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}\n`;
      });
      report += `\n`;
    }
    
    if (score.suggestions.length > 0) {
      report += `改进建议:\n`;
      score.suggestions.forEach((suggestion, index) => {
        report += `${index + 1}. ${suggestion}\n`;
      });
    }
    
    return report;
  }
}

export default QualityScorer;
