import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Tag,
  Progress,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Alert,
  Tooltip,
  Empty
} from 'antd';
import {
  BulbOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  FireOutlined,
  StarOutlined,
  ThunderboltOutlined,
  BookOutlined,
  TagOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { Question, WrongQuestion } from '../../types';

const { Title, Text } = Typography;

interface RecommendationItem {
  id: string;
  type: 'weak_knowledge' | 'frequent_error' | 'time_sensitive' | 'similar_pattern';
  title: string;
  description: string;
  questions: Question[];
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // 分钟
  expectedImprovement: number; // 百分比
}

const SmartRecommendation: React.FC = () => {
  const {
    wrongQuestions,
    questions,
    userStats,
    // getWrongQuestions,
    getQuestions,
    getUserStats
  } = useAppStore();

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [wrongQuestions, questions]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        // getWrongQuestions(),
        getQuestions(),
        getUserStats()
      ]);
      
      const recs = generateRecommendations();
      setRecommendations(recs);
    } catch (error) {
      console.error('加载推荐失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecommendations = (): RecommendationItem[] => {
    const recs: RecommendationItem[] = [];

    // 1. 薄弱知识点推荐
    const weakKnowledgeRec = generateWeakKnowledgeRecommendation();
    if (weakKnowledgeRec) recs.push(weakKnowledgeRec);

    // 2. 高频错误推荐
    const frequentErrorRec = generateFrequentErrorRecommendation();
    if (frequentErrorRec) recs.push(frequentErrorRec);

    // 3. 时间敏感推荐
    const timeSensitiveRec = generateTimeSensitiveRecommendation();
    if (timeSensitiveRec) recs.push(timeSensitiveRec);

    // 4. 相似题型推荐
    const similarPatternRec = generateSimilarPatternRecommendation();
    if (similarPatternRec) recs.push(similarPatternRec);

    // 按优先级排序
    return recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const generateWeakKnowledgeRecommendation = (): RecommendationItem | null => {
    // 分析错题中的知识点分布
    const knowledgePointErrors: { [key: string]: number } = {};
    
    wrongQuestions.forEach(wq => {
      const question = questions.find(q => q.id === wq.questionId);
      if (question && question.tags) {
        question.tags.forEach(tag => {
          knowledgePointErrors[tag] = (knowledgePointErrors[tag] || 0) + wq.wrongCount;
        });
      }
    });

    // 找出错误最多的知识点
    const sortedKnowledgePoints = Object.entries(knowledgePointErrors)
      .sort(([,a], [,b]) => b - a);

    if (sortedKnowledgePoints.length === 0) return null;

    const [weakestPoint, errorCount] = sortedKnowledgePoints[0];
    
    // 找出该知识点的相关题目
    const relatedQuestions = questions.filter(q => 
      q.tags?.includes(weakestPoint) && 
      !wrongQuestions.some(wq => wq.questionId === q.id)
    ).slice(0, 10);

    if (relatedQuestions.length === 0) return null;

    return {
      id: 'weak_knowledge_' + weakestPoint,
      type: 'weak_knowledge',
      title: `加强 "${weakestPoint}" 知识点`,
      description: `您在此知识点已错误${errorCount}次，建议重点复习`,
      questions: relatedQuestions,
      priority: 'high',
      estimatedTime: relatedQuestions.length * 2,
      expectedImprovement: Math.min(errorCount * 5, 30)
    };
  };

  const generateFrequentErrorRecommendation = (): RecommendationItem | null => {
    // 找出错误次数最多的题目
    const frequentErrors = wrongQuestions
      .filter(wq => wq.wrongCount >= 3)
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 5);

    if (frequentErrors.length === 0) return null;

    const errorQuestions = frequentErrors
      .map(wq => questions.find(q => q.id === wq.questionId))
      .filter(Boolean) as Question[];

    return {
      id: 'frequent_error',
      type: 'frequent_error',
      title: '攻克高频错题',
      description: `这些题目您已错误多次，需要重点突破`,
      questions: errorQuestions,
      priority: 'high',
      estimatedTime: errorQuestions.length * 5,
      expectedImprovement: 25
    };
  };

  const generateTimeSensitiveRecommendation = (): RecommendationItem | null => {
    // 找出最近错误的题目
    const recentErrors = wrongQuestions
      .filter(wq => {
        const daysSinceError = (Date.now() - wq.lastWrongTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceError <= 3; // 3天内的错题
      })
      .sort((a, b) => b.lastWrongTime.getTime() - a.lastWrongTime.getTime())
      .slice(0, 8);

    if (recentErrors.length === 0) return null;

    const recentQuestions = recentErrors
      .map(wq => questions.find(q => q.id === wq.questionId))
      .filter(Boolean) as Question[];

    return {
      id: 'time_sensitive',
      type: 'time_sensitive',
      title: '趁热打铁复习',
      description: '这些是您最近做错的题目，趁记忆犹新时复习效果更好',
      questions: recentQuestions,
      priority: 'medium',
      estimatedTime: recentQuestions.length * 3,
      expectedImprovement: 20
    };
  };

  const generateSimilarPatternRecommendation = (): RecommendationItem | null => {
    // 基于错题找相似题型
    const errorPatterns: { [key: string]: number } = {};
    
    wrongQuestions.forEach(wq => {
      const question = questions.find(q => q.id === wq.questionId);
      if (question) {
        // 简单的题型分类（基于题目长度和选项数量）
        const pattern = `question_${question.options.length}_${Math.floor(question.title.length / 50)}`;
        errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
      }
    });

    const commonPattern = Object.entries(errorPatterns)
      .sort(([,a], [,b]) => b - a)[0];

    if (!commonPattern || commonPattern[1] < 2) return null;

    // 找出相似题型的题目
    const [patternKey] = commonPattern;
    const [type, optionCount, lengthCategory] = patternKey.split('_');
    
    const similarQuestions = questions.filter(q => {
      const qPattern = `question_${q.options.length}_${Math.floor(q.title.length / 50)}`;
      return qPattern === patternKey && 
             !wrongQuestions.some(wq => wq.questionId === q.id);
    }).slice(0, 8);

    if (similarQuestions.length === 0) return null;

    return {
      id: 'similar_pattern',
      type: 'similar_pattern',
      title: '相似题型强化',
      description: '基于您的错题模式，推荐相似题型进行强化练习',
      questions: similarQuestions,
      priority: 'low',
      estimatedTime: similarQuestions.length * 2,
      expectedImprovement: 15
    };
  };

  const handleStartRecommendation = (rec: RecommendationItem) => {
    // 这里应该启动推荐的学习会话
    console.log('开始推荐学习:', rec);
    // 可以导航到学习页面，并传入推荐的题目
  };

  const getRecommendationIcon = (type: RecommendationItem['type']) => {
    switch (type) {
      case 'weak_knowledge': return <BookOutlined />;
      case 'frequent_error': return <TagOutlined />;
      case 'time_sensitive': return <ClockCircleOutlined />;
      case 'similar_pattern': return <ThunderboltOutlined />;
      default: return <BulbOutlined />;
    }
  };

  const getPriorityColor = (priority: RecommendationItem['priority']) => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getPriorityText = (priority: RecommendationItem['priority']) => {
    switch (priority) {
      case 'high': return '高优先级';
      case 'medium': return '中优先级';
      case 'low': return '低优先级';
      default: return '未知';
    }
  };

  if (wrongQuestions.length === 0) {
    return (
      <Card>
        <Empty 
          description="暂无错题数据，无法生成智能推荐"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <BulbOutlined style={{ marginRight: '8px' }} />
          智能推荐
        </Title>
        <Text type="secondary">
          基于您的错题分析，为您推荐最适合的复习内容
        </Text>
      </div>

      {/* 推荐概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="推荐项目"
              value={recommendations.length}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="预计学习时间"
              value={recommendations.reduce((sum, rec) => sum + rec.estimatedTime, 0)}
              suffix="分钟"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="预期提升"
              value={Math.round(recommendations.reduce((sum, rec) => sum + rec.expectedImprovement, 0) / recommendations.length) || 0}
              suffix="%"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 推荐列表 */}
      <Card title="推荐内容">
        {recommendations.length > 0 ? (
          <List
            dataSource={recommendations}
            renderItem={(rec) => (
              <List.Item
                actions={[
                  <Button 
                    type="primary" 
                    onClick={() => handleStartRecommendation(rec)}
                  >
                    开始学习
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      backgroundColor: getPriorityColor(rec.priority),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      {getRecommendationIcon(rec.type)}
                    </div>
                  }
                  title={
                    <Space>
                      <Text strong>{rec.title}</Text>
                      <Tag color={getPriorityColor(rec.priority)}>
                        {getPriorityText(rec.priority)}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ marginBottom: '8px' }}>
                        {rec.description}
                      </div>
                      <Space>
                        <Text type="secondary">
                          <BookOutlined /> {rec.questions.length}题
                        </Text>
                        <Text type="secondary">
                          <ClockCircleOutlined /> {rec.estimatedTime}分钟
                        </Text>
                        <Text type="secondary">
                          <TrophyOutlined /> 预期提升{rec.expectedImprovement}%
                        </Text>
                      </Space>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无推荐内容" />
        )}
      </Card>

      {/* 学习建议 */}
      <Card title="学习建议" style={{ marginTop: '16px' }}>
        <Alert
          message="个性化学习建议"
          description={
            <div>
              <p>• 建议每天花费30-45分钟进行错题复习</p>
              <p>• 优先处理高优先级推荐，效果更显著</p>
              <p>• 结合不同类型的推荐，全面提升学习效果</p>
              <p>• 定期回顾已掌握的错题，巩固学习成果</p>
            </div>
          }
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default SmartRecommendation;
