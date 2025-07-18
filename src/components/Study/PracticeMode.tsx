import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Radio, Space, Typography, Progress, message, Tag, Divider } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import EmptyState from '../Common/EmptyState';
import { Question } from '../../types';

const { Title, Text, Paragraph } = Typography;

interface PracticeModeProps {
  questions?: Question[];
}

const PracticeMode: React.FC<PracticeModeProps> = ({ questions: propQuestions }) => {
  const navigate = useNavigate();
  const { 
    currentBank, 
    currentChapter, 
    questions: storeQuestions, 
    submitAnswer,
    addWrongQuestion,
    answerRecords,
    loadAnswerRecords
  } = useAppStore();

  // 优先使用props传入的questions，否则用store中的questions
  const questions = propQuestions ?? storeQuestions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState(new Date());
  // 新增：记录每题答题状态
  const [answersMap, setAnswersMap] = useState<{ [id: string]: { selectedAnswer: number, isCorrect: boolean, showAnswer: boolean } }>({});

  // 过滤当前章节的题目
  const filteredQuestions = questions.filter(q =>
    currentChapter &&
    currentChapter.questionIds.includes(q.id)
  );

  const question = filteredQuestions[currentIndex];

  useEffect(() => {
    if (currentBank && currentChapter && filteredQuestions.length > 0) {
      const qid = question?.id;
      if (qid && answersMap[qid]) {
        setSelectedAnswer(answersMap[qid].selectedAnswer);
        setShowAnswer(answersMap[qid].showAnswer);
        setIsCorrect(answersMap[qid].isCorrect);
      } else {
        setSelectedAnswer(null);
        setShowAnswer(false);
        setIsCorrect(null);
      }
      setStartTime(new Date());
    }
  }, [currentIndex, currentBank, currentChapter, filteredQuestions.length, question, answersMap]);

  useEffect(() => {
    if (currentBank && currentChapter) {
      loadAnswerRecords();
    }
  }, [currentBank, currentChapter, loadAnswerRecords]);

  useEffect(() => {
    if (filteredQuestions.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(0);
    }
  }, [filteredQuestions]);

  //只在章节、题库、props.questions变化时重置 currentIndex
  useEffect(() => {
    setCurrentIndex(0);
  }, [currentBank, currentChapter, propQuestions]);

  // 仅在 currentIndex 超界时重置
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(0);
    }
  }, [filteredQuestions, currentIndex]);

  const handleAnswerSelect = useCallback(async (answerIndex: number) => {
    if (showAnswer || !question) return;

    setSelectedAnswer(answerIndex);
    setShowAnswer(true);

    const correct = answerIndex === question.correctAnswer;
    setIsCorrect(correct);

    // 记录本题答题状态
    setAnswersMap(prev => ({
      ...prev,
      [question.id]: {
        selectedAnswer: answerIndex,
        isCorrect: correct,
        showAnswer: true
      }
    }));

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
              '刷题模式错误'
            );
          } catch (wrongError) {
            console.error('添加错题失败:', wrongError);
          }
        }
      }
    } catch (error) {
      message.error('提交答案失败');
    }
  }, [showAnswer, question, startTime, submitAnswer, currentBank, currentChapter, addWrongQuestion]);

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      message.info('已完成所有题目！');
      navigate('/');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 如果没有选择题库或章节，显示空状态
  if (!currentBank || !currentChapter) {
    return <EmptyState mode="practice" />;
  }

  // 如果没有题目，显示空状态
  if (filteredQuestions.length === 0) {
    return (
      <EmptyState
        mode="practice"
        title="该章节暂无题目"
        description="当前章节还没有题目，请先添加题目或选择其他章节。"
      />
    );
  }

  // 如果没有当前题目，显示加载状态
  if (!question) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text>加载中...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 头部信息 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Title level={3} style={{ margin: 0 }}>
            刷题模式
          </Title>
          <Space>
            <Tag color="blue">{currentBank?.name}</Tag>
            <Tag color="green">{currentChapter?.name}</Tag>
          </Space>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>
            第 {currentIndex + 1} 题 / 共 {filteredQuestions.length} 题
          </Text>
          <Progress 
            percent={Math.round(((currentIndex + 1) / filteredQuestions.length) * 100)} 
            size="small" 
            style={{ width: '200px' }}
          />
        </div>
      </div>

      {/* 题目卡片 */}
      <Card>
        {/* 题目内容 */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={4} style={{ marginBottom: '16px' }}>
            {question.title}
          </Title>
        </div>

        {/* 选项 */}
        <Radio.Group 
          value={selectedAnswer} 
          onChange={(e) => handleAnswerSelect(e.target.value)}
          style={{ width: '100%' }}
          disabled={showAnswer}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {question.options.map((option, index) => (
              <Radio 
                key={index} 
                value={index}
                style={{ 
                  width: '100%', 
                  padding: '12px',
                  border: showAnswer ? (
                    index === question.correctAnswer ? '2px solid #52c41a' :
                    index === selectedAnswer ? '2px solid #ff4d4f' : '1px solid #d9d9d9'
                  ) : '1px solid #d9d9d9',
                  borderRadius: '6px',
                  backgroundColor: showAnswer ? (
                    index === question.correctAnswer ? '#f6ffed' :
                    index === selectedAnswer && index !== question.correctAnswer ? '#fff2f0' : 'white'
                  ) : 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{option}</span>
                  {showAnswer && index === question.correctAnswer && (
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  )}
                  {showAnswer && index === selectedAnswer && index !== question.correctAnswer && (
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  )}
                </div>
              </Radio>
            ))}
          </Space>
        </Radio.Group>

        {/* 答案解析 */}
        {showAnswer && question.explanation && (
          <>
            <Divider />
            <div style={{ backgroundColor: '#f0f2f5', padding: '16px', borderRadius: '6px' }}>
              <Title level={5} style={{ marginBottom: '8px', color: '#1890ff' }}>
                解析
              </Title>
              <Paragraph style={{ margin: 0 }}>
                {question.explanation}
              </Paragraph>
            </div>
          </>
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
              icon={<ArrowRightOutlined />}
              onClick={handleNext}
              disabled={!showAnswer}
            >
              {currentIndex === filteredQuestions.length - 1 ? '完成' : '下一题'}
            </Button>
          </Space>
        </div>

        {/* 提示信息 */}
        {!showAnswer && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Text type="secondary">请选择答案查看解析</Text>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PracticeMode;