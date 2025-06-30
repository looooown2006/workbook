import React, { useEffect, useState } from 'react';
import {
  List,
  Button,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Upload,
  Card
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { QuestionBank } from '../../types';
import BankLevelImportAssistant from '../Import/BankLevelImportAssistant';

const { Title, Text } = Typography;
const { TextArea } = Input;

const QuestionBankSidebar: React.FC = () => {
  const {
    questionBanks,
    currentBank,
    loadQuestionBanks,
    addQuestionBank,
    updateQuestionBank,
    deleteQuestionBank,
    setCurrentBank,
    loadChapters,
    isLoading
  } = useAppStore();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadQuestionBanks();
  }, [loadQuestionBanks]);

  const handleAddBank = () => {
    setEditingBank(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditBank = (bank: QuestionBank) => {
    setEditingBank(bank);
    form.setFieldsValue({
      name: bank.name,
      description: bank.description
    });
    setIsModalVisible(true);
  };

  const handleDeleteBank = async (bankId: string) => {
    try {
      await deleteQuestionBank(bankId);
      message.success('题库删除成功');
    } catch (error) {
      message.error('题库删除失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingBank) {
        // 编辑题库
        await updateQuestionBank({
          ...editingBank,
          ...values
        });
        message.success('题库更新成功');
      } else {
        // 新增题库
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

  const handleBankSelect = async (bank: QuestionBank) => {
    setCurrentBank(bank);
    await loadChapters(bank.id);
  };

  const handleImportQuestions = () => {
    if (!currentBank) {
      message.warning('请先选择题库');
      return;
    }

    setImportVisible(true);
  };

  return (
    <div style={{ padding: '16px', height: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0, marginBottom: '12px' }}>
          题库列表
        </Title>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddBank}
            size="small"
          >
            新建题库
          </Button>
          <Button 
            icon={<UploadOutlined />} 
            onClick={handleImportQuestions}
            size="small"
          >
            导入题目
          </Button>
        </Space>
      </div>

      <List
        loading={isLoading}
        dataSource={questionBanks}
        renderItem={(bank) => (
          <List.Item style={{ padding: '8px 0' }}>
            <Card
              size="small"
              hoverable
              className={currentBank?.id === bank.id ? 'selected-bank' : ''}
              onClick={() => handleBankSelect(bank)}
              style={{ 
                width: '100%',
                border: currentBank?.id === bank.id ? '2px solid #1890ff' : '1px solid #d9d9d9'
              }}
              actions={[
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditBank(bank);
                  }}
                />,
                <Popconfirm
                  title="确定要删除这个题库吗？"
                  description="删除后将无法恢复，请谨慎操作。"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDeleteBank(bank.id);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              ]}
            >
              <Card.Meta
                avatar={<BookOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                title={
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {bank.name}
                  </div>
                }
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {bank.description || '暂无描述'}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      题目数量: {bank.totalQuestions}
                    </Text>
                  </div>
                }
              />
            </Card>
          </List.Item>
        )}
        locale={{ emptyText: '暂无题库，请创建新题库' }}
      />

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
              rows={3} 
              placeholder="请输入题库描述（可选）" 
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 题库级别导入助手 */}
      {currentBank && (
        <BankLevelImportAssistant
          visible={importVisible}
          onClose={() => setImportVisible(false)}
          questionBank={currentBank}
        />
      )}

      <style>{`
        .selected-bank {
          background-color: #e6f7ff;
        }
        
        .ant-card-actions {
          background: #fafafa;
        }
        
        .ant-card-actions > li {
          margin: 4px 0;
        }
        
        .ant-card-meta-title {
          margin-bottom: 4px;
        }
        
        .ant-card-meta-description {
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default QuestionBankSidebar;
