import { ImportResult, ImportQuestionData } from '../types';

export interface ImportProgress {
  progress: number;
  processed: number;
  total: number;
  message?: string;
}

export class ImportManager {
  private worker: Worker | null = null;
  private onProgress?: (progress: ImportProgress) => void;
  private onComplete?: (result: ImportResult) => void;
  private onError?: (error: string) => void;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      // 检测是否在Electron环境中
      const isElectron = typeof window !== 'undefined' && window.electronAPI;

      if (isElectron) {
        // 在Electron环境中禁用Web Worker，直接使用主线程处理
        console.log('Electron environment detected, using main thread for import processing');
        this.worker = null;
        return;
      }

      this.worker = new Worker('/importWorker.js');
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.onError?.('处理过程中发生错误');
      };
    } catch (error) {
      console.warn('Web Worker not supported, falling back to main thread');
      this.worker = null;
    }
  }

  private handleWorkerMessage(e: MessageEvent) {
    const { type, progress, processed, total, result, error } = e.data;

    switch (type) {
      case 'PROGRESS':
        this.onProgress?.({
          progress,
          processed,
          total,
          message: `正在处理第 ${processed}/${total} 道题目...`
        });
        break;

      case 'COMPLETE':
        this.onComplete?.(result);
        break;

      case 'ERROR':
        this.onError?.(error);
        break;

      case 'VALIDATION_COMPLETE':
        // 处理验证结果
        break;
    }
  }

  async processQuestions(
    questions: ImportQuestionData[],
    chapterId: string,
    options: {
      onProgress?: (progress: ImportProgress) => void;
      onComplete?: (result: ImportResult) => void;
      onError?: (error: string) => void;
      batchSize?: number;
    } = {}
  ): Promise<ImportResult> {
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;

    return new Promise((resolve, reject) => {
      if (this.worker) {
        // 使用Web Worker处理
        const originalOnComplete = this.onComplete;
        this.onComplete = (result) => {
          originalOnComplete?.(result);
          resolve(result);
        };

        const originalOnError = this.onError;
        this.onError = (error) => {
          originalOnError?.(error);
          reject(new Error(error));
        };

        this.worker.postMessage({
          type: 'PROCESS_QUESTIONS',
          data: {
            questions,
            chapterId,
            batchSize: options.batchSize || 100
          }
        });
      } else {
        // 回退到主线程处理
        this.processQuestionsMainThread(questions, chapterId, options)
          .then(resolve)
          .catch(reject);
      }
    });
  }

  private async processQuestionsMainThread(
    questions: ImportQuestionData[],
    chapterId: string,
    options: {
      onProgress?: (progress: ImportProgress) => void;
      onComplete?: (result: ImportResult) => void;
      onError?: (error: string) => void;
      batchSize?: number;
    }
  ): Promise<ImportResult> {
    const batchSize = options.batchSize || 100;
    const results: any[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        
        // 处理当前批次
        for (let j = 0; j < batch.length; j++) {
          try {
            const question = this.processQuestion(batch[j], chapterId);
            results.push(question);
          } catch (error) {
            errors.push(`第${i + j + 1}题处理失败: ${error}`);
          }
        }

        // 更新进度
        const progress = Math.min(100, Math.round(((i + batchSize) / questions.length) * 100));
        options.onProgress?.({
          progress,
          processed: Math.min(i + batchSize, questions.length),
          total: questions.length,
          message: `正在处理第 ${Math.min(i + batchSize, questions.length)}/${questions.length} 道题目...`
        });

        // 让出控制权，避免阻塞UI
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const result: ImportResult = {
        success: results.length > 0,
        totalCount: questions.length,
        successCount: results.length,
        failedCount: questions.length - results.length,
        errors,
        questions: results
      };

      options.onComplete?.(result);
      return result;

    } catch (error) {
      const errorMessage = `处理失败: ${error}`;
      options.onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }

  private processQuestion(questionData: ImportQuestionData, chapterId: string) {
    // 验证必需字段
    if (!questionData.title || !questionData.title.trim()) {
      throw new Error('题目标题不能为空');
    }
    
    if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
      throw new Error('选项至少需要2个');
    }
    
    // 验证选项内容
    for (let i = 0; i < questionData.options.length; i++) {
      if (!questionData.options[i] || !questionData.options[i].trim()) {
        throw new Error(`选项${i + 1}内容不能为空`);
      }
    }
    
    // 处理正确答案
    let correctAnswerIndex: number;
    if (typeof questionData.correctAnswer === 'number') {
      correctAnswerIndex = questionData.correctAnswer;
    } else if (typeof questionData.correctAnswer === 'string') {
      const letter = questionData.correctAnswer.toUpperCase();
      if (/^[A-Z]$/.test(letter)) {
        correctAnswerIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
      } else {
        const num = parseInt(questionData.correctAnswer);
        correctAnswerIndex = isNaN(num) ? 0 : num - 1; // 转为0-based索引
      }
    } else {
      correctAnswerIndex = 0;
    }
    
    // 验证答案索引
    if (correctAnswerIndex < 0 || correctAnswerIndex >= questionData.options.length) {
      throw new Error('正确答案索引超出选项范围');
    }
    
    // 生成唯一ID
    const id = crypto.randomUUID();
    const now = new Date();
    
    return {
      id,
      title: questionData.title.trim(),
      options: questionData.options.map(opt => opt.trim()),
      correctAnswer: correctAnswerIndex,
      explanation: questionData.explanation?.trim() || '',
      difficulty: questionData.difficulty || 'medium',
      tags: questionData.tags || [],
      status: 'new' as const,
      wrongCount: 0,
      isMastered: false,
      createdAt: now,
      updatedAt: now
    };
  }

  async validateQuestions(questions: ImportQuestionData[]): Promise<{
    validCount: number;
    invalidCount: number;
    errors: string[];
    validQuestions: ImportQuestionData[];
  }> {
    return new Promise((resolve, reject) => {
      if (this.worker) {
        const handleMessage = (e: MessageEvent) => {
          if (e.data.type === 'VALIDATION_COMPLETE') {
            this.worker?.removeEventListener('message', handleMessage);
            resolve(e.data.result);
          }
        };

        this.worker.addEventListener('message', handleMessage);
        this.worker.postMessage({
          type: 'VALIDATE_QUESTIONS',
          data: { questions }
        });
      } else {
        // 主线程验证
        const errors: string[] = [];
        const validQuestions: ImportQuestionData[] = [];

        questions.forEach((question, index) => {
          try {
            const validation = this.validateQuestion(question);
            if (validation.isValid) {
              validQuestions.push(question);
            } else {
              errors.push(`第${index + 1}题: ${validation.error}`);
            }
          } catch (error) {
            errors.push(`第${index + 1}题验证失败: ${error}`);
          }
        });

        resolve({
          validCount: validQuestions.length,
          invalidCount: errors.length,
          errors,
          validQuestions
        });
      }
    });
  }

  private validateQuestion(questionData: ImportQuestionData): { isValid: boolean; error?: string } {
    if (!questionData.title || questionData.title.trim() === '') {
      return { isValid: false, error: '题目标题不能为空' };
    }

    if (!questionData.options || questionData.options.length < 2) {
      return { isValid: false, error: '选项至少需要2个' };
    }

    if (questionData.options.some(option => !option || option.trim() === '')) {
      return { isValid: false, error: '选项内容不能为空' };
    }

    // 验证正确答案
    let correctAnswerIndex: number;
    if (typeof questionData.correctAnswer === 'number') {
      correctAnswerIndex = questionData.correctAnswer;
    } else if (typeof questionData.correctAnswer === 'string') {
      const letter = questionData.correctAnswer.toUpperCase();
      correctAnswerIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
    } else {
      return { isValid: false, error: '正确答案格式错误' };
    }

    if (correctAnswerIndex < 0 || correctAnswerIndex >= questionData.options.length) {
      return { isValid: false, error: '正确答案索引超出选项范围' };
    }

    return { isValid: true };
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
