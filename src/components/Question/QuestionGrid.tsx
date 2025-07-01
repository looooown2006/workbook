import React, { useState, useEffect } from 'react';
import { Typography, Button, Space, Card, List, Tag, Spin, Dropdown, Menu } from 'antd';
import { RobotOutlined, PlusOutlined, ImportOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { Question } from '../../types';
import SmartImportAssistant from '../Import/SmartImportAssistant';
import QuestionImport from '../Import/QuestionImport';
import { useNavigate } from 'react-router-dom';
import './QuestionGrid.css';

const { Text } = Typography;

const QuestionGrid: React.FC = () => {
  const {
    currentChapter,
    currentBank,
    questions,
    loadQuestions,
    isLoading
  } = useAppStore();

  const [smartImportVisible, setSmartImportVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);

  const navigate = useNavigate();
  const { pendingRoute, setPendingRoute } = useAppStore();

  // 调试信息
  console.log('QuestionGrid render:', {
    currentChapter: currentChapter ? { id: currentChapter.id, name: currentChapter.name } : null,
    currentBank: currentBank ? { id: currentBank.id, name: currentBank.name } : null,
    questionsCount: questions.length,
    localQuestionsCount: localQuestions.length,
    chapterQuestionIds: currentChapter?.questionIds?.length || 0,
    questionsLoading,
    isLoading
  });

  // 当章节变化时加载题目
  useEffect(() => {
    if (currentChapter?.id) {
      setQuestionsLoading(true);
      loadQuestions(currentChapter.id)
        .then((qs) => {
          setLocalQuestions(qs);
        })
        .finally(() => setQuestionsLoading(false));
    } else {
      setLocalQuestions([]);
    }
  }, [currentChapter?.id, loadQuestions]);

  // 当全局questions状态变化时，更新本地状态
  useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  if (!currentChapter || !currentBank) {
    return (
      <div className="empty-content">
        <Text type="secondary">请选择章节查看题目</Text>
      </div>
    );
  }

  // 显示加载状态
  if (questionsLoading) {
    return (
      <div className="empty-content" style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">正在加载题目...</Text>
        </div>
      </div>
    );
  }

  // 如果有题目，显示题目列表
  if (localQuestions && localQuestions.length > 0) {
    return (
      <>
        <div style={{ padding: '16px', paddingBottom: 0 }}>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item key="practice" onClick={() => navigate('/practice')}>刷题模式</Menu.Item>
                <Menu.Item key="test" onClick={() => navigate('/test')}>测试模式</Menu.Item>
                <Menu.Item key="quick-study" onClick={() => navigate('/quick-study')}>快刷模式</Menu.Item>
              </Menu>
            }
            placement="bottomLeft"
          >
            <Button type="primary" style={{ marginBottom: 16 }}>
              开始做题
            </Button>
          </Dropdown>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ fontSize: '16px' }}>
                {currentChapter.name} - 题目列表
              </Text>
              <Text type="secondary" style={{ marginLeft: '8px' }}>
                共 {localQuestions.length} 道题目
              </Text>
            </div>
            <Space>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={() => setSmartImportVisible(true)}
              >
                智能导入
              </Button>
              <Button
                icon={<ImportOutlined />}
                onClick={() => setImportVisible(true)}
              >
                文件导入
              </Button>
            </Space>
          </div>

          <List
            dataSource={localQuestions}
            renderItem={(question, index) => (
              <List.Item
                actions={[
                  <Button type="text" icon={<EditOutlined />} size="small">
                    编辑
                  </Button>,
                  <Button type="text" icon={<DeleteOutlined />} size="small" danger>
                    删除
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>题目 {index + 1}</Text>
                      <Tag color={question.status === 'correct' ? 'green' : question.status === 'wrong' ? 'red' : 'blue'}>
                        {question.status === 'correct' ? '已答对' : question.status === 'wrong' ? '答错过' : '未答题'}
                      </Tag>
                      {question.isMastered && <Tag color="gold">已掌握</Tag>}
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ marginBottom: '8px' }}>
                        <Text>{question.title}</Text>
                      </div>
                      <div>
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} style={{ marginLeft: '16px' }}>
                            <Text
                              type={optIndex === question.correctAnswer ? 'success' : undefined}
                              strong={optIndex === question.correctAnswer}
                            >
                              {String.fromCharCode(65 + optIndex)}. {option}
                            </Text>
                          </div>
                        ))}
                      </div>
                      {question.explanation && (
                        <div style={{ marginTop: '8px' }}>
                          <Text type="secondary">解析：{question.explanation}</Text>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>

        {/* 智能导入助手 */}
        <SmartImportAssistant
          visible={smartImportVisible}
          onClose={() => setSmartImportVisible(false)}
          chapterId={currentChapter?.id}
        />

        {/* 传统导入 */}
        <QuestionImport
          visible={importVisible}
          onClose={() => setImportVisible(false)}
          chapterId={currentChapter?.id}
        />
      </>
    );
  }

  // 现代化空状态显示
  return (
    <>
      <div className="empty-state-container">
        <div className="empty-state-content">
          <div className="empty-icon">
            <div className="floating-icon">📚</div>
            <div className="icon-shadow"></div>
          </div>

          <div className="empty-text-content">
            <Text className="empty-title">该章节暂无题目</Text>
            <Text className="empty-subtitle">
              开始您的学习之旅，导入题目或创建新题目
            </Text>
          </div>

          {/* 现代化导入选项卡片 */}
          <div className="import-options-grid">
            <Card className="import-option-card smart-import" hoverable>
              <div className="import-card-content">
                <div className="import-icon">
                  <RobotOutlined />
                </div>
                <div className="import-info">
                  <Text strong className="import-title">AI智能导入</Text>
                  <Text className="import-description">
                    支持多种格式自动识别，智能转换题目
                  </Text>
                </div>
                <Button
                  type="primary"
                  className="btn-gradient"
                  onClick={() => setSmartImportVisible(true)}
                  block
                  size="large"
                >
                  开始导入
                </Button>
              </div>
            </Card>

            <Card className="import-option-card file-import" hoverable>
              <div className="import-card-content">
                <div className="import-icon">
                  <ImportOutlined />
                </div>
                <div className="import-info">
                  <Text strong className="import-title">文件导入</Text>
                  <Text className="import-description">
                    支持Word、文本文件等多种格式
                  </Text>
                </div>
                <Button
                  onClick={() => setImportVisible(true)}
                  block
                  size="large"
                >
                  选择文件
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 智能导入助手 */}
      <SmartImportAssistant
        visible={smartImportVisible}
        onClose={() => setSmartImportVisible(false)}
        chapterId={currentChapter?.id}
      />

      {/* 传统导入 */}
      <QuestionImport
        visible={importVisible}
        onClose={() => setImportVisible(false)}
        chapterId={currentChapter?.id}
      />
    </>
  );
};

export default QuestionGrid;
