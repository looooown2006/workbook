// Web Worker for processing large question imports
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'PROCESS_QUESTIONS':
      processQuestions(data);
      break;
    case 'VALIDATE_QUESTIONS':
      validateQuestions(data);
      break;
    default:
      self.postMessage({
        type: 'ERROR',
        error: 'Unknown message type'
      });
  }
};

function processQuestions(data) {
  const { questions, chapterId, batchSize = 100 } = data;
  const results = [];
  const errors = [];
  
  try {
    // 分批处理题目
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchResults = [];
      
      batch.forEach((questionData, index) => {
        try {
          const processedQuestion = processQuestion(questionData, chapterId);
          if (processedQuestion) {
            batchResults.push(processedQuestion);
          }
        } catch (error) {
          errors.push(`第${i + index + 1}题处理失败: ${error.message}`);
        }
      });
      
      results.push(...batchResults);
      
      // 发送进度更新
      self.postMessage({
        type: 'PROGRESS',
        progress: Math.min(100, Math.round(((i + batchSize) / questions.length) * 100)),
        processed: i + batchSize,
        total: questions.length
      });
    }
    
    // 发送最终结果
    self.postMessage({
      type: 'COMPLETE',
      result: {
        success: results.length > 0,
        totalCount: questions.length,
        successCount: results.length,
        failedCount: questions.length - results.length,
        errors: errors,
        questions: results
      }
    });
    
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message
    });
  }
}

function processQuestion(questionData, chapterId) {
  // 验证必需字段
  if (!questionData.title || !questionData.title.trim()) {
    throw new Error('题目标题不能为空');
  }
  
  if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
    throw new Error('选项至少需要2个');
  }
  
  // 验证选项内容
  for (let i = 0; i < questionData.options.length; i++) {
    if (!questionData.options[i] || !questionData.options[i].trim()) {
      throw new Error(`选项${i + 1}内容不能为空`);
    }
  }
  
  // 处理正确答案
  let correctAnswerIndex;
  if (typeof questionData.correctAnswer === 'number') {
    correctAnswerIndex = questionData.correctAnswer;
  } else if (typeof questionData.correctAnswer === 'string') {
    const letter = questionData.correctAnswer.toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
      correctAnswerIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
    } else {
      const num = parseInt(questionData.correctAnswer);
      correctAnswerIndex = isNaN(num) ? 0 : num - 1; // 转为0-based索引
    }
  } else {
    correctAnswerIndex = 0;
  }
  
  // 验证答案索引
  if (correctAnswerIndex < 0 || correctAnswerIndex >= questionData.options.length) {
    throw new Error('正确答案索引超出选项范围');
  }
  
  // 生成唯一ID
  const id = generateId();
  const now = new Date();
  
  return {
    id: id,
    title: questionData.title.trim(),
    options: questionData.options.map(opt => opt.trim()),
    correctAnswer: correctAnswerIndex,
    explanation: questionData.explanation?.trim() || '',
    difficulty: questionData.difficulty || 'medium',
    tags: questionData.tags || [],
    status: 'new',
    wrongCount: 0,
    isMastered: false,
    createdAt: now,
    updatedAt: now
  };
}

function validateQuestions(data) {
  const { questions } = data;
  const errors = [];
  const validQuestions = [];
  
  questions.forEach((question, index) => {
    try {
      const validation = validateQuestion(question);
      if (validation.isValid) {
        validQuestions.push(question);
      } else {
        errors.push(`第${index + 1}题: ${validation.error}`);
      }
    } catch (error) {
      errors.push(`第${index + 1}题验证失败: ${error.message}`);
    }
  });
  
  self.postMessage({
    type: 'VALIDATION_COMPLETE',
    result: {
      validCount: validQuestions.length,
      invalidCount: errors.length,
      errors: errors,
      validQuestions: validQuestions
    }
  });
}

function validateQuestion(questionData) {
  if (!questionData.title || questionData.title.trim() === '') {
    return { isValid: false, error: '题目标题不能为空' };
  }

  if (!questionData.options || questionData.options.length < 2) {
    return { isValid: false, error: '选项至少需要2个' };
  }

  if (questionData.options.some(option => !option || option.trim() === '')) {
    return { isValid: false, error: '选项内容不能为空' };
  }

  // 验证正确答案
  let correctAnswerIndex;
  if (typeof questionData.correctAnswer === 'number') {
    correctAnswerIndex = questionData.correctAnswer;
  } else if (typeof questionData.correctAnswer === 'string') {
    const letter = questionData.correctAnswer.toUpperCase();
    correctAnswerIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
  } else {
    return { isValid: false, error: '正确答案格式错误' };
  }

  if (correctAnswerIndex < 0 || correctAnswerIndex >= questionData.options.length) {
    return { isValid: false, error: '正确答案索引超出选项范围' };
  }

  return { isValid: true };
}

// 生成唯一ID的简单实现
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
