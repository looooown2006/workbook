import React, { useState, useEffect } from 'react';
import { Layout, Button, Typography, Space } from 'antd';
import {
  SettingOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { fullscreenManager, FullscreenState } from '../../utils/fullscreenManager';
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

  const [isElectron, setIsElectron] = useState(false);
  const [fullscreenState, setFullscreenState] = useState<FullscreenState>(fullscreenManager.getState());

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

    // 监听全屏状态变化
    const handleFullscreenChange = (state: FullscreenState) => {
      setFullscreenState(state);
      console.log('全屏状态变化:', state);
    };

    fullscreenManager.addListener(handleFullscreenChange);

    // 清理函数
    return () => {
      fullscreenManager.removeListener(handleFullscreenChange);
    };
  }, []);



  const isHomePage = location.pathname === '/' && !currentBank;
  const isHomeRoute = location.pathname === '/home';
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

            <Title level={3} style={{ margin: 0, color: 'white' }}>
              workbook
            </Title>
          </div>
          


          <div className="header-right">
            <Space>
              {/* 全屏切换按钮 */}
              {fullscreenState.isSupported && (
                <Button
                  type="text"
                  icon={fullscreenState.isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  style={{ color: 'white' }}
                  onClick={() => fullscreenManager.toggleFullscreen()}
                  title={fullscreenState.isFullscreen ? '退出全屏' : '进入全屏'}
                >
                  {fullscreenState.isFullscreen ? '退出全屏' : '全屏'}
                </Button>
              )}

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

      <Layout>
        {/* 固定题库侧边栏 */}
        {isHomePage && <QuestionBankSidebar />}

        {/* 首页显示题库和章节选择，/home路径显示HomePage组件 */}
        {isHomePage ? (
          <>
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
                  style={{ marginLeft: '280px' }}
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
        ) : isHomeRoute ? (
          /* /home路径显示HomePage组件 */
          <Content className="page-content">
            {children}
          </Content>
        ) : (
          /* 其他页面显示主要内容 */
          <Content className="page-content">
            {children}
          </Content>
        )}
      </Layout>



      {/* 性能监控 */}
      <PerformanceMonitor />
    </Layout>
  );
};

export default MainLayout;
