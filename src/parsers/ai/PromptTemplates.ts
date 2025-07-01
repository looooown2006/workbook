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
  description: '严格版标准选择题解析模板',
  systemPrompt: `你是一个专业的题目解析专家，专门将各种格式的文本转换为标准化的JSON格式题目。

你的核心能力：
1. 精确识别题目结构：题干、选项、答案、解析
2. 智能处理OCR错误：自动修正常见识别错误
3. 格式标准化：统一不同来源的题目格式
4. 严格的完整性验证：确保每个题目信息完整且准确

处理规则：
- 题目编号：自动识别并移除题目前的序号（如"1."、"第1题"等）
- 选项标识：统一处理A/B/C/D、①②③④、(1)(2)(3)(4)等格式
- 答案识别：支持"答案：A"、"正确答案：A"、"Answer: A"等格式
- OCR修正：自动修正"0"与"O"、"1"与"l"、"5"与"S"等常见错误
- 内容清理：移除多余空格、换行符，保持文本整洁

严格的质量要求：
- 每个题目必须有明确的题干和至少2个选项
- 必须明确识别出正确答案，如果没有答案标识则拒绝解析该题目
- 正确答案必须在选项范围内，索引从0开始（A=0, B=1, C=2, D=3）
- 如果题目信息不完整（缺少题干、选项不足、没有答案），必须报错
- 解析内容可选，但如果存在必须准确提取
- 难度评估基于题目复杂度和专业程度
- 标签提取基于题目内容的关键词

重要提醒：
- 绝对不允许猜测或推断答案
- 如果文本中没有明确的答案标识，必须拒绝解析
- 宁可解析失败，也不要输出不完整的题目`,

  userPromptTemplate: `请仔细解析以下文本中的题目，按照标准格式返回JSON数组：

{input_text}

严格的解析要求：
1. 题目识别：找出所有完整的题目（必须包含题干、选项和答案）
2. 结构分析：分离题干、选项、答案、解析等部分
3. 答案验证：必须找到明确的答案标识，如"答案：A"、"正确答案：B"等
4. 内容清理：修正OCR错误，统一格式
5. 质量检查：确保每个题目信息完整且准确

输出格式（严格JSON数组）：
[
  {
    "title": "题目内容（去除序号）",
    "options": ["选项A内容", "选项B内容", "选项C内容", "选项D内容"],
    "correctAnswer": 0,  // 正确答案的索引（0=A, 1=B, 2=C, 3=D）
    "explanation": "解析内容（如果有）",
    "difficulty": "easy|medium|hard",  // 根据题目复杂度判断
    "tags": ["相关标签1", "相关标签2"]  // 基于题目内容提取关键词
  }
]

严格的质量标准：
- 只返回JSON数组，不要包含任何其他文字或解释
- 确保JSON格式正确，可以被程序解析
- 每个题目必须有明确的正确答案，如果没有答案标识则跳过该题目
- 如果整个文本中没有完整题目（包含答案），返回空数组[]
- 选项数量必须至少2个，最多6个
- correctAnswer索引必须在选项范围内（从0开始计数）

重要提醒：
- 绝对不要猜测答案！如果文本中没有明确标注答案，请跳过该题目
- 宁可返回空数组，也不要输出不完整的题目
- 确保每个输出的题目都是完整且准确的`,

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
      input: `第3题 以下哪个不是Python的数据类型？
①list
②tuple
③array
④dict
正确答案：C
解析：Python内置数据类型包括list、tuple、dict等，array需要导入numpy模块。`,
      output: `[{
  "title": "以下哪个不是Python的数据类型？",
  "options": ["list", "tuple", "array", "dict"],
  "correctAnswer": 2,
  "explanation": "Python内置数据类型包括list、tuple、dict等，array需要导入numpy模块。",
  "difficulty": "medium",
  "tags": ["Python", "数据类型"]
}]`,
      description: '带序号和特殊符号的题目'
    },
    {
      input: `4. 在JavaScript中，下列哪个方法可以向数组末尾添加元素？
A) push()
B) pop()
C) shift()
D) unshift()
Answer: A
Explanation: push()方法用于向数组末尾添加一个或多个元素。`,
      output: `[{
  "title": "在JavaScript中，下列哪个方法可以向数组末尾添加元素？",
  "options": ["push()", "pop()", "shift()", "unshift()"],
  "correctAnswer": 0,
  "explanation": "push()方法用于向数组末尾添加一个或多个元素。",
  "difficulty": "easy",
  "tags": ["JavaScript", "数组方法"]
}]`,
      description: '英文答案格式的题目'
    },
    {
      input: `5. 关于HTTP状态码，以下说法正确的是：
A. 200表示请求失败
B. 404表示服务器错误
C. 500表示服务器内部错误
D. 301表示永久重定向
答案：C、D
解析：200表示成功，404表示未找到，500表示服务器内部错误，301表示永久重定向。`,
      output: `[{
  "title": "关于HTTP状态码，以下说法正确的是：",
  "options": ["200表示请求失败", "404表示服务器错误", "500表示服务器内部错误", "301表示永久重定向"],
  "correctAnswer": 2,
  "explanation": "200表示成功，404表示未找到，500表示服务器内部错误，301表示永久重定向。注意：这是多选题，但系统当前只支持单选，选择了主要正确答案。",
  "difficulty": "medium",
  "tags": ["HTTP", "状态码", "网络协议"]
}]`,
      description: '多选题转单选的处理'
    },
    {
      input: `6. 以下哪个不是Python的数据类型？
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
