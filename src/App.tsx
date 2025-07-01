import React, { useEffect } from 'react';
import { ConfigProvider, Layout, theme, App as AntdApp } from 'antd';
import { BrowserRouter, HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useAppStore } from './stores/useAppStore';
import { initDatabase } from './utils/database';

import MainLayout from './components/Layout/MainLayout';
import HomePage from './pages/HomePage';
import StudyPage from './pages/StudyPage';
import TestPage from './pages/TestPage';
import StatisticsPage from './pages/StatisticsPage';
import WrongQuestionBookPage from './pages/WrongQuestionBookPage';
import WrongQuestionStatsPage from './pages/WrongQuestionStatsPage';
import StudyPlanPage from './pages/StudyPlanPage';
import SmartRecommendationPage from './pages/SmartRecommendationPage';
import DesktopSettingsPage from './pages/DesktopSettingsPage';
import './App.css';

const { Content } = Layout;

function PendingRouteHandler() {
  const { pendingRoute, setPendingRoute, currentBank } = useAppStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (pendingRoute && currentBank) {
      navigate(pendingRoute);
      setPendingRoute(undefined);
    }
  }, [pendingRoute, currentBank, navigate, setPendingRoute]);
  return null;
}

function AppWithRouter() {
  // 检测是否在Electron环境中
  const isElectron = typeof window !== 'undefined' && window.electronAPI;
  const Router = isElectron ? HashRouter : BrowserRouter;
  return (
    <Router>
      <PendingRouteHandler />
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/study" element={<StudyPage />} />
          <Route path="/quick-study" element={<StudyPage />} />
          <Route path="/practice" element={<StudyPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/wrong-questions" element={<WrongQuestionBookPage />} />
          <Route path="/wrong-questions/stats" element={<WrongQuestionStatsPage />} />
          <Route path="/study-plan" element={<StudyPlanPage />} />
          <Route path="/smart-recommendation" element={<SmartRecommendationPage />} />
          <Route path="/desktop-settings" element={<DesktopSettingsPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

function App() {
  const { initializeApp, isLoading, error, setError, setStudyMode } = useAppStore();

  useEffect(() => {
    const init = async () => {
      try {
        console.log('开始初始化应用...');
        await initDatabase();
        console.log('数据库初始化完成');
        await initializeApp();
        console.log('应用初始化完成');

        // Electron环境下的额外初始化
        if (typeof window !== 'undefined' && window.electronAPI) {
          console.log('Running in Electron environment');
        }
      } catch (error) {
        console.error('App initialization failed:', error);
        setError && setError(`应用初始化失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    init();
  }, [initializeApp]);

  if (error) {
    return (
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
        }}
      >
        <AntdApp>
          <Layout style={{ minHeight: '100vh' }}>
            <Content style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '18px',
              color: '#ff4d4f'
            }}>
              {error}
            </Content>
          </Layout>
        </AntdApp>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <AntdApp>
        <AppWithRouter />
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
