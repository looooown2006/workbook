/**
 * 格式检测器
 * 自动识别题目文本格式，选择最优解析策略
 */

import { FormatPattern, ALL_FORMAT_PATTERNS } from './FormatPatterns';

export interface FormatDetectionResult {
  detectedFormat: string;
  confidence: number;
  characteristics: string[];
  recommendations: string[];
  alternativeFormats: Array<{
    format: string;
    confidence: number;
  }>;
  metadata: {
    textLength: number;
    questionCount: number;
    hasAnswers: boolean;
    hasExplanations: boolean;
    qualityScore: number;
  };
}

export interface FormatAnalysis {
  pattern: FormatPattern;
  matchScore: number;
  matchedPatterns: number;
  confidence: number;
  issues: string[];
}

export class FormatDetector {
  
  /**
   * 检测文本格式
   */
  static detectFormat(text: string): FormatDetectionResult {
    const startTime = Date.now();
    
    // 预处理文本
    const cleanedText = this.preprocessText(text);
    
    // 分析所有格式模式
    const analyses = this.analyzeAllPatterns(cleanedText);
    
    // 选择最佳格式
    const bestFormat = this.selectBestFormat(analyses);
    
    // 生成元数据
    const metadata = this.generateMetadata(cleanedText);
    
    // 生成建议
    const recommendations = this.generateRecommendations(bestFormat, metadata);
    
    console.log(`格式检测完成，耗时: ${Date.now() - startTime}ms`);
    
    return {
      detectedFormat: bestFormat.pattern.name,
      confidence: bestFormat.confidence,
      characteristics: bestFormat.pattern.characteristics,
      recommendations,
      alternativeFormats: analyses
        .filter(a => a.pattern.name !== bestFormat.pattern.name)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map(a => ({
          format: a.pattern.name,
          confidence: a.confidence
        })),
      metadata
    };
  }

  /**
   * 预处理文本
   */
  private static preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  /**
   * 分析所有格式模式
   */
  private static analyzeAllPatterns(text: string): FormatAnalysis[] {
    return ALL_FORMAT_PATTERNS.map(pattern => this.analyzePattern(text, pattern));
  }

  /**
   * 分析单个格式模式
   */
  private static analyzePattern(text: string, pattern: FormatPattern): FormatAnalysis {
    let matchedPatterns = 0;
    let totalScore = 0;
    const issues: string[] = [];

    // 检查每个正则模式
    for (const regex of pattern.patterns) {
      const matches = text.match(regex);
      if (matches) {
        matchedPatterns++;
        totalScore += matches.length;
      }
    }

    // 计算匹配分数
    const matchScore = totalScore / Math.max(pattern.patterns.length, 1);
    
    // 基础置信度
    let confidence = pattern.confidence * (matchedPatterns / pattern.patterns.length);
    
    // 根据文本特征调整置信度
    confidence = this.adjustConfidenceByText(confidence, text, pattern, issues);
    
    return {
      pattern,
      matchScore,
      matchedPatterns,
      confidence: Math.max(0, Math.min(1, confidence)),
      issues
    };
  }

  /**
   * 根据文本特征调整置信度
   */
  private static adjustConfidenceByText(
    baseConfidence: number, 
    text: string, 
    pattern: FormatPattern,
    issues: string[]
  ): number {
    let confidence = baseConfidence;
    
    // 检查题目数量
    const questionCount = this.countQuestions(text);
    if (questionCount === 0) {
      confidence *= 0.1;
      issues.push('未检测到题目');
    } else if (questionCount > 1 && pattern.name.includes('simple')) {
      confidence *= 0.8; // 简单格式处理多题目能力较弱
    }

    // 检查选项完整性
    const optionCount = this.countOptions(text);
    const expectedOptions = questionCount * 4;
    if (optionCount < expectedOptions * 0.5) {
      confidence *= 0.7;
      issues.push('选项不完整');
    }

    // 检查答案存在性
    const hasAnswers = this.hasAnswers(text);
    if (!hasAnswers && pattern.name === 'standard_choice') {
      confidence *= 0.8;
      issues.push('缺少答案');
    }

    // 检查格式一致性
    const consistencyScore = this.checkFormatConsistency(text, pattern);
    confidence *= consistencyScore;
    if (consistencyScore < 0.8) {
      issues.push('格式不一致');
    }

    // 检查文本质量
    const qualityScore = this.assessTextQuality(text);
    if (qualityScore < 0.5 && pattern.name !== 'ocr_format') {
      confidence *= 0.6;
      issues.push('文本质量较低');
    }

    return confidence;
  }

  /**
   * 选择最佳格式
   */
  private static selectBestFormat(analyses: FormatAnalysis[]): FormatAnalysis {
    // 按置信度排序
    const sorted = analyses.sort((a, b) => {
      // 首先按置信度排序
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }
      // 置信度相近时，按优先级排序
      return a.pattern.priority - b.pattern.priority;
    });

    return sorted[0];
  }

  /**
   * 统计题目数量
   */
  private static countQuestions(text: string): number {
    const patterns = [
      /^\d+[.、]/gm,
      /^第\d+题/gm,
      /^\(\d+\)/gm
    ];

    let maxCount = 0;
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        maxCount = Math.max(maxCount, matches.length);
      }
    }

    return maxCount;
  }

  /**
   * 统计选项数量
   */
  private static countOptions(text: string): number {
    const patterns = [
      /[A-D][.、]/g,
      /[1-4][.、]/g,
      /\([A-D]\)/g,
      /\([1-4]\)/g
    ];

    let maxCount = 0;
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        maxCount = Math.max(maxCount, matches.length);
      }
    }

    return maxCount;
  }

  /**
   * 检查是否包含答案
   */
  private static hasAnswers(text: string): boolean {
    const answerPatterns = [
      /答案[：:]\s*[A-D1-4]/i,
      /正确答案[：:]\s*[A-D1-4]/i,
      /参考答案[：:]\s*[A-D1-4]/i
    ];

    return answerPatterns.some(pattern => pattern.test(text));
  }

  /**
   * 检查格式一致性
   */
  private static checkFormatConsistency(text: string, pattern: FormatPattern): number {
    // 检查选项标记的一致性
    const optionMarkers = text.match(/[A-D1-4][.、()]/g) || [];
    if (optionMarkers.length === 0) return 0.5;

    // 统计不同类型的标记
    const letterMarkers = optionMarkers.filter(m => /[A-D]/.test(m)).length;
    const numberMarkers = optionMarkers.filter(m => /[1-4]/.test(m)).length;
    const dotMarkers = optionMarkers.filter(m => /[.、]/.test(m)).length;
    const parenMarkers = optionMarkers.filter(m => /[()]/.test(m)).length;

    // 计算一致性分数
    const total = optionMarkers.length;
    const maxType = Math.max(letterMarkers, numberMarkers);
    const maxFormat = Math.max(dotMarkers, parenMarkers);

    const typeConsistency = maxType / total;
    const formatConsistency = maxFormat / total;

    return (typeConsistency + formatConsistency) / 2;
  }

  /**
   * 评估文本质量
   */
  private static assessTextQuality(text: string): number {
    let score = 1.0;

    // 检查异常字符
    const abnormalChars = text.match(/[^\w\s\u4e00-\u9fff.,;:!?()[\]{}""'']/g);
    if (abnormalChars) {
      score -= Math.min(0.3, abnormalChars.length / text.length);
    }

    // 检查异常空格
    const abnormalSpaces = text.match(/\s{3,}/g);
    if (abnormalSpaces) {
      score -= Math.min(0.2, abnormalSpaces.length * 0.05);
    }

    // 检查连续重复字符
    const repeatedChars = text.match(/(.)\1{3,}/g);
    if (repeatedChars) {
      score -= Math.min(0.2, repeatedChars.length * 0.1);
    }

    return Math.max(0, score);
  }

  /**
   * 生成元数据
   */
  private static generateMetadata(text: string) {
    return {
      textLength: text.length,
      questionCount: this.countQuestions(text),
      hasAnswers: this.hasAnswers(text),
      hasExplanations: /解析[：:]/.test(text),
      qualityScore: this.assessTextQuality(text)
    };
  }

  /**
   * 生成建议
   */
  private static generateRecommendations(analysis: FormatAnalysis, metadata: any): string[] {
    const recommendations: string[] = [];

    if (analysis.confidence < 0.5) {
      recommendations.push('文本格式识别置信度较低，建议手动检查格式');
    }

    if (metadata.qualityScore < 0.7) {
      recommendations.push('文本质量较低，建议进行预处理或使用OCR修复');
    }

    if (!metadata.hasAnswers) {
      recommendations.push('未检测到答案，建议补充答案信息');
    }

    if (metadata.questionCount === 0) {
      recommendations.push('未检测到有效题目，请检查文本格式');
    }

    if (analysis.issues.length > 0) {
      recommendations.push(`发现格式问题：${analysis.issues.join('、')}`);
    }

    return recommendations;
  }

  /**
   * 快速格式检测（用于实时预览）
   */
  static quickDetect(text: string): string {
    if (text.length < 10) return 'unknown';

    // 快速模式匹配
    if (/^\d+[.、]\s*.+[A-D][.、]/.test(text)) {
      return 'standard_choice';
    }

    if (/\([A-D]\)/.test(text)) {
      return 'parenthesis_choice';
    }

    if (/[1-4][.、]/.test(text)) {
      return 'numeric_choice';
    }

    if (/[0O1Il|]{2,}/.test(text)) {
      return 'ocr_format';
    }

    return 'simple_choice';
  }
}
