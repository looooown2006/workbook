/**
 * OCR解析器
 * 使用Tesseract.js进行图片文字识别
 */

import { IQuestionParser, ParseInput, ParseResult } from '../interfaces/IQuestionParser';
import { ImportQuestionData } from '../../types';
import { tesseractManager } from './TesseractManager';
import { ImagePreprocessor, PreprocessOptions } from './ImagePreprocessor';
import { AIParser } from '../../utils/aiParser';
import { PDFExtractor } from './PDFExtractor';

export interface OCRParserConfig {
  preprocess: boolean;
  preprocessOptions: PreprocessOptions;
  useAIFallback: boolean;
  confidenceThreshold: number;
}

export class OCRParser implements IQuestionParser {
  name = 'OCR';
  supportedTypes: ('text' | 'image' | 'pdf')[] = ['image', 'pdf'];
  
  private config: OCRParserConfig = {
    preprocess: true,
    preprocessOptions: {
      scale: 2.5,
      contrast: 160,
      brightness: 115,
      sharpen: true,
      denoise: true,
      grayscale: false,
      binarize: false,
      binarizeThreshold: 128,
      gamma: 1.0,
      saturation: 100
    },
    useAIFallback: true,
    confidenceThreshold: 75
  };

  private pdfExtractor: PDFExtractor;

  constructor(config?: Partial<OCRParserConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.pdfExtractor = new PDFExtractor();
  }

  /**
   * 解析图片或PDF中的题目
   */
  async parse(input: ParseInput): Promise<ParseResult> {
    const startTime = Date.now();

    if (!this.supports(input)) {
      return {
        success: false,
        questions: [],
        confidence: 0,
        errors: ['不支持的输入类型'],
        metadata: {
          parser: this.name,
          processingTime: Date.now() - startTime
        }
      };
    }

    // 如果是PDF文件，使用PDF解析器
    if (input.type === 'pdf') {
      return await this.pdfExtractor.parse(input);
    }

    try {
      const file = input.content as File;
      console.log('开始OCR解析，文件:', file.name, '大小:', file.size);

      // 1. 图片预处理
      let processedImage: HTMLCanvasElement;
      if (this.config.preprocess) {
        console.log('开始图片预处理...');
        processedImage = await ImagePreprocessor.preprocess(file, this.config.preprocessOptions);
        console.log('图片预处理完成');
      } else {
        processedImage = await this.fileToCanvas(file);
      }

      // 2. OCR识别
      console.log('开始OCR识别...');
      try {
        const ocrResult = await tesseractManager.recognize(processedImage);

        console.log('OCR识别完成，置信度:', ocrResult.data.confidence);
        console.log('识别文本长度:', ocrResult.data.text.length);

        // 3. 检查OCR质量
        if (ocrResult.data.confidence < this.config.confidenceThreshold) {
          console.warn(`OCR置信度过低: ${ocrResult.data.confidence}%`);

          if (this.config.useAIFallback) {
            console.log('OCR质量不佳，尝试使用AI解析...');
            return await this.fallbackToAI(ocrResult.data.text, ocrResult.data.confidence, startTime);
          }
        }

        // 4. 解析文本为题目
        const questions = await this.parseTextToQuestions(ocrResult.data.text);

        return {
          success: questions.length > 0,
          questions,
          confidence: Math.min(ocrResult.data.confidence / 100, 1),
          metadata: {
            parser: this.name,
            processingTime: Date.now() - startTime,
            ocrConfidence: ocrResult.data.confidence,
            detectedText: ocrResult.data.text.substring(0, 200) + '...'
          }
        };
      } catch (ocrError) {
        console.error('OCR识别失败，尝试AI后备方案:', ocrError);

        if (this.config.useAIFallback) {
          // 如果OCR完全失败，尝试使用AI解析（可能需要用户手动输入）
          return {
            success: false,
            questions: [],
            confidence: 0,
            errors: ['OCR识别失败，请尝试使用更清晰的图片或手动输入文本'],
            metadata: {
              parser: this.name,
              processingTime: Date.now() - startTime,
              ocrError: ocrError instanceof Error ? ocrError.message : String(ocrError)
            }
          };
        }

        throw ocrError;
      }

    } catch (error) {
      console.error('OCR解析失败:', error);
      return {
        success: false,
        questions: [],
        confidence: 0,
        errors: [error instanceof Error ? error.message : '图片处理失败，请检查文件格式和内容'],
        metadata: {
          parser: this.name,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * 检查是否支持输入类型
   */
  supports(input: ParseInput): boolean {
    return this.supportedTypes.includes(input.type) && input.content instanceof File;
  }

  /**
   * 获取配置
   */
  getConfig(): OCRParserConfig {
    return { ...this.config };
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<OCRParserConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 将File转换为Canvas
   */
  private async fileToCanvas(file: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 使用AI作为后备解析方案
   */
  private async fallbackToAI(text: string, ocrConfidence: number, startTime: number): Promise<ParseResult> {
    try {
      // 构建OCR上下文信息
      const context = {
        inputType: 'ocr' as const,
        hasOCRErrors: true,
        confidence: ocrConfidence / 100,
        textLength: text.length
      };

      const aiResult = await AIParser.parseWithAI(text, context);

      return {
        success: aiResult.success,
        questions: aiResult.questions,
        confidence: Math.min(aiResult.success ? 0.8 : 0, 1),
        metadata: {
          parser: `${this.name}+AI`,
          processingTime: Date.now() - startTime,
          ocrConfidence,
          fallbackUsed: true
        }
      };
    } catch (error) {
      return {
        success: false,
        questions: [],
        confidence: 0,
        errors: [`OCR识别失败，AI后备解析也失败: ${error instanceof Error ? error.message : String(error)}`],
        metadata: {
          parser: this.name,
          processingTime: Date.now() - startTime,
          ocrConfidence,
          fallbackFailed: true
        }
      };
    }
  }

  /**
   * 将OCR识别的文本解析为题目
   */
  private async parseTextToQuestions(text: string): Promise<ImportQuestionData[]> {
    // 文本后处理
    const cleanedText = this.postprocessText(text);

    // 使用AI解析器处理文本，提供OCR上下文
    try {
      const context = {
        inputType: 'ocr' as const,
        hasOCRErrors: true,
        textLength: cleanedText.length,
        confidence: 0.8 // OCR文本的基础置信度
      };

      const result = await AIParser.parseWithAI(cleanedText, context);
      return result.questions;
    } catch (error) {
      console.error('AI解析失败，尝试简单解析:', error);
      return this.simpleTextParse(cleanedText);
    }
  }

  /**
   * OCR文本后处理
   */
  private postprocessText(text: string): string {
    return text
      // 修正常见OCR错误
      .replace(/[|]/g, 'I')
      .replace(/[0O]/g, (match, offset, string) => {
        const before = string[offset - 1];
        const after = string[offset + 1];
        if (/\d/.test(before) || /\d/.test(after)) {
          return '0';
        }
        return 'O';
      })
      // 标准化空格和换行
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * 简单的文本解析（后备方案）
   */
  private simpleTextParse(text: string): ImportQuestionData[] {
    const questions: ImportQuestionData[] = [];
    
    // 简单的题目识别逻辑
    const lines = text.split('\n').filter(line => line.trim());
    let currentQuestion: Partial<ImportQuestionData> | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 识别题目开始
      if (/^\d+[.、]\s*/.test(trimmedLine)) {
        if (currentQuestion && currentQuestion.title) {
          questions.push(currentQuestion as ImportQuestionData);
        }
        currentQuestion = {
          title: trimmedLine.replace(/^\d+[.、]\s*/, ''),
          options: [],
          correctAnswer: 0
        };
      }
      // 识别选项
      else if (/^[A-D][.、)]\s*/.test(trimmedLine) && currentQuestion) {
        if (!currentQuestion.options) currentQuestion.options = [];
        currentQuestion.options.push(trimmedLine.replace(/^[A-D][.、)]\s*/, ''));
      }
    }
    
    // 添加最后一个题目
    if (currentQuestion && currentQuestion.title) {
      questions.push(currentQuestion as ImportQuestionData);
    }
    
    return questions;
  }
}
