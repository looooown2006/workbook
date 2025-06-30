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
  Card,
  Progress,
  Tag,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { Chapter } from '../../types';
import { calculateStudyStats } from '../../utils/helpers';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ChapterSidebar: React.FC = () => {
  const {
    chapters,
    questions,
    currentBank,
    currentChapter,
    loadChapters,
    loadQuestions,
    addChapter,
    updateChapter,
    deleteChapter,
    setCurrentChapter
  } = useAppStore();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [isChapterLoading, setIsChapterLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (currentBank) {
      setIsChapterLoading(true);
      loadChapters(currentBank.id).finally(() => {
        setIsChapterLoading(false);
      });
    }
  }, [currentBank, loadChapters]);

  const handleAddChapter = () => {
    if (!currentBank) {
      message.warning('请先选择题库');
      return;
    }
    setEditingChapter(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    form.setFieldsValue({
      name: chapter.name,
      description: chapter.description
    });
    setIsModalVisible(true);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      await deleteChapter(chapterId);
      message.success('章节删除成功');
    } catch (error) {
      message.error('章节删除失败');
    }
  };

  const handleModalOk = async () => {
    if (!currentBank) return;

    try {
      const values = await form.validateFields();
      
      if (editingChapter) {
        // 编辑章节
        await updateChapter({
          ...editingChapter,
          ...values
        });
        message.success('章节更新成功');
      } else {
        // 新增章节
        await addChapter({
          ...values,
          bankId: currentBank.id,
          order: chapters.length + 1
        });
        message.success('章节创建成功');
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
    setEditingChapter(null);
  };

  const handleChapterSelect = (chapter: Chapter) => {
    setCurrentChapter(chapter);
    // loadQuestions 将由 QuestionGrid 的 useEffect 自动调用
  };

  // 获取章节统计信息
  const getChapterStats = (chapter: Chapter) => {
    const chapterQuestions = questions.filter(q => 
      chapter.questionIds.includes(q.id)
    );
    return calculateStudyStats(chapterQuestions);
  };

  if (!currentBank) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Text type="secondary">请先选择题库</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>
          {currentBank.name}
        </Title>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          章节列表
        </Text>
        <div style={{ marginTop: '12px' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddChapter}
            size="small"
            block
          >
            新建章节
          </Button>
        </div>
      </div>

      <List
        loading={isChapterLoading}
        dataSource={chapters}
        renderItem={(chapter) => {
          const stats = getChapterStats(chapter);
          const progress = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
          
          return (
            <List.Item style={{ padding: '8px 0' }}>
              <Card
                size="small"
                hoverable
                className={currentChapter?.id === chapter.id ? 'selected-chapter' : ''}
                onClick={() => handleChapterSelect(chapter)}
                style={{ 
                  width: '100%',
                  border: currentChapter?.id === chapter.id ? '2px solid #1890ff' : '1px solid #d9d9d9'
                }}
                actions={[
                  <Tooltip title="编辑章节">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditChapter(chapter);
                      }}
                    />
                  </Tooltip>,
                  <Popconfirm
                    title="确定要删除这个章节吗？"
                    description="删除后将无法恢复，请谨慎操作。"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDeleteChapter(chapter.id);
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
                  avatar={<FolderOutlined style={{ fontSize: '20px', color: '#1890ff' }} />}
                  title={
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {chapter.name}
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {chapter.description || '暂无描述'}
                      </Text>
                      <br />
                      <div style={{ marginTop: '8px' }}>
                        <Space size="small">
                          <Tag color="blue" style={{ fontSize: '10px' }}>
                            共{stats.total}题
                          </Tag>
                          {stats.correct > 0 && (
                            <Tag color="green" style={{ fontSize: '10px' }}>
                              <CheckCircleOutlined /> {stats.correct}
                            </Tag>
                          )}
                          {stats.wrong > 0 && (
                            <Tag color="red" style={{ fontSize: '10px' }}>
                              <CloseCircleOutlined /> {stats.wrong}
                            </Tag>
                          )}
                        </Space>
                        {stats.total > 0 && (
                          <Progress 
                            percent={progress} 
                            size="small" 
                            style={{ marginTop: '4px' }}
                            strokeColor={{
                              '0%': '#108ee9',
                              '100%': '#87d068',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  }
                />
              </Card>
            </List.Item>
          );
        }}
        locale={{ emptyText: '暂无章节，请创建新章节' }}
      />

      {/* 新建/编辑章节模态框 */}
      <Modal
        title={editingChapter ? '编辑章节' : '新建章节'}
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
            label="章节名称"
            rules={[
              { required: true, message: '请输入章节名称' },
              { max: 50, message: '章节名称不能超过50个字符' }
            ]}
          >
            <Input placeholder="请输入章节名称" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="章节描述"
            rules={[
              { max: 200, message: '章节描述不能超过200个字符' }
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder="请输入章节描述（可选）" 
              showCount
              maxLength={200}
            />
          </Form.Item>
        </Form>
      </Modal>



      <style>{`
        .selected-chapter {
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
        
        .ant-progress-line {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default ChapterSidebar;
