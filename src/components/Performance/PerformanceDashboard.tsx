/**
 * 性能监控仪表板
 * 显示解析性能和成本分析
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Alert,
  Button,
  Select,
  Space,
  Typography,
  Progress,
  Tag,
  Tooltip
} from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  WarningOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { PerformanceMonitor, PerformanceReport } from '../../parsers/monitoring/PerformanceMonitor';

const { Title, Text } = Typography;
const { Option } = Select;

interface PerformanceDashboardProps {
  className?: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ className }) => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<number>(24); // 小时
  const [autoRefresh, setAutoRefresh] = useState(true);

  const monitor = PerformanceMonitor.getInstance();

  // 加载性能报告
  const loadReport = async () => {
    setLoading(true);
    try {
      const newReport = monitor.generateReport(period);
      setReport(newReport);
    } catch (error) {
      console.error('加载性能报告失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取实时统计
  const [realTimeStats, setRealTimeStats] = useState(monitor.getRealTimeStats());

  useEffect(() => {
    loadReport();
  }, [period]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadReport();
        setRealTimeStats(monitor.getRealTimeStats());
      }, 30000); // 30秒刷新

      return () => clearInterval(interval);
    }
  }, [autoRefresh, period]);

  // 导出数据
  const handleExport = () => {
    const data = monitor.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 解析器统计表格列
  const parserColumns = [
    {
      title: '解析器',
      dataIndex: 'parser',
      key: 'parser',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: '请求数',
      dataIndex: 'requests',
      key: 'requests',
      sorter: (a: any, b: any) => a.requests - b.requests
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      render: (rate: number) => (
        <Progress
          percent={rate}
          size="small"
          status={rate >= 80 ? 'success' : rate >= 60 ? 'active' : 'exception'}
          format={(percent) => `${percent?.toFixed(1)}%`}
        />
      ),
      sorter: (a: any, b: any) => a.successRate - b.successRate
    },
    {
      title: '平均时间',
      dataIndex: 'averageTime',
      key: 'averageTime',
      render: (time: number) => `${(time / 1000).toFixed(2)}s`,
      sorter: (a: any, b: any) => a.averageTime - b.averageTime
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost: number) => `¥${cost.toFixed(2)}`,
      sorter: (a: any, b: any) => a.totalCost - b.totalCost
    },
    {
      title: '平均置信度',
      dataIndex: 'averageConfidence',
      key: 'averageConfidence',
      render: (confidence: number) => `${(confidence * 100).toFixed(1)}%`,
      sorter: (a: any, b: any) => a.averageConfidence - b.averageConfidence
    }
  ];

  // 策略统计表格列
  const strategyColumns = [
    {
      title: '策略',
      dataIndex: 'strategy',
      key: 'strategy',
      render: (text: string) => <Tag color="green">{text}</Tag>
    },
    {
      title: '请求数',
      dataIndex: 'requests',
      key: 'requests'
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      render: (rate: number) => `${rate.toFixed(1)}%`
    },
    {
      title: '成本效率',
      dataIndex: 'costEfficiency',
      key: 'costEfficiency',
      render: (efficiency: number) => (
        <Tooltip title="成功题目数 / 总成本">
          {efficiency.toFixed(2)}
        </Tooltip>
      )
    }
  ];

  // 准备图表数据
  const trendData = report ? monitor.getPerformanceTrends(period) : null;

  const chartData = trendData ? trendData.timeLabels.map((label, index) => ({
    time: label,
    processingTime: (trendData.processingTimes[index] / 1000).toFixed(2),
    successRate: trendData.successRates[index].toFixed(1),
    cost: trendData.costs[index].toFixed(2)
  })) : [];

  // 解析器分布数据
  const parserDistribution = report ? Object.entries(report.byParser).map(([name, stats]) => ({
    name,
    value: stats.requests,
    color: name === 'AI' ? '#ff7875' : name === 'RuleBased' ? '#52c41a' : '#1890ff'
  })) : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className={className}>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3}>性能监控仪表板</Title>
          </Col>
          <Col>
            <Space>
              <Select
                value={period}
                onChange={setPeriod}
                style={{ width: 120 }}
              >
                <Option value={1}>1小时</Option>
                <Option value={6}>6小时</Option>
                <Option value={24}>24小时</Option>
                <Option value={168}>7天</Option>
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadReport}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                导出数据
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 实时统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日请求"
              value={realTimeStats.recentRequests}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成功率"
              value={realTimeStats.currentSuccessRate}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ 
                color: realTimeStats.currentSuccessRate >= 80 ? '#3f8600' : '#cf1322' 
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={realTimeStats.averageResponseTime / 1000}
              precision={2}
              suffix="s"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日成本"
              value={realTimeStats.totalCostToday}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="¥"
            />
          </Card>
        </Col>
      </Row>

      {/* 警报信息 */}
      {report && report.alerts.length > 0 && (
        <Alert
          message="性能警报"
          description={
            <ul>
              {report.alerts.map((alert, index) => (
                <li key={index}>
                  <Text type={alert.type === 'error' ? 'danger' : 'warning'}>
                    {alert.message}
                  </Text>
                </li>
              ))}
            </ul>
          }
          type="warning"
          icon={<WarningOutlined />}
          style={{ marginBottom: 24 }}
          closable
        />
      )}

      {/* 趋势图表 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="性能趋势" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="processingTime"
                  stroke="#8884d8"
                  name="处理时间(s)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="successRate"
                  stroke="#82ca9d"
                  name="成功率(%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="解析器使用分布" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={parserDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {parserDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 详细统计表格 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="解析器统计" loading={loading}>
            <Table
              dataSource={report ? Object.entries(report.byParser).map(([parser, stats]) => ({
                key: parser,
                parser,
                ...stats
              })) : []}
              columns={parserColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="策略统计" loading={loading}>
            <Table
              dataSource={report ? Object.entries(report.byStrategy).map(([strategy, stats]) => ({
                key: strategy,
                strategy,
                ...stats
              })) : []}
              columns={strategyColumns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PerformanceDashboard;
