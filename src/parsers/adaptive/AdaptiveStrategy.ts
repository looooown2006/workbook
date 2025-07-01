/**
 * 自适应策略系统
 * 根据历史表现动态调整解析策略
 */

import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';

export interface StrategyPerformance {
  strategy: string;
  successRate: number;
  averageTime: number;
  averageCost: number;
  averageConfidence: number;
  totalUsage: number;
  recentTrend: 'improving' | 'declining' | 'stable';
  lastUsed: number;
}

export interface AdaptationRule {
  name: string;
  condition: (performance: StrategyPerformance[], context: any) => boolean;
  action: (performance: StrategyPerformance[]) => StrategyAdjustment;
  priority: number;
}

export interface StrategyAdjustment {
  type: 'boost' | 'penalize' | 'disable' | 'enable';
  strategy: string;
  amount: number;
  reason: string;
  duration?: number; // 持续时间（毫秒）
}

export interface AdaptiveConfig {
  learningRate: number; // 学习速率 (0-1)
  adaptationThreshold: number; // 适应阈值
  minSampleSize: number; // 最小样本数量
  trendWindow: number; // 趋势窗口大小
  enableAutoAdjustment: boolean;
}

export class AdaptiveStrategy {
  private static instance: AdaptiveStrategy;
  private monitor: PerformanceMonitor;
  private config: AdaptiveConfig = {
    learningRate: 0.1,
    adaptationThreshold: 0.15,
    minSampleSize: 10,
    trendWindow: 20,
    enableAutoAdjustment: true
  };
  private adjustments = new Map<string, StrategyAdjustment[]>();
  private rules: AdaptationRule[] = [];

  private constructor() {
    this.monitor = PerformanceMonitor.getInstance();
    this.registerDefaultRules();
  }

  static getInstance(): AdaptiveStrategy {
    if (!AdaptiveStrategy.instance) {
      AdaptiveStrategy.instance = new AdaptiveStrategy();
    }
    return AdaptiveStrategy.instance;
  }

  /**
   * 分析策略性能
   */
  analyzePerformance(): StrategyPerformance[] {
    const report = this.monitor.generateReport();
    const performances: StrategyPerformance[] = [];

    for (const [strategy, stats] of Object.entries(report.byStrategy)) {
      const recentMetrics = this.monitor.getRecentMetrics(this.config.trendWindow)
        .filter(m => m.strategy === strategy);

      const trend = this.calculateTrend(recentMetrics);

      performances.push({
        strategy,
        successRate: stats.successRate,
        averageTime: stats.averageTime,
        averageCost: stats.totalCost / stats.requests,
        averageConfidence: stats.averageConfidence,
        totalUsage: stats.requests,
        recentTrend: trend,
        lastUsed: Math.max(...recentMetrics.map(m => m.timestamp), 0)
      });
    }

    return performances;
  }

  /**
   * 计算趋势
   */
  private calculateTrend(metrics: any[]): 'improving' | 'declining' | 'stable' {
    if (metrics.length < 5) return 'stable';

    const recent = metrics.slice(-5);
    const earlier = metrics.slice(-10, -5);

    if (earlier.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, m) => sum + m.confidence, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, m) => sum + m.confidence, 0) / earlier.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * 执行自适应调整
   */
  adapt(context?: any): StrategyAdjustment[] {
    if (!this.config.enableAutoAdjustment) {
      return [];
    }

    const performances = this.analyzePerformance();
    const adjustments: StrategyAdjustment[] = [];

    // 应用适应规则
    for (const rule of this.rules.sort((a, b) => b.priority - a.priority)) {
      if (rule.condition(performances, context)) {
        const adjustment = rule.action(performances);
        adjustments.push(adjustment);
        this.applyAdjustment(adjustment);
      }
    }

    return adjustments;
  }

  /**
   * 应用调整
   */
  private applyAdjustment(adjustment: StrategyAdjustment): void {
    const existing = this.adjustments.get(adjustment.strategy) || [];
    existing.push({
      ...adjustment,
      duration: adjustment.duration || 24 * 60 * 60 * 1000 // 默认24小时
    });
    this.adjustments.set(adjustment.strategy, existing);

    console.log(`应用策略调整: ${adjustment.type} ${adjustment.strategy} (${adjustment.reason})`);

    // 设置过期清理
    if (adjustment.duration) {
      setTimeout(() => {
        this.removeAdjustment(adjustment.strategy, adjustment);
      }, adjustment.duration);
    }
  }

  /**
   * 移除调整
   */
  private removeAdjustment(strategy: string, adjustment: StrategyAdjustment): void {
    const existing = this.adjustments.get(strategy) || [];
    const filtered = existing.filter(a => a !== adjustment);
    this.adjustments.set(strategy, filtered);
    console.log(`移除策略调整: ${adjustment.type} ${strategy}`);
  }

  /**
   * 获取策略调整分数
   */
  getAdjustmentScore(strategy: string): number {
    const adjustments = this.adjustments.get(strategy) || [];
    let score = 0;

    for (const adjustment of adjustments) {
      switch (adjustment.type) {
        case 'boost':
          score += adjustment.amount;
          break;
        case 'penalize':
          score -= adjustment.amount;
          break;
        case 'disable':
          score = -100;
          break;
        case 'enable':
          score = Math.max(score, 0);
          break;
      }
    }

    return score;
  }

  /**
   * 注册默认规则
   */
  private registerDefaultRules(): void {
    // 成功率过低规则
    this.registerRule({
      name: 'low_success_rate',
      priority: 10,
      condition: (performances) => {
        return performances.some(p => 
          p.totalUsage >= this.config.minSampleSize && 
          p.successRate < 0.7
        );
      },
      action: (performances) => {
        const worst = performances
          .filter(p => p.totalUsage >= this.config.minSampleSize)
          .sort((a, b) => a.successRate - b.successRate)[0];
        
        return {
          type: 'penalize',
          strategy: worst.strategy,
          amount: 3,
          reason: `成功率过低 (${(worst.successRate * 100).toFixed(1)}%)`
        };
      }
    });

    // 性能下降规则
    this.registerRule({
      name: 'declining_trend',
      priority: 8,
      condition: (performances) => {
        return performances.some(p => 
          p.totalUsage >= this.config.minSampleSize && 
          p.recentTrend === 'declining'
        );
      },
      action: (performances) => {
        const declining = performances.find(p => 
          p.totalUsage >= this.config.minSampleSize && 
          p.recentTrend === 'declining'
        )!;
        
        return {
          type: 'penalize',
          strategy: declining.strategy,
          amount: 2,
          reason: '性能呈下降趋势'
        };
      }
    });

    // 性能提升规则
    this.registerRule({
      name: 'improving_trend',
      priority: 6,
      condition: (performances) => {
        return performances.some(p => 
          p.totalUsage >= this.config.minSampleSize && 
          p.recentTrend === 'improving'
        );
      },
      action: (performances) => {
        const improving = performances.find(p => 
          p.totalUsage >= this.config.minSampleSize && 
          p.recentTrend === 'improving'
        )!;
        
        return {
          type: 'boost',
          strategy: improving.strategy,
          amount: 2,
          reason: '性能呈上升趋势'
        };
      }
    });

    // 成本效益规则
    this.registerRule({
      name: 'cost_efficiency',
      priority: 5,
      condition: (performances) => {
        const aiStrategies = performances.filter(p => p.strategy.includes('ai'));
        return aiStrategies.some(p => p.averageCost > 100); // 超过1元
      },
      action: (performances) => {
        const expensive = performances
          .filter(p => p.strategy.includes('ai'))
          .sort((a, b) => b.averageCost - a.averageCost)[0];
        
        return {
          type: 'penalize',
          strategy: expensive.strategy,
          amount: 1,
          reason: `成本过高 (${expensive.averageCost}分)`
        };
      }
    });

    // 长期未使用规则
    this.registerRule({
      name: 'unused_strategy',
      priority: 3,
      condition: (performances) => {
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        return performances.some(p => now - p.lastUsed > oneWeek);
      },
      action: (performances) => {
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const unused = performances.find(p => now - p.lastUsed > oneWeek)!;
        
        return {
          type: 'penalize',
          strategy: unused.strategy,
          amount: 1,
          reason: '长期未使用',
          duration: oneWeek
        };
      }
    });
  }

  /**
   * 注册适应规则
   */
  registerRule(rule: AdaptationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取适应报告
   */
  getAdaptationReport(): {
    performances: StrategyPerformance[];
    activeAdjustments: Map<string, StrategyAdjustment[]>;
    recommendations: string[];
    config: AdaptiveConfig;
  } {
    const performances = this.analyzePerformance();
    const recommendations: string[] = [];

    // 生成建议
    for (const performance of performances) {
      if (performance.totalUsage < this.config.minSampleSize) {
        recommendations.push(`${performance.strategy}策略样本数量不足，建议增加使用`);
      }
      
      if (performance.recentTrend === 'declining') {
        recommendations.push(`${performance.strategy}策略性能下降，建议检查配置`);
      }
      
      if (performance.successRate < 0.8) {
        recommendations.push(`${performance.strategy}策略成功率偏低，建议优化或减少使用`);
      }
    }

    return {
      performances,
      activeAdjustments: this.adjustments,
      recommendations,
      config: this.config
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AdaptiveConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('自适应策略配置已更新:', this.config);
  }

  /**
   * 重置调整
   */
  resetAdjustments(): void {
    this.adjustments.clear();
    console.log('所有策略调整已重置');
  }
}

export default AdaptiveStrategy;
