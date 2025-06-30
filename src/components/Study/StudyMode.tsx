import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Progress,
  Row,
  Col,
  Tag,
  Divider,
  Tooltip,
  Checkbox,
  message
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  StarOutlined,
  StarFilled,
  HomeOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { Question } from '../../types';
import { getStatusColor } from '../../utils/helpers';
import EmptyState from '../Common/EmptyState';

const { Title, Text, Paragraph } = Typography;

const StudyMode: React.FC = () => {
  const navigate = useNavigate();
  const {
    questions,
    currentQuestion,
    currentChapter,
    currentBank,
    setCurrentQuestion,
    markQuestionAsMastered,
    unmarkQuestionAsMastered
  } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(true); // 背题模式默认显示答案
  const [skipMastered, setSkipMastered] = useState(true); // 默认跳过已斩题
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);

  // 过滤题目
  useEffect(() => {
    let filtered = questions;
    if (skipMastered) {
      filtered = questions.filter(q => !q.isMastered);
    }
    setFilteredQuestions(filtered);
    
    if (filtered.length > 0 && currentQuestion) {
      const index = filtered.findIndex(q => q.id === currentQuestion.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [questions, currentQuestion, skipMastered]);

  // 当前题目
  const question = filteredQuestions[currentIndex];

  useEffect(() => {
    if (question) {
      setCurrentQuestion(question);
    }
  }, [question, setCurrentQuestion]);

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

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
        // 背题模式：斩题后不自动跳转，让用户手动控制
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSkipMasteredChange = (checked: boolean) => {
    setSkipMastered(checked);
  };

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
              <Tag color="green">背题模式</Tag>
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
            '0%': '#52c41a',
            '100%': '#87d068',
          }}
        />
      </Card>

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
              disabled={currentIndex === filteredQuestions.length - 1}
            >
              下一题
            </Button>
            
            <Button
              icon={question.isMastered ? <StarFilled /> : <StarOutlined />}
              style={{ color: question.isMastered ? '#faad14' : undefined }}
              onClick={handleToggleMastered}
            >
              {question.isMastered ? '取消斩题' : '标记斩题'}
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default StudyMode;
