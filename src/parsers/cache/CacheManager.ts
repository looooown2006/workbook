/**
 * 缓存管理器
 * 提供解析结果缓存，减少重复解析成本
 */

import { ParseResult } from '../interfaces/IQuestionParser';

export interface CacheEntry {
  key: string;
  data: ParseResult;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
  accessCount: number;
  lastAccessed: number;
  metadata: {
    inputHash: string;
    inputType: string;
    parser: string;
    strategy: string;
    cost: number;
  };
}

export interface CacheConfig {
  maxSize: number; // 最大缓存条目数
  defaultTTL: number; // 默认TTL（毫秒）
  cleanupInterval: number; // 清理间隔（毫秒）
  enablePersistence: boolean; // 是否持久化到localStorage
  compressionEnabled: boolean; // 是否启用压缩
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // 估算大小（字节）
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry: number;
  newestEntry: number;
  averageAccessCount: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0
  };
  private cleanupTimer?: NodeJS.Timeout;

  private constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 100,
      defaultTTL: 24 * 60 * 60 * 1000, // 24小时
      cleanupInterval: 60 * 60 * 1000, // 1小时
      enablePersistence: true,
      compressionEnabled: true,
      ...config
    };

    this.startCleanupTimer();
    this.loadFromStorage();
  }

  static getInstance(config?: Partial<CacheConfig>): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }

  /**
   * 生成缓存键
   */
  private generateKey(input: string, parser: string, strategy: string): string {
    const inputHash = this.hashString(input);
    return `${parser}_${strategy}_${inputHash}`;
  }

  /**
   * 简单字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取缓存
   */
  get(input: string, parser: string, strategy: string): ParseResult | null {
    const key = this.generateKey(input, parser, strategy);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // 更新访问统计
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    console.log(`缓存命中: ${key}`);
    return entry.data;
  }

  /**
   * 设置缓存
   */
  set(
    input: string, 
    parser: string, 
    strategy: string, 
    result: ParseResult, 
    cost: number = 0,
    ttl?: number
  ): void {
    const key = this.generateKey(input, parser, strategy);
    const now = Date.now();

    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key,
      data: result,
      timestamp: now,
      ttl: ttl || this.config.defaultTTL,
      accessCount: 1,
      lastAccessed: now,
      metadata: {
        inputHash: this.hashString(input),
        inputType: typeof input,
        parser,
        strategy,
        cost
      }
    };

    this.cache.set(key, entry);
    this.saveToStorage();

    console.log(`缓存已保存: ${key}, 成本节省: ${cost}`);
  }

  /**
   * 删除缓存
   */
  delete(input: string, parser: string, strategy: string): boolean {
    const key = this.generateKey(input, parser, strategy);
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.saveToStorage();
    }
    
    return deleted;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.saveToStorage();
    console.log('缓存已清空');
  }

  /**
   * LRU淘汰策略
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`LRU淘汰缓存: ${oldestKey}`);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.timestamp + entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`清理过期缓存: ${expiredKeys.length} 条`);
      this.saveToStorage();
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 从localStorage加载缓存
   */
  private loadFromStorage(): void {
    if (!this.config.enablePersistence || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('parser_cache');
      if (stored) {
        const data = JSON.parse(stored);
        
        // 恢复Map结构
        for (const [key, entry] of Object.entries(data.cache || {})) {
          this.cache.set(key, entry as CacheEntry);
        }
        
        // 恢复统计信息
        this.stats = data.stats || { hits: 0, misses: 0 };
        
        console.log(`从存储加载缓存: ${this.cache.size} 条`);
      }
    } catch (error) {
      console.error('加载缓存失败:', error);
    }
  }

  /**
   * 保存缓存到localStorage
   */
  private saveToStorage(): void {
    if (!this.config.enablePersistence || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = {
        cache: Object.fromEntries(this.cache),
        stats: this.stats,
        timestamp: Date.now()
      };

      localStorage.setItem('parser_cache', JSON.stringify(data));
    } catch (error) {
      console.error('保存缓存失败:', error);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      totalSize: this.estimateSize(),
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0,
      averageAccessCount: entries.length > 0 ? 
        entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length : 0
    };
  }

  /**
   * 估算缓存大小
   */
  private estimateSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      // 粗略估算JSON序列化后的大小
      size += JSON.stringify(entry).length * 2; // UTF-16编码
    }
    return size;
  }

  /**
   * 获取缓存配置
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * 更新缓存配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 重启清理定时器
    this.stopCleanupTimer();
    this.startCleanupTimer();
    
    console.log('缓存配置已更新:', this.config);
  }

  /**
   * 导出缓存数据
   */
  export(): string {
    return JSON.stringify({
      cache: Object.fromEntries(this.cache),
      stats: this.stats,
      config: this.config,
      exportTime: Date.now()
    }, null, 2);
  }

  /**
   * 导入缓存数据
   */
  import(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      this.cache.clear();
      for (const [key, entry] of Object.entries(parsed.cache || {})) {
        this.cache.set(key, entry as CacheEntry);
      }
      
      this.stats = parsed.stats || { hits: 0, misses: 0 };
      
      console.log(`导入缓存: ${this.cache.size} 条`);
      this.saveToStorage();
      
      return true;
    } catch (error) {
      console.error('导入缓存失败:', error);
      return false;
    }
  }
}

export default CacheManager;
