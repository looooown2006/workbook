import React from 'react';
import { Typography, Card, Row, Col, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  DesktopOutlined,
  SafetyOutlined,
  DashboardOutlined,
  CalendarOutlined,
  BulbOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useAppStore } from '../stores/useAppStore';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { setStudyMode } = useAppStore();

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>欢迎使用刷题软件</Title>
      <Paragraph>
        这是一个专为桌面端优化的刷题学习工具，支持多种学习模式和高级功能。
      </Paragraph>
      
      <Title level={3}>主要功能</Title>
      <Paragraph>
        <ul>
          <li><strong>题库管理</strong>：创建和管理多个题库，支持章节分类</li>
          <li><strong>题目导入</strong>：支持从文档和文本导入题目</li>
          <li><strong>快刷模式</strong>：快速刷题，立即查看答案和解析</li>
          <li><strong>背题模式</strong>：默认显示答案，适合记忆学习</li>
          <li><strong>测试模式</strong>：模拟考试环境，完成后统一查看结果</li>
          <li><strong>斩题功能</strong>：标记已掌握的题目，提高学习效率</li>
          <li><strong>统计分析</strong>：详细的学习数据和进度跟踪</li>
          <li><strong>错题本</strong>：自动收集错题，智能推荐复习内容</li>
          <li><strong>学习计划</strong>：制定个性化学习计划，跟踪进度</li>
          <li><strong>数据备份</strong>：本地和云端数据备份，保障学习数据安全</li>
        </ul>
      </Paragraph>

      {/* 桌面端功能卡片 */}
      <Title level={3}>桌面端专属功能</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/desktop-settings')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <DesktopOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '12px' }} />
            <Title level={4}>桌面功能</Title>
            <Paragraph>
              系统集成、快捷键、通知等桌面端专属功能
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/desktop-settings?tab=backup')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <SafetyOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '12px' }} />
            <Title level={4}>数据备份</Title>
            <Paragraph>
              自动备份、云同步、数据导入导出
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/desktop-settings?tab=performance')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <DashboardOutlined style={{ fontSize: '32px', color: '#faad14', marginBottom: '12px' }} />
            <Title level={4}>性能监控</Title>
            <Paragraph>
              实时监控应用性能，优化使用体验
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/desktop-settings?tab=study-plan')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <CalendarOutlined style={{ fontSize: '32px', color: '#722ed1', marginBottom: '12px' }} />
            <Title level={4}>学习计划</Title>
            <Paragraph>
              制定学习计划，设置提醒，跟踪进度
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/desktop-settings?tab=smart-recommendation')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <BulbOutlined style={{ fontSize: '32px', color: '#eb2f96', marginBottom: '12px' }} />
            <Title level={4}>智能推荐</Title>
            <Paragraph>
              基于错题分析的个性化学习推荐
            </Paragraph>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/wrong-questions')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <BookOutlined style={{ fontSize: '32px', color: '#f5222d', marginBottom: '12px' }} />
            <Title level={4}>错题本</Title>
            <Paragraph>
              错题收集、分类管理、复习模式
            </Paragraph>
          </Card>
        </Col>
      </Row>

      <Title level={3}>使用指南</Title>
      <Paragraph>
        <ol>
          <li>在左侧创建或选择题库</li>
          <li>在中间创建或选择章节</li>
          <li>在右侧查看题目网格，选择学习模式开始刷题</li>
          <li>使用星标功能标记已掌握的题目</li>
          <li>查看统计页面了解学习进度</li>
          <li>使用桌面端专属功能提升学习效率</li>
        </ol>
      </Paragraph>

      <Card style={{ marginTop: '24px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
        <Title level={4} style={{ color: '#52c41a' }}>💡 桌面端优势</Title>
        <Paragraph>
          • <strong>本地存储</strong>：数据存储在本地，访问速度更快，隐私更安全<br/>
          • <strong>系统集成</strong>：支持系统通知、托盘、快捷键等原生功能<br/>
          • <strong>性能优化</strong>：专为桌面端优化，支持大量题目和复杂操作<br/>
          • <strong>离线使用</strong>：无需网络连接，随时随地学习<br/>
          • <strong>数据备份</strong>：多种备份方式，确保学习数据安全
        </Paragraph>
        <Space>
          <Button type="primary" onClick={() => navigate('/desktop-settings')}>
            探索桌面功能
          </Button>
          <Button
            onClick={() => {
              setStudyMode('practice'); // 设置为刷题模式
              navigate('/study');       // 跳转到学习页面
            }}
          >
            开始刷题
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default HomePage;
