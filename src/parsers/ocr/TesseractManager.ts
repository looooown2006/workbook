/**
 * Tesseract OCR管理器
 * 负责初始化和管理Tesseract Worker
 */

import Tesseract, { Worker } from 'tesseract.js';

export interface OCRConfig {
  language: string;
  oem: number;
  psm: number;
  whitelist?: string;
  preserveInterwordSpaces?: boolean;
}

export interface RecognizeOptions {
  lang: string;
  options?: Record<string, any>;
}

export class TesseractManager {
  private worker: Worker | null = null;
  private isInitialized = false;
  private config: OCRConfig;

  constructor(config: Partial<OCRConfig> = {}) {
    this.config = {
      language: 'chi_sim+eng',
      oem: 1, // LSTM OCR引擎
      psm: 6, // 单一文本块
      whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz().,?!:;""\'\'，。？！：；（）【】',
      preserveInterwordSpaces: true,
      ...config
    };
  }

  /**
   * 初始化Tesseract Worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('初始化OCR引擎...');

      // 创建Tesseract Worker
      this.worker = await Tesseract.createWorker(this.config.language, 1, {
        logger: m => console.log('OCR进度:', m)
      });

      // 设置参数
      await this.worker.setParameters({
        tessedit_ocr_engine_mode: this.config.oem,
        tessedit_pageseg_mode: this.config.psm,
        tessedit_char_whitelist: this.config.whitelist || '',
        preserve_interword_spaces: this.config.preserveInterwordSpaces ? '1' : '0'
      });

      this.isInitialized = true;
      console.log('OCR引擎初始化完成');
    } catch (error) {
      console.error('OCR初始化失败:', error);
      throw new Error(`OCR初始化失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 识别图片中的文字
   */
  async recognize(
    image: string | File | HTMLCanvasElement | ImageData,
    options?: RecognizeOptions
  ): Promise<Tesseract.RecognizeResult> {
    if (!this.isInitialized || !this.worker) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCR Worker未初始化');
    }

    try {
      console.log('开始OCR识别...');

      const result = await this.worker.recognize(image, options?.options || {});

      console.log('OCR识别完成，置信度:', result.data.confidence);

      return result;
    } catch (error) {
      console.error('OCR识别失败:', error);
      throw new Error(`OCR识别失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): string[] {
    return [
      'chi_sim',     // 中文简体
      'chi_tra',     // 中文繁体
      'eng',         // 英文
      'chi_sim+eng', // 中英文混合
      'chi_tra+eng'  // 繁体中英文混合
    ];
  }

  /**
   * 更新OCR配置
   */
  async updateConfig(newConfig: Partial<OCRConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    if (this.worker && this.isInitialized) {
      await this.worker.setParameters({
        tessedit_ocr_engine_mode: this.config.oem,
        tessedit_pageseg_mode: this.config.psm,
        tessedit_char_whitelist: this.config.whitelist || '',
        preserve_interword_spaces: this.config.preserveInterwordSpaces ? '1' : '0'
      });
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): OCRConfig {
    return { ...this.config };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('Tesseract Worker已销毁');
    }
  }

  /**
   * 销毁Worker（别名方法）
   */
  async terminate(): Promise<void> {
    await this.cleanup();
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }
}

// 单例实例
export const tesseractManager = new TesseractManager();
