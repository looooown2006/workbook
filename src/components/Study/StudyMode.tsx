import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Divider,
  Checkbox,
  Tag,
  message
} from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { Question } from '../../types';
import { getStatusColor } from '../../utils/helpers';
import { filterMasteredQuestions } from '../../utils/dataUtils';
import {
  QuestionInfo,
  NavigationButtons,
  MasteredButton
} from '../Common/CommonComponents';
import EmptyState from '../Common/EmptyState';

const { Title, Text, Paragraph } = Typography;

interface StudyModeProps {
  questions?: Question[];
}

const StudyMode: React.FC<StudyModeProps> = ({ questions: propQuestions }) => {
  const navigate = useNavigate();
  const {
    questions: storeQuestions,
    currentQuestion,
    currentChapter,
    currentBank,
    setCurrentQuestion,
    markQuestionAsMastered,
    unmarkQuestionAsMastered
  } = useAppStore();

  // 优先使用props传入的questions，否则用store中的questions
  const questions = propQuestions ?? storeQuestions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(true); // 背题模式默认显示答案
  const [skipMastered, setSkipMastered] = useState(true); // 默认跳过已斩题
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);

  // 过滤题目
  useEffect(() => {
    const filtered = filterMasteredQuestions(questions, !skipMastered);
    setFilteredQuestions(filtered);

    // 如果当前索引超出范围，重置为0
    if (filtered.length > 0 && currentIndex >= filtered.length) {
      setCurrentIndex(0);
    }
  }, [questions, skipMastered, currentIndex]);

  // 当前题目
  const question = filteredQuestions[currentIndex];

  useEffect(() => {
    if (question) {
      setCurrentQuestion(question);
    }
  }, [question, setCurrentQuestion]);

  const handleNext = React.useCallback((): void => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, filteredQuestions.length]);

  const handlePrevious = React.useCallback((): void => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleToggleMastered = React.useCallback(async (): Promise<void> => {
    if (!question) return;

    try {
      if (question.isMastered) {
        await unmarkQuestionAsMastered(question.id);
        message.success('已取消斩题标记');
      } else {
        await markQuestionAsMastered(question.id);
        message.success('已标记为斩题');
        // 背题模式：斩题后不自动跳转，让用户手动控制
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  }, [question, markQuestionAsMastered, unmarkQuestionAsMastered]);

  const handleBackToHome = React.useCallback((): void => {
    navigate('/');
  }, [navigate]);

  const handleSkipMasteredChange = React.useCallback((checked: boolean): void => {
    setSkipMastered(checked);
  }, []);

  // 如果没有选择题库或章节，显示空状态
  if (!currentBank || !currentChapter) {
    return <EmptyState mode="study" />;
  }

  // 如果没有题目，显示空状态
  if (filteredQuestions.length === 0) {
    const title = skipMastered ? '没有未掌握的题目' : '该章节暂无题目';
    const description = skipMastered
      ? '当前章节的所有题目都已掌握，您可以选择显示所有题目继续复习。'
      : '当前章节还没有题目，请先添加题目或选择其他章节。';

    return (
      <EmptyState
        mode="study"
        title={title}
        description={description}
      />
    );
  }

  if (!question) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">
          {filteredQuestions.length === 0 ? '没有可用的题目' : '加载中...'}
        </Text>
      </div>
    );
  }

  // progress 已在 QuestionInfo 组件中计算，这里不需要

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 头部信息 */}
      <QuestionInfo
        bankName={currentBank.name}
        chapterName={currentChapter.name}
        mode="背题模式"
        currentIndex={currentIndex}
        totalCount={filteredQuestions.length}
        isMastered={question.isMastered}
        onToggleMastered={handleToggleMastered}
        onBackToHome={handleBackToHome}
      />

      {/* 控制选项 */}
      <Card style={{ marginBottom: '16px' }}>
        <Space>
          <Checkbox 
            checked={showAnswer} 
            onChange={(e) => setShowAnswer(e.target.checked)}
          >
            显示答案
          </Checkbox>
          <Checkbox 
            checked={skipMastered} 
            onChange={(e) => handleSkipMasteredChange(e.target.checked)}
          >
            跳过已斩题
          </Checkbox>
          <Button
            type="text"
            icon={showAnswer ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer ? '隐藏答案' : '显示答案'}
          </Button>
        </Space>
      </Card>

      {/* 题目内容 */}
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={4}>
            第 {currentIndex + 1} 题
          </Title>
          <Paragraph style={{ fontSize: '16px', lineHeight: '1.6' }}>
            {question.title}
          </Paragraph>
        </div>

        {/* 选项 */}
        <div style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {question.options.map((option, index) => {
              const isCorrect = index === question.correctAnswer;
              
              let optionStyle: React.CSSProperties = {
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                marginBottom: '8px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                backgroundColor: '#fff'
              };

              if (showAnswer && isCorrect) {
                optionStyle = {
                  ...optionStyle,
                  backgroundColor: '#f6ffed',
                  borderColor: '#52c41a',
                  color: '#52c41a'
                };
              }

              return (
                <div key={index} style={optionStyle}>
                  <Space>
                    <Text strong>{String.fromCharCode(65 + index)}.</Text>
                    <Text>{option}</Text>
                    {showAnswer && isCorrect && (
                      <Tag color="success">正确答案</Tag>
                    )}
                  </Space>
                </div>
              );
            })}
          </Space>
        </div>

        {/* 答案和解析 */}
        {showAnswer && (
          <div>
            <Divider />
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <Text strong>正确答案:</Text>
                <Tag color="success">
                  {String.fromCharCode(65 + question.correctAnswer)} - {question.options[question.correctAnswer]}
                </Tag>
              </Space>
            </div>

            {question.explanation && (
              <div style={{ marginBottom: '16px' }}>
                <Text strong>解析:</Text>
                <Paragraph style={{ marginTop: '8px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
                  {question.explanation}
                </Paragraph>
              </div>
            )}

            {/* 题目统计信息 */}
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <Text type="secondary">错误次数: {question.wrongCount}</Text>
                <Text type="secondary">
                  状态: 
                  <Tag 
                    color={getStatusColor(question.status, question.isMastered, question.wrongCount)}
                    style={{ marginLeft: '4px' }}
                  >
                    {question.isMastered ? '已斩题' : 
                     question.status === 'new' ? '未做' :
                     question.status === 'correct' ? '正确' : '错误'}
                  </Tag>
                </Text>
                {question.difficulty && (
                  <Text type="secondary">
                    难度: 
                    <Tag 
                      color={
                        question.difficulty === 'easy' ? 'green' :
                        question.difficulty === 'medium' ? 'orange' : 'red'
                      }
                      style={{ marginLeft: '4px' }}
                    >
                      {question.difficulty === 'easy' ? '简单' :
                       question.difficulty === 'medium' ? '中等' : '困难'}
                    </Tag>
                  </Text>
                )}
              </Space>
            </div>

            {/* 标签 */}
            {question.tags && question.tags.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary">标签: </Text>
                <Space>
                  {question.tags.map((tag, index) => (
                    <Tag key={index} color="blue">{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
        )}

        {/* 导航按钮 */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Space size="large">
            <NavigationButtons
              currentIndex={currentIndex}
              totalCount={filteredQuestions.length}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />

            <MasteredButton
              isMastered={question.isMastered}
              onClick={handleToggleMastered}
              showText={true}
            />
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default StudyMode;
