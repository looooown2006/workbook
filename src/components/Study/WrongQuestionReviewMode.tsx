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
  Modal,
  Statistic,
  Divider,
  Alert,
  Tooltip
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  StarFilled,
  HistoryOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { Question, WrongQuestion } from '../../types';
import { formatDuration, formatDate } from '../../utils/helpers';

const { Title, Text, Paragraph } = Typography;

const WrongQuestionReviewMode: React.FC = () => {
  const navigate = useNavigate();
  const {
    wrongQuestions,
    questions,
    currentBank,
    currentChapter,
    addWrongQuestion,
    markWrongQuestionAsMastered,
    unmarkWrongQuestionAsMastered,
    startWrongQuestionSession,
    updateWrongQuestionSession,
    completeWrongQuestionSession,
    currentWrongQuestionSession
  } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<{question: Question, wrongQuestion: WrongQuestion}[]>([]);

  // 过滤活跃的错题并获取对应的题目
  useEffect(() => {
    const activeWrongQuestions = wrongQuestions.filter(wq => wq.status === 'active');
    const questionPairs = activeWrongQuestions
      .map(wq => {
        const question = questions.find(q => q.id === wq.questionId);
        return question ? { question, wrongQuestion: wq } : null;
      })
      .filter(pair => pair !== null) as {question: Question, wrongQuestion: WrongQuestion}[];
    
    // 按错误次数和最后错误时间排序（错误次数多的优先，最近错误的优先）
    questionPairs.sort((a, b) => {
      if (a.wrongQuestion.wrongCount !== b.wrongQuestion.wrongCount) {
        return b.wrongQuestion.wrongCount - a.wrongQuestion.wrongCount;
      }
      return new Date(b.wrongQuestion.lastWrongTime).getTime() - new Date(a.wrongQuestion.lastWrongTime).getTime();
    });

    setReviewQuestions(questionPairs);
    
    // 初始化复习会话
    if (questionPairs.length > 0) {
      const questionIds = questionPairs.map(pair => pair.wrongQuestion.id);
      startWrongQuestionSession(questionIds, 'review');
      setStartTime(new Date());
    }
  }, [wrongQuestions, questions, startWrongQuestionSession]);

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (showResults) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNext();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          event.preventDefault();
          const optionIndex = parseInt(event.key) - 1;
          if (optionIndex < currentQuestionPair?.question.options.length) {
            handleAnswerSelect(optionIndex);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResults, currentIndex, reviewQuestions]);

  const currentQuestionPair = reviewQuestions[currentIndex];

  const handleAnswerSelect = useCallback((answerIndex: number) => {
    if (!currentQuestionPair || showResults) return;

    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestionPair.wrongQuestion.id, answerIndex);
    setAnswers(newAnswers);

    // 更新会话结果
    const results = Array.from(newAnswers.entries()).map(([wrongQuestionId, answer]) => {
      const pair = reviewQuestions.find(p => p.wrongQuestion.id === wrongQuestionId);
      if (!pair) return null;
      
      return {
        questionId: pair.wrongQuestion.questionId,
        isCorrect: answer === pair.question.correctAnswer,
        timeSpent: Math.floor((new Date().getTime() - startTime.getTime()) / 1000),
        answer
      };
    }).filter(r => r !== null) as any[];

    updateWrongQuestionSession(results);
  }, [currentQuestionPair, answers, showResults, reviewQuestions, startTime, updateWrongQuestionSession]);

  const handleNext = () => {
    if (currentIndex < reviewQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinishReview();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinishReview = async () => {
    try {
      await completeWrongQuestionSession();
      setShowResults(true);
    } catch (error) {
      message.error('完成复习失败');
    }
  };

  const handleToggleMastered = async () => {
    if (!currentQuestionPair) return;

    try {
      if (currentQuestionPair.wrongQuestion.isMastered) {
        await unmarkWrongQuestionAsMastered(currentQuestionPair.wrongQuestion.id);
        message.success('已取消掌握标记');
      } else {
        await markWrongQuestionAsMastered(currentQuestionPair.wrongQuestion.id);
        message.success('已标记为掌握');
        // 掌握后自动跳到下一题
        setTimeout(() => {
          handleNext();
        }, 500);
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleBackToWrongQuestionBook = () => {
    navigate('/wrong-questions');
  };

  const calculateResults = () => {
    let correctCount = 0;
    let wrongCount = 0;
    const results: Array<{
      questionPair: {question: Question, wrongQuestion: WrongQuestion};
      userAnswer: number | undefined;
      isCorrect: boolean;
    }> = [];

    reviewQuestions.forEach(pair => {
      const userAnswer = answers.get(pair.wrongQuestion.id);
      const isCorrect = userAnswer === pair.question.correctAnswer;
      
      if (userAnswer !== undefined) {
        if (isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }

      results.push({
        questionPair: pair,
        userAnswer,
        isCorrect
      });
    });

    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    return {
      correctCount,
      wrongCount,
      totalAnswered,
      totalQuestions: reviewQuestions.length,
      accuracy,
      results
    };
  };

  if (reviewQuestions.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Alert
          message="没有需要复习的错题"
          description="恭喜！您暂时没有需要复习的错题。"
          type="success"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Button type="primary" onClick={handleBackToWrongQuestionBook}>
          返回错题本
        </Button>
      </div>
    );
  }

  if (!currentQuestionPair) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  const progress = Math.round(((currentIndex + 1) / reviewQuestions.length) * 100);
  const answeredCount = answers.size;

  // 显示复习结果
  if (showResults) {
    const results = calculateResults();
    
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Title level={2}>错题复习完成</Title>
            <Text type="secondary">本次复习结果</Text>
          </div>

          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Statistic
                title="复习题数"
                value={results.totalQuestions}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="正确数"
                value={results.correctCount}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="错误数"
                value={results.wrongCount}
                valueStyle={{ color: '#cf1322' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="正确率"
                value={results.accuracy}
                suffix="%"
                valueStyle={{ 
                  color: results.accuracy >= 80 ? '#3f8600' : 
                         results.accuracy >= 60 ? '#faad14' : '#cf1322' 
                }}
              />
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={12}>
              <Statistic
                title="复习用时"
                value={formatDuration(elapsedTime)}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="平均用时"
                value={results.totalAnswered > 0 ? 
                  formatDuration(Math.round(elapsedTime / results.totalAnswered)) : '0秒'}
              />
            </Col>
          </Row>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Space>
              <Button type="primary" onClick={handleBackToWrongQuestionBook}>
                返回错题本
              </Button>
              <Button onClick={() => window.location.reload()}>
                重新复习
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 头部信息 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button 
                icon={<HomeOutlined />} 
                onClick={handleBackToWrongQuestionBook}
              >
                返回错题本
              </Button>
              <Tag color="red">错题复习</Tag>
              <Text strong>复习模式</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text>进度: {currentIndex + 1}/{reviewQuestions.length}</Text>
              <Text>已答: {answeredCount}/{reviewQuestions.length}</Text>
              <Text>用时: {formatDuration(elapsedTime)}</Text>
            </Space>
          </Col>
        </Row>
        <Progress 
          percent={progress} 
          style={{ marginTop: '8px' }}
          strokeColor={{
            '0%': '#ff4d4f',
            '100%': '#ff7875',
          }}
        />
      </Card>

      {/* 错题信息 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Space direction="vertical" size="small">
              <Text type="secondary">错误次数</Text>
              <Tag color="red">{currentQuestionPair.wrongQuestion.wrongCount}次</Tag>
            </Space>
          </Col>
          <Col span={12}>
            <Space direction="vertical" size="small">
              <Text type="secondary">最后错误时间</Text>
              <Text>{formatDate(currentQuestionPair.wrongQuestion.lastWrongTime)}</Text>
            </Space>
          </Col>
        </Row>
        
        {currentQuestionPair.wrongQuestion.errorType && (
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">错误类型: </Text>
            <Tag color="orange">{currentQuestionPair.wrongQuestion.errorType}</Tag>
          </div>
        )}

        {currentQuestionPair.wrongQuestion.notes && (
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">个人笔记: </Text>
            <Paragraph style={{ margin: 0, padding: '8px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
              {currentQuestionPair.wrongQuestion.notes}
            </Paragraph>
          </div>
        )}
      </Card>

      {/* 题目内容 */}
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={4}>
            第 {currentIndex + 1} 题
            <Tooltip title="这是一道错题，请仔细作答">
              <BulbOutlined style={{ marginLeft: '8px', color: '#faad14' }} />
            </Tooltip>
          </Title>
          <Paragraph style={{ fontSize: '16px', lineHeight: '1.6' }}>
            {currentQuestionPair.question.title}
          </Paragraph>
        </div>

        {/* 选项 */}
        <Radio.Group 
          value={answers.get(currentQuestionPair.wrongQuestion.id)} 
          onChange={(e) => handleAnswerSelect(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {currentQuestionPair.question.options.map((option, index) => (
              <Radio.Button
                key={index}
                value={index}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  height: 'auto',
                  marginBottom: '8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px'
                }}
              >
                <Space>
                  <Text strong>{String.fromCharCode(65 + index)}.</Text>
                  <Text>{option}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    (按 {index + 1} 键选择)
                  </Text>
                </Space>
              </Radio.Button>
            ))}
          </Space>
        </Radio.Group>

        {/* 历史错误答案提示 */}
        {currentQuestionPair.wrongQuestion.wrongAnswers.length > 0 && (
          <Alert
            message="历史错误答案"
            description={
              <Space>
                <Text>您曾经选择过：</Text>
                {currentQuestionPair.wrongQuestion.wrongAnswers.map((wrongAnswer, index) => (
                  <Tag key={index} color="red">
                    {String.fromCharCode(65 + wrongAnswer)}
                  </Tag>
                ))}
              </Space>
            }
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />
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
            
            <Button
              type="primary"
              icon={currentIndex === reviewQuestions.length - 1 ? undefined : <ArrowRightOutlined />}
              onClick={handleNext}
            >
              {currentIndex === reviewQuestions.length - 1 ? '完成复习' : '下一题'}
            </Button>
            
            <Button
              icon={currentQuestionPair.wrongQuestion.isMastered ? <StarFilled /> : <StarOutlined />}
              style={{ color: currentQuestionPair.wrongQuestion.isMastered ? '#faad14' : undefined }}
              onClick={handleToggleMastered}
            >
              {currentQuestionPair.wrongQuestion.isMastered ? '取消掌握' : '标记掌握'}
            </Button>
          </Space>
          
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">
              快捷键：数字键选择答案，空格键/右箭头下一题，左箭头上一题
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WrongQuestionReviewMode;
