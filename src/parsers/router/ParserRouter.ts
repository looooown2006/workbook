/**
 * 智能解析路由系统
 * 根据输入类型和成本考虑，智能选择解析策略
 */

import { IQuestionParser, ParseInput, ParseResult } from '../interfaces/IQuestionParser';
import { RuleBasedParser } from '../rule/RuleBasedParser';
import { OCRParser } from '../ocr/OCRParser';
import { AIParser } from '../../utils/aiParser';
import { FormatDetector } from '../rule/FormatDetector';
import { AIConfigManager } from '../../utils/aiConfig';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';

export interface ParsingStrategy {
  name: string;
  parser: IQuestionParser | 'ai';
  cost: number; // 相对成本 (0-10)
  speed: number; // 处理速度 (0-10)
  accuracy: number; // 准确率 (0-10)
  reliability: number; // 可靠性 (0-10)
  supportedTypes: ('text' | 'image' | 'pdf')[];
  supportedFormats: string[];
  requirements: string[]; // 使用要求
}

export interface RoutingDecision {
  selectedStrategy: ParsingStrategy;
  confidence: number;
  reasoning: string[];
  alternatives: ParsingStrategy[];
  estimatedCost: number;
  estimatedTime: number;
}

export interface RoutingContext {
  inputType: 'text' | 'image' | 'pdf';
  textLength?: number;
  fileSize?: number;
  detectedFormat?: string;
  formatConfidence?: number;
  userPreference?: 'speed' | 'accuracy' | 'cost';
  budget?: number; // 成本预算
  timeLimit?: number; // 时间限制(ms)
  qualityRequirement?: 'low' | 'medium' | 'high';
}

export class ParserRouter {

  private monitor = PerformanceMonitor.getInstance();
  private strategies: ParsingStrategy[] = [
    {
      name: 'rule_based',
      parser: new RuleBasedParser(),
      cost: 0,
      speed: 10,
      accuracy: 7,
      reliability: 9,
      supportedTypes: ['text'],
      supportedFormats: ['standard_choice', 'simple_choice', 'numeric_choice', 'parenthesis_choice'],
      requirements: []
    },
    {
      name: 'ocr_processing',
      parser: new OCRParser(),
      cost: 2,
      speed: 4,
      accuracy: 6,
      reliability: 7,
      supportedTypes: ['image', 'pdf'],
      supportedFormats: ['ocr_format', 'mixed_format'],
      requirements: []
    },
    {
      name: 'ai_parsing',
      parser: 'ai',
      cost: 8,
      speed: 6,
      accuracy: 9,
      reliability: 8,
      supportedTypes: ['text', 'image', 'pdf'],
      supportedFormats: ['*'], // 支持所有格式
      requirements: ['AI服务配置', 'API密钥', '网络连接']
    }
  ];

  /**
   * 智能选择解析策略
   */
  async route(input: ParseInput, context?: Partial<RoutingContext>): Promise<RoutingDecision> {
    // 分析输入上下文
    const fullContext = await this.analyzeContext(input, context);
    
    // 过滤可用策略
    const availableStrategies = this.filterAvailableStrategies(fullContext);
    
    // 评估策略
    const evaluatedStrategies = this.evaluateStrategies(availableStrategies, fullContext);
    
    // 选择最佳策略
    const selectedStrategy = this.selectBestStrategy(evaluatedStrategies, fullContext);
    
    // 生成决策说明
    const reasoning = this.generateReasoning(selectedStrategy, fullContext);
    
    return {
      selectedStrategy,
      confidence: this.calculateConfidence(selectedStrategy, fullContext),
      reasoning,
      alternatives: evaluatedStrategies.slice(1, 3),
      estimatedCost: this.estimateCost(selectedStrategy, fullContext),
      estimatedTime: this.estimateTime(selectedStrategy, fullContext)
    };
  }

  /**
   * 执行解析
   */
  async parse(input: ParseInput, context?: Partial<RoutingContext>): Promise<ParseResult> {
    const startTime = Date.now();
    
    try {
      // 获取路由决策
      const decision = await this.route(input, context);
      
      console.log(`选择解析策略: ${decision.selectedStrategy.name}`);
      console.log(`决策理由: ${decision.reasoning.join(', ')}`);
      
      // 执行解析
      let result: ParseResult;

      if (decision.selectedStrategy.parser === 'ai') {
        // 使用AI解析
        const aiContext = {
          inputType: input.type,
          textLength: typeof input.content === 'string' ? input.content.length : undefined,
          detectedFormat: context?.detectedFormat,
          formatConfidence: context?.formatConfidence
        };

        const aiResult = await AIParser.parseWithAI(
          typeof input.content === 'string' ? input.content : '',
          aiContext
        );

        result = {
          success: aiResult.success,
          questions: aiResult.questions,
          confidence: decision.confidence,
          errors: aiResult.errors,
          metadata: {
            parser: 'AI',
            strategy: decision.selectedStrategy.name,
            processingTime: Date.now() - startTime,
            estimatedCost: decision.estimatedCost,
            reasoning: decision.reasoning
          }
        };
      } else {
        // 使用其他解析器
        result = await (decision.selectedStrategy.parser as IQuestionParser).parse(input);

        // 添加路由元数据
        result.metadata = {
          ...result.metadata,
          strategy: decision.selectedStrategy.name,
          estimatedCost: decision.estimatedCost,
          reasoning: decision.reasoning
        };
      }

      // 记录性能指标
      this.monitor.recordMetric({
        parser: result.metadata?.parser || decision.selectedStrategy.name,
        strategy: decision.selectedStrategy.name,
        inputType: input.type,
        inputSize: this.getInputSize(input),
        processingTime: Date.now() - startTime,
        success: result.success,
        questionsCount: result.questions.length,
        confidence: result.confidence,
        cost: decision.estimatedCost,
        errors: result.errors,
        metadata: {
          reasoning: decision.reasoning,
          alternatives: decision.alternatives.map(a => a.name)
        }
      });

      return result;
      
    } catch (error) {
      console.error('解析路由失败:', error);
      return {
        success: false,
        questions: [],
        confidence: 0,
        errors: [`解析路由失败: ${error instanceof Error ? error.message : String(error)}`],
        metadata: {
          parser: 'Router',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * 分析输入上下文
   */
  private async analyzeContext(input: ParseInput, context?: Partial<RoutingContext>): Promise<RoutingContext> {
    const baseContext: RoutingContext = {
      inputType: input.type,
      userPreference: 'accuracy',
      qualityRequirement: 'medium',
      ...context
    };

    // 分析文本输入
    if (input.type === 'text' && typeof input.content === 'string') {
      baseContext.textLength = input.content.length;
      
      // 检测格式
      if (!baseContext.detectedFormat) {
        const formatResult = FormatDetector.detectFormat(input.content);
        baseContext.detectedFormat = formatResult.detectedFormat;
        baseContext.formatConfidence = formatResult.confidence;
      }
    }

    // 分析文件输入
    if (input.content instanceof File) {
      baseContext.fileSize = input.content.size;
    }

    return baseContext;
  }

  /**
   * 过滤可用策略
   */
  private filterAvailableStrategies(context: RoutingContext): ParsingStrategy[] {
    return this.strategies.filter(strategy => {
      // 检查输入类型支持
      if (!strategy.supportedTypes.includes(context.inputType)) {
        return false;
      }

      // 检查格式支持
      if (context.detectedFormat && 
          !strategy.supportedFormats.includes('*') && 
          !strategy.supportedFormats.includes(context.detectedFormat)) {
        return false;
      }

      // 检查AI策略的可用性
      if (strategy.parser === 'ai') {
        const aiConfig = AIConfigManager.getConfig();
        if (!aiConfig.enabled || aiConfig.provider === 'local') {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 评估策略
   */
  private evaluateStrategies(strategies: ParsingStrategy[], context: RoutingContext): ParsingStrategy[] {
    const evaluated = strategies.map(strategy => {
      let score = 0;
      
      // 根据用户偏好调整权重
      switch (context.userPreference) {
        case 'speed':
          score = strategy.speed * 0.4 + strategy.reliability * 0.3 + strategy.accuracy * 0.2 - strategy.cost * 0.1;
          break;
        case 'accuracy':
          score = strategy.accuracy * 0.4 + strategy.reliability * 0.3 + strategy.speed * 0.2 - strategy.cost * 0.1;
          break;
        case 'cost':
          score = (10 - strategy.cost) * 0.4 + strategy.reliability * 0.3 + strategy.speed * 0.2 + strategy.accuracy * 0.1;
          break;
        default:
          score = strategy.accuracy * 0.3 + strategy.reliability * 0.3 + strategy.speed * 0.2 + (10 - strategy.cost) * 0.2;
      }

      // 格式匹配度调整
      if (context.detectedFormat && strategy.supportedFormats.includes(context.detectedFormat)) {
        score += 2;
      }

      // 质量要求调整
      if (context.qualityRequirement === 'high' && strategy.accuracy < 8) {
        score -= 3;
      }

      return { ...strategy, score };
    });

    return evaluated.sort((a, b) => (b as any).score - (a as any).score);
  }

  /**
   * 选择最佳策略
   */
  private selectBestStrategy(strategies: ParsingStrategy[], context: RoutingContext): ParsingStrategy {
    if (strategies.length === 0) {
      throw new Error('没有可用的解析策略');
    }

    return strategies[0];
  }

  /**
   * 生成决策理由
   */
  private generateReasoning(strategy: ParsingStrategy, context: RoutingContext): string[] {
    const reasons: string[] = [];

    reasons.push(`选择${strategy.name}策略`);

    if (context.detectedFormat && strategy.supportedFormats.includes(context.detectedFormat)) {
      reasons.push(`支持检测到的${context.detectedFormat}格式`);
    }

    if (context.userPreference) {
      reasons.push(`符合${context.userPreference}偏好`);
    }

    if (strategy.cost === 0) {
      reasons.push('无额外成本');
    } else if (strategy.cost <= 3) {
      reasons.push('成本较低');
    }

    if (strategy.speed >= 8) {
      reasons.push('处理速度快');
    }

    if (strategy.accuracy >= 8) {
      reasons.push('准确率高');
    }

    return reasons;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(strategy: ParsingStrategy, context: RoutingContext): number {
    let confidence = 0.7; // 基础置信度

    // 格式匹配度影响
    if (context.formatConfidence) {
      confidence += context.formatConfidence * 0.2;
    }

    // 策略可靠性影响
    confidence += (strategy.reliability / 10) * 0.1;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * 估算成本
   */
  private estimateCost(strategy: ParsingStrategy, context: RoutingContext): number {
    let cost = strategy.cost;

    // 根据输入大小调整成本
    if (context.textLength && context.textLength > 5000) {
      cost += 1;
    }

    if (context.fileSize && context.fileSize > 10 * 1024 * 1024) { // 10MB
      cost += 2;
    }

    return cost;
  }

  /**
   * 估算处理时间
   */
  private estimateTime(strategy: ParsingStrategy, context: RoutingContext): number {
    let baseTime = (10 - strategy.speed) * 1000; // 基础时间(ms)

    // 根据输入大小调整时间
    if (context.textLength) {
      baseTime += Math.floor(context.textLength / 1000) * 100;
    }

    if (context.fileSize) {
      baseTime += Math.floor(context.fileSize / (1024 * 1024)) * 2000; // 每MB增加2秒
    }

    return baseTime;
  }

  /**
   * 获取所有可用策略
   */
  getAvailableStrategies(): ParsingStrategy[] {
    return [...this.strategies];
  }

  /**
   * 添加自定义策略
   */
  addStrategy(strategy: ParsingStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * 获取输入大小
   */
  private getInputSize(input: ParseInput): number {
    if (typeof input.content === 'string') {
      return input.content.length;
    } else if (input.content instanceof File) {
      return input.content.size;
    }
    return 0;
  }

  /**
   * 获取性能监控器
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.monitor;
  }
}
