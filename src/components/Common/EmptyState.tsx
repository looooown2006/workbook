import React from 'react';
import { Card, Button, Typography, Space, Divider } from 'antd';
import { 
  BookOutlined, 
  EditOutlined, 
  FileTextOutlined, 
  HomeOutlined,
  PlusOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

interface EmptyStateProps {
  mode: 'study' | 'practice' | 'test' | 'quick';
  title?: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ mode, title, description }) => {
  const navigate = useNavigate();

  const getModeConfig = () => {
    switch (mode) {
      case 'study':
        return {
          icon: <BookOutlined style={{ fontSize: '64px', color: '#52c41a' }} />,
          title: title || '背题模式',
          description: description || '在背题模式中，您可以查看答案和详细解析，适合记忆学习。',
          color: '#52c41a',
          bgColor: '#f6ffed'
        };
      case 'quick':
        return {
          icon: <EditOutlined style={{ fontSize: '64px', color: '#ff4d4f' }} />,
          title: title || '快刷模式',
          description: description || '在快刷模式中，您可以快速刷题并立即查看答案，适合快速复习。',
          color: '#ff4d4f',
          bgColor: '#fff2f0'
        };
      case 'practice':
        return {
          icon: <EditOutlined style={{ fontSize: '64px', color: '#1890ff' }} />,
          title: title || '刷题模式',
          description: description || '在刷题模式中，您需要先选择答案再查看结果，适合练习巩固。',
          color: '#1890ff',
          bgColor: '#f0f9ff'
        };
      case 'test':
        return {
          icon: <FileTextOutlined style={{ fontSize: '64px', color: '#faad14' }} />,
          title: title || '测试模式',
          description: description || '在测试模式中，模拟真实考试环境，完成后统一查看结果。',
          color: '#faad14',
          bgColor: '#fffbf0'
        };
      default:
        return {
          icon: <BookOutlined style={{ fontSize: '64px', color: '#1890ff' }} />,
          title: title || '学习模式',
          description: description || '请选择题库和章节开始学习。',
          color: '#1890ff',
          bgColor: '#f0f9ff'
        };
    }
  };

  const config = getModeConfig();

  return (
    <div style={{ 
      padding: '24px', 
      maxWidth: '800px', 
      margin: '0 auto',
      minHeight: 'calc(100vh - 200px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Card 
        style={{ 
          width: '100%',
          textAlign: 'center',
          backgroundColor: config.bgColor,
          border: `1px solid ${config.color}20`
        }}
      >
        <div style={{ padding: '40px 20px' }}>
          {/* 模式图标 */}
          <div style={{ marginBottom: '24px' }}>
            {config.icon}
          </div>

          {/* 标题 */}
          <Title level={2} style={{ color: config.color, marginBottom: '16px' }}>
            {config.title}
          </Title>

          {/* 描述 */}
          <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
            {config.description}
          </Paragraph>

          <Divider />

          {/* 提示信息 */}
          <div style={{ marginBottom: '32px' }}>
            <FolderOpenOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Title level={4} style={{ color: '#999', marginBottom: '8px' }}>
              请先选择题库和章节
            </Title>
            <Paragraph style={{ color: '#999' }}>
              您需要先在首页选择一个题库和章节，然后才能开始{config.title}。
            </Paragraph>
          </div>

          {/* 操作按钮 */}
          <Space size="large" wrap>
            <Button 
              type="primary" 
              size="large"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
              style={{ backgroundColor: config.color, borderColor: config.color }}
            >
              返回首页选择题库
            </Button>
            
            <Button 
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigate('/')}
            >
              创建新题库
            </Button>
          </Space>

          <Divider />

          {/* 功能说明 */}
          <div style={{ textAlign: 'left', marginTop: '32px' }}>
            <Title level={5} style={{ color: config.color }}>
              {config.title}特点：
            </Title>
            {mode === 'study' && (
              <ul style={{ color: '#666', paddingLeft: '20px' }}>
                <li>默认显示答案和详细解析</li>
                <li>支持标记已掌握题目</li>
                <li>手动控制学习进度</li>
                <li>适合深度记忆和理解学习</li>
              </ul>
            )}
            {mode === 'quick' && (
              <ul style={{ color: '#666', paddingLeft: '20px' }}>
                <li>点击选项后立即显示答案</li>
                <li>1秒后自动跳转下一题</li>
                <li>简化的答案反馈界面</li>
                <li>适合快速复习和刷题</li>
              </ul>
            )}
            {mode === 'practice' && (
              <ul style={{ color: '#666', paddingLeft: '20px' }}>
                <li>先选择答案再查看结果</li>
                <li>实时反馈正确与否</li>
                <li>错题自动加入错题本</li>
                <li>适合练习和巩固</li>
              </ul>
            )}
            {mode === 'test' && (
              <ul style={{ color: '#666', paddingLeft: '20px' }}>
                <li>模拟真实考试环境</li>
                <li>完成后统一查看结果</li>
                <li>详细的成绩统计分析</li>
                <li>适合检验学习效果</li>
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmptyState;
