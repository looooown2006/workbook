import React, { useState, useEffect } from 'react';
import {
  Modal,
  Steps,
  Input,
  Button,
  Card,
  List,
  Typography,
  Space,
  Alert,
  Divider,
  Form,
  Select,
  message,
  Spin,
  Row,
  Col,
  Tag,
  Tooltip
} from 'antd';
import {
  RobotOutlined,
  EditOutlined,
  CheckOutlined,
  DeleteOutlined,
  PlusOutlined,
  BulbOutlined,
  FileTextOutlined,
  FileImageOutlined,
  ScanOutlined
} from '@ant-design/icons';
import { SmartTextParser } from '../../utils/smartTextParser';
import { AIParser } from '../../utils/aiParser';
import { AIConfigManager } from '../../utils/aiConfig';
import { ImportQuestionData, ImportResult, Question } from '../../types';
import { useAppStore } from '../../stores/useAppStore';
import { OCRParser } from '../../parsers/ocr/OCRParser';
import FileUploader from './FileUploader';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface SmartImportAssistantProps {
  visible: boolean;
  onClose: () => void;
  chapterId?: string;
}

interface ParsedQuestion extends ImportQuestionData {
  id: string;
  isValid: boolean;
  errors: string[];
}

const SmartImportAssistant: React.FC<SmartImportAssistantProps> = ({
  visible,
  onClose,
  chapterId
}) => {
  const { addQuestions, currentChapter, chapters, setCurrentChapter } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [parseMode, setParseMode] = useState<'local' | 'ai' | 'ocr'>('local');
  const [aiConfig, setAiConfig] = useState(AIConfigManager.getConfig());
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);

  // 监听组件显示状态，重新获取AI配置并设置当前章节
  useEffect(() => {
    if (visible) {
      const currentConfig = AIConfigManager.getConfig();
      setAiConfig(currentConfig);

      // 如果传入了chapterId，设置当前章节
      if (chapterId && chapters.length > 0) {
        const targetChapter = chapters.find(c => c.id === chapterId);
        if (targetChapter && targetChapter.id !== currentChapter?.id) {
          setCurrentChapter(targetChapter);
        }
      }
    }
  }, [visible, chapterId, chapters, currentChapter, setCurrentChapter]);

  // 重置状态
  const resetState = () => {
    setCurrentStep(0);
    setInputText('');
    setParsedQuestions([]);
    setSelectedQuestions(new Set());
    setEditingQuestion(null);
    setParsing(false);
    setImporting(false);
    setSelectedFile(null);
    setOcrProgress(0);
  };

  // 解析内容（文本或文件）
  const handleParse = async () => {
    // 检查输入
    if (inputMode === 'text' && !inputText.trim()) {
      message.warning('请输入题目文本');
      return;
    }
    if (inputMode === 'file' && !selectedFile) {
      message.warning('请选择要解析的文件');
      return;
    }

    setParsing(true);
    setOcrProgress(0);

    try {
      let result: ImportResult;

      if (inputMode === 'file' && selectedFile) {
        // 文件解析模式
        result = await handleFileParseWithProgress(selectedFile);
      } else {
        // 文本解析模式
        result = await handleTextParse(inputText);
      }

      if (result.success && result.questions.length > 0) {
        const questionsWithValidation = result.questions.map((q, index) => ({
          ...q,
          id: `temp_${index}`,
          isValid: validateQuestion(q),
          errors: getQuestionErrors(q)
        }));

        setParsedQuestions(questionsWithValidation);
        setSelectedQuestions(new Set(questionsWithValidation.map(q => q.id)));
        setCurrentStep(1);

        const modeText = getModeText();
        message.success(`${modeText}成功识别 ${result.questions.length} 道题目`);
      } else {
        const modeText = getModeText();
        message.error(`${modeText}未能识别到有效的题目格式，请检查输入内容或尝试其他解析方式`);
      }
    } catch (error) {
      const modeText = getModeText();
      message.error(`${modeText}失败: ${error}`);
    } finally {
      setParsing(false);
      setOcrProgress(0);
    }
  };

  // 获取解析模式文本
  const getModeText = () => {
    if (inputMode === 'file') {
      return 'OCR识别';
    }
    return parseMode === 'ai' ? 'AI智能解析' : '本地解析';
  };

  // 处理文本解析
  const handleTextParse = async (text: string): Promise<ImportResult> => {
    if (parseMode === 'ai' && aiConfig.enabled) {
      // 模拟解析延迟，提供更好的用户体验
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await AIParser.parseWithAI(text);
    } else {
      // 模拟解析延迟，提供更好的用户体验
      await new Promise(resolve => setTimeout(resolve, 500));
      return await SmartTextParser.parseText(text);
    }
  };

  // 处理文件解析（带进度）
  const handleFileParseWithProgress = async (file: File): Promise<ImportResult> => {
    const ocrParser = new OCRParser();

    // 模拟进度更新
    const progressInterval = setInterval(() => {
      setOcrProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const result = await ocrParser.parse({
        type: file.type.includes('pdf') ? 'pdf' : 'image',
        content: file
      });

      setOcrProgress(100);
      clearInterval(progressInterval);

      return {
        success: result.success,
        questions: result.questions as Question[],
        totalCount: result.questions.length,
        successCount: result.success ? result.questions.length : 0,
        failedCount: result.success ? 0 : 1,
        errors: result.errors || []
      };
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  };

  // 文件选择处理
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setInputText(''); // 清空文本输入
    setInputMode('file');
  };

  // 文件移除处理
  const handleFileRemove = () => {
    setSelectedFile(null);
    setInputMode('text');
  };

  // 估算成本
  const estimateCost = (text: string) => {
    if (parseMode === 'ai' && aiConfig.enabled) {
      const tokenCount = Math.ceil(text.length / 4); // 粗略估算
      const cost = tokenCount * 0.001; // 假设每1K token 0.001元
      setEstimatedCost(cost);
    } else {
      setEstimatedCost(0);
    }
  };

  // 验证题目
  const validateQuestion = (question: ImportQuestionData): boolean => {
    return !!(
      question.title &&
      question.options &&
      question.options.length >= 2 &&
      question.correctAnswer !== undefined &&
      Number(question.correctAnswer) >= 0 &&
      Number(question.correctAnswer) < question.options.length
    );
  };

  // 获取题目错误
  const getQuestionErrors = (question: ImportQuestionData): string[] => {
    const errors: string[] = [];
    
    if (!question.title) errors.push('缺少题目内容');
    if (!question.options || question.options.length < 2) errors.push('选项不足（至少需要2个）');
    if (question.correctAnswer === undefined || Number(question.correctAnswer) < 0) errors.push('缺少正确答案');
    if (question.options && Number(question.correctAnswer) >= question.options.length) errors.push('答案索引超出选项范围');
    
    return errors;
  };

  // 编辑题目
  const handleEditQuestion = (questionId: string, updatedQuestion: Partial<ImportQuestionData>) => {
    setParsedQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        const updated = { ...q, ...updatedQuestion };
        return {
          ...updated,
          isValid: validateQuestion(updated),
          errors: getQuestionErrors(updated)
        };
      }
      return q;
    }));
  };

  // 删除题目
  const handleDeleteQuestion = (questionId: string) => {
    setParsedQuestions(prev => prev.filter(q => q.id !== questionId));
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(questionId);
      return newSet;
    });
  };

  // 切换题目选择
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // 导入题目
  const handleImportQuestions = async () => {
    if (!chapterId || !currentChapter) {
      message.error('请先选择章节');
      return;
    }

    const selectedQuestionsData = parsedQuestions
      .filter(q => selectedQuestions.has(q.id) && q.isValid)
      .map(q => ({
        title: q.title,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: q.tags
      }));

    if (selectedQuestionsData.length === 0) {
      message.warning('没有选择有效的题目');
      return;
    }

    setImporting(true);
    try {
      // 转换为标准格式并添加到题库
      const questions = selectedQuestionsData.map(q => ({
        title: q.title,
        options: q.options,
        correctAnswer: typeof q.correctAnswer === 'string' ? parseInt(q.correctAnswer) : q.correctAnswer,
        explanation: q.explanation || '',
        difficulty: (q.difficulty as any) || 'medium',
        tags: q.tags || [],
        status: 'new' as const,
        wrongCount: 0,
        isMastered: false
      }));

      await addQuestions(questions);
      message.success(`成功导入 ${questions.length} 道题目`);
      onClose();
      resetState();
    } catch (error) {
      message.error('导入失败');
    } finally {
      setImporting(false);
    }
  };

  // 示例文本
  const exampleTexts = [
    {
      title: '标准格式',
      content: `1. 以下哪个是正确的JavaScript变量声明？
A. var name = "张三";
B. variable name = "张三";
C. string name = "张三";
D. declare name = "张三";
答案：A
解析：JavaScript使用var、let或const关键字声明变量。`
    },
    {
      title: '简化格式',
      content: `什么是HTML？
A. 超文本标记语言
B. 高级文本语言
C. 超链接文本语言
D. 混合文本语言
答案：A`
    }
  ];

  const steps = [
    {
      title: '输入文本',
      description: '粘贴或输入题目文本'
    },
    {
      title: '预览编辑',
      description: '检查和编辑识别的题目'
    },
    {
      title: '确认导入',
      description: '选择题目并导入到题库'
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          题目导入助手
        </Space>
      }
      open={visible}
      onCancel={() => {
        onClose();
        resetState();
      }}
      footer={null}
      width="90%"
      style={{ maxWidth: '1200px', minWidth: '800px' }}
      destroyOnClose
      centered
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

      {currentStep === 0 && (
        <div>
          <Alert
            message="智能识别多种格式"
            description="支持文本输入、图片识别、PDF解析等多种输入方式，自动识别和转换题目格式"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* 输入方式选择 */}
          <Card title="输入方式" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Button
                  type={inputMode === 'text' ? 'primary' : 'default'}
                  block
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    setInputMode('text');
                    setSelectedFile(null);
                  }}
                >
                  文本输入
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  type={inputMode === 'file' ? 'primary' : 'default'}
                  block
                  icon={<ScanOutlined />}
                  onClick={() => {
                    setInputMode('file');
                    setInputText('');
                  }}
                >
                  文件识别
                </Button>
              </Col>
            </Row>
          </Card>

          {/* 解析方式选择（仅文本模式） */}
          {inputMode === 'text' && (
            <Card title="解析方式" style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Select
                    value={parseMode}
                    onChange={(value) => {
                      setParseMode(value);
                      if (value === 'ai' && inputText.trim()) {
                        const cost = AIParser.estimateCost(inputText, aiConfig);
                        setEstimatedCost(cost);
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="local">
                      <Space>
                        <FileTextOutlined />
                        本地解析
                      </Space>
                    </Select.Option>
                    <Select.Option value="ai" disabled={!aiConfig.enabled}>
                      <Space>
                        <RobotOutlined />
                        AI智能解析
                        {!aiConfig.enabled && <Text type="secondary">(未启用)</Text>}
                      </Space>
                    </Select.Option>
                  </Select>
                </Col>
                <Col span={16}>
                  {parseMode === 'local' && (
                    <Text type="secondary">
                      使用内置规则解析，支持常见格式，完全免费
                    </Text>
                  )}
                  {parseMode === 'ai' && aiConfig.enabled && (
                    <Space>
                      <Text type="secondary">
                        使用AI模型解析，识别准确率更高
                      </Text>
                      {estimatedCost > 0 && (
                        <Tag color="orange">
                          预估费用: ¥{(estimatedCost / 100).toFixed(3)}
                        </Tag>
                      )}
                    </Space>
                  )}
                  {parseMode === 'ai' && !aiConfig.enabled && (
                    <Text type="warning">
                      请先在设置中配置AI服务
                    </Text>
                  )}
                </Col>
              </Row>
            </Card>
          )}

          {/* 输入内容区域 */}
          {inputMode === 'text' ? (
            <Card title="输入题目文本" style={{ marginBottom: 16 }}>
              <TextArea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  // 实时更新成本估算
                  if (parseMode === 'ai' && e.target.value.trim()) {
                    const cost = AIParser.estimateCost(e.target.value, aiConfig);
                    setEstimatedCost(cost);
                  }
                }}
                placeholder="请粘贴题目文本，支持多种格式..."
                rows={12}
                style={{
                  marginBottom: 16,
                  width: '100%',
                  resize: 'vertical',
                  minHeight: '300px'
                }}
              />

              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <Button
                      type="primary"
                      icon={parseMode === 'ai' ? <RobotOutlined /> : <FileTextOutlined />}
                      onClick={handleParse}
                      loading={parsing}
                      disabled={!inputText.trim() || (parseMode === 'ai' && !aiConfig.enabled)}
                    >
                      {parseMode === 'ai' ? 'AI智能解析' : '本地解析'}
                    </Button>
                    <Button onClick={() => setInputText('')}>
                      清空
                    </Button>
                  </Space>
                </Col>
                <Col>
                  <Text type="secondary">
                    字符数: {inputText.length}
                </Text>
              </Col>
            </Row>
            </Card>
          ) : (
            <Card title="上传文件" style={{ marginBottom: 16 }}>
              <FileUploader
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                loading={parsing}
                progress={ocrProgress}
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                maxSize={50}
              />

              <Row justify="center" style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<ScanOutlined />}
                  onClick={handleParse}
                  loading={parsing}
                  disabled={!selectedFile}
                  size="large"
                >
                  开始识别
                </Button>
              </Row>
            </Card>
          )}

          {inputMode === 'text' && (
            <Card title="格式示例" size="small">
            <Row gutter={16}>
              {exampleTexts.map((example, index) => (
                <Col span={12} key={index}>
                  <Card
                    size="small"
                    title={example.title}
                    extra={
                      <Button
                        size="small"
                        type="link"
                        onClick={() => setInputText(example.content)}
                      >
                        使用示例
                      </Button>
                    }
                  >
                    <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {example.content}
                    </pre>
                  </Card>
                </Col>
              ))}
            </Row>
            </Card>
          )}
        </div>
      )}

      {currentStep === 1 && (
        <div>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                识别结果
                <Tag color="blue">{parsedQuestions.length} 道题目</Tag>
              </Space>
            }
            extra={
              <Space>
                <Button onClick={() => setCurrentStep(0)}>
                  返回编辑
                </Button>
                <Button
                  type="primary"
                  onClick={() => setCurrentStep(2)}
                  disabled={selectedQuestions.size === 0}
                >
                  下一步
                </Button>
              </Space>
            }
          >
            <div style={{
              maxHeight: '500px',
              overflowY: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: '6px',
              padding: '8px'
            }}>
              <List
                dataSource={parsedQuestions}
                renderItem={(question, index) => (
                  <QuestionPreviewItem
                    key={question.id}
                    question={question}
                    index={index}
                    selected={selectedQuestions.has(question.id)}
                    editing={editingQuestion === question.id}
                    onToggleSelect={() => toggleQuestionSelection(question.id)}
                    onEdit={() => setEditingQuestion(question.id)}
                    onSave={(updated) => {
                      handleEditQuestion(question.id, updated);
                      setEditingQuestion(null);
                    }}
                    onCancel={() => setEditingQuestion(null)}
                    onDelete={() => handleDeleteQuestion(question.id)}
                  />
                )}
              />
            </div>
          </Card>
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <Card
            title="确认导入"
            extra={
              <Space>
                <Button onClick={() => setCurrentStep(1)}>
                  返回编辑
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleImportQuestions}
                  loading={importing}
                >
                  导入题目
                </Button>
              </Space>
            }
          >
            <Alert
              message={`即将导入 ${selectedQuestions.size} 道题目到章节"${currentChapter?.name}"`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <List
              dataSource={parsedQuestions.filter(q => selectedQuestions.has(q.id))}
              renderItem={(question, index) => (
                <List.Item>
                  <Card size="small" style={{ width: '100%' }}>
                    <Title level={5}>题目 {index + 1}</Title>
                    <Paragraph>{question.title}</Paragraph>
                    <div>
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex}>
                          <Text
                            strong={optIndex === question.correctAnswer}
                            type={optIndex === question.correctAnswer ? 'success' : undefined}
                          >
                            {String.fromCharCode(65 + optIndex)}. {option}
                          </Text>
                        </div>
                      ))}
                    </div>
                    {question.explanation && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">解析：{question.explanation}</Text>
                      </div>
                    )}
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        </div>
      )}
    </Modal>
  );
};

// 题目预览项组件
interface QuestionPreviewItemProps {
  question: ParsedQuestion;
  index: number;
  selected: boolean;
  editing: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onSave: (question: Partial<ImportQuestionData>) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const QuestionPreviewItem: React.FC<QuestionPreviewItemProps> = ({
  question,
  index,
  selected,
  editing,
  onToggleSelect,
  onEdit,
  onSave,
  onCancel,
  onDelete
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        title: question.title,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      });
    }
  }, [editing, question, form]);

  const handleSave = () => {
    form.validateFields().then(values => {
      onSave(values);
    });
  };

  if (editing) {
    return (
      <List.Item>
        <Card style={{ width: '100%' }}>
          <Form form={form} layout="vertical">
            <Form.Item
              label="题目内容"
              name="title"
              rules={[{ required: true, message: '请输入题目内容' }]}
            >
              <TextArea rows={2} />
            </Form.Item>
            
            <Form.Item label="选项">
              <Form.List name="options">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Space key={key} style={{ display: 'flex', marginBottom: 8 }}>
                        <Text>{String.fromCharCode(65 + name)}.</Text>
                        <Form.Item
                          {...restField}
                          name={name}
                          rules={[{ required: true, message: '请输入选项内容' }]}
                          style={{ flex: 1, margin: 0 }}
                        >
                          <Input />
                        </Form.Item>
                        {fields.length > 2 && (
                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        )}
                      </Space>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      icon={<PlusOutlined />}
                      style={{ width: '100%' }}
                    >
                      添加选项
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
            
            <Form.Item
              label="正确答案"
              name="correctAnswer"
              rules={[{ required: true, message: '请选择正确答案' }]}
            >
              <Select>
                {question.options.map((_, index) => (
                  <Select.Option key={index} value={index}>
                    {String.fromCharCode(65 + index)}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item label="解析" name="explanation">
              <TextArea rows={2} />
            </Form.Item>
            
            <Space>
              <Button type="primary" onClick={handleSave}>
                保存
              </Button>
              <Button onClick={onCancel}>
                取消
              </Button>
            </Space>
          </Form>
        </Card>
      </List.Item>
    );
  }

  return (
    <List.Item
      actions={[
        <Tooltip title={selected ? '取消选择' : '选择导入'}>
          <Button
            type={selected ? 'primary' : 'default'}
            icon={<CheckOutlined />}
            onClick={onToggleSelect}
          />
        </Tooltip>,
        <Tooltip title="编辑">
          <Button icon={<EditOutlined />} onClick={onEdit} />
        </Tooltip>,
        <Tooltip title="删除">
          <Button icon={<DeleteOutlined />} danger onClick={onDelete} />
        </Tooltip>
      ]}
    >
      <List.Item.Meta
        title={
          <Space>
            <Text>题目 {index + 1}</Text>
            {!question.isValid && <Tag color="red">有错误</Tag>}
            {question.isValid && <Tag color="green">格式正确</Tag>}
          </Space>
        }
        description={
          <div>
            <Paragraph ellipsis={{ rows: 2 }}>{question.title}</Paragraph>
            <div>
              {question.options.map((option, optIndex) => (
                <div key={optIndex}>
                  <Text
                    strong={optIndex === question.correctAnswer}
                    type={optIndex === question.correctAnswer ? 'success' : undefined}
                  >
                    {String.fromCharCode(65 + optIndex)}. {option}
                  </Text>
                </div>
              ))}
            </div>
            {question.errors.length > 0 && (
              <Alert
                message="格式错误"
                description={question.errors.join(', ')}
                type="error"

                style={{ marginTop: 8 }}
              />
            )}
          </div>
        }
      />
    </List.Item>
  );
};

export default SmartImportAssistant;
