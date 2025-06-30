import React, { useState, useEffect } from 'react';
import { Tabs, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import {
  SettingOutlined,
  SafetyOutlined,
  DashboardOutlined,
  DesktopOutlined,
  RobotOutlined
} from '@ant-design/icons';
import DesktopFeatures from '../components/Desktop/DesktopFeatures';
import DataBackup from '../components/Desktop/DataBackup';
import PerformanceMonitor from '../components/Performance/PerformanceMonitor';
import AISettings from '../components/Settings/AISettings';

const { Title } = Typography;
const { TabPane } = Tabs;

const DesktopSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('features');
  const location = useLocation();

  useEffect(() => {
    // 从URL参数中获取要显示的标签页
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: '8px' }} />
          网页端设置
        </Title>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        type="card"
        size="large"
      >
        <TabPane
          tab={
            <span>
              <SettingOutlined />
              基本设置
            </span>
          }
          key="features"
        >
          <DesktopFeatures />
        </TabPane>

        <TabPane
          tab={
            <span>
              <RobotOutlined />
              AI配置
            </span>
          }
          key="ai-settings"
        >
          <AISettings />
        </TabPane>

        <TabPane
          tab={
            <span>
              <SafetyOutlined />
              数据备份
            </span>
          }
          key="backup"
        >
          <DataBackup />
        </TabPane>

        <TabPane
          tab={
            <span>
              <DashboardOutlined />
              性能监控
            </span>
          }
          key="performance"
        >
          <div style={{ position: 'relative' }}>
            <PerformanceMonitor />
            <div style={{ marginTop: '100px' }}>
              {/* 这里可以添加更多性能相关的设置 */}
            </div>
          </div>
        </TabPane>


      </Tabs>
    </div>
  );
};

export default DesktopSettingsPage;
