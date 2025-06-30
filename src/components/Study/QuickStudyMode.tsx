import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Radio,
  Space,
  Typography,
  Progress,
  message,
  Row,
  Col,
  Tag,
  Divider,
  Tooltip
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  StarOutlined,
  StarFilled,
  HomeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { Question } from '../../types';
import { getStatusColor } from '../../utils/helpers';
import EmptyState from '../Common/EmptyState';

const { Title, Text, Paragraph } = Typography;

const QuickStudyMode: React.FC = () => {
  const navigate = useNavigate();
  const {
    questions,
    currentQuestion,
    currentChapter,
    currentBank,
    studyMode,
    setCurrentQuestion,
    submitAnswer,
    markQuestionAsMastered,
    unmarkQuestionAsMastered,
    loadQuestions,
    addWrongQuestion
  } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);

  // 过滤题目（跳过已斩题的题目）
  useEffect(() => {
    const filtered = questions.filter(q => !q.isMastered);
    setFilteredQuestions(filtered);
    
    if (filtered.length > 0 && currentQuestion) {
      const index = filtered.findIndex(q => q.id === currentQuestion.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [questions, currentQuestion]);

  // 当前题目
  const question = filteredQuestions[currentIndex];

  useEffect(() => {
    if (question) {
      setCurrentQuestion(question);
      resetQuestionState();
    }
  }, [question, setCurrentQuestion]);

  const resetQuestionState = () => {
    setSelectedAnswer(null);
    setShowAnswer(false);
    setIsCorrect(null);
    setStartTime(new Date());
  };

  const handleNext = useCallback(() => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      message.info('已完成所有题目！');
      navigate('/');
    }
  }, [currentIndex, filteredQuestions.length, navigate]);

  const handleAnswerSelect = useCallback(async (answerIndex: number) => {
    if (showAnswer || !question) return;

    setSelectedAnswer(answerIndex);
    setShowAnswer(true);

    const correct = answerIndex === question.correctAnswer;
    setIsCorrect(correct);

    // 计算答题时间
    const timeSpent = Math.round((new Date().getTime() - startTime.getTime()) / 1000);

    // 提交答案
    try {
      await submitAnswer(question.id, answerIndex, timeSpent);

      if (correct) {
        message.success('回答正确！');
      } else {
        message.error('回答错误！');

        // 自动添加到错题本
        if (currentBank && currentChapter) {
          try {
            await addWrongQuestion(
              question.id,
              currentBank.id,
              currentChapter.id,
              answerIndex,
              '快刷模式错误'
            );
          } catch (wrongError) {
            console.error('添加错题失败:', wrongError);
          }
        }
      }

      // 快刷模式：显示答案后1秒自动跳转下一题
      setTimeout(() => {
        handleNext();
      }, 1000);

    } catch (error) {
      message.error('提交答案失败');
    }
  }, [showAnswer, question, startTime, submitAnswer, currentBank, currentChapter, addWrongQuestion, handleNext]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleToggleMastered = async () => {
    if (!question) return;

    try {
      if (question.isMastered) {
        await unmarkQuestionAsMastered(question.id);
        message.success('已取消斩题标记');
      } else {
        await markQuestionAsMastered(question.id);
        message.success('已标记为斩题');
        // 斩题后自动跳到下一题
        setTimeout(() => {
          handleNext();
        }, 1000);
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  // 如果没有选择题库或章节，显示空状态
  if (!currentBank || !currentChapter) {
    return <EmptyState mode="quick" />;
  }

  // 如果没有题目，显示空状态
  if (filteredQuestions.length === 0) {
    return (
      <EmptyState
        mode="study"
        title="没有可学习的题目"
        description="当前章节的所有题目都已掌握，或者还没有题目。请添加题目或选择其他章节。"
      />
    );
  }

  if (!question) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  const progress = Math.round(((currentIndex + 1) / filteredQuestions.length) * 100);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 头部信息 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button 
                icon={<HomeOutlined />} 
                onClick={handleBackToHome}
              >
                返回首页
              </Button>
              <Tag color="blue">快刷模式</Tag>
              <Text strong>{currentBank.name} - {currentChapter.name}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text>进度: {currentIndex + 1}/{filteredQuestions.length}</Text>
              <Tooltip title={question.isMastered ? '取消斩题' : '标记斩题'}>
                <Button
                  type="text"
                  icon={question.isMastered ? <StarFilled /> : <StarOutlined />}
                  style={{ color: question.isMastered ? '#faad14' : undefined }}
                  onClick={handleToggleMastered}
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>
        <Progress 
          percent={progress} 
          style={{ marginTop: '8px' }}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
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
        <Radio.Group 
          value={selectedAnswer} 
          onChange={(e) => handleAnswerSelect(e.target.value)}
          style={{ width: '100%' }}
          disabled={showAnswer}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {question.options.map((option, index) => {
              let buttonStyle: React.CSSProperties = {
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                height: 'auto',
                marginBottom: '8px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px'
              };

              if (showAnswer) {
                if (index === question.correctAnswer) {
                  // 正确答案
                  buttonStyle = {
                    ...buttonStyle,
                    backgroundColor: '#f6ffed',
                    borderColor: '#52c41a',
                    color: '#52c41a'
                  };
                } else if (index === selectedAnswer) {
                  // 用户选择的错误答案
                  buttonStyle = {
                    ...buttonStyle,
                    backgroundColor: '#fff2f0',
                    borderColor: '#ff4d4f',
                    color: '#ff4d4f'
                  };
                }
              }

              return (
                <Radio.Button
                  key={index}
                  value={index}
                  style={buttonStyle}
                >
                  <Space>
                    <Text strong>{String.fromCharCode(65 + index)}.</Text>
                    <Text>{option}</Text>
                    {showAnswer && index === question.correctAnswer && (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    )}
                    {showAnswer && index === selectedAnswer && index !== question.correctAnswer && (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    )}
                  </Space>
                </Radio.Button>
              );
            })}
          </Space>
        </Radio.Group>

        {/* 快刷模式简化答案显示 */}
        {showAnswer && (
          <div style={{ marginTop: '24px' }}>
            <Divider />
            <div style={{
              textAlign: 'center',
              padding: '20px',
              backgroundColor: isCorrect ? '#f6ffed' : '#fff2f0',
              borderRadius: '8px',
              border: `2px solid ${isCorrect ? '#52c41a' : '#ff4d4f'}`
            }}>
              <Space direction="vertical" size="middle">
                {isCorrect ? (
                  <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
                )}
                <Text strong style={{ fontSize: '18px', color: isCorrect ? '#52c41a' : '#ff4d4f' }}>
                  {isCorrect ? '回答正确！' : '回答错误！'}
                </Text>
                <Text style={{ fontSize: '16px' }}>
                  正确答案: <Text strong>{String.fromCharCode(65 + question.correctAnswer)}</Text>
                </Text>
              </Space>
            </div>
          </div>
        )}

        {/* 导航按钮 */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Space size="large">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              上一题
            </Button>

            {showAnswer ? (
              <Text type="secondary" style={{ fontSize: '14px' }}>
                {currentIndex === filteredQuestions.length - 1 ? '即将完成...' : '1秒后自动跳转下一题...'}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: '14px' }}>请选择答案</Text>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default QuickStudyMode;
