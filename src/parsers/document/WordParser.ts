/**
 * Word文档解析器
 * 支持.doc和.docx文件的文本提取和题目解析
 */

import { ImportQuestionData } from '../../types';

export interface WordParseResult {
  success: boolean;
  text: string;
  questions: ImportQuestionData[];
  errors: string[];
  metadata: {
    fileName: string;
    fileSize: number;
    wordCount: number;
    extractionMethod: string;
  };
}

export class WordParser {
  
  /**
   * 解析Word文档
   */
  static async parseWordFile(file: File): Promise<WordParseResult> {
    const result: WordParseResult = {
      success: false,
      text: '',
      questions: [],
      errors: [],
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        wordCount: 0,
        extractionMethod: ''
      }
    };

    try {
      // 检查文件类型
      const isDocx = file.name.toLowerCase().endsWith('.docx') || 
                     file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isDoc = file.name.toLowerCase().endsWith('.doc') || 
                    file.type === 'application/msword';

      if (!isDocx && !isDoc) {
        result.errors.push('不支持的Word文档格式');
        return result;
      }

      if (isDocx) {
        // 解析.docx文件
        result.text = await this.parseDocxFile(file);
        result.metadata.extractionMethod = 'docx-xml';
      } else {
        // 解析.doc文件（使用备用方法）
        result.text = await this.parseDocFile(file);
        result.metadata.extractionMethod = 'doc-fallback';
      }

      if (result.text.trim().length === 0) {
        result.errors.push('未能从Word文档中提取到文本内容');
        return result;
      }

      result.metadata.wordCount = result.text.split(/\s+/).length;
      
      // 解析题目
      result.questions = this.extractQuestionsFromText(result.text);
      result.success = true;

      console.log(`Word文档解析完成: ${result.questions.length}道题目, ${result.metadata.wordCount}个词`);

    } catch (error) {
      result.errors.push(`Word文档解析失败: ${error}`);
      console.error('Word解析错误:', error);
    }

    return result;
  }

  /**
   * 解析.docx文件（使用XML解析）
   */
  private static async parseDocxFile(file: File): Promise<string> {
    try {
      // 使用JSZip解析.docx文件（.docx实际上是一个ZIP文件）
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      
      const zipContent = await zip.loadAsync(file);
      const documentXml = await zipContent.file('word/document.xml')?.async('string');
      
      if (!documentXml) {
        throw new Error('无法找到document.xml文件');
      }

      // 解析XML并提取文本
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(documentXml, 'text/xml');
      
      // 提取所有文本节点
      const textNodes = xmlDoc.getElementsByTagName('w:t');
      const textContent: string[] = [];
      
      for (let i = 0; i < textNodes.length; i++) {
        const textNode = textNodes[i];
        if (textNode.textContent) {
          textContent.push(textNode.textContent);
        }
      }

      // 处理段落分隔
      const paragraphs = xmlDoc.getElementsByTagName('w:p');
      let result = '';
      let currentParagraph = '';
      let textIndex = 0;

      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        const textNodesInParagraph = paragraph.getElementsByTagName('w:t');
        
        currentParagraph = '';
        for (let j = 0; j < textNodesInParagraph.length; j++) {
          if (textIndex < textContent.length) {
            currentParagraph += textContent[textIndex];
            textIndex++;
          }
        }
        
        if (currentParagraph.trim()) {
          result += currentParagraph.trim() + '\n';
        }
      }

      return result;

    } catch (error) {
      console.error('DOCX解析失败，尝试备用方法:', error);
      return this.parseDocFile(file);
    }
  }

  /**
   * 解析.doc文件或作为.docx的备用方法
   */
  private static async parseDocFile(file: File): Promise<string> {
    try {
      // 对于.doc文件或.docx解析失败的情况，使用FileReader读取为文本
      // 这种方法可能包含一些格式字符，但通常能提取到主要文本内容
      
      const arrayBuffer = await this.fileToArrayBuffer(file);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 尝试检测文本编码并提取可读文本
      let text = '';
      
      // 方法1: 尝试UTF-8解码
      try {
        const decoder = new TextDecoder('utf-8');
        const decodedText = decoder.decode(uint8Array);
        text = this.cleanExtractedText(decodedText);
      } catch (e) {
        // 方法2: 尝试Latin-1解码
        try {
          const decoder = new TextDecoder('latin1');
          const decodedText = decoder.decode(uint8Array);
          text = this.cleanExtractedText(decodedText);
        } catch (e2) {
          // 方法3: 字节级文本提取
          text = this.extractTextFromBytes(uint8Array);
        }
      }

      return text;

    } catch (error) {
      throw new Error(`无法解析Word文档: ${error}`);
    }
  }

  /**
   * 将File转换为ArrayBuffer
   */
  private static fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 清理提取的文本
   */
  private static cleanExtractedText(text: string): string {
    return text
      // 移除控制字符和特殊字符
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      // 移除明显的格式标记
      .replace(/[^\u4e00-\u9fa5\u0020-\u007E\u00A0-\u00FF]/g, ' ')
      // 规范化换行
      .replace(/\s*\n\s*/g, '\n')
      .trim();
  }

  /**
   * 从字节数组中提取文本
   */
  private static extractTextFromBytes(bytes: Uint8Array): string {
    const text: string[] = [];
    
    for (let i = 0; i < bytes.length - 1; i++) {
      const byte = bytes[i];
      
      // 提取可打印的ASCII字符和常见的中文字符范围
      if ((byte >= 32 && byte <= 126) || // ASCII可打印字符
          (byte >= 160 && byte <= 255)) { // 扩展ASCII
        text.push(String.fromCharCode(byte));
      } else if (byte === 10 || byte === 13) { // 换行符
        text.push('\n');
      } else if (byte === 9) { // 制表符
        text.push(' ');
      }
    }

    return this.cleanExtractedText(text.join(''));
  }

  /**
   * 从文本中提取题目
   */
  private static extractQuestionsFromText(text: string): ImportQuestionData[] {
    const questions: ImportQuestionData[] = [];
    
    // 使用正则表达式匹配题目模式
    const questionPatterns = [
      // 标准格式: 1. 题目内容 A. 选项1 B. 选项2 ...
      /(\d+)[.、]\s*([^A-D]*?)\s*A[.、]\s*([^\n]*?)\s*B[.、]\s*([^\n]*?)(?:\s*C[.、]\s*([^\n]*?))?(?:\s*D[.、]\s*([^\n]*?))?/g,
      // 简化格式: 题目内容 A) 选项1 B) 选项2 ...
      /([^A-D]*?)\s*A\)\s*([^\n]*?)\s*B\)\s*([^\n]*?)(?:\s*C\)\s*([^\n]*?))?(?:\s*D\)\s*([^\n]*?))?/g
    ];

    for (const pattern of questionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const options = [match[3], match[4], match[5], match[6]].filter(Boolean);
        
        if (options.length >= 2) {
          questions.push({
            title: (match[2] || match[1]).trim(),
            options: options.map(opt => opt.trim()),
            correctAnswer: 0, // 默认第一个选项，需要后续AI解析确定
            explanation: '',
            difficulty: 'medium',
            tags: ['Word文档导入']
          });
        }
      }
    }

    return questions;
  }
}
