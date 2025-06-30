import { create } from 'zustand';
import {
  Question,
  QuestionBank,
  Chapter,
  StudyMode,
  AppState,
  TestSession,
  AnswerRecord,
  DB_KEYS,
  WrongQuestion,
  WrongQuestionStats,
  WrongQuestionSession,
  StudyPlan
} from '../types';
import { dbManager } from '../utils/database';
import { WrongQuestionManager } from '../utils/wrongQuestionManager';

interface AppStore extends AppState {
  // 数据
  questionBanks: QuestionBank[];
  chapters: Chapter[];
  questions: Question[];
  answerRecords: AnswerRecord[];
  currentTestSession?: TestSession;

  // 错题本数据
  wrongQuestions: WrongQuestion[];
  wrongQuestionStats?: WrongQuestionStats;
  currentWrongQuestionSession?: WrongQuestionSession;

  // 学习计划数据
  studyPlans: StudyPlan[];

  // Actions - 题库管理
  loadQuestionBanks: () => Promise<void>;
  addQuestionBank: (bank: Omit<QuestionBank, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateQuestionBank: (bank: QuestionBank) => Promise<void>;
  deleteQuestionBank: (bankId: string) => Promise<void>;
  setCurrentBank: (bank: QuestionBank | undefined) => void;

  // Actions - 章节管理
  loadChapters: (bankId: string) => Promise<void>;
  addChapter: (chapter: Omit<Chapter, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateChapter: (chapter: Chapter) => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
  setCurrentChapter: (chapter: Chapter | undefined) => void;

  // Actions - 题目管理
  loadQuestions: (chapterId: string) => Promise<void>;
  addQuestion: (question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addQuestions: (questions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  updateQuestion: (question: Question) => Promise<void>;
  deleteQuestion: (questionId: string) => Promise<void>;
  setCurrentQuestion: (question: Question | undefined) => void;
  
  // Actions - 答题相关
  submitAnswer: (questionId: string, selectedAnswer: number, timeSpent: number) => Promise<void>;
  markQuestionAsMastered: (questionId: string) => Promise<void>;
  unmarkQuestionAsMastered: (questionId: string) => Promise<void>;

  // Actions - 测试会话
  startTestSession: (bankId: string, chapterId: string, questionIds: string[]) => void;
  updateTestSession: (answers: Map<string, number>) => void;
  completeTestSession: () => Promise<void>;

  // Actions - 错题本管理
  loadWrongQuestions: () => Promise<void>;
  addWrongQuestion: (questionId: string, bankId: string, chapterId: string, wrongAnswer: number, errorType?: string) => Promise<void>;
  markWrongQuestionAsMastered: (wrongQuestionId: string) => Promise<void>;
  unmarkWrongQuestionAsMastered: (wrongQuestionId: string) => Promise<void>;
  ignoreWrongQuestion: (wrongQuestionId: string) => Promise<void>;
  addWrongQuestionNote: (wrongQuestionId: string, notes: string) => Promise<void>;
  addWrongQuestionTags: (wrongQuestionId: string, tags: string[]) => Promise<void>;

  // Actions - 学习计划管理
  loadStudyPlans: () => Promise<void>;
  addStudyPlan: (plan: Omit<StudyPlan, 'id' | 'createdTime' | 'updatedTime'>) => Promise<void>;
  updateStudyPlan: (plan: StudyPlan) => Promise<void>;
  deleteStudyPlan: (planId: string) => Promise<void>;
  deleteWrongQuestion: (wrongQuestionId: string) => Promise<void>;
  getWrongQuestionStats: () => Promise<void>;
  startWrongQuestionSession: (questionIds: string[], mode: 'review' | 'test' | 'practice') => void;
  updateWrongQuestionSession: (results: Array<{ questionId: string; isCorrect: boolean; timeSpent: number; answer: number }>) => void;
  completeWrongQuestionSession: () => Promise<void>;

  // Actions - 应用状态
  setStudyMode: (mode: StudyMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
  clearError: () => void;

  // Actions - 用户统计（临时添加，避免编译错误）
  userStats?: any;
  getQuestions: () => Question[];
  getUserStats: () => any;

  // Actions - 初始化
  initializeApp: () => Promise<void>;

  // Actions - 答题记录
  loadAnswerRecords: () => Promise<void>;

}

export const useAppStore = create<AppStore>((set, get) => ({
  // 初始状态
  questionBanks: [],
  chapters: [],
  questions: [],
  answerRecords: [],
  currentBank: undefined,
  currentChapter: undefined,
  currentQuestion: undefined,
  currentTestSession: undefined,
  studyMode: 'quick',
  isLoading: false,
  error: undefined,

  // 错题本初始状态
  wrongQuestions: [],
  wrongQuestionStats: undefined,
  currentWrongQuestionSession: undefined,

  // 学习计划初始状态
  studyPlans: [],


  // 题库管理
  loadQuestionBanks: async () => {
    try {
      console.log('开始加载题库...');
      const banks = await dbManager.getAll<QuestionBank>(DB_KEYS.QUESTION_BANKS);
      console.log('题库数据:', banks);
      set({ questionBanks: banks });
      console.log('题库设置完成');
    } catch (error) {
      console.error('加载题库失败:', error);
      set({ error: '加载题库失败' });
      throw error;
    }
  },

  addQuestionBank: async (bankData) => {
    try {
      const bank: QuestionBank = {
        ...bankData,
        id: crypto.randomUUID(),
        chapterIds: [],
        totalQuestions: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await dbManager.add(DB_KEYS.QUESTION_BANKS, bank);
      set(state => ({ 
        questionBanks: [...state.questionBanks, bank] 
      }));
    } catch (error) {
      set({ error: '添加题库失败' });
    }
  },

  updateQuestionBank: async (bank) => {
    try {
      const updatedBank = { ...bank, updatedAt: new Date() };
      await dbManager.update(DB_KEYS.QUESTION_BANKS, updatedBank);
      
      set(state => ({
        questionBanks: state.questionBanks.map(b => 
          b.id === bank.id ? updatedBank : b
        ),
        currentBank: state.currentBank?.id === bank.id ? updatedBank : state.currentBank
      }));
    } catch (error) {
      set({ error: '更新题库失败' });
    }
  },

  deleteQuestionBank: async (bankId) => {
    try {
      await dbManager.delete(DB_KEYS.QUESTION_BANKS, bankId);
      set(state => ({
        questionBanks: state.questionBanks.filter(b => b.id !== bankId),
        currentBank: state.currentBank?.id === bankId ? undefined : state.currentBank
      }));
    } catch (error) {
      set({ error: '删除题库失败' });
    }
  },

  setCurrentBank: (bank) => {
    set({ currentBank: bank, currentChapter: undefined, currentQuestion: undefined });
  },

  // 章节管理
  loadChapters: async (bankId) => {
    try {
      set({ error: undefined });
      const chapters = await dbManager.getByIndex<Chapter>(DB_KEYS.CHAPTERS, 'bankId', bankId);
      set({ chapters: chapters.sort((a, b) => a.order - b.order) });
    } catch (error) {
      set({ error: '加载章节失败' });
      throw error;
    }
  },

  addChapter: async (chapterData) => {
    try {
      const chapter: Chapter = {
        ...chapterData,
        id: crypto.randomUUID(),
        questionIds: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await dbManager.add(DB_KEYS.CHAPTERS, chapter);
      
      // 更新题库的章节列表
      const { currentBank } = get();
      if (currentBank && currentBank.id === chapter.bankId) {
        const updatedBank = {
          ...currentBank,
          chapterIds: [...currentBank.chapterIds, chapter.id],
          updatedAt: new Date()
        };
        await dbManager.update(DB_KEYS.QUESTION_BANKS, updatedBank);
        
        set(state => ({
          chapters: [...state.chapters, chapter],
          currentBank: updatedBank,
          questionBanks: state.questionBanks.map(b => 
            b.id === updatedBank.id ? updatedBank : b
          )
        }));
      }
    } catch (error) {
      set({ error: '添加章节失败' });
    }
  },

  updateChapter: async (chapter) => {
    try {
      const updatedChapter = { ...chapter, updatedAt: new Date() };
      await dbManager.update(DB_KEYS.CHAPTERS, updatedChapter);
      
      set(state => ({
        chapters: state.chapters.map(c => 
          c.id === chapter.id ? updatedChapter : c
        ),
        currentChapter: state.currentChapter?.id === chapter.id ? updatedChapter : state.currentChapter
      }));
    } catch (error) {
      set({ error: '更新章节失败' });
    }
  },

  deleteChapter: async (chapterId) => {
    try {
      await dbManager.delete(DB_KEYS.CHAPTERS, chapterId);
      set(state => ({
        chapters: state.chapters.filter(c => c.id !== chapterId),
        currentChapter: state.currentChapter?.id === chapterId ? undefined : state.currentChapter
      }));
    } catch (error) {
      set({ error: '删除章节失败' });
    }
  },

  setCurrentChapter: (chapter) => {
    set({ currentChapter: chapter, currentQuestion: undefined });
  },

  // 题目管理
  loadQuestions: async (chapterId) => {
    try {
      // 不设置全局 isLoading，避免影响整个应用
      set({ error: undefined });
      const chapter = await dbManager.get<Chapter>(DB_KEYS.CHAPTERS, chapterId);
      if (chapter) {
        const questions: Question[] = [];
        for (const questionId of chapter.questionIds) {
          const question = await dbManager.get<Question>(DB_KEYS.QUESTIONS, questionId);
          if (question) {
            questions.push(question);
          }
        }
        set({ questions });
      } else {
        // 章节不存在时，设置空题目列表
        set({ questions: [] });
      }
    } catch (error) {
      set({ error: '加载题目失败' });
      throw error;
    }
  },

  addQuestion: async (questionData) => {
    try {
      const { currentChapter, currentBank } = get();
      if (!currentChapter) {
        throw new Error('没有选择章节');
      }

      const question: Question = {
        ...questionData,
        id: crypto.randomUUID(),
        status: 'new',
        wrongCount: 0,
        isMastered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 添加题目到数据库
      await dbManager.add(DB_KEYS.QUESTIONS, question);

      // 更新章节的题目ID列表
      const updatedChapter = {
        ...currentChapter,
        questionIds: [...currentChapter.questionIds, question.id],
        updatedAt: new Date()
      };
      await dbManager.update(DB_KEYS.CHAPTERS, updatedChapter);

      // 更新题库的题目总数
      if (currentBank) {
        const updatedBank = {
          ...currentBank,
          totalQuestions: currentBank.totalQuestions + 1,
          updatedAt: new Date()
        };
        await dbManager.update(DB_KEYS.QUESTION_BANKS, updatedBank);

        set(state => ({
          questions: [...state.questions, question],
          currentChapter: updatedChapter,
          currentBank: updatedBank,
          chapters: state.chapters.map(c =>
            c.id === updatedChapter.id ? updatedChapter : c
          ),
          questionBanks: state.questionBanks.map(b =>
            b.id === updatedBank.id ? updatedBank : b
          )
        }));
      } else {
        set(state => ({
          questions: [...state.questions, question],
          currentChapter: updatedChapter,
          chapters: state.chapters.map(c =>
            c.id === updatedChapter.id ? updatedChapter : c
          )
        }));
      }
    } catch (error) {
      console.error('添加题目失败:', error);
      set({ error: '添加题目失败' });
      throw error;
    }
  },

  addQuestions: async (questionsData) => {
    try {
      const { currentChapter, currentBank } = get();
      if (!currentChapter) {
        throw new Error('没有选择章节');
      }

      const questions: Question[] = questionsData.map(data => ({
        ...data,
        id: crypto.randomUUID(),
        status: 'new' as const,
        wrongCount: 0,
        isMastered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // 批量添加题目到数据库
      await dbManager.addBatch(DB_KEYS.QUESTIONS, questions);

      // 更新章节的题目ID列表
      const updatedChapter = {
        ...currentChapter,
        questionIds: [...currentChapter.questionIds, ...questions.map(q => q.id)],
        updatedAt: new Date()
      };
      await dbManager.update(DB_KEYS.CHAPTERS, updatedChapter);

      // 更新题库的题目总数
      if (currentBank) {
        const updatedBank = {
          ...currentBank,
          totalQuestions: currentBank.totalQuestions + questions.length,
          updatedAt: new Date()
        };
        await dbManager.update(DB_KEYS.QUESTION_BANKS, updatedBank);

        set(state => ({
          questions: [...state.questions, ...questions],
          currentChapter: updatedChapter,
          currentBank: updatedBank,
          chapters: state.chapters.map(c =>
            c.id === updatedChapter.id ? updatedChapter : c
          ),
          questionBanks: state.questionBanks.map(b =>
            b.id === updatedBank.id ? updatedBank : b
          )
        }));
      } else {
        set(state => ({
          questions: [...state.questions, ...questions],
          currentChapter: updatedChapter,
          chapters: state.chapters.map(c =>
            c.id === updatedChapter.id ? updatedChapter : c
          )
        }));
      }
    } catch (error) {
      console.error('批量添加题目失败:', error);
      set({ error: '批量添加题目失败' });
      throw error;
    }
  },

  updateQuestion: async (question) => {
    try {
      const updatedQuestion = { ...question, updatedAt: new Date() };
      await dbManager.update(DB_KEYS.QUESTIONS, updatedQuestion);
      
      set(state => ({
        questions: state.questions.map(q => 
          q.id === question.id ? updatedQuestion : q
        ),
        currentQuestion: state.currentQuestion?.id === question.id ? updatedQuestion : state.currentQuestion
      }));
    } catch (error) {
      set({ error: '更新题目失败' });
    }
  },

  deleteQuestion: async (questionId) => {
    try {
      await dbManager.delete(DB_KEYS.QUESTIONS, questionId);
      set(state => ({
        questions: state.questions.filter(q => q.id !== questionId),
        currentQuestion: state.currentQuestion?.id === questionId ? undefined : state.currentQuestion
      }));
    } catch (error) {
      set({ error: '删除题目失败' });
    }
  },

  setCurrentQuestion: (question) => {
    set({ currentQuestion: question });
  },

  // 答题相关
  submitAnswer: async (questionId, selectedAnswer, timeSpent) => {
    console.log('submitAnswer 被调用', questionId, selectedAnswer, timeSpent);
    try {
      const { currentQuestion, studyMode, currentBank, currentChapter } = get();
      if (!currentQuestion || !currentBank || !currentChapter) 
        return;

      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      
      // 创建答题记录
      const record: AnswerRecord = {
        id: crypto.randomUUID(),
        questionId,
        selectedAnswer,
        isCorrect,
        mode: studyMode,
        timestamp: new Date(),
        timeSpent,
        bankId: currentBank.id,
        chapterId: currentChapter.id
      };
      
      await dbManager.add(DB_KEYS.ANSWER_RECORDS, record);
      console.log('已写入答题记录', record);
      
      // 更新题目状态
      const updatedQuestion: Question = {
        ...currentQuestion,
        status: isCorrect ? 'correct' : 'wrong',
        wrongCount: isCorrect ? currentQuestion.wrongCount : currentQuestion.wrongCount + 1,
        lastAnswered: new Date(),
        updatedAt: new Date()
      };
      
      await dbManager.update(DB_KEYS.QUESTIONS, updatedQuestion);
      
      set(state => ({
        questions: state.questions.map(q => 
          q.id === questionId ? updatedQuestion : q
        ),
        currentQuestion: updatedQuestion,
        answerRecords: [...state.answerRecords, record]
      }));
    } catch (error) {
      set({ error: '提交答案失败' });
    }
  },

  markQuestionAsMastered: async (questionId) => {
    try {
      const question = await dbManager.get<Question>(DB_KEYS.QUESTIONS, questionId);
      if (question) {
        const updatedQuestion = { 
          ...question, 
          isMastered: true, 
          status: 'correct' as const,
          updatedAt: new Date() 
        };
        await dbManager.update(DB_KEYS.QUESTIONS, updatedQuestion);
        
        set(state => ({
          questions: state.questions.map(q => 
            q.id === questionId ? updatedQuestion : q
          ),
          currentQuestion: state.currentQuestion?.id === questionId ? updatedQuestion : state.currentQuestion
        }));
      }
    } catch (error) {
      set({ error: '标记斩题失败' });
    }
  },

  unmarkQuestionAsMastered: async (questionId) => {
    try {
      const question = await dbManager.get<Question>(DB_KEYS.QUESTIONS, questionId);
      if (question) {
        const updatedQuestion = { 
          ...question, 
          isMastered: false,
          updatedAt: new Date() 
        };
        await dbManager.update(DB_KEYS.QUESTIONS, updatedQuestion);
        
        set(state => ({
          questions: state.questions.map(q => 
            q.id === questionId ? updatedQuestion : q
          ),
          currentQuestion: state.currentQuestion?.id === questionId ? updatedQuestion : state.currentQuestion
        }));
      }
    } catch (error) {
      set({ error: '取消斩题失败' });
    }
  },

  // 测试会话
  startTestSession: (bankId, chapterId, questionIds) => {
    const session: TestSession = {
      id: crypto.randomUUID(),
      bankId,
      chapterId,
      questionIds,
      currentQuestionIndex: 0,
      answers: new Map(),
      startTime: new Date(),
      isCompleted: false
    };
    set({ currentTestSession: session });
  },

  updateTestSession: (answers) => {
    set(state => ({
      currentTestSession: state.currentTestSession ? {
        ...state.currentTestSession,
        answers
      } : undefined
    }));
  },

  completeTestSession: async () => {
    const { currentTestSession } = get();
    if (currentTestSession) {
      const completedSession = {
        ...currentTestSession,
        endTime: new Date(),
        isCompleted: true
      };
      set({ currentTestSession: completedSession });
    }
  },

  // 应用状态
  setStudyMode: (mode) => {
    set({ studyMode: mode });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearError: () => {
    set({ error: undefined });
  },

  // 错题本管理
  loadWrongQuestions: async () => {
    try {
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      const wrongQuestions = await wrongQuestionManager.getAllWrongQuestions();
      set({ wrongQuestions });
    } catch (error) {
      console.error('Failed to load wrong questions:', error);
      set({ error: '加载错题失败' });
    }
  },

  addWrongQuestion: async (questionId, bankId, chapterId, wrongAnswer, errorType) => {
    try {
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      await wrongQuestionManager.addWrongQuestion(questionId, bankId, chapterId, wrongAnswer, errorType);
      await get().loadWrongQuestions();
    } catch (error) {
      console.error('Failed to add wrong question:', error);
      set({ error: '添加错题失败' });
    }
  },

  markWrongQuestionAsMastered: async (wrongQuestionId) => {
    try {
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      await wrongQuestionManager.markWrongQuestionAsMastered(wrongQuestionId);
      await get().loadWrongQuestions();
    } catch (error) {
      console.error('Failed to mark wrong question as mastered:', error);
      set({ error: '标记错题为已掌握失败' });
    }
  },

  unmarkWrongQuestionAsMastered: async (wrongQuestionId) => {
    try {
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      await wrongQuestionManager.unmarkWrongQuestionAsMastered(wrongQuestionId);
      await get().loadWrongQuestions();
    } catch (error) {
      console.error('Failed to unmark wrong question as mastered:', error);
      set({ error: '取消错题掌握标记失败' });
    }
  },

  ignoreWrongQuestion: async (wrongQuestionId) => {
    try {
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      await wrongQuestionManager.ignoreWrongQuestion(wrongQuestionId);
      await get().loadWrongQuestions();
    } catch (error) {
      console.error('Failed to ignore wrong question:', error);
      set({ error: '忽略错题失败' });
    }
  },

  addWrongQuestionNote: async (wrongQuestionId, notes) => {
    try {
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      await wrongQuestionManager.addWrongQuestionNote(wrongQuestionId, notes);
      await get().loadWrongQuestions();
    } catch (error) {
      console.error('Failed to add wrong question note:', error);
      set({ error: '添加错题笔记失败' });
    }
  },

  addWrongQuestionTags: async (wrongQuestionId, tags) => {
    try {
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      await wrongQuestionManager.addWrongQuestionTags(wrongQuestionId, tags);
      await get().loadWrongQuestions();
    } catch (error) {
      console.error('Failed to add wrong question tags:', error);
      set({ error: '添加错题标签失败' });
    }
  },

  deleteWrongQuestion: async (wrongQuestionId) => {
    try {
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      await wrongQuestionManager.deleteWrongQuestion(wrongQuestionId);
      await get().loadWrongQuestions();
    } catch (error) {
      console.error('Failed to delete wrong question:', error);
      set({ error: '删除错题失败' });
    }
  },

  getWrongQuestionStats: async () => {
    try {
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      const stats = await wrongQuestionManager.getWrongQuestionStats();
      set({ wrongQuestionStats: stats });
    } catch (error) {
      console.error('Failed to get wrong question stats:', error);
      set({ error: '获取错题统计失败' });
    }
  },

  startWrongQuestionSession: (questionIds, mode) => {
    const session: WrongQuestionSession = {
      id: Date.now().toString(),
      startTime: new Date(),
      questionIds,
      results: [],
      mode,
      totalQuestions: questionIds.length,
      correctCount: 0,
      accuracy: 0
    };
    set({ currentWrongQuestionSession: session });
  },

  updateWrongQuestionSession: (results) => {
    const session = get().currentWrongQuestionSession;
    if (session) {
      session.results = results;
      session.correctCount = results.filter(r => r.isCorrect).length;
      session.accuracy = session.totalQuestions > 0 ? (session.correctCount / session.totalQuestions) * 100 : 0;
      set({ currentWrongQuestionSession: session });
    }
  },

  completeWrongQuestionSession: async () => {
    const session = get().currentWrongQuestionSession;
    if (session) {
      session.endTime = new Date();

      // 记录复习结果
      const wrongQuestionManager = WrongQuestionManager.getInstance();
      for (const result of session.results) {
        if (result.isCorrect) {
          await wrongQuestionManager.recordCorrectAnswer(result.questionId, result.answer);
        }
      }

      // 清除当前会话
      set({ currentWrongQuestionSession: undefined });

      // 重新加载错题数据
      await get().loadWrongQuestions();
    }
  },

  // 初始化
  initializeApp: async () => {
    try {
      set({ isLoading: true });
      console.log('开始初始化应用...');

      // 简化初始化，只加载题库
      await get().loadQuestionBanks();
      console.log('题库加载完成');

      set({ isLoading: false });
      console.log('应用初始化完成');
    } catch (error) {
      console.error('应用初始化失败:', error);
      set({ error: '应用初始化失败', isLoading: false });
    }
  },

  // 学习计划管理
  loadStudyPlans: async () => {
    try {
      const plans = await dbManager.getAll<StudyPlan>(DB_KEYS.STUDY_PLANS);
      set({ studyPlans: plans });
    } catch (error) {
      console.error('加载学习计划失败:', error);
      set({ error: '加载学习计划失败' });
      throw error;
    }
  },

  addStudyPlan: async (planData) => {
    try {
      const plan: StudyPlan = {
        ...planData,
        id: crypto.randomUUID(),
        createdTime: new Date(),
        updatedTime: new Date()
      };

      await dbManager.add(DB_KEYS.STUDY_PLANS, plan);
      set(state => ({
        studyPlans: [...state.studyPlans, plan]
      }));
    } catch (error) {
      console.error('添加学习计划失败:', error);
      set({ error: '添加学习计划失败' });
      throw error;
    }
  },

  updateStudyPlan: async (plan) => {
    try {
      const updatedPlan = { ...plan, updatedTime: new Date() };
      await dbManager.update(DB_KEYS.STUDY_PLANS, updatedPlan);

      set(state => ({
        studyPlans: state.studyPlans.map(p =>
          p.id === plan.id ? updatedPlan : p
        )
      }));
    } catch (error) {
      console.error('更新学习计划失败:', error);
      set({ error: '更新学习计划失败' });
      throw error;
    }
  },

  deleteStudyPlan: async (planId) => {
    try {
      await dbManager.delete(DB_KEYS.STUDY_PLANS, planId);
      set(state => ({
        studyPlans: state.studyPlans.filter(p => p.id !== planId)
      }));
    } catch (error) {
      console.error('删除学习计划失败:', error);
      set({ error: '删除学习计划失败' });
      throw error;
    }
  },

  // 用户统计相关方法（临时实现）
  userStats: undefined,
  getQuestions: () => get().questions,
  getUserStats: () => ({ totalQuestions: 0, correctRate: 0 }),

  // Actions - 答题记录
  loadAnswerRecords: async () => {
    try {
      const records = await dbManager.getAll(DB_KEYS.ANSWER_RECORDS) as AnswerRecord[];
      set({ answerRecords: records });
    } catch (error) {
      set({ error: '加载答题记录失败' });
    }
  }
}));
