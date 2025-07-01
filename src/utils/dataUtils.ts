/**
 * 数据处理工具函数
 * 统一处理各种数据查找、过滤和转换操作
 */

import { Question, QuestionBank, Chapter, WrongQuestion } from '../types';

/**
 * 根据ID查找题库
 */
export function findBankById(banks: QuestionBank[], bankId: string): QuestionBank | undefined {
  return banks.find(bank => bank.id === bankId);
}

/**
 * 根据ID查找章节
 */
export function findChapterById(chapters: Chapter[], chapterId: string): Chapter | undefined {
  return chapters.find(chapter => chapter.id === chapterId);
}

/**
 * 根据ID查找题目
 */
export function findQuestionById(questions: Question[], questionId: string): Question | undefined {
  return questions.find(question => question.id === questionId);
}

/**
 * 获取题库名称
 */
export function getBankName(banks: QuestionBank[], bankId: string): string {
  const bank = findBankById(banks, bankId);
  return bank?.name || '未知题库';
}

/**
 * 获取章节名称
 */
export function getChapterName(chapters: Chapter[], chapterId: string): string {
  const chapter = findChapterById(chapters, chapterId);
  return chapter?.name || '未知章节';
}

/**
 * 获取题目标题
 */
export function getQuestionTitle(questions: Question[], questionId: string): string {
  const question = findQuestionById(questions, questionId);
  return question?.title || '题目已删除';
}

/**
 * 过滤章节中的题目
 */
export function filterQuestionsByChapter(questions: Question[], chapterId: string): Question[] {
  return questions.filter(question => question.chapterId === chapterId);
}

/**
 * 过滤已掌握的题目
 */
export function filterMasteredQuestions(questions: Question[], includeMastered: boolean = true): Question[] {
  return includeMastered ? questions : questions.filter(q => !q.isMastered);
}

/**
 * 过滤错题
 */
export function filterWrongQuestions(
  wrongQuestions: WrongQuestion[],
  filters: {
    status?: string;
    bankId?: string;
    chapterId?: string;
    searchText?: string;
  },
  questions: Question[]
): WrongQuestion[] {
  let filtered = wrongQuestions;

  // 按状态过滤
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(wq => wq.status === filters.status);
  }

  // 按题库过滤
  if (filters.bankId && filters.bankId !== 'all') {
    filtered = filtered.filter(wq => wq.bankId === filters.bankId);
  }

  // 按章节过滤
  if (filters.chapterId && filters.chapterId !== 'all') {
    filtered = filtered.filter(wq => wq.chapterId === filters.chapterId);
  }

  // 按搜索文本过滤
  if (filters.searchText && filters.searchText.trim()) {
    const searchLower = filters.searchText.toLowerCase();
    filtered = filtered.filter(wq => {
      const question = findQuestionById(questions, wq.questionId);
      return question?.title.toLowerCase().includes(searchLower) ||
             question?.options.some(opt => opt.toLowerCase().includes(searchLower));
    });
  }

  return filtered;
}

/**
 * 计算学习进度
 */
export function calculateProgress(current: number, total: number): number {
  return total > 0 ? Math.round((current / total) * 100) : 0;
}

/**
 * 计算正确率
 */
export function calculateAccuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/**
 * 生成题目统计信息
 */
export function generateQuestionStats(questions: Question[]) {
  const total = questions.length;
  const mastered = questions.filter(q => q.isMastered).length;
  const unmastered = total - mastered;
  
  return {
    total,
    mastered,
    unmastered,
    masteredRate: calculateAccuracy(mastered, total)
  };
}

/**
 * 生成错题统计信息
 */
export function generateWrongQuestionStats(wrongQuestions: WrongQuestion[]) {
  const total = wrongQuestions.length;
  const active = wrongQuestions.filter(wq => wq.status === 'active').length;
  const mastered = wrongQuestions.filter(wq => wq.status === 'mastered').length;
  const ignored = wrongQuestions.filter(wq => wq.status === 'ignored').length;

  return {
    total,
    active,
    mastered,
    ignored,
    masteredRate: calculateAccuracy(mastered, total)
  };
}

/**
 * 按题型分组题目
 */
export function groupQuestionsByType(questions: Question[]): Record<string, Question[]> {
  return questions.reduce((groups, question) => {
    const type = question.type || 'unknown';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(question);
    return groups;
  }, {} as Record<string, Question[]>);
}

/**
 * 按难度分组题目
 */
export function groupQuestionsByDifficulty(questions: Question[]): Record<string, Question[]> {
  return questions.reduce((groups, question) => {
    const difficulty = question.difficulty || 'medium';
    if (!groups[difficulty]) {
      groups[difficulty] = [];
    }
    groups[difficulty].push(question);
    return groups;
  }, {} as Record<string, Question[]>);
}

/**
 * 排序题目
 */
export function sortQuestions(questions: Question[], sortBy: 'title' | 'difficulty' | 'type' | 'createdAt' = 'title'): Question[] {
  return [...questions].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'difficulty': {
        const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
        return (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 2) -
               (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 2);
      }
      case 'type':
        return (a.type || '').localeCompare(b.type || '');
      case 'createdAt':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      default:
        return 0;
    }
  });
}

/**
 * 随机打乱数组
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 分页数据
 */
export function paginateData<T>(data: T[], page: number, pageSize: number): {
  items: T[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const items = data.slice(startIndex, endIndex);

  return {
    items,
    total,
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}
