/**
 * 题目数据转换工具
 * 用于在不同数据格式之间进行转换
 */

import { Question, ImportQuestionData, QuestionType } from '../types';
import { generateId } from './helpers';

/**
 * 将ImportQuestionData转换为Question
 */
export function convertImportDataToQuestion(
  importData: ImportQuestionData,
  chapterId: string
): Question {
  return {
    id: generateId(),
    title: importData.title,
    options: importData.options,
    correctAnswer: convertAnswerToIndex(importData.correctAnswer, importData.options),
    explanation: importData.explanation,
    difficulty: importData.difficulty || 'medium',
    type: importData.type || 'single_choice',
    tags: importData.tags || [],
    chapterId,
    status: 'new',
    wrongCount: 0,
    isMastered: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * 批量转换ImportQuestionData数组为Question数组
 */
export function convertImportDataArrayToQuestions(
  importDataArray: ImportQuestionData[],
  chapterId: string
): Question[] {
  return importDataArray.map(data => convertImportDataToQuestion(data, chapterId));
}

/**
 * 将答案字符串转换为索引
 */
function convertAnswerToIndex(answer: string | number, options: string[]): number {
  if (typeof answer === 'number') {
    return answer;
  }

  // 如果答案是字母形式 (A, B, C, D)
  if (typeof answer === 'string') {
    const upperAnswer = answer.toUpperCase().trim();
    
    // 尝试匹配字母
    const letterMatch = upperAnswer.match(/^([A-Z])/);
    if (letterMatch) {
      const letterIndex = letterMatch[1].charCodeAt(0) - 'A'.charCodeAt(0);
      if (letterIndex >= 0 && letterIndex < options.length) {
        return letterIndex;
      }
    }

    // 尝试匹配数字
    const numberMatch = upperAnswer.match(/^(\d+)/);
    if (numberMatch) {
      const numberIndex = parseInt(numberMatch[1]) - 1; // 转换为0-based索引
      if (numberIndex >= 0 && numberIndex < options.length) {
        return numberIndex;
      }
    }

    // 尝试直接匹配选项内容
    for (let i = 0; i < options.length; i++) {
      if (options[i].toLowerCase().includes(answer.toLowerCase())) {
        return i;
      }
    }
  }

  // 默认返回第一个选项
  return 0;
}

/**
 * 将Question转换为ImportQuestionData（用于编辑等场景）
 */
export function convertQuestionToImportData(question: Question): ImportQuestionData {
  return {
    title: question.title,
    options: question.options,
    correctAnswer: convertIndexToAnswer(question.correctAnswer),
    explanation: question.explanation,
    difficulty: question.difficulty,
    type: question.type,
    tags: question.tags
  };
}

/**
 * 将索引转换为答案字符串
 */
function convertIndexToAnswer(index: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

/**
 * 验证Question数据的完整性
 */
export function validateQuestion(question: Question): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!question.id) {
    errors.push('题目ID不能为空');
  }

  if (!question.title || question.title.trim().length === 0) {
    errors.push('题目内容不能为空');
  }

  if (!question.options || question.options.length === 0) {
    errors.push('选项不能为空');
  }

  if (question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
    errors.push('正确答案索引超出范围');
  }

  if (!question.chapterId) {
    errors.push('章节ID不能为空');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 批量验证Question数组
 */
export function validateQuestions(questions: Question[]): {
  isValid: boolean;
  validQuestions: Question[];
  invalidQuestions: Array<{ question: Question; errors: string[] }>;
} {
  const validQuestions: Question[] = [];
  const invalidQuestions: Array<{ question: Question; errors: string[] }> = [];

  questions.forEach(question => {
    const validation = validateQuestion(question);
    if (validation.isValid) {
      validQuestions.push(question);
    } else {
      invalidQuestions.push({
        question,
        errors: validation.errors
      });
    }
  });

  return {
    isValid: invalidQuestions.length === 0,
    validQuestions,
    invalidQuestions
  };
}
