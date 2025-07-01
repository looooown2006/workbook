/**
 * 增强的文件验证系统
 * 提供详细的文件格式验证和错误提示
 */

import { message } from 'antd';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    extension: string;
    category: 'image' | 'document' | 'unknown';
  };
  suggestions: string[];
}

export interface ValidationConfig {
  maxSize: number; // MB
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  strictMode: boolean; // 是否启用严格模式验证
}

export class FileValidator {
  
  private static readonly DEFAULT_CONFIG: ValidationConfig = {
    maxSize: 50,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx'],
    allowedMimeTypes: [
      'image/jpeg',
      'image/png', 
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    strictMode: true
  };

  /**
   * 验证文件
   */
  static validateFile(file: File, config: Partial<ValidationConfig> = {}): FileValidationResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: this.getFileExtension(file.name),
        category: this.getFileCategory(file)
      },
      suggestions: []
    };

    // 1. 基本信息验证
    this.validateBasicInfo(file, result);
    
    // 2. 文件扩展名验证
    this.validateExtension(file, finalConfig, result);
    
    // 3. MIME类型验证
    this.validateMimeType(file, finalConfig, result);
    
    // 4. 文件大小验证
    this.validateFileSize(file, finalConfig, result);
    
    // 5. 文件内容验证（如果启用严格模式）
    if (finalConfig.strictMode) {
      this.validateFileContent(file, result);
    }
    
    // 6. 生成建议
    this.generateSuggestions(result);
    
    result.isValid = result.errors.length === 0;
    
    return result;
  }

  /**
   * 验证基本信息
   */
  private static validateBasicInfo(file: File, result: FileValidationResult): void {
    if (!file.name || file.name.trim().length === 0) {
      result.errors.push('文件名不能为空');
    }

    if (file.name.length > 255) {
      result.warnings.push('文件名过长，可能导致处理问题');
    }

    if (file.size === 0) {
      result.errors.push('文件大小为0，可能是空文件');
    }

    // 检查文件名中的特殊字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.name)) {
      result.warnings.push('文件名包含特殊字符，建议重命名');
    }
  }

  /**
   * 验证文件扩展名
   */
  private static validateExtension(file: File, config: ValidationConfig, result: FileValidationResult): void {
    const extension = this.getFileExtension(file.name);
    
    if (!extension) {
      result.errors.push('文件没有扩展名');
      return;
    }

    if (!config.allowedExtensions.includes(extension.toLowerCase())) {
      result.errors.push(`不支持的文件格式: ${extension}`);
      result.suggestions.push(`支持的格式: ${config.allowedExtensions.join(', ')}`);
    }
  }

  /**
   * 验证MIME类型
   */
  private static validateMimeType(file: File, config: ValidationConfig, result: FileValidationResult): void {
    if (!file.type) {
      result.warnings.push('无法检测文件的MIME类型');
      return;
    }

    if (!config.allowedMimeTypes.includes(file.type)) {
      result.errors.push(`不支持的文件类型: ${file.type}`);
    }

    // 检查扩展名与MIME类型是否匹配
    const extension = this.getFileExtension(file.name);
    const expectedMimeTypes = this.getExpectedMimeTypes(extension);
    
    if (expectedMimeTypes.length > 0 && !expectedMimeTypes.includes(file.type)) {
      result.warnings.push(`文件扩展名(${extension})与MIME类型(${file.type})不匹配`);
    }
  }

  /**
   * 验证文件大小
   */
  private static validateFileSize(file: File, config: ValidationConfig, result: FileValidationResult): void {
    const sizeInMB = file.size / (1024 * 1024);
    
    if (sizeInMB > config.maxSize) {
      result.errors.push(`文件大小(${sizeInMB.toFixed(2)}MB)超过限制(${config.maxSize}MB)`);
      result.suggestions.push('请压缩文件或选择较小的文件');
    }

    if (sizeInMB > config.maxSize * 0.8) {
      result.warnings.push(`文件较大(${sizeInMB.toFixed(2)}MB)，处理可能较慢`);
    }

    // 检查是否过小
    if (result.fileInfo.category === 'image' && sizeInMB < 0.01) {
      result.warnings.push('图片文件过小，可能影响OCR识别效果');
    }
  }

  /**
   * 验证文件内容（基础检查）
   */
  private static validateFileContent(file: File, result: FileValidationResult): void {
    // 这里可以添加更深入的文件内容验证
    // 例如检查文件头、魔数等
    
    const extension = this.getFileExtension(file.name);
    
    // 检查常见的文件头魔数
    if (extension === '.pdf' && file.type !== 'application/pdf') {
      result.warnings.push('PDF文件的MIME类型异常');
    }
    
    if (['.jpg', '.jpeg'].includes(extension) && !file.type.includes('jpeg')) {
      result.warnings.push('JPEG文件的MIME类型异常');
    }
    
    if (extension === '.png' && file.type !== 'image/png') {
      result.warnings.push('PNG文件的MIME类型异常');
    }
  }

  /**
   * 生成建议
   */
  private static generateSuggestions(result: FileValidationResult): void {
    if (result.errors.length > 0) {
      result.suggestions.push('请检查文件格式和大小是否符合要求');
    }

    if (result.fileInfo.category === 'image') {
      result.suggestions.push('图片建议使用高分辨率，确保文字清晰可读');
    }

    if (result.fileInfo.category === 'document') {
      result.suggestions.push('文档建议包含清晰的题目格式，便于AI解析');
    }

    if (result.warnings.length > 0) {
      result.suggestions.push('虽然文件可以使用，但建议处理警告项以获得更好效果');
    }
  }

  /**
   * 获取文件扩展名
   */
  private static getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex >= 0 ? fileName.substring(lastDotIndex) : '';
  }

  /**
   * 获取文件类别
   */
  private static getFileCategory(file: File): 'image' | 'document' | 'unknown' {
    if (file.type.startsWith('image/')) {
      return 'image';
    }
    
    if (file.type.includes('pdf') || 
        file.type.includes('word') || 
        file.type.includes('document')) {
      return 'document';
    }
    
    const extension = this.getFileExtension(file.name).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
      return 'image';
    }
    
    if (['.pdf', '.doc', '.docx'].includes(extension)) {
      return 'document';
    }
    
    return 'unknown';
  }

  /**
   * 获取扩展名对应的期望MIME类型
   */
  private static getExpectedMimeTypes(extension: string): string[] {
    const mimeMap: { [key: string]: string[] } = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.webp': ['image/webp'],
      '.pdf': ['application/pdf'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    return mimeMap[extension.toLowerCase()] || [];
  }

  /**
   * 显示验证结果
   */
  static showValidationResult(result: FileValidationResult): void {
    if (result.isValid) {
      if (result.warnings.length > 0) {
        message.warning({
          content: `文件验证通过，但有以下警告：\n${result.warnings.join('\n')}`,
          duration: 5
        });
      } else {
        message.success('文件验证通过');
      }
    } else {
      const errorText = `文件验证失败：\n${result.errors.join('\n')}`;
      const suggestionText = result.suggestions.length > 0 ?
        `\n建议：\n${result.suggestions.join('\n')}` : '';

      message.error({
        content: errorText + suggestionText,
        duration: 8
      });
    }
  }
}
