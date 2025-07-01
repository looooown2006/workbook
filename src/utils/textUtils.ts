/**
 * 文本处理工具函数
 * 统一处理各种文本清理和格式化操作
 */

/**
 * 清理和标准化文本
 */
export function cleanText(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .replace(/\s*\n\s*/g, '\n');
}

/**
 * 预处理文本（用于解析）
 */
export function preprocessText(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * 修复常见的OCR错误
 */
export function fixOCRErrors(text: string): string {
  return text
    .replace(/[0O]/g, '0')  // 数字0的OCR错误
    .replace(/[1Il|]/g, '1') // 数字1的OCR错误
    .replace(/^[A-D][.、:：]\s*/, (match) => match.charAt(0) + '. ') // 统一选项格式
    .trim();
}

/**
 * 检查格式一致性
 */
export function checkFormatConsistency(text: string): number {
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
export function assessTextQuality(text: string): number {
  let score = 1.0;

  // 检查文本长度
  if (text.length < 10) score *= 0.3;
  else if (text.length < 50) score *= 0.7;

  // 检查特殊字符比例
  const specialChars = text.match(/[^\w\s\u4e00-\u9fff]/g) || [];
  const specialRatio = specialChars.length / text.length;
  if (specialRatio > 0.3) score *= 0.6;

  // 检查数字和字母比例
  const alphanumeric = text.match(/[a-zA-Z0-9]/g) || [];
  const alphanumericRatio = alphanumeric.length / text.length;
  if (alphanumericRatio > 0.8) score *= 0.7; // 可能是OCR错误

  return Math.max(0, Math.min(1, score));
}

/**
 * 提取题目编号
 */
export function extractQuestionNumber(text: string): number | null {
  const match = text.match(/^(\d+)[.、\s]/);
  return match ? parseInt(match[1]) : null;
}

/**
 * 标准化选项格式
 */
export function standardizeOptions(options: string[]): string[] {
  return options.map(option => {
    // 移除前导空白
    let cleaned = option.trim();
    
    // 标准化选项标记
    cleaned = cleaned.replace(/^[A-D][.、:：]\s*/, (match) => match.charAt(0) + '. ');
    
    // 修复OCR错误
    cleaned = fixOCRErrors(cleaned);
    
    return cleaned;
  });
}

/**
 * 验证编号连续性
 */
export function validateSequentialNumbering(boundaries: Array<{ number: number }>): boolean {
  if (boundaries.length <= 1) return true;
  
  const numbers = boundaries.map(b => b.number).sort((a, b) => a - b);
  
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * 计算文本相似度（简单版本）
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * 生成文本摘要
 */
export function generateTextSummary(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  
  const sentences = text.split(/[.。!！?？]/);
  let summary = '';
  
  for (const sentence of sentences) {
    if (summary.length + sentence.length <= maxLength) {
      summary += sentence + '。';
    } else {
      break;
    }
  }
  
  return summary || text.substring(0, maxLength) + '...';
}
