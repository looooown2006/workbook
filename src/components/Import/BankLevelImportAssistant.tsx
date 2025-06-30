import React, { useState } from 'react';
import {
  Modal,
  Steps,
  Button,
  Input,
  message,
  Card,
  Alert,
  Space,
  Typography,
  List,
  Checkbox,
  Select,
  Divider,
  Tag
} from 'antd';
import {
  RobotOutlined,
  CheckOutlined,
  DeleteOutlined,
  PlusOutlined,
  FileTextOutlined,
  ScanOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { AIParser } from '../../utils/aiParser';
import { AIConfigManager } from '../../utils/aiConfig';
import { ImportQuestionData, ImportResult, QuestionBank, Chapter, Question } from '../../types';
import FileUploader from './FileUploader';
import { OCRParser } from '../../parsers/ocr/OCRParser';
import { ParserRouter } from '../../parsers/router/ParserRouter';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface ParsedQuestion extends ImportQuestionData {
  id: string;
  isValid: boolean;
  errors: string[];
  suggestedChapter?: string;
}

interface ChapterAssignment {
  chapterId: string;
  chapterName: string;
  questionIds: string[];
}

interface BankLevelImportAssistantProps {
  visible: boolean;
  onClose: () => void;
  questionBank: QuestionBank;
}

const BankLevelImportAssistant: React.FC<BankLevelImportAssistantProps> = ({
  visible,
  onClose,
  questionBank
}) => {
  const { 
    addQuestions, 
    addChapter, 
    chapters,
    setCurrentChapter 
  } = useAppStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [chapterAssignments, setChapterAssignments] = useState<ChapterAssignment[]>([]);
  const [newChapterName, setNewChapterName] = useState('');

  // 重置状态
  const resetState = () => {
    setCurrentStep(0);
    setInputText('');
    setParsedQuestions([]);
    setSelectedQuestions(new Set());
    setParsing(false);
    setImporting(false);
    setSelectedFile(null);
    setOcrProgress(0);
    setChapterAssignments([]);
    setNewChapterName('');
  };

  // 文件选择处理
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setInputText('');
    setInputMode('file');
  };

  // 文件移除处理
  const handleFileRemove = () => {
    setSelectedFile(null);
    setInputMode('text');
  };

  // 解析内容（文本或文件）
  const handleParse = async () => {
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
        result = await handleFileParseWithProgress(selectedFile);
      } else {
        result = await handleTextParse(inputText);
      }

      if (result.success && result.questions.length > 0) {
        const questionsWithValidation = result.questions.map((q, index) => ({
          ...q,
          id: `temp_${index}`,
          isValid: validateQuestion(q),
          errors: getQuestionErrors(q),
          suggestedChapter: detectChapterFromQuestion(q)
        }));

        setParsedQuestions(questionsWithValidation);
        setSelectedQuestions(new Set(questionsWithValidation.map(q => q.id)));
        
        // 自动生成章节分配建议
        generateChapterAssignments(questionsWithValidation);
        
        setCurrentStep(1);
        message.success(`AI智能解析成功识别 ${result.questions.length} 道题目`);
      } else {
        message.error('AI解析未能识别到有效的题目格式，请检查输入内容');
      }
    } catch (error) {
      message.error(`解析失败: ${error}`);
    } finally {
      setParsing(false);
      setOcrProgress(0);
    }
  };

  // 处理文本解析
  const handleTextParse = async (text: string): Promise<ImportResult> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 使用智能路由系统
    const router = new ParserRouter();
    const parseInput = {
      type: 'text' as const,
      content: text
    };

    const routingContext = {
      userPreference: 'accuracy' as const,
      qualityRequirement: 'high' as const,
      textLength: text.length
    };

    const parseResult = await router.parse(parseInput, routingContext);

    return {
      success: parseResult.success,
      questions: parseResult.questions,
      totalCount: parseResult.questions.length,
      successCount: parseResult.success ? parseResult.questions.length : 0,
      failedCount: parseResult.success ? 0 : 1,
      errors: parseResult.errors || []
    };
  };

  // 处理文件解析（带进度）
  const handleFileParseWithProgress = async (file: File): Promise<ImportResult> => {
    const ocrParser = new OCRParser();
    
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

  // 验证题目
  const validateQuestion = (question: ImportQuestionData): boolean => {
    const correctAnswer = typeof question.correctAnswer === 'string'
      ? parseInt(question.correctAnswer)
      : question.correctAnswer;

    return !!(
      question.title?.trim() &&
      question.options?.length >= 2 &&
      correctAnswer >= 0 &&
      correctAnswer < question.options.length
    );
  };

  // 获取题目错误
  const getQuestionErrors = (question: ImportQuestionData): string[] => {
    const errors: string[] = [];
    const correctAnswer = typeof question.correctAnswer === 'string'
      ? parseInt(question.correctAnswer)
      : question.correctAnswer;

    if (!question.title?.trim()) errors.push('题目内容为空');
    if (!question.options || question.options.length < 2) errors.push('选项数量不足');
    if (correctAnswer < 0 || correctAnswer >= (question.options?.length || 0)) {
      errors.push('正确答案无效');
    }
    return errors;
  };

  // 从题目内容检测章节
  const detectChapterFromQuestion = (question: ImportQuestionData): string => {
    const title = question.title?.toLowerCase() || '';
    
    // 简单的关键词匹配
    if (title.includes('javascript') || title.includes('js')) return 'JavaScript基础';
    if (title.includes('react') || title.includes('组件')) return 'React开发';
    if (title.includes('css') || title.includes('样式')) return 'CSS样式';
    if (title.includes('html') || title.includes('标签')) return 'HTML结构';
    if (title.includes('算法') || title.includes('数据结构')) return '算法与数据结构';
    
    return '通用题目';
  };

  // 生成章节分配建议
  const generateChapterAssignments = (questions: ParsedQuestion[]) => {
    const chapterMap = new Map<string, string[]>();
    
    questions.forEach(q => {
      const chapter = q.suggestedChapter || '通用题目';
      if (!chapterMap.has(chapter)) {
        chapterMap.set(chapter, []);
      }
      chapterMap.get(chapter)!.push(q.id);
    });

    const assignments: ChapterAssignment[] = Array.from(chapterMap.entries()).map(([chapterName, questionIds]) => ({
      chapterId: '', // 将在导入时创建
      chapterName,
      questionIds
    }));

    setChapterAssignments(assignments);
  };

  // 添加新章节
  const handleAddChapter = () => {
    if (!newChapterName.trim()) {
      message.warning('请输入章节名称');
      return;
    }
    
    const newAssignment: ChapterAssignment = {
      chapterId: '',
      chapterName: newChapterName.trim(),
      questionIds: []
    };
    
    setChapterAssignments([...chapterAssignments, newAssignment]);
    setNewChapterName('');
  };

  // 移除章节分配
  const handleRemoveChapterAssignment = (index: number) => {
    const newAssignments = [...chapterAssignments];
    newAssignments.splice(index, 1);
    setChapterAssignments(newAssignments);
  };

  // 更新章节分配
  const handleUpdateChapterAssignment = (index: number, field: string, value: any) => {
    const newAssignments = [...chapterAssignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setChapterAssignments(newAssignments);
  };

  // 确认导入
  const handleConfirmImport = async () => {
    const selectedQuestionsData = parsedQuestions.filter(q => selectedQuestions.has(q.id));
    
    if (selectedQuestionsData.length === 0) {
      message.warning('请至少选择一道题目');
      return;
    }

    if (chapterAssignments.length === 0) {
      message.warning('请至少创建一个章节');
      return;
    }

    setImporting(true);
    
    try {
      // 创建章节并导入题目
      for (const assignment of chapterAssignments) {
        if (assignment.questionIds.length === 0) continue;
        
        // 创建新章节
        const newChapter: Chapter = {
          id: `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: assignment.chapterName,
          description: `通过智能导入创建的章节`,
          questionIds: [],
          bankId: questionBank.id,
          order: Date.now(), // 使用时间戳作为排序
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await addChapter(newChapter);

        // 设置当前章节，这样addQuestions就能正确工作
        setCurrentChapter(newChapter);

        // 获取对应的题目
        const chapterQuestions = selectedQuestionsData.filter(q =>
          assignment.questionIds.includes(q.id)
        );

        if (chapterQuestions.length > 0) {
          // 转换为Question格式（移除额外的字段）
          const questions = chapterQuestions.map(q => ({
            title: q.title,
            options: q.options,
            correctAnswer: typeof q.correctAnswer === 'string' ? parseInt(q.correctAnswer) : q.correctAnswer,
            explanation: q.explanation,
            difficulty: (q.difficulty as any) || 'medium',
            tags: q.tags || [],
            status: 'new' as const,
            wrongCount: 0,
            isMastered: false
          }));

          await addQuestions(questions);
        }
      }

      message.success(`成功导入 ${selectedQuestionsData.length} 道题目到 ${chapterAssignments.length} 个章节`);
      resetState();
      onClose();
    } catch (error) {
      message.error(`导入失败: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          智能题目导入助手
        </Space>
      }
      open={visible}
      onCancel={() => {
        resetState();
        onClose();
      }}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Steps
        current={currentStep}
        items={[
          {
            title: '输入内容',
            description: '粘贴文本或上传文件'
          },
          {
            title: '章节分配',
            description: '分配题目到章节'
          },
          {
            title: '确认导入',
            description: '选择题目并导入到题库'
          }
        ]}
        style={{ marginBottom: 24 }}
      />

      {currentStep === 0 && (
        <div>
          <Alert
            message="智能识别多种格式"
            description={`正在为题库"${questionBank.name}"导入题目。支持文本输入、图片识别、PDF解析等多种输入方式，自动识别和转换题目格式，并智能分配到不同章节。`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* 输入方式选择 */}
          <Card title="输入方式" style={{ marginBottom: 16 }}>
            <Space size="large">
              <Button
                type={inputMode === 'text' ? 'primary' : 'default'}
                icon={<FileTextOutlined />}
                onClick={() => {
                  setInputMode('text');
                  setSelectedFile(null);
                }}
              >
                文本输入
              </Button>
              <Button
                type={inputMode === 'file' ? 'primary' : 'default'}
                icon={<ScanOutlined />}
                onClick={() => {
                  setInputMode('file');
                  setInputText('');
                }}
              >
                文件识别
              </Button>
            </Space>
          </Card>

          {/* 输入内容区域 */}
          {inputMode === 'text' ? (
            <Card title="输入题目文本" style={{ marginBottom: 16 }}>
              <TextArea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="请粘贴题目文本，支持多种格式..."
                rows={12}
                style={{ marginBottom: 16 }}
              />
              
              <Space>
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={handleParse}
                  loading={parsing}
                  disabled={!inputText.trim()}
                >
                  AI智能解析
                </Button>
                <Button onClick={() => setInputText('')}>
                  清空
                </Button>
              </Space>
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
              
              <div style={{ textAlign: 'center', marginTop: 16 }}>
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
              </div>
            </Card>
          )}
        </div>
      )}

      {currentStep === 1 && (
        <div>
          <Alert
            message="章节分配"
            description="系统已自动分析题目内容并建议章节分配，您可以调整分配方案或创建新章节。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* 章节分配列表 */}
          <Card title="章节分配方案" style={{ marginBottom: 16 }}>
            {chapterAssignments.map((assignment, index) => (
              <Card
                key={index}
                size="small"
                style={{ marginBottom: 8 }}
                extra={
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveChapterAssignment(index)}
                    danger
                  />
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input
                    value={assignment.chapterName}
                    onChange={(e) => handleUpdateChapterAssignment(index, 'chapterName', e.target.value)}
                    placeholder="章节名称"
                  />
                  <Text type="secondary">
                    包含题目: {assignment.questionIds.length} 道
                  </Text>
                </Space>
              </Card>
            ))}

            <Card size="small" style={{ border: '1px dashed #d9d9d9' }}>
              <Space>
                <Input
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder="新章节名称"
                  style={{ width: 200 }}
                />
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={handleAddChapter}
                >
                  添加章节
                </Button>
              </Space>
            </Card>
          </Card>

          <Space>
            <Button onClick={() => setCurrentStep(0)}>
              上一步
            </Button>
            <Button
              type="primary"
              onClick={() => setCurrentStep(2)}
              disabled={chapterAssignments.length === 0}
            >
              下一步
            </Button>
          </Space>
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <Alert
            message="确认导入"
            description="请确认要导入的题目和章节分配，点击确认导入完成操作。"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Card title="导入摘要">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>
                <strong>目标题库:</strong> {questionBank.name}
              </Text>
              <Text>
                <strong>题目数量:</strong> {selectedQuestions.size} 道
              </Text>
              <Text>
                <strong>章节数量:</strong> {chapterAssignments.length} 个
              </Text>
              <Divider />
              {chapterAssignments.map((assignment, index) => (
                <div key={index}>
                  <Tag color="blue">{assignment.chapterName}</Tag>
                  <Text type="secondary"> - {assignment.questionIds.length} 道题目</Text>
                </div>
              ))}
            </Space>
          </Card>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCurrentStep(1)}>
                上一步
              </Button>
              <Button
                type="primary"
                onClick={handleConfirmImport}
                loading={importing}
                icon={<CheckOutlined />}
              >
                确认导入
              </Button>
            </Space>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BankLevelImportAssistant;
