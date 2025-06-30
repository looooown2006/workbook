import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select,
  Switch,
  TimePicker,
  Checkbox,
  message,
  Progress,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CalendarOutlined,
  TrophyOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { StudyPlan, StudyMode } from '../../types';
import { useAppStore } from '../../stores/useAppStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const StudyPlanManager: React.FC = () => {
  const {
    questionBanks,
    chapters,
    studyPlans,
    loadQuestionBanks,
    loadChapters,
    loadStudyPlans,
    addStudyPlan,
    updateStudyPlan,
    deleteStudyPlan
  } = useAppStore();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadQuestionBanks();
    loadStudyPlans();
  }, [loadQuestionBanks, loadStudyPlans]);

  const handleCreatePlan = () => {
    setEditingPlan(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditPlan = (plan: StudyPlan) => {
    setEditingPlan(plan);
    form.setFieldsValue({
      name: plan.name,
      description: plan.description,
      dateRange: [dayjs(plan.startDate), dayjs(plan.endDate)],
      targetQuestions: plan.targetQuestions,
      dailyTarget: plan.dailyTarget,
      bankIds: plan.bankIds,
      chapterIds: plan.chapterIds,
      modes: plan.modes,
      reminderEnabled: plan.reminders.enabled,
      reminderTime: plan.reminders.time ? dayjs(plan.reminders.time, 'HH:mm') : null,
      reminderDays: plan.reminders.days
    });
    setIsModalVisible(true);
  };

  const handleDeletePlan = (planId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个学习计划吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteStudyPlan(planId);
          message.success('学习计划已删除');
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleToggleActive = async (planId: string) => {
    try {
      const plan = studyPlans.find(p => p.id === planId);
      if (plan) {
        await updateStudyPlan({ ...plan, isActive: !plan.isActive });
        message.success('计划状态已更新');
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const [startDate, endDate] = values.dateRange;
      
      const planData: Partial<StudyPlan> = {
        name: values.name,
        description: values.description,
        startDate: startDate.toDate(),
        endDate: endDate.toDate(),
        targetQuestions: values.targetQuestions,
        dailyTarget: values.dailyTarget,
        bankIds: values.bankIds || [],
        chapterIds: values.chapterIds || [],
        modes: values.modes || ['quick'],
        reminders: {
          enabled: values.reminderEnabled || false,
          time: values.reminderTime ? values.reminderTime.format('HH:mm') : '',
          days: values.reminderDays || []
        },
        updatedTime: new Date()
      };

      if (editingPlan) {
        // 更新现有计划
        await updateStudyPlan({ ...editingPlan, ...planData });
        message.success('学习计划已更新');
      } else {
        // 创建新计划
        const newPlanData = {
          ...planData as Omit<StudyPlan, 'id' | 'createdTime' | 'updatedTime'>,
          progress: {
            completedQuestions: 0,
            accuracy: 0,
            daysCompleted: 0
          },
          isActive: true
        };
        await addStudyPlan(newPlanData);
        message.success('学习计划已创建');
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('保存学习计划失败:', error);
    }
  };

  const columns = [
    {
      title: '计划名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: StudyPlan) => (
        <div>
          <Text strong>{name}</Text>
          {record.isActive && <Tag color="green" style={{ marginLeft: '8px' }}>进行中</Tag>}
        </div>
      ),
    },
    {
      title: '时间范围',
      key: 'dateRange',
      render: (record: StudyPlan) => (
        <div>
          <div>{dayjs(record.startDate).format('YYYY-MM-DD')}</div>
          <div>{dayjs(record.endDate).format('YYYY-MM-DD')}</div>
        </div>
      ),
    },
    {
      title: '目标/进度',
      key: 'progress',
      render: (record: StudyPlan) => {
        const progressPercent = Math.round((record.progress.completedQuestions / record.targetQuestions) * 100);
        return (
          <div>
            <Progress 
              percent={progressPercent} 
              size="small" 
              format={() => `${record.progress.completedQuestions}/${record.targetQuestions}`}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              正确率: {record.progress.accuracy}%
            </Text>
          </div>
        );
      },
    },
    {
      title: '每日目标',
      dataIndex: 'dailyTarget',
      key: 'dailyTarget',
      render: (target: number) => `${target}题/天`,
    },
    {
      title: '学习模式',
      dataIndex: 'modes',
      key: 'modes',
      render: (modes: StudyMode[]) => (
        <Space>
          {modes.map(mode => {
            const modeMap: Record<StudyMode, { text: string; color: string }> = {
              quick: { text: '快刷', color: 'blue' },
              study: { text: '背题', color: 'green' },
              practice: { text: '练习', color: 'purple' },
              test: { text: '测试', color: 'orange' },
              'wrong-review': { text: '错题', color: 'red' }
            };
            const modeInfo = modeMap[mode];
            return (
              <Tag key={mode} color={modeInfo.color}>
                {modeInfo.text}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: StudyPlan) => (
        <Space>
          <Button
            type="text"
            icon={record.isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleToggleActive(record.id)}
          >
            {record.isActive ? '暂停' : '启动'}
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditPlan(record)}
          >
            编辑
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeletePlan(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const activePlans = studyPlans.filter(p => p.isActive);
  const totalTargetQuestions = activePlans.reduce((sum, p) => sum + p.targetQuestions, 0);
  const totalCompletedQuestions = activePlans.reduce((sum, p) => sum + p.progress.completedQuestions, 0);
  const averageAccuracy = activePlans.length > 0
    ? Math.round(activePlans.reduce((sum, p) => sum + p.progress.accuracy, 0) / activePlans.length)
    : 0;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>学习计划</Title>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePlan}>
              创建计划
            </Button>
          </Col>
        </Row>
      </div>

      {/* 总体统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="活跃计划"
              value={activePlans.length}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总体进度"
              value={totalTargetQuestions > 0 ? Math.round((totalCompletedQuestions / totalTargetQuestions) * 100) : 0}
              suffix="%"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="平均正确率"
              value={averageAccuracy}
              suffix="%"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 计划列表 */}
      <Card title="我的学习计划">
        <Table
          columns={columns}
          dataSource={studyPlans}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
        />
      </Card>

      {/* 创建/编辑计划模态框 */}
      <Modal
        title={editingPlan ? '编辑学习计划' : '创建学习计划'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="计划名称"
            rules={[{ required: true, message: '请输入计划名称' }]}
          >
            <Input placeholder="输入学习计划名称" />
          </Form.Item>

          <Form.Item name="description" label="计划描述">
            <TextArea rows={3} placeholder="描述学习计划的目标和内容" />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="时间范围"
            rules={[{ required: true, message: '请选择时间范围' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="targetQuestions"
                label="目标题数"
                rules={[{ required: true, message: '请输入目标题数' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="总目标题数" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dailyTarget"
                label="每日目标"
                rules={[{ required: true, message: '请输入每日目标' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="每日题数" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="bankIds" label="关联题库">
            <Select mode="multiple" placeholder="选择题库">
              {questionBanks.map(bank => (
                <Option key={bank.id} value={bank.id}>{bank.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="modes" label="学习模式">
            <Checkbox.Group>
              <Checkbox value="quick">快刷模式</Checkbox>
              <Checkbox value="study">背题模式</Checkbox>
              <Checkbox value="test">测试模式</Checkbox>
              <Checkbox value="wrong-review">错题复习</Checkbox>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="reminderEnabled" valuePropName="checked" label="学习提醒">
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.reminderEnabled !== currentValues.reminderEnabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('reminderEnabled') ? (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="reminderTime" label="提醒时间">
                      <TimePicker format="HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="reminderDays" label="提醒日期">
                      <Checkbox.Group>
                        <Checkbox value={1}>周一</Checkbox>
                        <Checkbox value={2}>周二</Checkbox>
                        <Checkbox value={3}>周三</Checkbox>
                        <Checkbox value={4}>周四</Checkbox>
                        <Checkbox value={5}>周五</Checkbox>
                        <Checkbox value={6}>周六</Checkbox>
                        <Checkbox value={0}>周日</Checkbox>
                      </Checkbox.Group>
                    </Form.Item>
                  </Col>
                </Row>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StudyPlanManager;
