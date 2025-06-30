import React, { useState, useEffect } from 'react';
import { Typography, Button, Space, Card, List, Tag, Spin } from 'antd';
import { RobotOutlined, PlusOutlined, ImportOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { Question } from '../../types';
import SmartImportAssistant from '../Import/SmartImportAssistant';
import QuestionImport from '../Import/QuestionImport';
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
      console.log('Loading questions for chapter:', currentChapter.name);
      setQuestionsLoading(true);
      loadQuestions(currentChapter.id)
        .then(() => {
          // 使用全局questions状态
          setLocalQuestions(questions);
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

  // 显示暂无题目和导入选项
  return (
    <>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        minHeight: '400px',
        width: '100%',
        textAlign: 'center',
        padding: '50px',
        boxSizing: 'border-box'
      }}>
        <div style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }}>
          📝
        </div>
        <Text type="secondary" style={{ fontSize: '16px', marginBottom: '16px' }}>
          该章节暂无题目
        </Text>
        <Text type="secondary" style={{ fontSize: '14px', marginBottom: '32px' }}>
          请先添加题目或导入题目文件
        </Text>

        {/* 导入选项 */}
        <Card
          style={{
            marginTop: '32px',
            maxWidth: '400px',
            width: '100%',
            margin: '32px auto 0',
            textAlign: 'left',
            flexShrink: 0
          }}
          title="快速开始"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={() => setSmartImportVisible(true)}
              block
              size="large"
            >
              智能导入助手
            </Button>
            <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
              支持多种格式自动识别，智能转换题目
            </Text>

            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportVisible(true)}
              block
            >
              传统文件导入
            </Button>
            <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center', display: 'block' }}>
              支持Word、文本文件导入
            </Text>
          </Space>
        </Card>
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
