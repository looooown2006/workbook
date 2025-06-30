/**
 * 题目格式模式定义
 * 包含各种常见的题目文本格式模式
 */

export interface FormatPattern {
  name: string;
  description: string;
  patterns: RegExp[];
  confidence: number;
  priority: number;
  examples: string[];
  characteristics: string[];
}

/**
 * 标准选择题格式
 */
export const STANDARD_CHOICE_FORMAT: FormatPattern = {
  name: 'standard_choice',
  description: '标准选择题格式（1. 题目 A. B. C. D. 答案：）',
  patterns: [
    /^\d+[.、]\s*.+\??\s*\n?[A-D][.、]\s*.+/m,
    /答案[：:]\s*[A-D]/m,
    /正确答案[：:]\s*[A-D]/m
  ],
  confidence: 0.9,
  priority: 1,
  examples: [
    `1. 这是一道选择题？
A. 选项A
B. 选项B
C. 选项C
D. 选项D
答案：A`
  ],
  characteristics: [
    '题目以数字编号开始',
    '选项使用A、B、C、D标记',
    '包含明确的答案标识'
  ]
};

/**
 * 简化选择题格式
 */
export const SIMPLE_CHOICE_FORMAT: FormatPattern = {
  name: 'simple_choice',
  description: '简化选择题格式（无编号或简单编号）',
  patterns: [
    /^.+\??\s*\n?[A-D][.、]\s*.+/m,
    /[A-D][.、]\s*.+/g
  ],
  confidence: 0.7,
  priority: 2,
  examples: [
    `什么是HTML？
A. 超文本标记语言
B. 高级技术语言
C. 网页设计语言
D. 编程语言`
  ],
  characteristics: [
    '题目可能无编号',
    '选项使用A、B、C、D标记',
    '答案可能缺失'
  ]
};

/**
 * 数字选项格式
 */
export const NUMERIC_CHOICE_FORMAT: FormatPattern = {
  name: 'numeric_choice',
  description: '数字选项格式（1. 2. 3. 4.）',
  patterns: [
    /^\d+[.、]\s*.+\??\s*\n?[1-4][.、]\s*.+/m,
    /[1-4][.、]\s*.+/g
  ],
  confidence: 0.8,
  priority: 3,
  examples: [
    `1. 以下哪个是编程语言？
1. JavaScript
2. HTML
3. CSS
4. XML
答案：1`
  ],
  characteristics: [
    '选项使用数字1、2、3、4标记',
    '题目通常有编号',
    '可能包含答案'
  ]
};

/**
 * 括号选项格式
 */
export const PARENTHESIS_CHOICE_FORMAT: FormatPattern = {
  name: 'parenthesis_choice',
  description: '括号选项格式（(A) (B) (C) (D)）',
  patterns: [
    /^\d*[.、]?\s*.+\??\s*\n?\([A-D]\)\s*.+/m,
    /\([A-D]\)\s*.+/g
  ],
  confidence: 0.8,
  priority: 4,
  examples: [
    `什么是CSS？
(A) 层叠样式表
(B) 计算机科学
(C) 网页脚本
(D) 数据库语言`
  ],
  characteristics: [
    '选项使用括号包围字母',
    '格式较为正式',
    '常见于考试题目'
  ]
};

/**
 * Word复制格式
 */
export const WORD_COPY_FORMAT: FormatPattern = {
  name: 'word_copy',
  description: 'Word文档复制格式（可能包含特殊字符）',
  patterns: [
    /^\d+[.、]\s*.+[\r\n]+[A-D][.、]\s*.+/m,
    /\r\n|\r|\n/g,
    /\s{2,}/g
  ],
  confidence: 0.6,
  priority: 5,
  examples: [
    `1. 这是从Word复制的题目？

A. 选项A

B. 选项B

C. 选项C

D. 选项D

答案：A`
  ],
  characteristics: [
    '包含多余的空行',
    '可能有异常的空格',
    '换行符不规范'
  ]
};

/**
 * PDF复制格式
 */
export const PDF_COPY_FORMAT: FormatPattern = {
  name: 'pdf_copy',
  description: 'PDF复制格式（可能有分页符和格式问题）',
  patterns: [
    /^\d+[.、]\s*.+/m,
    /[A-D][.、]\s*.+/g,
    /\f|\x0C/g, // 分页符
    /\s+/g
  ],
  confidence: 0.5,
  priority: 6,
  examples: [
    `1.什么是JavaScript?A.脚本语言B.标记语言C.样式语言D.数据库语言答案:A`
  ],
  characteristics: [
    '可能缺少空格和换行',
    '文本可能连在一起',
    '包含分页符等特殊字符'
  ]
};

/**
 * OCR识别格式
 */
export const OCR_FORMAT: FormatPattern = {
  name: 'ocr_format',
  description: 'OCR识别格式（可能有识别错误）',
  patterns: [
    /[0O1Il|]{2,}/g, // 连续的易混淆字符
    /[^\w\s\u4e00-\u9fff.,;:!?()[\]{}""'']/g, // 异常字符
    /\s{3,}/g // 异常空格
  ],
  confidence: 0.4,
  priority: 7,
  examples: [
    `1.什么是HTML?
A.HyperText Markup Language
B.High Tech M0dern Language
C.H0me T00l Markup Language
D.Hyperlink and Text Markup Language
答案:A`
  ],
  characteristics: [
    '可能包含OCR识别错误',
    '数字0和字母O混淆',
    '字母I和数字1混淆'
  ]
};

/**
 * 混合格式
 */
export const MIXED_FORMAT: FormatPattern = {
  name: 'mixed_format',
  description: '混合格式（包含多种格式特征）',
  patterns: [
    /^\d+[.、]\s*.+/m,
    /[A-D1-4][.、()]\s*.+/g
  ],
  confidence: 0.3,
  priority: 8,
  examples: [
    `1. 题目一
A. 选项A
B. 选项B

2、题目二
(1) 选项1
(2) 选项2`
  ],
  characteristics: [
    '包含多种编号方式',
    '选项格式不统一',
    '需要智能识别'
  ]
};

/**
 * 所有格式模式
 */
export const ALL_FORMAT_PATTERNS: FormatPattern[] = [
  STANDARD_CHOICE_FORMAT,
  SIMPLE_CHOICE_FORMAT,
  NUMERIC_CHOICE_FORMAT,
  PARENTHESIS_CHOICE_FORMAT,
  WORD_COPY_FORMAT,
  PDF_COPY_FORMAT,
  OCR_FORMAT,
  MIXED_FORMAT
];

/**
 * 根据名称获取格式模式
 */
export function getFormatPattern(name: string): FormatPattern | null {
  return ALL_FORMAT_PATTERNS.find(pattern => pattern.name === name) || null;
}

/**
 * 获取高优先级格式模式
 */
export function getHighPriorityPatterns(): FormatPattern[] {
  return ALL_FORMAT_PATTERNS.filter(pattern => pattern.priority <= 4);
}

/**
 * 获取低质量格式模式
 */
export function getLowQualityPatterns(): FormatPattern[] {
  return ALL_FORMAT_PATTERNS.filter(pattern => pattern.confidence < 0.6);
}
