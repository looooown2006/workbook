/**
 * 文本分片处理工具
 * 用于处理大文本的分批解析，提高AI解析的成功率和性能
 */

export interface TextChunk {
  content: string;
  index: number;
  totalChunks: number;
  estimatedQuestions: number;
}

export interface SplitOptions {
  maxChunkSize: number; // 每个分片的最大字符数
  overlapSize: number;  // 分片之间的重叠字符数
  preserveQuestions: boolean; // 是否保持题目完整性
}

export class TextSplitter {
  private static readonly DEFAULT_OPTIONS: SplitOptions = {
    maxChunkSize: 8000,  // 8K字符，适合大多数AI模型
    overlapSize: 200,    // 200字符重叠，避免题目被截断
    preserveQuestions: true
  };

  /**
   * 检查文本是否需要分片处理
   */
  static needsSplitting(text: string, maxSize: number = 10000): boolean {
    return text.length > maxSize;
  }

  /**
   * 估算文本中的题目数量
   */
  static estimateQuestionCount(text: string): number {
    // 通过题目编号模式估算
    const patterns = [
      /\d+[.、]/g,           // 1. 2. 3.
      /第\d+题/g,            // 第1题 第2题
      /\(\d+\)/g,            // (1) (2) (3)
      /【\d+】/g,            // 【1】【2】
      /\d+\s*[、.]/g         // 1、2、3
    ];

    let maxCount = 0;
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        maxCount = Math.max(maxCount, matches.length);
      }
    });

    return maxCount || Math.ceil(text.length / 500); // 备用估算：每500字符一题
  }

  /**
   * 将文本分片
   */
  static splitText(text: string, options: Partial<SplitOptions> = {}): TextChunk[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (text.length <= opts.maxChunkSize) {
      return [{
        content: text,
        index: 0,
        totalChunks: 1,
        estimatedQuestions: this.estimateQuestionCount(text)
      }];
    }

    const chunks: TextChunk[] = [];
    
    if (opts.preserveQuestions) {
      // 智能分片：尝试保持题目完整性
      chunks.push(...this.smartSplit(text, opts));
    } else {
      // 简单分片：按字符数分割
      chunks.push(...this.simpleSplit(text, opts));
    }

    return chunks;
  }

  /**
   * 智能分片：尝试在题目边界处分割
   */
  private static smartSplit(text: string, options: SplitOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentPos = 0;
    let chunkIndex = 0;

    // 找到所有可能的题目分割点
    const splitPoints = this.findQuestionBoundaries(text);
    
    while (currentPos < text.length) {
      let chunkEnd = Math.min(currentPos + options.maxChunkSize, text.length);
      
      // 如果不是最后一个分片，尝试在题目边界处分割
      if (chunkEnd < text.length) {
        const nearestBoundary = this.findNearestBoundary(splitPoints, chunkEnd, options.maxChunkSize * 0.8);
        if (nearestBoundary > currentPos) {
          chunkEnd = nearestBoundary;
        }
      }

      // 添加重叠内容（除了第一个分片）
      const chunkStart = chunkIndex === 0 ? currentPos : Math.max(0, currentPos - options.overlapSize);
      const chunkContent = text.substring(chunkStart, chunkEnd);

      chunks.push({
        content: chunkContent,
        index: chunkIndex,
        totalChunks: 0, // 稍后更新
        estimatedQuestions: this.estimateQuestionCount(chunkContent)
      });

      currentPos = chunkEnd;
      chunkIndex++;
    }

    // 更新总分片数
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * 简单分片：按字符数分割
   */
  private static simpleSplit(text: string, options: SplitOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentPos = 0;
    let chunkIndex = 0;

    while (currentPos < text.length) {
      const chunkStart = chunkIndex === 0 ? currentPos : Math.max(0, currentPos - options.overlapSize);
      const chunkEnd = Math.min(currentPos + options.maxChunkSize, text.length);
      const chunkContent = text.substring(chunkStart, chunkEnd);

      chunks.push({
        content: chunkContent,
        index: chunkIndex,
        totalChunks: 0, // 稍后更新
        estimatedQuestions: this.estimateQuestionCount(chunkContent)
      });

      currentPos = chunkEnd;
      chunkIndex++;
    }

    // 更新总分片数
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * 找到题目边界位置
   */
  private static findQuestionBoundaries(text: string): number[] {
    const boundaries: number[] = [];
    
    // 题目开始的模式
    const patterns = [
      /\n\s*\d+[.、]/g,      // 换行后的题目编号
      /\n\s*第\d+题/g,       // 换行后的"第X题"
      /\n\s*\(\d+\)/g,       // 换行后的(1)(2)
      /\n\s*【\d+】/g,       // 换行后的【1】【2】
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        boundaries.push(match.index);
      }
    });

    return boundaries.sort((a, b) => a - b);
  }

  /**
   * 找到最近的边界点
   */
  private static findNearestBoundary(boundaries: number[], targetPos: number, minPos: number): number {
    // 找到小于目标位置且大于最小位置的最大边界点
    for (let i = boundaries.length - 1; i >= 0; i--) {
      if (boundaries[i] <= targetPos && boundaries[i] >= minPos) {
        return boundaries[i];
      }
    }
    return targetPos;
  }

  /**
   * 合并分片解析结果
   */
  static mergeResults(results: any[]): any {
    const mergedQuestions: any[] = [];
    const mergedErrors: string[] = [];
    let totalCount = 0;
    let successCount = 0;
    let failedCount = 0;

    results.forEach((result, index) => {
      if (result.success && result.questions) {
        mergedQuestions.push(...result.questions);
        successCount += result.successCount || 0;
      }
      
      if (result.errors && result.errors.length > 0) {
        // 为错误信息添加分片标识
        const chunkErrors = result.errors.map((error: string) => 
          `分片${index + 1}: ${error}`
        );
        mergedErrors.push(...chunkErrors);
      }
      
      totalCount += result.totalCount || 0;
      failedCount += result.failedCount || 0;
    });

    return {
      success: mergedQuestions.length > 0 && mergedErrors.length === 0,
      questions: mergedQuestions,
      totalCount: mergedQuestions.length,
      successCount: mergedQuestions.length,
      failedCount: mergedErrors.length,
      errors: mergedErrors
    };
  }

  /**
   * 获取分片处理的建议配置
   */
  static getRecommendedOptions(textLength: number, estimatedQuestions: number): SplitOptions {
    if (textLength < 5000) {
      // 小文本，不需要分片
      return {
        maxChunkSize: textLength,
        overlapSize: 0,
        preserveQuestions: false
      };
    } else if (textLength < 20000) {
      // 中等文本，保守分片
      return {
        maxChunkSize: 10000,
        overlapSize: 300,
        preserveQuestions: true
      };
    } else {
      // 大文本，积极分片
      return {
        maxChunkSize: 8000,
        overlapSize: 400,
        preserveQuestions: true
      };
    }
  }
}
