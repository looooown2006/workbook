import { Question, QuestionStatus, ImportQuestionData, ImportResult } from '../types';

// 生成唯一ID
export const generateId = (): string => {
  return crypto.randomUUID();
};

// 格式化日期
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化时间间隔（秒转为可读格式）
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`;
  }
};

// 计算正确率
export const calculateAccuracy = (correct: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
};

// 根据错误次数获取颜色深度
export const getErrorColor = (wrongCount: number): string => {
  if (wrongCount === 0) return '#52c41a'; // 绿色
  if (wrongCount === 1) return '#ff7875'; // 浅红色
  if (wrongCount === 2) return '#ff4d4f'; // 中红色
  if (wrongCount >= 3) return '#cf1322'; // 深红色
  return '#d9d9d9'; // 默认灰色
};

// 根据题目状态获取颜色
export const getStatusColor = (status: QuestionStatus, isMastered: boolean, wrongCount: number): string => {
  if (isMastered) return '#52c41a'; // 斩题显示绿色
  
  switch (status) {
    case 'correct':
      return '#52c41a'; // 绿色
    case 'wrong':
      return getErrorColor(wrongCount);
    case 'new':
      return '#d9d9d9'; // 灰色
    default:
      return '#d9d9d9';
  }
};

// 验证题目数据格式
export const validateQuestionData = (data: ImportQuestionData): { isValid: boolean; error?: string } => {
  if (!data.title || data.title.trim() === '') {
    return { isValid: false, error: '题目标题不能为空' };
  }

  if (!data.options || data.options.length < 2) {
    return { isValid: false, error: '选项至少需要2个' };
  }

  if (data.options.some(option => !option || option.trim() === '')) {
    return { isValid: false, error: '选项内容不能为空' };
  }

  // 验证正确答案
  let correctAnswerIndex: number;
  if (typeof data.correctAnswer === 'number') {
    correctAnswerIndex = data.correctAnswer;
  } else if (typeof data.correctAnswer === 'string') {
    // 处理字母答案 (A, B, C, D)
    const letter = data.correctAnswer.toUpperCase();
    correctAnswerIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
  } else {
    return { isValid: false, error: '正确答案格式错误' };
  }

  if (correctAnswerIndex < 0 || correctAnswerIndex >= data.options.length) {
    return { isValid: false, error: '正确答案索引超出选项范围' };
  }

  return { isValid: true };
};

// 转换导入数据为题目格式
export const convertImportDataToQuestion = (
  data: ImportQuestionData, 
  chapterId: string
): Omit<Question, 'id' | 'createdAt' | 'updatedAt'> => {
  let correctAnswerIndex: number;
  if (typeof data.correctAnswer === 'number') {
    correctAnswerIndex = data.correctAnswer;
  } else {
    const letter = data.correctAnswer.toString().toUpperCase();
    correctAnswerIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
  }

  return {
    title: data.title.trim(),
    options: data.options.map(opt => opt.trim()),
    correctAnswer: correctAnswerIndex,
    explanation: data.explanation?.trim(),
    difficulty: data.difficulty as any,
    tags: data.tags || [],
    status: 'new',
    wrongCount: 0,
    isMastered: false
  };
};

// 批量处理导入数据
export const processImportData = (
  dataList: ImportQuestionData[], 
  chapterId: string
): ImportResult => {
  const result: ImportResult = {
    success: false,
    totalCount: dataList.length,
    successCount: 0,
    failedCount: 0,
    errors: [],
    questions: []
  };

  dataList.forEach((data, index) => {
    const validation = validateQuestionData(data);
    if (validation.isValid) {
      try {
        const question = convertImportDataToQuestion(data, chapterId);
        result.questions.push(question as Question);
        result.successCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push(`第${index + 1}题转换失败: ${error}`);
      }
    } else {
      result.failedCount++;
      result.errors.push(`第${index + 1}题验证失败: ${validation.error}`);
    }
  });

  result.success = result.successCount > 0;
  return result;
};

// 打乱数组顺序
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 过滤已掌握的题目
export const filterNonMasteredQuestions = (questions: Question[]): Question[] => {
  return questions.filter(q => !q.isMastered);
};

// 按状态分组题目
export const groupQuestionsByStatus = (questions: Question[]) => {
  return questions.reduce((groups, question) => {
    const status = question.isMastered ? 'mastered' : question.status;
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(question);
    return groups;
  }, {} as Record<string, Question[]>);
};

// 计算学习统计
export const calculateStudyStats = (questions: Question[]) => {
  const total = questions.length;
  const correct = questions.filter(q => q.status === 'correct' || q.isMastered).length;
  const wrong = questions.filter(q => q.status === 'wrong').length;
  const mastered = questions.filter(q => q.isMastered).length;
  const newQuestions = questions.filter(q => q.status === 'new').length;

  return {
    total,
    correct,
    wrong,
    mastered,
    new: newQuestions,
    accuracy: calculateAccuracy(correct, total - newQuestions)
  };
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 深拷贝
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

// 本地存储工具
export const storage = {
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  get: <T>(key: string, defaultValue?: T): T | undefined => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }
};
