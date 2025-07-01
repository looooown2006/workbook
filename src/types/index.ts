// 题目难度等级
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// 题目状态
export type QuestionStatus = 'new' | 'correct' | 'wrong' | 'mastered';

// 刷题模式
export type StudyMode = 'quick' | 'study' | 'practice' | 'test' | 'wrong-review';

// 题目类型
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';

// 题目接口
export interface Question {
  id: string;
  title: string;
  options: string[];
  correctAnswer: number; // 正确答案的索引 (0-based)
  explanation?: string;
  difficulty?: DifficultyLevel;
  type?: QuestionType;
  tags?: string[];
  chapterId: string; // 所属章节ID
  status: QuestionStatus;
  wrongCount: number; // 错误次数
  lastAnswered?: Date;
  isMastered: boolean; // 是否已"斩题"
  createdAt: Date;
  updatedAt: Date;
}

// 章节接口
export interface Chapter {
  id: string;
  name: string;
  description?: string;
  questionIds: string[]; // 题目ID列表
  bankId: string; // 所属题库ID
  order: number; // 章节顺序
  createdAt: Date;
  updatedAt: Date;
}

// 题库接口
export interface QuestionBank {
  id: string;
  name: string;
  description?: string;
  chapterIds: string[]; // 章节ID列表
  totalQuestions: number;
  createdAt: Date;
  updatedAt: Date;
}

// 答题记录接口
export interface AnswerRecord {
  id: string;
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  mode: StudyMode;
  timestamp: Date;
  timeSpent: number; // 答题用时(秒)
  bankId: string;
  chapterId: string;
}

// 测试会话接口
export interface TestSession {
  id: string;
  bankId: string;
  chapterId: string;
  questionIds: string[];
  currentQuestionIndex: number;
  answers: Map<string, number>; // questionId -> selectedAnswer
  startTime: Date;
  endTime?: Date;
  isCompleted: boolean;
}

// 统计数据接口
export interface Statistics {
  bankId: string;
  chapterId?: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  masteredCount: number;
  accuracy: number; // 正确率
  averageTime: number; // 平均答题时间
  lastStudyDate?: Date;
}

// 导入题目的原始数据格式
export interface ImportQuestionData {
  title: string; // 题目内容 - 保持与Question接口一致
  options: string[];
  correctAnswer: number | string; // 可能是数字或字母(A,B,C,D)
  explanation?: string;
  difficulty?: DifficultyLevel;
  type?: QuestionType;
  tags?: string[];
}

// 导入结果
export interface ImportResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failedCount: number;
  errors: string[];
  questions: Question[];
}

// 应用状态接口
export interface AppState {
  currentBank?: QuestionBank;
  currentChapter?: Chapter;
  currentQuestion?: Question;
  studyMode: StudyMode;
  isLoading: boolean;
  error?: string;
}

// 数据库存储的键名常量
export const DB_KEYS = {
  QUESTION_BANKS: 'questionBanks',
  CHAPTERS: 'chapters',
  QUESTIONS: 'questions',
  ANSWER_RECORDS: 'answerRecords',
  STATISTICS: 'statistics',
  APP_SETTINGS: 'appSettings',
  WRONG_QUESTIONS: 'wrongQuestions',
  WRONG_QUESTION_SESSIONS: 'wrongQuestionSessions',
  STUDY_PLANS: 'studyPlans'
} as const;

// 应用设置接口
export interface AppSettings {
  theme: 'light' | 'dark';
  autoSave: boolean;
  showExplanation: boolean;
  enableSound: boolean;
  defaultStudyMode: StudyMode;
}

// 错题本相关类型
export interface WrongQuestion {
  id: string;
  questionId: string; // 关联原题目
  userId?: string; // 用户ID（为将来多用户支持）
  wrongCount: number; // 错误次数
  firstWrongTime: Date; // 首次答错时间
  lastWrongTime: Date; // 最近答错时间
  wrongAnswers: number[]; // 历次错误答案
  correctAnswers: number[]; // 历次正确答案（复习时）
  tags: string[]; // 错题标签
  difficulty?: 'easy' | 'medium' | 'hard'; // 主观难度
  errorType?: string; // 错误类型（知识点不熟、粗心、理解错误等）
  notes?: string; // 个人笔记
  isMastered: boolean; // 是否已掌握
  masteredTime?: Date; // 掌握时间
  reviewCount: number; // 复习次数
  lastReviewTime?: Date; // 最后复习时间
  status: 'active' | 'mastered' | 'ignored'; // 状态
  bankId: string; // 所属题库
  chapterId: string; // 所属章节
}

export interface WrongQuestionSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  questionIds: string[]; // 本次复习的错题ID
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    timeSpent: number;
    answer: number;
  }>;
  mode: 'review' | 'test' | 'practice'; // 复习模式
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
}

export interface WrongQuestionStats {
  totalWrongQuestions: number;
  masteredCount: number;
  activeCount: number;
  ignoredCount: number;
  averageWrongCount: number;
  recentWrongQuestions: WrongQuestion[];
  topErrorTypes: Array<{
    type: string;
    count: number;
  }>;
  improvementTrend: Array<{
    date: string;
    wrongCount: number;
    masteredCount: number;
  }>;
}

// 学习计划相关类型
export interface StudyPlan {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  targetQuestions: number; // 目标题目数
  dailyTarget: number; // 每日目标
  bankIds: string[]; // 关联题库
  chapterIds: string[]; // 关联章节
  modes: StudyMode[]; // 学习模式
  progress: {
    completedQuestions: number;
    accuracy: number;
    daysCompleted: number;
  };
  reminders: {
    enabled: boolean;
    time: string; // HH:mm格式
    days: number[]; // 0-6，周日到周六
  };
  isActive: boolean;
  createdTime: Date;
  updatedTime: Date;
}
