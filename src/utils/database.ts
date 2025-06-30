import {
  Question,
  QuestionBank,
  Chapter,
  AnswerRecord,
  Statistics,
  AppSettings,
  DB_KEYS
} from '../types';

// 重新导出DB_KEYS以便其他模块使用
export { DB_KEYS } from '../types';

// IndexedDB 数据库名称和版本
const DB_NAME = 'QuizAppDB';
const DB_VERSION = 2; // 增加版本号以支持新的对象存储

// 数据库实例
let db: IDBDatabase | null = null;

// 初始化数据库
export const initDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // 创建题库表
      if (!database.objectStoreNames.contains(DB_KEYS.QUESTION_BANKS)) {
        const bankStore = database.createObjectStore(DB_KEYS.QUESTION_BANKS, { keyPath: 'id' });
        bankStore.createIndex('name', 'name', { unique: false });
      }

      // 创建章节表
      if (!database.objectStoreNames.contains(DB_KEYS.CHAPTERS)) {
        const chapterStore = database.createObjectStore(DB_KEYS.CHAPTERS, { keyPath: 'id' });
        chapterStore.createIndex('bankId', 'bankId', { unique: false });
        chapterStore.createIndex('order', 'order', { unique: false });
      }

      // 创建题目表
      if (!database.objectStoreNames.contains(DB_KEYS.QUESTIONS)) {
        const questionStore = database.createObjectStore(DB_KEYS.QUESTIONS, { keyPath: 'id' });
        questionStore.createIndex('status', 'status', { unique: false });
        questionStore.createIndex('difficulty', 'difficulty', { unique: false });
      }

      // 创建答题记录表
      if (!database.objectStoreNames.contains(DB_KEYS.ANSWER_RECORDS)) {
        const recordStore = database.createObjectStore(DB_KEYS.ANSWER_RECORDS, { keyPath: 'id' });
        recordStore.createIndex('questionId', 'questionId', { unique: false });
        recordStore.createIndex('bankId', 'bankId', { unique: false });
        recordStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 创建统计数据表
      if (!database.objectStoreNames.contains(DB_KEYS.STATISTICS)) {
        database.createObjectStore(DB_KEYS.STATISTICS, { keyPath: 'id' });
      }

      // 创建应用设置表
      if (!database.objectStoreNames.contains(DB_KEYS.APP_SETTINGS)) {
        database.createObjectStore(DB_KEYS.APP_SETTINGS, { keyPath: 'key' });
      }

      // 创建错题存储
      if (!database.objectStoreNames.contains(DB_KEYS.WRONG_QUESTIONS)) {
        const wrongQuestionStore = database.createObjectStore(DB_KEYS.WRONG_QUESTIONS, { keyPath: 'id' });
        wrongQuestionStore.createIndex('questionId', 'questionId', { unique: false });
        wrongQuestionStore.createIndex('lastWrongTime', 'lastWrongTime', { unique: false });
        wrongQuestionStore.createIndex('isMastered', 'isMastered', { unique: false });
        wrongQuestionStore.createIndex('status', 'status', { unique: false });
        wrongQuestionStore.createIndex('bankId', 'bankId', { unique: false });
        wrongQuestionStore.createIndex('chapterId', 'chapterId', { unique: false });
        wrongQuestionStore.createIndex('wrongCount', 'wrongCount', { unique: false });
        wrongQuestionStore.createIndex('errorType', 'errorType', { unique: false });
      }

      // 创建错题复习会话存储
      if (!database.objectStoreNames.contains(DB_KEYS.WRONG_QUESTION_SESSIONS)) {
        const sessionStore = database.createObjectStore(DB_KEYS.WRONG_QUESTION_SESSIONS, { keyPath: 'id' });
        sessionStore.createIndex('startTime', 'startTime', { unique: false });
        sessionStore.createIndex('mode', 'mode', { unique: false });
        sessionStore.createIndex('accuracy', 'accuracy', { unique: false });
      }

      // 创建学习计划存储
      if (!database.objectStoreNames.contains(DB_KEYS.STUDY_PLANS)) {
        const planStore = database.createObjectStore(DB_KEYS.STUDY_PLANS, { keyPath: 'id' });
        planStore.createIndex('isActive', 'isActive', { unique: false });
        planStore.createIndex('startDate', 'startDate', { unique: false });
        planStore.createIndex('endDate', 'endDate', { unique: false });
        planStore.createIndex('createdTime', 'createdTime', { unique: false });
      }
    };
  });
};

// 通用的数据库操作类
export class DatabaseManager {
  private static instance: DatabaseManager;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // 添加数据
  async add<T>(storeName: string, data: T): Promise<void> {
    const database = await initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to add data to ${storeName}`));
    });
  }

  // 更新数据
  async update<T>(storeName: string, data: T): Promise<void> {
    const database = await initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to update data in ${storeName}`));
    });
  }

  // 获取单个数据
  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const database = await initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get data from ${storeName}`));
    });
  }

  // 获取所有数据
  async getAll<T>(storeName: string): Promise<T[]> {
    const database = await initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get all data from ${storeName}`));
    });
  }

  // 根据索引查询
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const database = await initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to query by index ${indexName}`));
    });
  }

  // 删除数据
  async delete(storeName: string, id: string): Promise<void> {
    const database = await initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete data from ${storeName}`));
    });
  }

  // 批量添加
  async addBatch<T>(storeName: string, dataList: T[]): Promise<void> {
    const database = await initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      let completed = 0;
      const total = dataList.length;

      if (total === 0) {
        resolve();
        return;
      }

      dataList.forEach(data => {
        const request = store.add(data);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        request.onerror = () => {
          reject(new Error(`Failed to add batch data to ${storeName}`));
        };
      });
    });
  }

  // 清空表
  async clear(storeName: string): Promise<void> {
    const database = await initDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
    });
  }
}

// 导出数据库管理器实例
export const dbManager = DatabaseManager.getInstance();
