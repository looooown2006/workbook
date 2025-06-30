import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Typography,
  Row,
  Col,
  Divider
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  StarOutlined,
  StarFilled
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { Question, DifficultyLevel } from '../../types';
import { formatDate, getStatusColor } from '../../utils/helpers';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const QuestionManager: React.FC = () => {
  const {
    questions,
    currentChapter,
    loadQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    markQuestionAsMastered,
    unmarkQuestionAsMastered,
    isLoading
  } = useAppStore();

  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (currentChapter) {
      loadQuestions(currentChapter.id);
    }
  }, [currentChapter, loadQuestions]);

  const handleAdd = () => {
    if (!currentChapter) {
      message.warning('请先选择章节');
      return;
    }
    setEditingQuestion(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    form.setFieldsValue({
      title: question.title,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      difficulty: question.difficulty,
      tags: question.tags
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (questionId: string) => {
    try {
      await deleteQuestion(questionId);
      message.success('题目删除成功');
      if (selectedQuestion?.id === questionId) {
        setSelectedQuestion(null);
      }
    } catch (error) {
      message.error('题目删除失败');
    }
  };

  const handleModalOk = async () => {
    if (!currentChapter) return;

    try {
      const values = await form.validateFields();
      
      if (editingQuestion) {
        await updateQuestion({
          ...editingQuestion,
          ...values
        });
        message.success('题目更新成功');
      } else {
        await addQuestion({
          ...values,
          chapterId: currentChapter.id
        });
        message.success('题目创建成功');
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
    setEditingQuestion(null);
  };

  const handleView = (question: Question) => {
    setSelectedQuestion(question);
  };

  const handleToggleMastered = async (question: Question) => {
    try {
      if (question.isMastered) {
        await unmarkQuestionAsMastered(question.id);
        message.success('已取消斩题标记');
      } else {
        await markQuestionAsMastered(question.id);
        message.success('已标记为斩题');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getDifficultyColor = (difficulty?: DifficultyLevel) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'default';
    }
  };

  const getDifficultyText = (difficulty?: DifficultyLevel) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '未设置';
    }
  };

  const getStatusText = (question: Question) => {
    if (question.isMastered) return '已斩题';
    switch (question.status) {
      case 'new': return '未做';
      case 'correct': return '正确';
      case 'wrong': return '错误';
      default: return '未知';
    }
  };

  const columns = [
    {
      title: '题目',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: Question) => (
        <Button type="link" onClick={() => handleView(record)}>
          <Text ellipsis style={{ maxWidth: 200 }}>{text}</Text>
        </Button>
      ),
    },
    {
      title: '选项数',
      dataIndex: 'options',
      key: 'optionCount',
      render: (options: string[]) => (
        <Tag color="blue">{options.length}</Tag>
      ),
    },
    {
      title: '正确答案',
      dataIndex: 'correctAnswer',
      key: 'correctAnswer',
      render: (index: number, record: Question) => (
        <Tag color="green">
          {String.fromCharCode(65 + index)} - {record.options[index]?.substring(0, 10)}...
        </Tag>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: DifficultyLevel) => (
        <Tag color={getDifficultyColor(difficulty)}>
          {getDifficultyText(difficulty)}
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: Question) => (
        <Tag 
          color={record.isMastered ? 'gold' : 
                 record.status === 'correct' ? 'green' :
                 record.status === 'wrong' ? 'red' : 'default'}
        >
          {getStatusText(record)}
        </Tag>
      ),
    },
    {
      title: '错误次数',
      dataIndex: 'wrongCount',
      key: 'wrongCount',
      render: (count: number) => (
        <Tag color={count > 0 ? 'red' : 'green'}>{count}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Question) => (
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
          <Tooltip title={record.isMastered ? '取消斩题' : '标记斩题'}>
            <Button
              type="text"
              icon={record.isMastered ? <StarFilled /> : <StarOutlined />}
              style={{ color: record.isMastered ? '#faad14' : undefined }}
              onClick={() => handleToggleMastered(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这道题目吗？"
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

  if (!currentChapter) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="secondary">请先选择章节</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>题目管理 - {currentChapter.name}</Title>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新建题目
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={selectedQuestion ? 16 : 24}>
          <Card title="题目列表">
            <Table
              columns={columns}
              dataSource={questions}
              rowKey="id"
              loading={isLoading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 道题目`,
              }}
            />
          </Card>
        </Col>

        {selectedQuestion && (
          <Col span={8}>
            <Card
              title="题目详情"
              extra={
                <Button
                  type="text"
                  onClick={() => setSelectedQuestion(null)}
                >
                  关闭
                </Button>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>题目：</Text>
                  <Paragraph>{selectedQuestion.title}</Paragraph>
                </div>
                
                <div>
                  <Text strong>选项：</Text>
                  {selectedQuestion.options.map((option, index) => (
                    <div key={index} style={{ marginLeft: '16px' }}>
                      <Text 
                        style={{ 
                          color: index === selectedQuestion.correctAnswer ? '#52c41a' : undefined,
                          fontWeight: index === selectedQuestion.correctAnswer ? 'bold' : 'normal'
                        }}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                        {index === selectedQuestion.correctAnswer && ' ✓'}
                      </Text>
                    </div>
                  ))}
                </div>

                {selectedQuestion.explanation && (
                  <div>
                    <Text strong>解析：</Text>
                    <Paragraph>{selectedQuestion.explanation}</Paragraph>
                  </div>
                )}

                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>难度：</Text>
                    <br />
                    <Tag color={getDifficultyColor(selectedQuestion.difficulty)}>
                      {getDifficultyText(selectedQuestion.difficulty)}
                    </Tag>
                  </Col>
                  <Col span={12}>
                    <Text strong>状态：</Text>
                    <br />
                    <Tag 
                      color={selectedQuestion.isMastered ? 'gold' : 
                             selectedQuestion.status === 'correct' ? 'green' :
                             selectedQuestion.status === 'wrong' ? 'red' : 'default'}
                    >
                      {getStatusText(selectedQuestion)}
                    </Tag>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>错误次数：</Text>
                    <br />
                    <Text>{selectedQuestion.wrongCount}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>创建时间：</Text>
                    <br />
                    <Text>{formatDate(selectedQuestion.createdAt)}</Text>
                  </Col>
                </Row>

                <Space style={{ width: '100%', marginTop: '16px' }}>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(selectedQuestion)}
                    block
                  >
                    编辑题目
                  </Button>
                  <Button
                    icon={selectedQuestion.isMastered ? <StarFilled /> : <StarOutlined />}
                    onClick={() => handleToggleMastered(selectedQuestion)}
                    style={{ color: selectedQuestion.isMastered ? '#faad14' : undefined }}
                    block
                  >
                    {selectedQuestion.isMastered ? '取消斩题' : '标记斩题'}
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>
        )}
      </Row>

      {/* 新建/编辑题目模态框 */}
      <Modal
        title={editingQuestion ? '编辑题目' : '新建题目'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="确定"
        cancelText="取消"
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="title"
            label="题目内容"
            rules={[
              { required: true, message: '请输入题目内容' },
              { max: 500, message: '题目内容不能超过500个字符' }
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="请输入题目内容" 
              showCount
              maxLength={500}
            />
          </Form.Item>
          
          <Form.List name="options">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>选项设置</Text>
                  <Button type="dashed" onClick={() => add()} disabled={fields.length >= 6}>
                    添加选项
                  </Button>
                </div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Text>{String.fromCharCode(65 + name)}.</Text>
                    <Form.Item
                      {...restField}
                      name={[name]}
                      rules={[{ required: true, message: '请输入选项内容' }]}
                      style={{ flex: 1, margin: 0 }}
                    >
                      <Input placeholder="请输入选项内容" />
                    </Form.Item>
                    {fields.length > 2 && (
                      <Button type="text" danger onClick={() => remove(name)}>
                        删除
                      </Button>
                    )}
                  </Space>
                ))}
              </>
            )}
          </Form.List>

          <Form.Item
            name="correctAnswer"
            label="正确答案"
            rules={[{ required: true, message: '请选择正确答案' }]}
          >
            <Select placeholder="请选择正确答案">
              {form.getFieldValue('options')?.map((_: any, index: number) => (
                <Option key={index} value={index}>
                  {String.fromCharCode(65 + index)}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="explanation"
            label="题目解析"
            rules={[{ max: 1000, message: '题目解析不能超过1000个字符' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="请输入题目解析（可选）" 
              showCount
              maxLength={1000}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="difficulty"
                label="难度等级"
              >
                <Select placeholder="请选择难度等级">
                  <Option value="easy">简单</Option>
                  <Option value="medium">中等</Option>
                  <Option value="hard">困难</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="请输入标签（可选）"
                  tokenSeparators={[',']}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default QuestionManager;
