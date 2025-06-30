import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Table,
  Tag,
  Space,
  Select,
  Input,
  Tooltip,
  message,
  Modal,
  Typography,
  Divider
} from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeInvisibleOutlined,
  StarOutlined,
  StarFilled,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { WrongQuestion, Question } from '../../types';
import { formatDate, formatDuration } from '../../utils/helpers';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { confirm } = Modal;

const WrongQuestionBook: React.FC = () => {
  const navigate = useNavigate();
  const {
    wrongQuestions,
    wrongQuestionStats,
    questions,
    questionBanks,
    chapters,
    loadWrongQuestions,
    getWrongQuestionStats,
    markWrongQuestionAsMastered,
    unmarkWrongQuestionAsMastered,
    ignoreWrongQuestion,
    deleteWrongQuestion,
    setStudyMode,
    isLoading
  } = useAppStore();

  const [filteredWrongQuestions, setFilteredWrongQuestions] = useState<WrongQuestion[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBank, setFilterBank] = useState<string>('all');
  const [filterChapter, setFilterChapter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  useEffect(() => {
    loadWrongQuestions();
    getWrongQuestionStats();
  }, [loadWrongQuestions, getWrongQuestionStats]);

  // 过滤错题
  useEffect(() => {
    let filtered = wrongQuestions;

    // 按状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(wq => wq.status === filterStatus);
    }

    // 按题库过滤
    if (filterBank !== 'all') {
      filtered = filtered.filter(wq => wq.bankId === filterBank);
    }

    // 按章节过滤
    if (filterChapter !== 'all') {
      filtered = filtered.filter(wq => wq.chapterId === filterChapter);
    }

    // 按搜索文本过滤
    if (searchText) {
      filtered = filtered.filter(wq => {
        const question = questions.find(q => q.id === wq.questionId);
        return question?.title.toLowerCase().includes(searchText.toLowerCase()) ||
               wq.notes?.toLowerCase().includes(searchText.toLowerCase()) ||
               wq.tags.some(tag => tag.toLowerCase().includes(searchText.toLowerCase()));
      });
    }

    setFilteredWrongQuestions(filtered);
  }, [wrongQuestions, filterStatus, filterBank, filterChapter, searchText, questions]);

  const handleStartReview = () => {
    if (filteredWrongQuestions.length === 0) {
      message.warning('没有可复习的错题');
      return;
    }

    const activeWrongQuestions = filteredWrongQuestions.filter(wq => wq.status === 'active');
    if (activeWrongQuestions.length === 0) {
      message.warning('没有活跃状态的错题可复习');
      return;
    }

    setStudyMode('wrong-review');
    navigate('/study');
  };

  const handleToggleMastered = async (wrongQuestion: WrongQuestion) => {
    try {
      if (wrongQuestion.isMastered) {
        await unmarkWrongQuestionAsMastered(wrongQuestion.id);
        message.success('已取消掌握标记');
      } else {
        await markWrongQuestionAsMastered(wrongQuestion.id);
        message.success('已标记为掌握');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleIgnore = async (wrongQuestionId: string) => {
    try {
      await ignoreWrongQuestion(wrongQuestionId);
      message.success('已忽略该错题');
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = (wrongQuestionId: string) => {
    confirm({
      title: '确认删除',
      content: '确定要删除这道错题吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteWrongQuestion(wrongQuestionId);
          message.success('错题已删除');
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const getQuestionTitle = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    return question?.title || '题目已删除';
  };

  const getBankName = (bankId: string) => {
    const bank = questionBanks.find(b => b.id === bankId);
    return bank?.name || '未知题库';
  };

  const getChapterName = (chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    return chapter?.name || '未知章节';
  };

  const columns = [
    {
      title: '题目',
      dataIndex: 'questionId',
      key: 'question',
      ellipsis: true,
      render: (questionId: string) => (
        <Tooltip title={getQuestionTitle(questionId)}>
          <Text ellipsis style={{ maxWidth: 200 }}>
            {getQuestionTitle(questionId)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '题库/章节',
      key: 'location',
      render: (record: WrongQuestion) => (
        <div>
          <div>{getBankName(record.bankId)}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {getChapterName(record.chapterId)}
          </Text>
        </div>
      ),
    },
    {
      title: '错误次数',
      dataIndex: 'wrongCount',
      key: 'wrongCount',
      sorter: (a: WrongQuestion, b: WrongQuestion) => a.wrongCount - b.wrongCount,
      render: (count: number) => (
        <Tag color={count >= 3 ? 'red' : count >= 2 ? 'orange' : 'blue'}>
          {count}次
        </Tag>
      ),
    },
    {
      title: '最后错误时间',
      dataIndex: 'lastWrongTime',
      key: 'lastWrongTime',
      sorter: (a: WrongQuestion, b: WrongQuestion) => 
        new Date(a.lastWrongTime).getTime() - new Date(b.lastWrongTime).getTime(),
      render: (time: Date) => formatDate(time),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: '活跃', value: 'active' },
        { text: '已掌握', value: 'mastered' },
        { text: '已忽略', value: 'ignored' },
      ],
      render: (status: string, record: WrongQuestion) => {
        if (record.isMastered) {
          return <Tag color="success" icon={<CheckCircleOutlined />}>已掌握</Tag>;
        }
        switch (status) {
          case 'active':
            return <Tag color="processing">活跃</Tag>;
          case 'ignored':
            return <Tag color="default" icon={<EyeInvisibleOutlined />}>已忽略</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
    },
    {
      title: '错误类型',
      dataIndex: 'errorType',
      key: 'errorType',
      render: (errorType: string) => errorType ? <Tag>{errorType}</Tag> : '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: WrongQuestion) => (
        <Space>
          <Tooltip title={record.isMastered ? '取消掌握' : '标记掌握'}>
            <Button
              type="text"
              size="small"
              icon={record.isMastered ? <StarFilled /> : <StarOutlined />}
              style={{ color: record.isMastered ? '#faad14' : undefined }}
              onClick={() => handleToggleMastered(record)}
            />
          </Tooltip>
          
          {record.status === 'active' && (
            <Tooltip title="忽略">
              <Button
                type="text"
                size="small"
                icon={<EyeInvisibleOutlined />}
                onClick={() => handleIgnore(record.id)}
              />
            </Tooltip>
          )}
          
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总错题数"
              value={wrongQuestionStats?.totalWrongQuestions || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃错题"
              value={wrongQuestionStats?.activeCount || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已掌握"
              value={wrongQuestionStats?.masteredCount || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="掌握率"
              value={wrongQuestionStats?.totalWrongQuestions ? 
                Math.round((wrongQuestionStats.masteredCount / wrongQuestionStats.totalWrongQuestions) * 100) : 0}
              suffix="%"
              valueStyle={{ 
                color: wrongQuestionStats?.totalWrongQuestions && 
                       (wrongQuestionStats.masteredCount / wrongQuestionStats.totalWrongQuestions) >= 0.8 ? 
                       '#3f8600' : '#cf1322' 
              }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={handleStartReview}
                disabled={filteredWrongQuestions.filter(wq => wq.status === 'active').length === 0}
              >
                开始复习
              </Button>
              <Button
                icon={<BarChartOutlined />}
                onClick={() => navigate('/wrong-questions/stats')}
              >
                查看统计
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Search
                placeholder="搜索错题..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col>
            <Text strong>筛选：</Text>
          </Col>
          <Col>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 120 }}
              placeholder="状态"
            >
              <Option value="all">全部状态</Option>
              <Option value="active">活跃</Option>
              <Option value="mastered">已掌握</Option>
              <Option value="ignored">已忽略</Option>
            </Select>
          </Col>
          <Col>
            <Select
              value={filterBank}
              onChange={setFilterBank}
              style={{ width: 150 }}
              placeholder="题库"
            >
              <Option value="all">全部题库</Option>
              {questionBanks.map(bank => (
                <Option key={bank.id} value={bank.id}>{bank.name}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Select
              value={filterChapter}
              onChange={setFilterChapter}
              style={{ width: 150 }}
              placeholder="章节"
            >
              <Option value="all">全部章节</Option>
              {chapters
                .filter(chapter => filterBank === 'all' || chapter.bankId === filterBank)
                .map(chapter => (
                  <Option key={chapter.id} value={chapter.id}>{chapter.name}</Option>
                ))}
            </Select>
          </Col>
          <Col>
            <Text type="secondary">
              共 {filteredWrongQuestions.length} 道错题
            </Text>
          </Col>
        </Row>
      </Card>

      {/* 错题列表 */}
      <Card title="错题列表">
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredWrongQuestions}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default WrongQuestionBook;
