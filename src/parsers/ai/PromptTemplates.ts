/**
 * AI解析提示词模板
 * 包含结构化模板、few-shot示例和错误恢复机制
 */

export interface PromptTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  fewShotExamples: FewShotExample[];
  outputFormat: string;
  errorRecoveryPrompts: string[];
}

export interface FewShotExample {
  input: string;
  output: string;
  description: string;
}

/**
 * 标准题目解析模板
 */
export const STANDARD_QUESTION_TEMPLATE: PromptTemplate = {
  name: 'standard_question',
  description: '标准选择题解析模板',
  systemPrompt: `你是一个专业的题目解析专家，专门将各种格式的文本转换为标准化的JSON格式题目。

你的任务是：
1. 准确识别题目内容、选项、正确答案和解析
2. 处理各种格式的输入文本（包括OCR识别的文本）
3. 返回严格符合JSON Schema的结果
4. 对于模糊或不完整的信息，进行合理推断

输出要求：
- 必须返回有效的JSON数组
- 每个题目必须包含完整的字段
- 正确答案索引从0开始
- 保持原文的准确性，但修正明显的OCR错误`,

  userPromptTemplate: `请解析以下文本中的题目，返回JSON格式：

{input_text}

要求：
1. 识别所有题目、选项、答案和解析
2. 修正常见的OCR错误（如"0"和"O"的混淆）
3. 返回JSON数组，每个题目包含：
   - title: 题目内容
   - options: 选项数组
   - correctAnswer: 正确答案索引（0-3）
   - explanation: 解析内容（可选）
   - difficulty: 难度等级（easy/medium/hard）
   - tags: 相关标签数组

只返回JSON数组，不要包含其他说明文字。`,

  fewShotExamples: [
    {
      input: `1. JavaScript中用于声明变量的关键字有哪些？
A. var, let, const
B. var, let, function
C. let, const, class
D. var, function, class
答案：A
解析：JavaScript中有三个用于声明变量的关键字：var、let和const。`,
      output: `[{
  "title": "JavaScript中用于声明变量的关键字有哪些？",
  "options": ["var, let, const", "var, let, function", "let, const, class", "var, function, class"],
  "correctAnswer": 0,
  "explanation": "JavaScript中有三个用于声明变量的关键字：var、let和const。",
  "difficulty": "medium",
  "tags": ["JavaScript", "变量声明"]
}]`,
      description: '标准格式的单选题'
    },
    {
      input: `2. CSS中用于设置元素背景颜色的属性是？
A. color
B. background-color
C. bgcolor
D. background
答案：B`,
      output: `[{
  "title": "CSS中用于设置元素背景颜色的属性是？",
  "options": ["color", "background-color", "bgcolor", "background"],
  "correctAnswer": 1,
  "explanation": "",
  "difficulty": "easy",
  "tags": ["CSS", "样式属性"]
}]`,
      description: '无解析的题目'
    },
    {
      input: `3. 以下哪个不是Python的数据类型？
A. list
B. tuple
C. array
D. dict
正确答案：C
解释：Python内置的数据类型包括list、tuple、dict等，但array不是内置类型。`,
      output: `[{
  "title": "以下哪个不是Python的数据类型？",
  "options": ["list", "tuple", "array", "dict"],
  "correctAnswer": 2,
  "explanation": "Python内置的数据类型包括list、tuple、dict等，但array不是内置类型。",
  "difficulty": "medium",
  "tags": ["Python", "数据类型"]
}]`,
      description: '不同的答案和解析格式'
    }
  ],

  outputFormat: `JSON数组格式：
[
  {
    "title": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "correctAnswer": 0,
    "explanation": "解析内容",
    "difficulty": "easy|medium|hard",
    "tags": ["标签1", "标签2"]
  }
]`,

  errorRecoveryPrompts: [
    '如果无法确定正确答案，请分析题目内容进行合理推断',
    '如果选项不完整，请根据题目内容补充合理的选项',
    '如果题目格式不规范，请提取核心信息并标准化',
    '对于OCR识别错误，请根据上下文进行修正'
  ]
};

/**
 * 多题目批量解析模板
 */
export const BATCH_QUESTION_TEMPLATE: PromptTemplate = {
  name: 'batch_question',
  description: '批量题目解析模板',
  systemPrompt: `你是一个专业的批量题目解析专家。你需要处理包含多道题目的文本，准确识别每道题目的边界，并将它们转换为标准JSON格式。

特别注意：
1. 正确识别题目编号和分隔符
2. 处理不规范的格式和OCR错误
3. 保持题目的完整性和准确性
4. 对于缺失的信息进行合理补充`,

  userPromptTemplate: `请解析以下包含多道题目的文本：

{input_text}

解析要求：
1. 识别所有题目的边界
2. 为每道题目提取完整信息
3. 修正OCR识别错误
4. 返回JSON数组格式

只返回JSON数组，不要包含其他内容。`,

  fewShotExamples: [
    {
      input: `1. HTML的全称是什么？
A. HyperText Markup Language
B. High Tech Modern Language
C. Home Tool Markup Language
D. Hyperlink and Text Markup Language
答案：A

2. CSS的作用是什么？
A. 控制网页结构
B. 控制网页样式
C. 控制网页行为
D. 控制网页数据
答案：B
解析：CSS用于控制网页的样式和布局。`,
      output: `[
  {
    "title": "HTML的全称是什么？",
    "options": ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink and Text Markup Language"],
    "correctAnswer": 0,
    "explanation": "",
    "difficulty": "easy",
    "tags": ["HTML", "基础概念"]
  },
  {
    "title": "CSS的作用是什么？",
    "options": ["控制网页结构", "控制网页样式", "控制网页行为", "控制网页数据"],
    "correctAnswer": 1,
    "explanation": "CSS用于控制网页的样式和布局。",
    "difficulty": "easy",
    "tags": ["CSS", "基础概念"]
  }
]`,
      description: '多道题目的批量解析'
    }
  ],

  outputFormat: `JSON数组格式，包含所有识别的题目`,

  errorRecoveryPrompts: [
    '如果题目编号不连续，请按顺序重新编号',
    '如果某道题目信息不完整，请根据上下文补充',
    '如果格式混乱，请提取核心信息并标准化',
    '确保每道题目都有完整的选项和答案'
  ]
};

/**
 * OCR文本修复模板
 */
export const OCR_REPAIR_TEMPLATE: PromptTemplate = {
  name: 'ocr_repair',
  description: 'OCR识别文本修复模板',
  systemPrompt: `你是一个OCR文本修复专家，专门处理OCR识别产生的错误文本。你需要：

1. 识别和修复常见的OCR错误
2. 恢复题目的正确格式
3. 补充缺失的标点符号和格式
4. 保持原意不变的前提下修复错误

常见OCR错误：
- 数字0和字母O的混淆
- 字母I和数字1的混淆
- 标点符号识别错误
- 空格和换行丢失
- 相似字符的误识别`,

  userPromptTemplate: `请修复以下OCR识别的文本，然后解析为题目格式：

原始OCR文本：
{input_text}

请先修复OCR错误，然后解析为标准JSON格式的题目。`,

  fewShotExamples: [
    {
      input: `1.什么是HTML?
A.HyperText Markup Language
B.High Tech M0dern Language
C.H0me T00l Markup Language
D.Hyperlink and Text Markup Language
答案:A`,
      output: `[{
  "title": "什么是HTML？",
  "options": ["HyperText Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink and Text Markup Language"],
  "correctAnswer": 0,
  "explanation": "",
  "difficulty": "easy",
  "tags": ["HTML", "基础概念"]
}]`,
      description: 'OCR错误修复示例'
    }
  ],

  outputFormat: `修复后的JSON数组格式`,

  errorRecoveryPrompts: [
    '如果无法确定某个字符，请根据上下文进行合理推断',
    '如果格式严重损坏，请提取可识别的信息重新组织',
    '保持题目的核心含义不变',
    '优先修复影响理解的关键错误'
  ]
};

/**
 * 获取指定模板
 */
export function getPromptTemplate(templateName: string): PromptTemplate | null {
  const templates = {
    'standard_question': STANDARD_QUESTION_TEMPLATE,
    'batch_question': BATCH_QUESTION_TEMPLATE,
    'ocr_repair': OCR_REPAIR_TEMPLATE
  };

  return templates[templateName as keyof typeof templates] || null;
}

/**
 * 获取所有可用模板
 */
export function getAllTemplates(): PromptTemplate[] {
  return [
    STANDARD_QUESTION_TEMPLATE,
    BATCH_QUESTION_TEMPLATE,
    OCR_REPAIR_TEMPLATE
  ];
}
