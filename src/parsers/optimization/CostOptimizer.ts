/**
 * 成本优化器
 * 优化解析成本，选择最经济的解析策略
 */

import { AIConfigManager } from '../../utils/aiConfig';

export interface CostAnalysis {
  estimatedCost: number; // 预估成本（分）
  breakdown: {
    tokenCost: number;
    apiCallCost: number;
    processingCost: number;
  };
  alternatives: CostAlternative[];
  recommendations: string[];
  savingOpportunities: SavingOpportunity[];
}

export interface CostAlternative {
  strategy: string;
  cost: number;
  savings: number;
  tradeoffs: string[];
  confidence: number;
}

export interface SavingOpportunity {
  type: 'caching' | 'preprocessing' | 'chunking' | 'format_optimization';
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: number; // 0-10
}

export interface CostBudget {
  daily: number;
  monthly: number;
  perRequest: number;
  alertThreshold: number;
}

export interface CostTracker {
  today: number;
  thisMonth: number;
  totalRequests: number;
  averageCostPerRequest: number;
  lastReset: number;
}

export class CostOptimizer {
  private static instance: CostOptimizer;
  private budget: CostBudget = {
    daily: 1000, // 10元
    monthly: 20000, // 200元
    perRequest: 50, // 0.5元
    alertThreshold: 80 // 80%
  };
  private tracker: CostTracker = {
    today: 0,
    thisMonth: 0,
    totalRequests: 0,
    averageCostPerRequest: 0,
    lastReset: Date.now()
  };

  private constructor() {
    this.loadTrackerFromStorage();
    this.startDailyReset();
  }

  static getInstance(): CostOptimizer {
    if (!CostOptimizer.instance) {
      CostOptimizer.instance = new CostOptimizer();
    }
    return CostOptimizer.instance;
  }

  /**
   * 分析文本解析成本
   */
  analyzeCost(text: string, strategy: string = 'ai'): CostAnalysis {
    const tokenCount = this.estimateTokens(text);
    const config = AIConfigManager.getConfig();
    
    let estimatedCost = 0;
    let tokenCost = 0;
    let apiCallCost = 0;
    let processingCost = 0;

    if (strategy === 'ai' && config.enabled && config.provider !== 'local') {
      const model = AIConfigManager.getModel(config.provider, config.model);
      if (model) {
        tokenCost = Math.ceil((tokenCount / 1000) * model.costPer1kTokens);
        apiCallCost = 5; // 基础API调用成本
        processingCost = Math.ceil(tokenCount / 10000) * 2; // 处理成本
        estimatedCost = tokenCost + apiCallCost + processingCost;
      }
    }

    const alternatives = this.generateAlternatives(text, estimatedCost);
    const savingOpportunities = this.identifySavingOpportunities(text, tokenCount);
    const recommendations = this.generateRecommendations(estimatedCost, alternatives);

    return {
      estimatedCost,
      breakdown: {
        tokenCost,
        apiCallCost,
        processingCost
      },
      alternatives,
      recommendations,
      savingOpportunities
    };
  }

  /**
   * 估算token数量
   */
  private estimateTokens(text: string): number {
    // 中文字符按1.5个token计算，英文单词按1个token计算
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const punctuation = (text.match(/[^\w\s\u4e00-\u9fa5]/g) || []).length;
    
    return Math.ceil(chineseChars * 1.5 + englishWords + punctuation * 0.5 + 500); // 加上prompt的token
  }

  /**
   * 生成替代方案
   */
  private generateAlternatives(text: string, aiCost: number): CostAlternative[] {
    const alternatives: CostAlternative[] = [];

    // 规则解析
    alternatives.push({
      strategy: 'rule_based',
      cost: 0,
      savings: aiCost,
      tradeoffs: ['准确率可能较低', '不支持复杂格式'],
      confidence: 0.7
    });

    // OCR + 规则解析
    if (text.length > 1000) {
      alternatives.push({
        strategy: 'ocr_preprocessing',
        cost: Math.ceil(aiCost * 0.3),
        savings: Math.ceil(aiCost * 0.7),
        tradeoffs: ['需要额外的预处理时间', 'OCR可能有识别错误'],
        confidence: 0.8
      });
    }

    // 分块处理
    if (text.length > 2000) {
      const chunkCost = Math.ceil(aiCost * 0.6);
      alternatives.push({
        strategy: 'chunked_processing',
        cost: chunkCost,
        savings: aiCost - chunkCost,
        tradeoffs: ['处理时间较长', '可能丢失上下文信息'],
        confidence: 0.9
      });
    }

    // 缓存策略
    alternatives.push({
      strategy: 'cached_result',
      cost: 0,
      savings: aiCost,
      tradeoffs: ['仅适用于重复内容'],
      confidence: 0.95
    });

    return alternatives.sort((a, b) => b.savings - a.savings);
  }

  /**
   * 识别节省机会
   */
  private identifySavingOpportunities(text: string, tokenCount: number): SavingOpportunity[] {
    const opportunities: SavingOpportunity[] = [];

    // 缓存机会
    opportunities.push({
      type: 'caching',
      description: '启用智能缓存，避免重复解析相同内容',
      potentialSavings: Math.ceil(tokenCount * 0.8),
      effort: 'low',
      impact: 8
    });

    // 预处理机会
    if (text.includes('　') || text.includes('\t')) {
      opportunities.push({
        type: 'preprocessing',
        description: '清理文本格式，减少无效token',
        potentialSavings: Math.ceil(tokenCount * 0.1),
        effort: 'low',
        impact: 3
      });
    }

    // 分块机会
    if (text.length > 2000) {
      opportunities.push({
        type: 'chunking',
        description: '将长文本分块处理，提高成功率',
        potentialSavings: Math.ceil(tokenCount * 0.3),
        effort: 'medium',
        impact: 6
      });
    }

    // 格式优化机会
    if (text.includes('\n\n\n') || text.includes('  ')) {
      opportunities.push({
        type: 'format_optimization',
        description: '优化文本格式，减少冗余内容',
        potentialSavings: Math.ceil(tokenCount * 0.15),
        effort: 'low',
        impact: 4
      });
    }

    return opportunities.sort((a, b) => b.impact - a.impact);
  }

  /**
   * 生成建议
   */
  private generateRecommendations(cost: number, alternatives: CostAlternative[]): string[] {
    const recommendations: string[] = [];

    if (cost > this.budget.perRequest) {
      recommendations.push(`成本超出单次预算(${this.budget.perRequest}分)，建议使用替代方案`);
    }

    if (alternatives.length > 0 && alternatives[0].savings > cost * 0.5) {
      recommendations.push(`推荐使用${alternatives[0].strategy}策略，可节省${alternatives[0].savings}分`);
    }

    const todayUsage = (this.tracker.today / this.budget.daily) * 100;
    if (todayUsage > this.budget.alertThreshold) {
      recommendations.push(`今日成本已达预算的${todayUsage.toFixed(1)}%，建议谨慎使用AI解析`);
    }

    if (this.tracker.averageCostPerRequest > 20) {
      recommendations.push('平均单次成本较高，建议启用缓存和预处理优化');
    }

    return recommendations;
  }

  /**
   * 记录成本
   */
  recordCost(cost: number): void {
    this.tracker.today += cost;
    this.tracker.thisMonth += cost;
    this.tracker.totalRequests++;
    this.tracker.averageCostPerRequest = 
      (this.tracker.today + this.tracker.thisMonth) / this.tracker.totalRequests;

    this.saveTrackerToStorage();

    // 检查预算警告
    this.checkBudgetAlerts();
  }

  /**
   * 检查预算警告
   */
  private checkBudgetAlerts(): void {
    const dailyUsage = (this.tracker.today / this.budget.daily) * 100;
    const monthlyUsage = (this.tracker.thisMonth / this.budget.monthly) * 100;

    if (dailyUsage >= 100) {
      console.warn('⚠️ 今日成本预算已用完');
    } else if (dailyUsage >= this.budget.alertThreshold) {
      console.warn(`⚠️ 今日成本已达预算的${dailyUsage.toFixed(1)}%`);
    }

    if (monthlyUsage >= 100) {
      console.warn('⚠️ 本月成本预算已用完');
    } else if (monthlyUsage >= this.budget.alertThreshold) {
      console.warn(`⚠️ 本月成本已达预算的${monthlyUsage.toFixed(1)}%`);
    }
  }

  /**
   * 检查是否可以使用AI
   */
  canUseAI(estimatedCost: number): boolean {
    return (
      this.tracker.today + estimatedCost <= this.budget.daily &&
      this.tracker.thisMonth + estimatedCost <= this.budget.monthly &&
      estimatedCost <= this.budget.perRequest
    );
  }

  /**
   * 获取成本统计
   */
  getCostStats(): {
    budget: CostBudget;
    tracker: CostTracker;
    usage: {
      dailyPercentage: number;
      monthlyPercentage: number;
    };
    projections: {
      dailyProjection: number;
      monthlyProjection: number;
    };
  } {
    const dailyPercentage = (this.tracker.today / this.budget.daily) * 100;
    const monthlyPercentage = (this.tracker.thisMonth / this.budget.monthly) * 100;

    // 简单的线性投影
    const now = new Date();
    const dayProgress = (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
    const dailyProjection = dayProgress > 0 ? this.tracker.today / dayProgress : 0;

    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth;
    const monthlyProjection = monthProgress > 0 ? this.tracker.thisMonth / monthProgress : 0;

    return {
      budget: this.budget,
      tracker: this.tracker,
      usage: {
        dailyPercentage,
        monthlyPercentage
      },
      projections: {
        dailyProjection,
        monthlyProjection
      }
    };
  }

  /**
   * 设置预算
   */
  setBudget(budget: Partial<CostBudget>): void {
    this.budget = { ...this.budget, ...budget };
    this.saveTrackerToStorage();
    console.log('成本预算已更新:', this.budget);
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.tracker = {
      today: 0,
      thisMonth: 0,
      totalRequests: 0,
      averageCostPerRequest: 0,
      lastReset: Date.now()
    };
    this.saveTrackerToStorage();
  }

  /**
   * 启动每日重置
   */
  private startDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.tracker.today = 0;
      this.saveTrackerToStorage();
      
      // 设置每日重置定时器
      setInterval(() => {
        this.tracker.today = 0;
        this.saveTrackerToStorage();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * 从存储加载追踪数据
   */
  private loadTrackerFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('cost_tracker');
      if (stored) {
        const data = JSON.parse(stored);
        this.tracker = { ...this.tracker, ...data.tracker };
        this.budget = { ...this.budget, ...data.budget };
      }
    } catch (error) {
      console.error('加载成本追踪数据失败:', error);
    }
  }

  /**
   * 保存追踪数据到存储
   */
  private saveTrackerToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = {
        tracker: this.tracker,
        budget: this.budget,
        timestamp: Date.now()
      };
      localStorage.setItem('cost_tracker', JSON.stringify(data));
    } catch (error) {
      console.error('保存成本追踪数据失败:', error);
    }
  }
}

export default CostOptimizer;
