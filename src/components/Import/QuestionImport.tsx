import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Tabs,
  Input,
  message,
  Progress,
  List,
  Typography,
  Space,
  Alert,
  Card,
  Divider
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { DocumentParser } from '../../utils/documentParser';
import { ImportManager, ImportProgress } from '../../utils/importManager';
import { ImportResult } from '../../types';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface QuestionImportProps {
  visible: boolean;
  onClose: () => void;
  chapterId?: string;
}

const QuestionImport: React.FC<QuestionImportProps> = ({
  visible,
  onClose,
  chapterId
}) => {
  const { addQuestions, currentChapter } = useAppStore();
  const [activeTab, setActiveTab] = useState('file');
  const [textContent, setTextContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ progress: 0, processed: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importManager] = useState(() => new ImportManager());

  const handleFileUpload = async (file: File) => {
    if (!chapterId || !currentChapter) {
      message.error('请先选择章节');
      return false;
    }

    setImporting(true);
    setImportProgress({ progress: 0, processed: 0, total: 0 });

    try {
      // 解析文档
      const parseResult = await DocumentParser.parseDocx(file, chapterId);

      if (!parseResult.success || parseResult.questions.length === 0) {
        setImportResult(parseResult);
        setImporting(false);
        return false;
      }

      // 使用ImportManager处理题目
      const result = await importManager.processQuestions(
        parseResult.questions,
        chapterId,
        {
          onProgress: (progress) => {
            setImportProgress(progress);
          },
          onComplete: async (result) => {
            if (result.success && result.questions.length > 0) {
              await addQuestions(result.questions);
              message.success(`成功导入 ${result.successCount} 道题目`);
            }
            setImportResult(result);
            setImporting(false);
          },
          onError: (error) => {
            message.error('导入失败');
            setImportResult({
              success: false,
              totalCount: 0,
              successCount: 0,
              failedCount: 1,
              errors: [`导入失败: ${error}`],
              questions: []
            });
            setImporting(false);
          }
        }
      );
    } catch (error) {
      message.error('导入失败');
      setImportResult({
        success: false,
        totalCount: 0,
        successCount: 0,
        failedCount: 1,
        errors: [`导入失败: ${error}`],
        questions: []
      });
      setImporting(false);
    }

    return false; // 阻止默认上传行为
  };

  const handleTextImport = async () => {
    if (!chapterId || !currentChapter) {
      message.error('请先选择章节');
      return;
    }

    if (!textContent.trim()) {
      message.error('请输入题目内容');
      return;
    }

    setImporting(true);
    setImportProgress({ progress: 0, processed: 0, total: 0 });

    try {
      // 解析文本内容
      const parseResult = DocumentParser.parseTextContent(textContent, chapterId);

      if (!parseResult.success || parseResult.questions.length === 0) {
        setImportResult(parseResult);
        setImporting(false);
        return;
      }

      // 使用ImportManager处理题目
      const result = await importManager.processQuestions(
        parseResult.questions,
        chapterId,
        {
          onProgress: (progress) => {
            setImportProgress(progress);
          },
          onComplete: async (result) => {
            if (result.success && result.questions.length > 0) {
              await addQuestions(result.questions);
              message.success(`成功导入 ${result.successCount} 道题目`);
            }
            setImportResult(result);
            setImporting(false);
          },
          onError: (error) => {
            message.error('导入失败');
            setImportResult({
              success: false,
              totalCount: 0,
              successCount: 0,
              failedCount: 1,
              errors: [`导入失败: ${error}`],
              questions: []
            });
            setImporting(false);
          }
        }
      );
    } catch (error) {
      message.error('导入失败');
      setImportResult({
        success: false,
        totalCount: 0,
        successCount: 0,
        failedCount: 1,
        errors: [`导入失败: ${error}`],
        questions: []
      });
      setImporting(false);
    }
  };

  const handleModalClose = () => {
    setTextContent('');
    setImportProgress({ progress: 0, processed: 0, total: 0 });
    setImportResult(null);
    setImporting(false);
    importManager.destroy();
    onClose();
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.docx,.doc,.txt,.text',
    beforeUpload: handleFileUpload,
    showUploadList: false,
  };

  const formatExample = `示例格式：

1. 以下哪个是正确的？
A. 选项A
B. 选项B  
C. 选项C
D. 选项D
答案：A
解析：这是解析内容

2. 第二道题目？
A. 选项A
B. 选项B
答案：B

JSON格式示例：
[
  {
    "title": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "correctAnswer": 0,
    "explanation": "解析内容"
  }
]`;

  return (
    <Modal
      title="导入题目"
      open={visible}
      onCancel={handleModalClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'file',
            label: (
              <span>
                <FileTextOutlined />
                文件导入
              </span>
            ),
            children: (
              <div>
                <Alert
                  message="支持的文件格式"
                  description="支持 .docx、.doc、.txt 格式的文件。请确保文件内容按照标准格式编写。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <Dragger {...uploadProps} disabled={importing}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    点击或拖拽文件到此区域上传
                  </p>
                  <p className="ant-upload-hint">
                    支持单个文件上传，支持 .docx、.doc、.txt 格式
                  </p>
                </Dragger>
              </div>
            ),
          },
          {
            key: 'text',
            label: (
              <span>
                <FileTextOutlined />
                文本导入
              </span>
            ),
            children: (
              <div>
                <Alert
                  message="文本格式说明"
                  description="支持普通文本格式和JSON格式。请参考右侧示例格式编写题目内容。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <TextArea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="请输入题目内容..."
                      rows={12}
                      disabled={importing}
                    />
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <Button
                        type="primary"
                        onClick={handleTextImport}
                        loading={importing}
                        disabled={!textContent.trim()}
                      >
                        开始导入
                      </Button>
                    </div>
                  </div>
                  
                  <div style={{ width: 300 }}>
                    <Card title="格式示例" size="small">
                      <pre style={{ 
                        fontSize: 11, 
                        lineHeight: 1.3,
                        whiteSpace: 'pre-wrap',
                        margin: 0,
                        maxHeight: 300,
                        overflow: 'auto'
                      }}>
                        {formatExample}
                      </pre>
                    </Card>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      {/* 导入进度 */}
      {importing && (
        <div style={{ marginTop: 24 }}>
          <Title level={5}>导入进度</Title>
          <Progress percent={importProgress.progress} status="active" />
          <Text type="secondary">
            {importProgress.message || `正在处理 ${importProgress.processed}/${importProgress.total} 道题目...`}
          </Text>
        </div>
      )}

      {/* 导入结果 */}
      {importResult && (
        <div style={{ marginTop: 24 }}>
          <Divider />
          <Title level={5}>导入结果</Title>
          
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message={importResult.success ? '导入完成' : '导入失败'}
              description={
                <div>
                  <p>总计: {importResult.totalCount} 道题目</p>
                  <p>成功: {importResult.successCount} 道</p>
                  <p>失败: {importResult.failedCount} 道</p>
                </div>
              }
              type={importResult.success ? 'success' : 'error'}
              showIcon
            />

            {importResult.errors.length > 0 && (
              <Card title="错误详情" size="small">
                <List
                  size="small"
                  dataSource={importResult.errors}
                  renderItem={(error, index) => (
                    <List.Item>
                      <Space>
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        <Text>{error}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {importResult.questions.length > 0 && (
              <Card title="成功导入的题目" size="small">
                <List
                  size="small"
                  dataSource={importResult.questions.slice(0, 5)}
                  renderItem={(question, index) => (
                    <List.Item>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text ellipsis style={{ maxWidth: 400 }}>
                          {index + 1}. {question.title}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
                {importResult.questions.length > 5 && (
                  <Text type="secondary">
                    还有 {importResult.questions.length - 5} 道题目...
                  </Text>
                )}
              </Card>
            )}
          </Space>
        </div>
      )}
    </Modal>
  );
};

export default QuestionImport;
