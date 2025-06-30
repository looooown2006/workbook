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
  Table,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { Question, TestSession } from '../../types';
import { formatDuration } from '../../utils/helpers';
import EmptyState from '../Common/EmptyState';

const { Title, Text, Paragraph } = Typography;

const TestMode: React.FC = () => {
  const navigate = useNavigate();
  const {
    questions,
    currentChapter,
    currentBank,
    startTestSession,
    updateTestSession,
    completeTestSession,
    currentTestSession,
    addWrongQuestion
  } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);

  // 过滤题目（跳过已斩题的题目）
  useEffect(() => {
    const filtered = questions.filter(q => !q.isMastered);
    setFilteredQuestions(filtered);
    
    // 初始化测试会话
    if (filtered.length > 0 && currentBank && currentChapter) {
      const questionIds = filtered.map(q => q.id);
      startTestSession(currentBank.id, currentChapter.id, questionIds);
      setStartTime(new Date());
    }
  }, [questions, currentBank, currentChapter, startTestSession]);

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
          if (optionIndex < currentQuestion?.options.length) {
            handleAnswerSelect(optionIndex);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResults, currentIndex, filteredQuestions]);

  const currentQuestion = filteredQuestions[currentIndex];

  const handleAnswerSelect = useCallback((answerIndex: number) => {
    if (!currentQuestion || showResults) return;

    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, answerIndex);
    setAnswers(newAnswers);
    updateTestSession(newAnswers);
  }, [currentQuestion, answers, showResults, updateTestSession]);

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinishTest();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinishTest = async () => {
    try {
      await completeTestSession();

      // 收集错题
      if (currentBank && currentChapter) {
        for (const question of filteredQuestions) {
          const userAnswer = answers.get(question.id);
          if (userAnswer !== undefined && userAnswer !== question.correctAnswer) {
            try {
              await addWrongQuestion(
                question.id,
                currentBank.id,
                currentChapter.id,
                userAnswer,
                '测试模式错误'
              );
            } catch (wrongError) {
              console.error('添加错题失败:', wrongError);
            }
          }
        }
      }

      setShowResults(true);
    } catch (error) {
      message.error('完成测试失败');
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const calculateResults = () => {
    let correctCount = 0;
    let wrongCount = 0;
    const results: Array<{
      question: Question;
      userAnswer: number | undefined;
      isCorrect: boolean;
    }> = [];

    filteredQuestions.forEach(question => {
      const userAnswer = answers.get(question.id);
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (userAnswer !== undefined) {
        if (isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }

      results.push({
        question,
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
      totalQuestions: filteredQuestions.length,
      accuracy,
      results
    };
  };

  // 如果没有选择题库或章节，显示空状态
  if (!currentBank || !currentChapter) {
    return <EmptyState mode="test" />;
  }

  // 如果没有题目，显示空状态
  if (filteredQuestions.length === 0) {
    return (
      <EmptyState
        mode="test"
        title="没有可测试的题目"
        description="当前章节的所有题目都已掌握，或者还没有题目。请添加题目或选择其他章节。"
      />
    );
  }

  if (!currentQuestion) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  const progress = Math.round(((currentIndex + 1) / filteredQuestions.length) * 100);
  const answeredCount = answers.size;
  const testResults = showResults ? calculateResults() : null;

  // 显示测试结果
  if (showResults && testResults) {
    const resultColumns = [
      {
        title: '题号',
        dataIndex: 'index',
        key: 'index',
        width: 60,
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: '题目',
        dataIndex: 'question',
        key: 'question',
        ellipsis: true,
        render: (question: Question) => (
          <Text ellipsis style={{ maxWidth: 200 }}>{question.title}</Text>
        ),
      },
      {
        title: '你的答案',
        dataIndex: 'userAnswer',
        key: 'userAnswer',
        render: (userAnswer: number | undefined, record: any) => {
          if (userAnswer === undefined) {
            return <Text type="secondary">未答</Text>;
          }
          return (
            <Tag color={record.isCorrect ? 'success' : 'error'}>
              {String.fromCharCode(65 + userAnswer)}
            </Tag>
          );
        },
      },
      {
        title: '正确答案',
        dataIndex: 'question',
        key: 'correctAnswer',
        render: (question: Question) => (
          <Tag color="success">
            {String.fromCharCode(65 + question.correctAnswer)}
          </Tag>
        ),
      },
      {
        title: '结果',
        dataIndex: 'isCorrect',
        key: 'result',
        render: (isCorrect: boolean, record: any) => {
          if (record.userAnswer === undefined) {
            return <Text type="secondary">未答</Text>;
          }
          return isCorrect ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          );
        },
      },
    ];

    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Title level={2}>测试完成</Title>
            <Text type="secondary">{currentBank.name} - {currentChapter.name}</Text>
          </div>

          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Statistic
                title="总题数"
                value={testResults.totalQuestions}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="已答题数"
                value={testResults.totalAnswered}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="正确数"
                value={testResults.correctCount}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="正确率"
                value={testResults.accuracy}
                suffix="%"
                valueStyle={{ 
                  color: testResults.accuracy >= 80 ? '#3f8600' : 
                         testResults.accuracy >= 60 ? '#faad14' : '#cf1322' 
                }}
              />
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={12}>
              <Statistic
                title="用时"
                value={formatDuration(elapsedTime)}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="平均用时"
                value={testResults.totalAnswered > 0 ? 
                  formatDuration(Math.round(elapsedTime / testResults.totalAnswered)) : '0秒'}
              />
            </Col>
          </Row>

          <Divider />

          <Table
            columns={resultColumns}
            dataSource={testResults.results}
            rowKey={(record) => record.question.id}
            pagination={false}
            scroll={{ y: 400 }}
            size="small"
          />

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Space>
              <Button type="primary" onClick={handleBackToHome}>
                返回首页
              </Button>
              <Button onClick={() => window.location.reload()}>
                重新测试
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
                onClick={handleBackToHome}
              >
                返回首页
              </Button>
              <Tag color="orange">测试模式</Tag>
              <Text strong>{currentBank.name} - {currentChapter.name}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text>进度: {currentIndex + 1}/{filteredQuestions.length}</Text>
              <Text>已答: {answeredCount}/{filteredQuestions.length}</Text>
              <Text>用时: {formatDuration(elapsedTime)}</Text>
            </Space>
          </Col>
        </Row>
        <Progress 
          percent={progress} 
          style={{ marginTop: '8px' }}
          strokeColor={{
            '0%': '#faad14',
            '100%': '#fa8c16',
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
            {currentQuestion.title}
          </Paragraph>
        </div>

        {/* 选项 */}
        <Radio.Group 
          value={answers.get(currentQuestion.id)} 
          onChange={(e) => handleAnswerSelect(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {currentQuestion.options.map((option, index) => (
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
              icon={currentIndex === filteredQuestions.length - 1 ? undefined : <ArrowRightOutlined />}
              onClick={handleNext}
            >
              {currentIndex === filteredQuestions.length - 1 ? '完成测试' : '下一题'}
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

export default TestMode;
