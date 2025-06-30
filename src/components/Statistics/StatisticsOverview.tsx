import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Select,
  Typography,
  Space,
  Tag,
  Button,
  DatePicker,
  Divider
} from 'antd';
import {
  TrophyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  DownloadOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { Question, QuestionBank, Chapter, AnswerRecord } from '../../types';
import { calculateStudyStats, formatDate, formatDuration } from '../../utils/helpers';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface StatisticsData {
  totalQuestions: number;
  correctQuestions: number;
  wrongQuestions: number;
  masteredQuestions: number;
  accuracy: number;
  totalStudyTime: number;
  averageTime: number;
  recentActivity: AnswerRecord[];
  bankStats: Array<{
    bank: QuestionBank;
    stats: ReturnType<typeof calculateStudyStats>;
  }>;
  chapterStats: Array<{
    chapter: Chapter;
    stats: ReturnType<typeof calculateStudyStats>;
  }>;
}

const StatisticsOverview: React.FC = () => {
  const {
    questionBanks,
    chapters,
    questions,
    answerRecords,
    loadQuestionBanks,
    loadChapters,
    loadQuestions
  } = useAppStore();

  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);

  useEffect(() => {
    loadQuestionBanks();
  }, [loadQuestionBanks]);

  useEffect(() => {
    calculateStatistics();
  }, [questionBanks, chapters, questions, answerRecords, selectedBank, dateRange]);

  const calculateStatistics = () => {
    let filteredQuestions = questions;
    let filteredRecords = answerRecords;

    // 按题库过滤
    if (selectedBank !== 'all') {
      const bank = questionBanks.find(b => b.id === selectedBank);
      if (bank) {
        const bankChapters = chapters.filter(c => c.bankId === bank.id);
        const questionIds = new Set<string>();

        for (const chapter of bankChapters) {
          chapter.questionIds.forEach(id => questionIds.add(id));
        }

        filteredQuestions = questions.filter(q => questionIds.has(q.id));
        filteredRecords = answerRecords.filter(r => questionIds.has(r.questionId));
      }
    }

    // 按日期过滤
    if (dateRange) {
      const [startDate, endDate] = dateRange;
      filteredRecords = filteredRecords.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    // 计算基础统计
    const stats = calculateStudyStats(filteredQuestions);

    // 计算学习时间
    const totalStudyTime = filteredRecords.reduce((total, record) => total + record.timeSpent, 0);
    const averageTime = filteredRecords.length > 0 ? totalStudyTime / filteredRecords.length : 0;

    // 获取最近活动
    const recentActivity = filteredRecords
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // 计算各题库统计（使用已有数据）
    const bankStats = questionBanks.map((bank) => {
      const bankChapters = chapters.filter(c => c.bankId === bank.id);
      const bankQuestions: Question[] = [];

      for (const chapter of bankChapters) {
        const chapterQuestions = questions.filter(q => chapter.questionIds.includes(q.id));
        bankQuestions.push(...chapterQuestions);
      }

      return {
        bank,
        stats: calculateStudyStats(bankQuestions)
      };
    });

    // 计算各章节统计（使用已有数据）
    const chapterStats = chapters.map((chapter) => {
      const chapterQuestions = questions.filter(q => chapter.questionIds.includes(q.id));

      return {
        chapter,
        stats: calculateStudyStats(chapterQuestions)
      };
    });

    setStatisticsData({
      totalQuestions: stats.total,
      correctQuestions: stats.correct,
      wrongQuestions: stats.wrong,
      masteredQuestions: stats.mastered,
      accuracy: stats.accuracy,
      totalStudyTime,
      averageTime,
      recentActivity,
      bankStats,
      chapterStats
    });
  };

  const handleExportData = () => {
    // TODO: 实现数据导出功能
    console.log('导出数据功能待实现');
  };

  if (!statisticsData) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">加载统计数据中...</Text>
      </div>
    );
  }

  const bankColumns = [
    {
      title: '题库名称',
      dataIndex: 'bank',
      key: 'bankName',
      render: (bank: QuestionBank) => bank.name,
    },
    {
      title: '总题数',
      dataIndex: 'stats',
      key: 'total',
      render: (stats: ReturnType<typeof calculateStudyStats>) => stats.total,
    },
    {
      title: '正确数',
      dataIndex: 'stats',
      key: 'correct',
      render: (stats: ReturnType<typeof calculateStudyStats>) => (
        <Tag color="success">{stats.correct}</Tag>
      ),
    },
    {
      title: '错误数',
      dataIndex: 'stats',
      key: 'wrong',
      render: (stats: ReturnType<typeof calculateStudyStats>) => (
        <Tag color="error">{stats.wrong}</Tag>
      ),
    },
    {
      title: '已斩题',
      dataIndex: 'stats',
      key: 'mastered',
      render: (stats: ReturnType<typeof calculateStudyStats>) => (
        <Tag color="gold">{stats.mastered}</Tag>
      ),
    },
    {
      title: '正确率',
      dataIndex: 'stats',
      key: 'accuracy',
      render: (stats: ReturnType<typeof calculateStudyStats>) => (
        <Progress
          percent={stats.accuracy}
          size="small"
          strokeColor={stats.accuracy >= 80 ? '#52c41a' : stats.accuracy >= 60 ? '#faad14' : '#ff4d4f'}
        />
      ),
    },
  ];

  const activityColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: Date) => formatDate(timestamp),
    },
    {
      title: '模式',
      dataIndex: 'mode',
      key: 'mode',
      render: (mode: string) => {
        const modeMap = {
          quick: '快刷',
          study: '背题',
          test: '测试'
        };
        return <Tag>{modeMap[mode as keyof typeof modeMap] || mode}</Tag>;
      },
    },
    {
      title: '结果',
      dataIndex: 'isCorrect',
      key: 'result',
      render: (isCorrect: boolean) => (
        isCorrect ? (
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
        )
      ),
    },
    {
      title: '用时',
      dataIndex: 'timeSpent',
      key: 'timeSpent',
      render: (timeSpent: number) => formatDuration(timeSpent),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>学习统计</Title>
          </Col>
          <Col>
            <Space>
              <Select
                value={selectedBank}
                onChange={setSelectedBank}
                style={{ width: 200 }}
                placeholder="选择题库"
              >
                <Option value="all">全部题库</Option>
                {questionBanks.map(bank => (
                  <Option key={bank.id} value={bank.id}>{bank.name}</Option>
                ))}
              </Select>
              <RangePicker
                onChange={setDateRange}
                placeholder={['开始日期', '结束日期']}
              />
              <Button icon={<DownloadOutlined />} onClick={handleExportData}>
                导出数据
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 总体统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总题数"
              value={statisticsData.totalQuestions}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="正确数"
              value={statisticsData.correctQuestions}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已斩题"
              value={statisticsData.masteredQuestions}
              valueStyle={{ color: '#faad14' }}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="正确率"
              value={statisticsData.accuracy}
              suffix="%"
              valueStyle={{ 
                color: statisticsData.accuracy >= 80 ? '#3f8600' : 
                       statisticsData.accuracy >= 60 ? '#faad14' : '#cf1322' 
              }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="总学习时间"
              value={formatDuration(statisticsData.totalStudyTime)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="平均答题时间"
              value={formatDuration(Math.round(statisticsData.averageTime))}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 题库统计 */}
      <Card title="题库统计" style={{ marginBottom: '24px' }}>
        <Table
          columns={bankColumns}
          dataSource={statisticsData.bankStats}
          rowKey={(record) => record.bank.id}
          pagination={false}
          size="small"
        />
      </Card>

      {/* 最近活动 */}
      <Card title="最近活动">
        <Table
          columns={activityColumns}
          dataSource={statisticsData.recentActivity}
          rowKey={(record) => record.id}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无答题记录' }}
        />
      </Card>
    </div>
  );
};

export default StatisticsOverview;
