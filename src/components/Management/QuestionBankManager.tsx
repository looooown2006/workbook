import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Typography,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { QuestionBank } from '../../types';
import { formatDate, calculateStudyStats } from '../../utils/helpers';

const { Title, Text } = Typography;
const { TextArea } = Input;

const QuestionBankManager: React.FC = () => {
  const {
    questionBanks,
    chapters,
    questions,
    loadQuestionBanks,
    loadChapters,
    loadQuestions,
    addQuestionBank,
    updateQuestionBank,
    deleteQuestionBank,
    isLoading,
    setCurrentBank
  } = useAppStore();

  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadQuestionBanks();
  }, [loadQuestionBanks]);

  // 获取题库统计信息
  const getBankStats = async (bank: QuestionBank) => {
    // 加载该题库的所有章节和题目
    await loadChapters(bank.id);
    const bankChapters = chapters.filter(c => c.bankId === bank.id);
    
    let totalQuestions = 0;
    let correctQuestions = 0;
    let wrongQuestions = 0;
    let masteredQuestions = 0;

    for (const chapter of bankChapters) {
      await loadQuestions(chapter.id);
      const chapterQuestions = questions.filter(q => chapter.questionIds.includes(q.id));
      const stats = calculateStudyStats(chapterQuestions);
      
      totalQuestions += stats.total;
      correctQuestions += stats.correct;
      wrongQuestions += stats.wrong;
      masteredQuestions += stats.mastered;
    }

    return {
      totalQuestions,
      correctQuestions,
      wrongQuestions,
      masteredQuestions,
      chapterCount: bankChapters.length,
      accuracy: totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0
    };
  };

  const handleAdd = () => {
    setEditingBank(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (bank: QuestionBank) => {
    setEditingBank(bank);
    form.setFieldsValue({
      name: bank.name,
      description: bank.description
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (bankId: string) => {
    try {
      await deleteQuestionBank(bankId);
      message.success('题库删除成功');
      if (selectedBank?.id === bankId) {
        setSelectedBank(null);
      }
    } catch (error) {
      message.error('题库删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingBank) {
        await updateQuestionBank({
          ...editingBank,
          ...values
        });
        message.success('题库更新成功');
      } else {
        await addQuestionBank(values);
        message.success('题库创建成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingBank(null);
  };

  const handleView = (bank: QuestionBank) => {
    setCurrentBank(bank);
    setSelectedBank(bank);
  };

  const handleExport = (bank: QuestionBank) => {
    // TODO: 实现导出功能
    message.info('导出功能正在开发中');
  };

  const columns = [
    {
      title: '题库名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: QuestionBank) => (
        <Button type="link" onClick={() => handleView(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis>{text || '暂无描述'}</Text>
        </Tooltip>
      ),
    },
    {
      title: '章节数',
      dataIndex: 'chapterIds',
      key: 'chapterCount',
      render: (chapterIds: string[]) => (
        <Tag color="blue">{chapterIds.length}</Tag>
      ),
    },
    {
      title: '题目数',
      dataIndex: 'totalQuestions',
      key: 'totalQuestions',
      render: (count: number) => (
        <Tag color="green">{count}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => formatDate(date),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: QuestionBank) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="导出">
            <Button
              type="text"
              icon={<ExportOutlined />}
              onClick={() => handleExport(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个题库吗？"
            description="删除后将无法恢复，请谨慎操作。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>题库管理</Title>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                新建题库
              </Button>
              <Button
                icon={<ImportOutlined />}
                onClick={() => message.info('批量导入功能正在开发中')}
              >
                批量导入
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={selectedBank ? 16 : 24}>
          <Card title="题库列表">
            <Table
              columns={columns}
              dataSource={questionBanks}
              rowKey="id"
              loading={isLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 个题库`,
              }}
            />
          </Card>
        </Col>

        {selectedBank && (
          <Col span={8}>
            <Card
              title={`题库详情 - ${selectedBank.name}`}
              extra={
                <Button
                  type="text"
                  onClick={() => setSelectedBank(null)}
                >
                  关闭
                </Button>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>描述：</Text>
                  <br />
                  <Text>{selectedBank.description || '暂无描述'}</Text>
                </div>
                
                <div>
                  <Text strong>创建时间：</Text>
                  <br />
                  <Text>{formatDate(selectedBank.createdAt)}</Text>
                </div>
                
                <div>
                  <Text strong>更新时间：</Text>
                  <br />
                  <Text>{formatDate(selectedBank.updatedAt)}</Text>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic title="章节数" value={selectedBank.chapterIds.length} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="题目数" value={selectedBank.totalQuestions} />
                  </Col>
                </Row>

                <Space style={{ width: '100%', marginTop: '16px' }}>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(selectedBank)}
                    block
                  >
                    编辑题库
                  </Button>
                  <Button
                    icon={<ExportOutlined />}
                    onClick={() => handleExport(selectedBank)}
                    block
                  >
                    导出题库
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>
        )}
      </Row>

      {/* 新建/编辑题库模态框 */}
      <Modal
        title={editingBank ? '编辑题库' : '新建题库'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="题库名称"
            rules={[
              { required: true, message: '请输入题库名称' },
              { max: 50, message: '题库名称不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入题库名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="题库描述"
            rules={[
              { max: 200, message: '题库描述不能超过200个字符' }
            ]}
          >
            <TextArea 
              rows={4} 
              placeholder="请输入题库描述（可选）" 
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuestionBankManager;
