import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, Space, Drawer } from 'antd';
import {
  MenuOutlined,
  HomeOutlined,
  BookOutlined,
  FileTextOutlined,
  EditOutlined,
  BarChartOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import QuestionBankSidebar from '../Sidebar/QuestionBankSidebar';
import ChapterSidebar from '../Sidebar/ChapterSidebar';
import QuestionGrid from '../Question/QuestionGrid';
import PerformanceMonitor from '../Performance/PerformanceMonitor';
import CustomTitleBar from './CustomTitleBar';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentBank, currentChapter } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // 检查是否在Electron环境中
    const checkElectron = () => {
      return typeof window !== 'undefined' && window.electronAPI;
    };

    setIsElectron(!!checkElectron());

    // 为Electron环境添加CSS类
    if (checkElectron()) {
      document.body.classList.add('electron-app');
    }
  }, []);

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/study',
      icon: <BookOutlined />,
      label: '背题模式',
    },
    {
      key: '/quick-study',
      icon: <EditOutlined />,
      label: '快刷模式',
    },
    {
      key: '/practice',
      icon: <EditOutlined />,
      label: '刷题模式',
    },
    {
      key: '/test',
      icon: <FileTextOutlined />,
      label: '测试模式',
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '统计分析',
    },
    {
      key: '/wrong-questions',
      icon: <ExclamationCircleOutlined />,
      label: '错题本',
    },
    {
      key: '/study-plan',
      icon: <CalendarOutlined />,
      label: '学习计划',
    },
    {
      key: '/smart-recommendation',
      icon: <BulbOutlined />,
      label: '智能推荐',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    setMobileMenuVisible(false);
  };

  const isHomePage = location.pathname === '/';
  const isSettingsPage = location.pathname === '/desktop-settings';

  // 调试信息
  console.log('MainLayout render:', {
    isHomePage,
    currentBank: currentBank ? { id: currentBank.id, name: currentBank.name } : null,
    currentChapter: currentChapter ? { id: currentChapter.id, name: currentChapter.name } : null,
    pathname: location.pathname
  });

  return (
    <Layout style={{ minHeight: '100vh' }} className={isElectron ? 'electron-layout' : ''}>
      {/* 自定义标题栏（仅在Electron中显示） */}
      {isElectron && <CustomTitleBar />}

      {/* 顶部导航栏 */}
      <Header className="main-header">
        <div className="header-content">
          <div className="header-left">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuVisible(true)}
              className="mobile-menu-trigger"
            />
            <Title level={3} style={{ margin: 0, color: 'white' }}>
              workbook
            </Title>
          </div>
          
          <div className="header-center">
            <Menu
              theme="dark"
              mode="horizontal"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={handleMenuClick}
              className="desktop-menu"
            />
          </div>

          <div className="header-right">
            <Space>
              {!isSettingsPage && (
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  style={{ color: 'white' }}
                  onClick={() => navigate('/desktop-settings')}
                >
                  设置
                </Button>
              )}
            </Space>
          </div>
        </div>
      </Header>

      <Layout className={collapsed ? 'sidebar-collapsed' : ''}>
        {/* 左侧功能导航栏 - 在所有页面都显示 */}
        <Sider
          width={240}
          className="function-sidebar"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="lg"
          collapsedWidth={64}
        >
          <div className="function-menu-container">
            <Menu
              mode="vertical"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={handleMenuClick}
              className="function-menu"
            />
          </div>
        </Sider>

        {/* 首页显示题库和章节选择 */}
        {isHomePage ? (
          <>
            {/* 中间题库列表 */}
            <Sider
              width={280}
              className="bank-sidebar"
              theme="light"
            >
              <QuestionBankSidebar />
            </Sider>

            {/* 右侧章节列表或题目网格 */}
            {currentBank ? (
              currentChapter ? (
                <Content className="main-content">
                  <QuestionGrid />
                </Content>
              ) : (
                <Sider
                  width={280}
                  className="chapter-sidebar"
                  theme="light"
                >
                  <ChapterSidebar />
                </Sider>
              )
            ) : (
              <Content className="main-content">
                <div className="empty-content">
                  <div className="empty-text">请选择题库</div>
                </div>
              </Content>
            )}
          </>
        ) : (
          /* 其他页面显示主要内容 */
          <Content className="page-content">
            {children}
          </Content>
        )}
      </Layout>

      {/* 移动端菜单抽屉 */}
      <Drawer
        title="菜单"
        placement="left"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        className="mobile-menu-drawer"
      >
        <Menu
          mode="vertical"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Drawer>

      {/* 性能监控 */}
      <PerformanceMonitor />
    </Layout>
  );
};

export default MainLayout;
