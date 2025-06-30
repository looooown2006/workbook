import React, { useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  List,
  Tag,
  Space,
  Empty
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { formatDate } from '../../utils/helpers';

const { Title, Text } = Typography;

const WrongQuestionStats: React.FC = () => {
  const {
    wrongQuestionStats,
    getWrongQuestionStats,
    isLoading
  } = useAppStore();

  useEffect(() => {
    getWrongQuestionStats();
  }, [getWrongQuestionStats]);

  if (!wrongQuestionStats) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Empty description="暂无错题统计数据" />
      </div>
    );
  }

  const {
    totalWrongQuestions,
    masteredCount,
    activeCount,
    ignoredCount,
    averageWrongCount,
    recentWrongQuestions,
    topErrorTypes,
    improvementTrend
  } = wrongQuestionStats;

  const masteryRate = totalWrongQuestions > 0 
    ? Math.round((masteredCount / totalWrongQuestions) * 100) 
    : 0;

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>错题统计分析</Title>

      {/* 总体统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总错题数"
              value={totalWrongQuestions}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已掌握"
              value={masteredCount}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="掌握率"
              value={masteryRate}
              suffix="%"
              valueStyle={{ 
                color: masteryRate >= 80 ? '#3f8600' : 
                       masteryRate >= 60 ? '#faad14' : '#cf1322' 
              }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均错误次数"
              value={averageWrongCount.toFixed(1)}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 状态分布 */}
      <Card title="错题状态分布" style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={totalWrongQuestions > 0 ? Math.round((activeCount / totalWrongQuestions) * 100) : 0}
                strokeColor="#ff4d4f"
                format={() => `${activeCount}`}
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong>活跃错题</Text>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={masteryRate}
                strokeColor="#52c41a"
                format={() => `${masteredCount}`}
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong>已掌握</Text>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={totalWrongQuestions > 0 ? Math.round((ignoredCount / totalWrongQuestions) * 100) : 0}
                strokeColor="#d9d9d9"
                format={() => `${ignoredCount}`}
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong>已忽略</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {/* 错误类型统计 */}
        <Col xs={24} md={12}>
          <Card title="常见错误类型" style={{ marginBottom: '24px' }}>
            {topErrorTypes.length > 0 ? (
              <List
                dataSource={topErrorTypes}
                renderItem={(item, index) => (
                  <List.Item>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space>
                        <Text strong>#{index + 1}</Text>
                        <Tag color="orange">{item.type}</Tag>
                      </Space>
                      <Text type="secondary">{item.count}次</Text>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无错误类型数据" />
            )}
          </Card>
        </Col>

        {/* 最近错题 */}
        <Col xs={24} md={12}>
          <Card title="最近错题" style={{ marginBottom: '24px' }}>
            {recentWrongQuestions.length > 0 ? (
              <List
                dataSource={recentWrongQuestions.slice(0, 5)}
                renderItem={(wrongQuestion) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text ellipsis style={{ maxWidth: 200 }}>
                            题目ID: {wrongQuestion.questionId.slice(0, 8)}...
                          </Text>
                          <Tag color="red">{wrongQuestion.wrongCount}次</Tag>
                        </Space>
                      }
                      description={formatDate(wrongQuestion.lastWrongTime)}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无最近错题" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 改进趋势 */}
      <Card title="7天改进趋势">
        {improvementTrend.length > 0 ? (
          <div>
            <Row gutter={16}>
              {improvementTrend.map((trend, index) => (
                <Col key={trend.date} span={24 / improvementTrend.length}>
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {new Date(trend.date).toLocaleDateString('zh-CN', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </div>
                    
                    <div style={{ marginBottom: '4px' }}>
                      <Space>
                        <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                        <Text style={{ color: '#ff4d4f' }}>{trend.wrongCount}</Text>
                      </Space>
                    </div>
                    
                    <div>
                      <Space>
                        <ArrowUpOutlined style={{ color: '#52c41a' }} />
                        <Text style={{ color: '#52c41a' }}>{trend.masteredCount}</Text>
                      </Space>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
            
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Space>
                <Space>
                  <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                  <Text type="secondary">新增错题</Text>
                </Space>
                <Space>
                  <ArrowUpOutlined style={{ color: '#52c41a' }} />
                  <Text type="secondary">掌握错题</Text>
                </Space>
              </Space>
            </div>
          </div>
        ) : (
          <Empty description="暂无趋势数据" />
        )}
      </Card>
    </div>
  );
};

export default WrongQuestionStats;
