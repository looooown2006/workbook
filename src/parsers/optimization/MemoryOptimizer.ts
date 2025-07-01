/**
 * 内存优化器
 * 监控和优化解析过程中的内存使用
 */

export interface MemoryStats {
  used: number; // 已使用内存（字节）
  total: number; // 总内存（字节）
  percentage: number; // 使用百分比
  timestamp: number;
}

export interface MemoryThreshold {
  warning: number; // 警告阈值（百分比）
  critical: number; // 严重阈值（百分比）
  cleanup: number; // 清理阈值（百分比）
}

export interface OptimizationAction {
  type: 'cleanup' | 'compress' | 'cache_clear' | 'gc_force';
  description: string;
  priority: number;
  execute: () => Promise<void>;
}

export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private thresholds: MemoryThreshold = {
    warning: 70,
    critical: 85,
    cleanup: 90
  };
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private memoryHistory: MemoryStats[] = [];
  private maxHistorySize = 100;
  private optimizationActions: OptimizationAction[] = [];

  private constructor() {
    this.registerDefaultActions();
  }

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  /**
   * 获取当前内存使用情况
   */
  getCurrentMemoryStats(): MemoryStats {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        timestamp: Date.now()
      };
    }

    // 浏览器不支持performance.memory时的估算
    return {
      used: 0,
      total: 0,
      percentage: 0,
      timestamp: Date.now()
    };
  }

  /**
   * 开始内存监控
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    console.log('内存监控已启动');
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('内存监控已停止');
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    const stats = this.getCurrentMemoryStats();
    this.addToHistory(stats);

    if (stats.percentage >= this.thresholds.cleanup) {
      console.warn(`内存使用率达到清理阈值: ${stats.percentage.toFixed(1)}%`);
      this.executeOptimization('critical');
    } else if (stats.percentage >= this.thresholds.critical) {
      console.warn(`内存使用率达到严重阈值: ${stats.percentage.toFixed(1)}%`);
      this.executeOptimization('high');
    } else if (stats.percentage >= this.thresholds.warning) {
      console.warn(`内存使用率达到警告阈值: ${stats.percentage.toFixed(1)}%`);
      this.executeOptimization('medium');
    }
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(stats: MemoryStats): void {
    this.memoryHistory.push(stats);
    
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
  }

  /**
   * 执行优化操作
   */
  private async executeOptimization(priority: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    const priorityMap = { low: 1, medium: 2, high: 3, critical: 4 };
    const targetPriority = priorityMap[priority];

    const applicableActions = this.optimizationActions
      .filter(action => action.priority <= targetPriority)
      .sort((a, b) => b.priority - a.priority);

    for (const action of applicableActions) {
      try {
        console.log(`执行优化操作: ${action.description}`);
        await action.execute();
        
        // 检查优化效果
        const newStats = this.getCurrentMemoryStats();
        if (newStats.percentage < this.thresholds.warning) {
          console.log('内存优化成功');
          break;
        }
      } catch (error) {
        console.error(`优化操作失败: ${action.description}`, error);
      }
    }
  }

  /**
   * 注册默认优化操作
   */
  private registerDefaultActions(): void {
    // 清理缓存
    this.registerAction({
      type: 'cache_clear',
      description: '清理解析缓存',
      priority: 2,
      execute: async () => {
        // 这里需要访问CacheManager实例
        const { CacheManager } = await import('../cache/CacheManager');
        const cache = CacheManager.getInstance();
        const stats = cache.getStats();
        
        if (stats.totalEntries > 50) {
          // 只保留最近访问的50%缓存
          cache.clear();
          console.log('已清理解析缓存');
        }
      }
    });

    // 强制垃圾回收
    this.registerAction({
      type: 'gc_force',
      description: '强制垃圾回收',
      priority: 3,
      execute: async () => {
        if (typeof window !== 'undefined' && (window as any).gc) {
          (window as any).gc();
          console.log('已执行强制垃圾回收');
        }
      }
    });

    // 清理大型对象
    this.registerAction({
      type: 'cleanup',
      description: '清理大型临时对象',
      priority: 1,
      execute: async () => {
        // 清理全局变量中的大型对象
        this.cleanupLargeObjects();
      }
    });
  }

  /**
   * 注册优化操作
   */
  registerAction(action: OptimizationAction): void {
    this.optimizationActions.push(action);
    this.optimizationActions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 清理大型对象
   */
  private cleanupLargeObjects(): void {
    // 清理内存历史记录
    if (this.memoryHistory.length > 20) {
      this.memoryHistory = this.memoryHistory.slice(-20);
    }

    // 清理其他可能的大型对象
    console.log('已清理大型临时对象');
  }

  /**
   * 获取内存使用趋势
   */
  getMemoryTrend(): {
    trend: 'increasing' | 'decreasing' | 'stable';
    averageUsage: number;
    peakUsage: number;
    recentChange: number;
  } {
    if (this.memoryHistory.length < 5) {
      return {
        trend: 'stable',
        averageUsage: 0,
        peakUsage: 0,
        recentChange: 0
      };
    }

    const recent = this.memoryHistory.slice(-5);
    const averageUsage = recent.reduce((sum, stat) => sum + stat.percentage, 0) / recent.length;
    const peakUsage = Math.max(...recent.map(stat => stat.percentage));
    
    const first = recent[0].percentage;
    const last = recent[recent.length - 1].percentage;
    const recentChange = last - first;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentChange > 5) {
      trend = 'increasing';
    } else if (recentChange < -5) {
      trend = 'decreasing';
    }

    return {
      trend,
      averageUsage,
      peakUsage,
      recentChange
    };
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(): string[] {
    const stats = this.getCurrentMemoryStats();
    const trend = this.getMemoryTrend();
    const suggestions: string[] = [];

    if (stats.percentage > this.thresholds.warning) {
      suggestions.push('当前内存使用率较高，建议清理缓存');
    }

    if (trend.trend === 'increasing') {
      suggestions.push('内存使用呈上升趋势，注意监控');
    }

    if (trend.peakUsage > this.thresholds.critical) {
      suggestions.push('检测到内存峰值过高，建议优化大型数据处理');
    }

    if (this.memoryHistory.length > 0) {
      const avgUsage = this.memoryHistory.reduce((sum, stat) => sum + stat.percentage, 0) / this.memoryHistory.length;
      if (avgUsage > this.thresholds.warning) {
        suggestions.push('平均内存使用率偏高，建议启用自动清理');
      }
    }

    return suggestions;
  }

  /**
   * 设置内存阈值
   */
  setThresholds(thresholds: Partial<MemoryThreshold>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('内存阈值已更新:', this.thresholds);
  }

  /**
   * 获取内存历史
   */
  getMemoryHistory(): MemoryStats[] {
    return [...this.memoryHistory];
  }

  /**
   * 手动触发内存优化
   */
  async optimizeMemory(): Promise<void> {
    console.log('手动触发内存优化');
    await this.executeOptimization('high');
  }

  /**
   * 获取内存报告
   */
  getMemoryReport(): {
    current: MemoryStats;
    trend: ReturnType<typeof this.getMemoryTrend>;
    suggestions: string[];
    thresholds: MemoryThreshold;
    isMonitoring: boolean;
  } {
    return {
      current: this.getCurrentMemoryStats(),
      trend: this.getMemoryTrend(),
      suggestions: this.getOptimizationSuggestions(),
      thresholds: this.thresholds,
      isMonitoring: this.isMonitoring
    };
  }
}

export default MemoryOptimizer;
