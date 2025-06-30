import { WrongQuestion, WrongQuestionSession, WrongQuestionStats, DB_KEYS } from '../types';
import { DatabaseManager } from './database';
import { v4 as uuidv4 } from 'uuid';

// 桌面端专用：检查是否在Electron环境中
const isElectron = () => {
  return typeof window !== 'undefined' &&
         window.process &&
         window.process.type === 'renderer';
};

export class WrongQuestionManager {
  private static instance: WrongQuestionManager;
  private dbManager: DatabaseManager;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  public static getInstance(): WrongQuestionManager {
    if (!WrongQuestionManager.instance) {
      WrongQuestionManager.instance = new WrongQuestionManager();
    }
    return WrongQuestionManager.instance;
  }

  // 添加错题
  async addWrongQuestion(
    questionId: string,
    bankId: string,
    chapterId: string,
    wrongAnswer: number,
    errorType?: string
  ): Promise<void> {
    try {
      // 检查是否已存在该错题
      const existingWrongQuestion = await this.getWrongQuestionByQuestionId(questionId);
      
      if (existingWrongQuestion) {
        // 更新现有错题记录
        existingWrongQuestion.wrongCount += 1;
        existingWrongQuestion.lastWrongTime = new Date();
        existingWrongQuestion.wrongAnswers.push(wrongAnswer);
        if (errorType) {
          existingWrongQuestion.errorType = errorType;
        }
        // 如果之前已掌握，重新设为活跃状态
        if (existingWrongQuestion.isMastered) {
          existingWrongQuestion.isMastered = false;
          existingWrongQuestion.status = 'active';
          existingWrongQuestion.masteredTime = undefined;
        }
        
        await this.dbManager.update(DB_KEYS.WRONG_QUESTIONS, existingWrongQuestion);
      } else {
        // 创建新的错题记录
        const wrongQuestion: WrongQuestion = {
          id: uuidv4(),
          questionId,
          bankId,
          chapterId,
          wrongCount: 1,
          firstWrongTime: new Date(),
          lastWrongTime: new Date(),
          wrongAnswers: [wrongAnswer],
          correctAnswers: [],
          tags: [],
          errorType,
          isMastered: false,
          reviewCount: 0,
          status: 'active'
        };
        
        await this.dbManager.add(DB_KEYS.WRONG_QUESTIONS, wrongQuestion);
      }
    } catch (error) {
      console.error('Failed to add wrong question:', error);
      throw error;
    }
  }

  // 记录正确答案（复习时）
  async recordCorrectAnswer(questionId: string, correctAnswer: number): Promise<void> {
    try {
      const wrongQuestion = await this.getWrongQuestionByQuestionId(questionId);
      if (wrongQuestion) {
        wrongQuestion.correctAnswers.push(correctAnswer);
        wrongQuestion.reviewCount += 1;
        wrongQuestion.lastReviewTime = new Date();
        
        await this.dbManager.update(DB_KEYS.WRONG_QUESTIONS, wrongQuestion);
      }
    } catch (error) {
      console.error('Failed to record correct answer:', error);
      throw error;
    }
  }

  // 标记错题为已掌握
  async markWrongQuestionAsMastered(wrongQuestionId: string): Promise<void> {
    try {
      const wrongQuestion = await this.dbManager.get<WrongQuestion>(
        DB_KEYS.WRONG_QUESTIONS, 
        wrongQuestionId
      );
      
      if (wrongQuestion) {
        wrongQuestion.isMastered = true;
        wrongQuestion.status = 'mastered';
        wrongQuestion.masteredTime = new Date();
        
        await this.dbManager.update(DB_KEYS.WRONG_QUESTIONS, wrongQuestion);
      }
    } catch (error) {
      console.error('Failed to mark wrong question as mastered:', error);
      throw error;
    }
  }

  // 取消掌握标记
  async unmarkWrongQuestionAsMastered(wrongQuestionId: string): Promise<void> {
    try {
      const wrongQuestion = await this.dbManager.get<WrongQuestion>(
        DB_KEYS.WRONG_QUESTIONS, 
        wrongQuestionId
      );
      
      if (wrongQuestion) {
        wrongQuestion.isMastered = false;
        wrongQuestion.status = 'active';
        wrongQuestion.masteredTime = undefined;
        
        await this.dbManager.update(DB_KEYS.WRONG_QUESTIONS, wrongQuestion);
      }
    } catch (error) {
      console.error('Failed to unmark wrong question as mastered:', error);
      throw error;
    }
  }

  // 忽略错题
  async ignoreWrongQuestion(wrongQuestionId: string): Promise<void> {
    try {
      const wrongQuestion = await this.dbManager.get<WrongQuestion>(
        DB_KEYS.WRONG_QUESTIONS, 
        wrongQuestionId
      );
      
      if (wrongQuestion) {
        wrongQuestion.status = 'ignored';
        await this.dbManager.update(DB_KEYS.WRONG_QUESTIONS, wrongQuestion);
      }
    } catch (error) {
      console.error('Failed to ignore wrong question:', error);
      throw error;
    }
  }

  // 添加错题笔记
  async addWrongQuestionNote(wrongQuestionId: string, notes: string): Promise<void> {
    try {
      const wrongQuestion = await this.dbManager.get<WrongQuestion>(
        DB_KEYS.WRONG_QUESTIONS, 
        wrongQuestionId
      );
      
      if (wrongQuestion) {
        wrongQuestion.notes = notes;
        await this.dbManager.update(DB_KEYS.WRONG_QUESTIONS, wrongQuestion);
      }
    } catch (error) {
      console.error('Failed to add wrong question note:', error);
      throw error;
    }
  }

  // 添加错题标签
  async addWrongQuestionTags(wrongQuestionId: string, tags: string[]): Promise<void> {
    try {
      const wrongQuestion = await this.dbManager.get<WrongQuestion>(
        DB_KEYS.WRONG_QUESTIONS, 
        wrongQuestionId
      );
      
      if (wrongQuestion) {
        wrongQuestion.tags = [...new Set([...wrongQuestion.tags, ...tags])];
        await this.dbManager.update(DB_KEYS.WRONG_QUESTIONS, wrongQuestion);
      }
    } catch (error) {
      console.error('Failed to add wrong question tags:', error);
      throw error;
    }
  }

  // 根据题目ID获取错题记录
  async getWrongQuestionByQuestionId(questionId: string): Promise<WrongQuestion | null> {
    try {
      const wrongQuestions = await this.dbManager.getByIndex<WrongQuestion>(
        DB_KEYS.WRONG_QUESTIONS,
        'questionId',
        questionId
      );
      return wrongQuestions.length > 0 ? wrongQuestions[0] : null;
    } catch (error) {
      console.error('Failed to get wrong question by question ID:', error);
      return null;
    }
  }

  // 获取所有错题
  async getAllWrongQuestions(): Promise<WrongQuestion[]> {
    try {
      return await this.dbManager.getAll<WrongQuestion>(DB_KEYS.WRONG_QUESTIONS);
    } catch (error) {
      console.error('Failed to get all wrong questions:', error);
      return [];
    }
  }

  // 根据状态获取错题
  async getWrongQuestionsByStatus(status: 'active' | 'mastered' | 'ignored'): Promise<WrongQuestion[]> {
    try {
      return await this.dbManager.getByIndex<WrongQuestion>(
        DB_KEYS.WRONG_QUESTIONS,
        'status',
        status
      );
    } catch (error) {
      console.error('Failed to get wrong questions by status:', error);
      return [];
    }
  }

  // 根据题库获取错题
  async getWrongQuestionsByBank(bankId: string): Promise<WrongQuestion[]> {
    try {
      return await this.dbManager.getByIndex<WrongQuestion>(
        DB_KEYS.WRONG_QUESTIONS,
        'bankId',
        bankId
      );
    } catch (error) {
      console.error('Failed to get wrong questions by bank:', error);
      return [];
    }
  }

  // 根据章节获取错题
  async getWrongQuestionsByChapter(chapterId: string): Promise<WrongQuestion[]> {
    try {
      return await this.dbManager.getByIndex<WrongQuestion>(
        DB_KEYS.WRONG_QUESTIONS,
        'chapterId',
        chapterId
      );
    } catch (error) {
      console.error('Failed to get wrong questions by chapter:', error);
      return [];
    }
  }

  // 获取错题统计
  async getWrongQuestionStats(): Promise<WrongQuestionStats> {
    try {
      const allWrongQuestions = await this.getAllWrongQuestions();
      
      const totalWrongQuestions = allWrongQuestions.length;
      const masteredCount = allWrongQuestions.filter(wq => wq.isMastered).length;
      const activeCount = allWrongQuestions.filter(wq => wq.status === 'active').length;
      const ignoredCount = allWrongQuestions.filter(wq => wq.status === 'ignored').length;
      
      const averageWrongCount = totalWrongQuestions > 0 
        ? allWrongQuestions.reduce((sum, wq) => sum + wq.wrongCount, 0) / totalWrongQuestions 
        : 0;

      // 最近的错题（按最后错误时间排序）
      const recentWrongQuestions = allWrongQuestions
        .filter(wq => wq.status === 'active')
        .sort((a, b) => b.lastWrongTime.getTime() - a.lastWrongTime.getTime())
        .slice(0, 10);

      // 错误类型统计
      const errorTypeMap = new Map<string, number>();
      allWrongQuestions.forEach(wq => {
        if (wq.errorType) {
          errorTypeMap.set(wq.errorType, (errorTypeMap.get(wq.errorType) || 0) + 1);
        }
      });
      
      const topErrorTypes = Array.from(errorTypeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 改进趋势（最近7天）
      const improvementTrend = this.calculateImprovementTrend(allWrongQuestions);

      return {
        totalWrongQuestions,
        masteredCount,
        activeCount,
        ignoredCount,
        averageWrongCount,
        recentWrongQuestions,
        topErrorTypes,
        improvementTrend
      };
    } catch (error) {
      console.error('Failed to get wrong question stats:', error);
      throw error;
    }
  }

  // 计算改进趋势
  private calculateImprovementTrend(wrongQuestions: WrongQuestion[]): Array<{
    date: string;
    wrongCount: number;
    masteredCount: number;
  }> {
    const trend: Array<{ date: string; wrongCount: number; masteredCount: number }> = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const wrongCount = wrongQuestions.filter(wq => {
        const wrongDate = new Date(wq.lastWrongTime);
        return wrongDate.toISOString().split('T')[0] === dateStr;
      }).length;
      
      const masteredCount = wrongQuestions.filter(wq => {
        if (!wq.masteredTime) return false;
        const masteredDate = new Date(wq.masteredTime);
        return masteredDate.toISOString().split('T')[0] === dateStr;
      }).length;
      
      trend.push({ date: dateStr, wrongCount, masteredCount });
    }
    
    return trend;
  }

  // 删除错题
  async deleteWrongQuestion(wrongQuestionId: string): Promise<void> {
    try {
      await this.dbManager.delete(DB_KEYS.WRONG_QUESTIONS, wrongQuestionId);
    } catch (error) {
      console.error('Failed to delete wrong question:', error);
      throw error;
    }
  }

  // 批量删除错题
  async batchDeleteWrongQuestions(wrongQuestionIds: string[]): Promise<void> {
    try {
      for (const id of wrongQuestionIds) {
        await this.deleteWrongQuestion(id);
      }
    } catch (error) {
      console.error('Failed to batch delete wrong questions:', error);
      throw error;
    }
  }
}
