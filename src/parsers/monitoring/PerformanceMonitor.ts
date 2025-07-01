/**
 * 性能监控系统
 * 监控解析性能和成本，提供数据分析
 */

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  parser: string;
  strategy: string;
  inputType: 'text' | 'image' | 'pdf' | 'file';
  inputSize: number;
  processingTime: number;
  success: boolean;
  questionsCount: number;
  confidence: number;
  cost: number;
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalRequests: number;
    successRate: number;
    averageProcessingTime: number;
    totalCost: number;
    averageConfidence: number;
    totalQuestionsProcessed: number;
  };
  byParser: Record<string, ParserStats>;
  byStrategy: Record<string, StrategyStats>;
  trends: {
    processingTime: number[];
    successRate: number[];
    cost: number[];
  };
  alerts: Alert[];
}

export interface ParserStats {
  requests: number;
  successRate: number;
  averageTime: number;
  totalCost: number;
  averageConfidence: number;
}

export interface StrategyStats {
  requests: number;
  successRate: number;
  averageTime: number;
  totalCost: number;
  costEfficiency: number; // 成功题目数 / 总成本
}

export interface Alert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metric?: string;
  value?: number;
  threshold?: number;
}

export interface MonitoringConfig {
  maxMetrics: number;
  alertThresholds: {
    processingTimeMs: number;
    successRatePercent: number;
    costPerQuestion: number;
    confidencePercent: number;
  };
  reportingInterval: number; // ms
  enableRealTimeAlerts: boolean;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private config: MonitoringConfig = {
    maxMetrics: 1000,
    alertThresholds: {
      processingTimeMs: 30000, // 30秒
      successRatePercent: 80,
      costPerQuestion: 0.1,
      confidencePercent: 70
    },
    reportingInterval: 60000, // 1分钟
    enableRealTimeAlerts: true
  };

  private constructor() {
    this.loadMetrics();
    this.startPeriodicReporting();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 记录性能指标
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.push(fullMetric);

    // 限制存储的指标数量
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    // 保存到本地存储
    this.saveMetrics();

    // 实时警报检查
    if (this.config.enableRealTimeAlerts) {
      this.checkAlerts(fullMetric);
    }

    console.log('性能指标已记录:', {
      parser: fullMetric.parser,
      strategy: fullMetric.strategy,
      time: fullMetric.processingTime,
      success: fullMetric.success,
      cost: fullMetric.cost
    });
  }

  /**
   * 生成性能报告
   */
  generateReport(periodHours: number = 24): PerformanceReport {
    const now = Date.now();
    const periodStart = now - (periodHours * 60 * 60 * 1000);
    
    const periodMetrics = this.metrics.filter(m => m.timestamp >= periodStart);

    if (periodMetrics.length === 0) {
      return this.getEmptyReport(periodStart, now);
    }

    const summary = this.calculateSummary(periodMetrics);
    const byParser = this.calculateParserStats(periodMetrics);
    const byStrategy = this.calculateStrategyStats(periodMetrics);
    const trends = this.calculateTrends(periodMetrics);
    const alerts = this.generateAlerts(periodMetrics);

    return {
      period: { start: periodStart, end: now },
      summary,
      byParser,
      byStrategy,
      trends,
      alerts
    };
  }

  /**
   * 获取实时统计
   */
  getRealTimeStats(): {
    recentRequests: number;
    currentSuccessRate: number;
    averageResponseTime: number;
    totalCostToday: number;
  } {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= last24h);

    const recentRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const currentSuccessRate = recentRequests > 0 ? (successfulRequests / recentRequests) * 100 : 0;
    
    const totalTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0);
    const averageResponseTime = recentRequests > 0 ? totalTime / recentRequests : 0;
    
    const totalCostToday = recentMetrics.reduce((sum, m) => sum + m.cost, 0);

    return {
      recentRequests,
      currentSuccessRate,
      averageResponseTime,
      totalCostToday
    };
  }

  /**
   * 获取性能趋势
   */
  getPerformanceTrends(hours: number = 24): {
    timeLabels: string[];
    processingTimes: number[];
    successRates: number[];
    costs: number[];
  } {
    const now = Date.now();
    const periodStart = now - (hours * 60 * 60 * 1000);
    const intervalMs = (hours * 60 * 60 * 1000) / 12; // 12个数据点

    const timeLabels: string[] = [];
    const processingTimes: number[] = [];
    const successRates: number[] = [];
    const costs: number[] = [];

    for (let i = 0; i < 12; i++) {
      const intervalStart = periodStart + (i * intervalMs);
      const intervalEnd = intervalStart + intervalMs;
      
      const intervalMetrics = this.metrics.filter(m => 
        m.timestamp >= intervalStart && m.timestamp < intervalEnd
      );

      timeLabels.push(new Date(intervalStart).toLocaleTimeString());

      if (intervalMetrics.length > 0) {
        const avgTime = intervalMetrics.reduce((sum, m) => sum + m.processingTime, 0) / intervalMetrics.length;
        const successCount = intervalMetrics.filter(m => m.success).length;
        const successRate = (successCount / intervalMetrics.length) * 100;
        const totalCost = intervalMetrics.reduce((sum, m) => sum + m.cost, 0);

        processingTimes.push(avgTime);
        successRates.push(successRate);
        costs.push(totalCost);
      } else {
        processingTimes.push(0);
        successRates.push(0);
        costs.push(0);
      }
    }

    return { timeLabels, processingTimes, successRates, costs };
  }

  /**
   * 清除旧数据
   */
  clearOldData(daysToKeep: number = 7): void {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    this.saveMetrics();
  }

  /**
   * 导出数据
   */
  exportData(): string {
    return JSON.stringify({
      metrics: this.metrics,
      config: this.config,
      exportTime: Date.now()
    }, null, 2);
  }

  /**
   * 导入数据
   */
  importData(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      if (parsed.metrics && Array.isArray(parsed.metrics)) {
        this.metrics = parsed.metrics;
        this.saveMetrics();
        return true;
      }
    } catch (error) {
      console.error('导入数据失败:', error);
    }
    return false;
  }

  // 私有方法

  private generateId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadMetrics(): void {
    try {
      const stored = localStorage.getItem('performance_metrics');
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.error('加载性能指标失败:', error);
      this.metrics = [];
    }
  }

  private saveMetrics(): void {
    try {
      localStorage.setItem('performance_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('保存性能指标失败:', error);
    }
  }

  private calculateSummary(metrics: PerformanceMetric[]) {
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.success).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    
    const totalTime = metrics.reduce((sum, m) => sum + m.processingTime, 0);
    const averageProcessingTime = totalRequests > 0 ? totalTime / totalRequests : 0;
    
    const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);
    
    const totalConfidence = metrics.reduce((sum, m) => sum + m.confidence, 0);
    const averageConfidence = totalRequests > 0 ? totalConfidence / totalRequests : 0;
    
    const totalQuestionsProcessed = metrics.reduce((sum, m) => sum + m.questionsCount, 0);

    return {
      totalRequests,
      successRate,
      averageProcessingTime,
      totalCost,
      averageConfidence,
      totalQuestionsProcessed
    };
  }

  private calculateParserStats(metrics: PerformanceMetric[]): Record<string, ParserStats> {
    const stats: Record<string, ParserStats> = {};

    for (const metric of metrics) {
      if (!stats[metric.parser]) {
        stats[metric.parser] = {
          requests: 0,
          successRate: 0,
          averageTime: 0,
          totalCost: 0,
          averageConfidence: 0
        };
      }

      const stat = stats[metric.parser];
      stat.requests++;
      stat.totalCost += metric.cost;
    }

    // 计算平均值
    for (const parser in stats) {
      const parserMetrics = metrics.filter(m => m.parser === parser);
      const successCount = parserMetrics.filter(m => m.success).length;
      
      stats[parser].successRate = (successCount / parserMetrics.length) * 100;
      stats[parser].averageTime = parserMetrics.reduce((sum, m) => sum + m.processingTime, 0) / parserMetrics.length;
      stats[parser].averageConfidence = parserMetrics.reduce((sum, m) => sum + m.confidence, 0) / parserMetrics.length;
    }

    return stats;
  }

  private calculateStrategyStats(metrics: PerformanceMetric[]): Record<string, StrategyStats> {
    const stats: Record<string, StrategyStats> = {};

    for (const metric of metrics) {
      if (!stats[metric.strategy]) {
        stats[metric.strategy] = {
          requests: 0,
          successRate: 0,
          averageTime: 0,
          totalCost: 0,
          costEfficiency: 0
        };
      }

      const stat = stats[metric.strategy];
      stat.requests++;
      stat.totalCost += metric.cost;
    }

    // 计算平均值和效率
    for (const strategy in stats) {
      const strategyMetrics = metrics.filter(m => m.strategy === strategy);
      const successCount = strategyMetrics.filter(m => m.success).length;
      const totalQuestions = strategyMetrics.reduce((sum, m) => sum + m.questionsCount, 0);
      
      stats[strategy].successRate = (successCount / strategyMetrics.length) * 100;
      stats[strategy].averageTime = strategyMetrics.reduce((sum, m) => sum + m.processingTime, 0) / strategyMetrics.length;
      stats[strategy].costEfficiency = stats[strategy].totalCost > 0 ? totalQuestions / stats[strategy].totalCost : 0;
    }

    return stats;
  }

  private calculateTrends(metrics: PerformanceMetric[]) {
    // 简化的趋势计算，实际应用中可以更复杂
    const recentMetrics = metrics.slice(-10);
    
    return {
      processingTime: recentMetrics.map(m => m.processingTime),
      successRate: recentMetrics.map(m => m.success ? 100 : 0),
      cost: recentMetrics.map(m => m.cost)
    };
  }

  private generateAlerts(metrics: PerformanceMetric[]): Alert[] {
    const alerts: Alert[] = [];
    const recentMetrics = metrics.slice(-10);

    if (recentMetrics.length === 0) return alerts;

    // 检查处理时间警报
    const avgTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length;
    if (avgTime > this.config.alertThresholds.processingTimeMs) {
      alerts.push({
        type: 'warning',
        message: `平均处理时间过长: ${(avgTime / 1000).toFixed(1)}秒`,
        timestamp: Date.now(),
        metric: 'processingTime',
        value: avgTime,
        threshold: this.config.alertThresholds.processingTimeMs
      });
    }

    // 检查成功率警报
    const successCount = recentMetrics.filter(m => m.success).length;
    const successRate = (successCount / recentMetrics.length) * 100;
    if (successRate < this.config.alertThresholds.successRatePercent) {
      alerts.push({
        type: 'error',
        message: `成功率过低: ${successRate.toFixed(1)}%`,
        timestamp: Date.now(),
        metric: 'successRate',
        value: successRate,
        threshold: this.config.alertThresholds.successRatePercent
      });
    }

    return alerts;
  }

  private checkAlerts(metric: PerformanceMetric): void {
    // 实时警报检查
    if (metric.processingTime > this.config.alertThresholds.processingTimeMs) {
      console.warn(`处理时间警报: ${metric.processingTime}ms 超过阈值 ${this.config.alertThresholds.processingTimeMs}ms`);
    }

    if (metric.confidence < this.config.alertThresholds.confidencePercent / 100) {
      console.warn(`置信度警报: ${(metric.confidence * 100).toFixed(1)}% 低于阈值 ${this.config.alertThresholds.confidencePercent}%`);
    }
  }

  private getEmptyReport(start: number, end: number): PerformanceReport {
    return {
      period: { start, end },
      summary: {
        totalRequests: 0,
        successRate: 0,
        averageProcessingTime: 0,
        totalCost: 0,
        averageConfidence: 0,
        totalQuestionsProcessed: 0
      },
      byParser: {},
      byStrategy: {},
      trends: {
        processingTime: [],
        successRate: [],
        cost: []
      },
      alerts: []
    };
  }

  private startPeriodicReporting(): void {
    setInterval(() => {
      const stats = this.getRealTimeStats();
      console.log('性能监控报告:', stats);
    }, this.config.reportingInterval);
  }
}
