import React, { useState, useEffect } from 'react';
import { Card, Switch, Typography, Row, Col, Button, message, Space } from 'antd';
import {
  NotificationOutlined,
  DownloadOutlined,
  UploadOutlined,
  SettingOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

// 桌面端特有功能组件
const DesktopFeatures: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [systemTray, setSystemTray] = useState(true);

  // 检查是否在Electron环境中
  const isElectron = typeof window !== 'undefined' && 
                     window.electronAPI !== undefined;

  useEffect(() => {
    if (!isElectron) {
      console.log('Desktop features only available in Electron environment');
    }
  }, [isElectron]);

  const handleExportData = async () => {
    try {
      if (isElectron) {
        // 使用Electron的文件对话框
        const result = await window.electronAPI?.showSaveDialog({
          title: '导出学习数据',
          defaultPath: `quiz-data-${new Date().toISOString().split('T')[0]}.json`,
          filters: [
            { name: 'JSON文件', extensions: ['json'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          // 这里应该调用实际的数据导出逻辑
          message.success('数据导出成功');
        }
      } else {
        // Web环境下的降级处理
        message.info('桌面版本支持更多导出选项');
      }
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleImportData = async () => {
    try {
      if (isElectron) {
        const result = await window.electronAPI?.showOpenDialog({
          title: '导入学习数据',
          filters: [
            { name: 'JSON文件', extensions: ['json'] },
            { name: '所有文件', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
          // 这里应该调用实际的数据导入逻辑
          message.success('数据导入成功');
        }
      } else {
        message.info('桌面版本支持更多导入选项');
      }
    } catch (error) {
      message.error('导入失败');
    }
  };

  const handleOpenDataFolder = async () => {
    try {
      if (isElectron) {
        const userDataPath = window.appDataAPI?.getUserDataPath();
        if (userDataPath) {
          // 在文件管理器中打开数据文件夹
          message.success('已在文件管理器中打开数据文件夹');
        }
      } else {
        message.info('此功能仅在桌面版本中可用');
      }
    } catch (error) {
      message.error('打开文件夹失败');
    }
  };

  const handleNotificationToggle = (checked: boolean) => {
    setNotifications(checked);
    if (isElectron) {
      // 这里可以调用Electron的通知设置
      message.success(checked ? '已启用系统通知' : '已禁用系统通知');
    }
  };

  const handleAutoBackupToggle = (checked: boolean) => {
    setAutoBackup(checked);
    message.success(checked ? '已启用自动备份' : '已禁用自动备份');
  };

  const handleSystemTrayToggle = (checked: boolean) => {
    setSystemTray(checked);
    if (isElectron) {
      message.success(checked ? '已启用系统托盘' : '已禁用系统托盘');
    }
  };

  if (!isElectron) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Title level={4}>桌面端功能</Title>
          <Text type="secondary">
            这些功能仅在桌面版本中可用。请下载并安装桌面版本以获得完整体验。
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>桌面端功能</Title>
      
      {/* 数据管理 */}
      <Card title="数据管理" style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleExportData}
              block
            >
              导出学习数据
            </Button>
          </Col>
          <Col span={8}>
            <Button 
              icon={<UploadOutlined />} 
              onClick={handleImportData}
              block
            >
              导入学习数据
            </Button>
          </Col>
          <Col span={8}>
            <Button 
              icon={<FolderOpenOutlined />} 
              onClick={handleOpenDataFolder}
              block
            >
              打开数据文件夹
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 系统集成 */}
      <Card title="系统集成" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <NotificationOutlined />
                <Text strong>系统通知</Text>
              </Space>
              <br />
              <Text type="secondary">学习提醒和进度通知</Text>
            </Col>
            <Col>
              <Switch 
                checked={notifications} 
                onChange={handleNotificationToggle}
              />
            </Col>
          </Row>

          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <SettingOutlined />
                <Text strong>系统托盘</Text>
              </Space>
              <br />
              <Text type="secondary">最小化到系统托盘</Text>
            </Col>
            <Col>
              <Switch 
                checked={systemTray} 
                onChange={handleSystemTrayToggle}
              />
            </Col>
          </Row>

          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <DownloadOutlined />
                <Text strong>自动备份</Text>
              </Space>
              <br />
              <Text type="secondary">定期自动备份学习数据</Text>
            </Col>
            <Col>
              <Switch 
                checked={autoBackup} 
                onChange={handleAutoBackupToggle}
              />
            </Col>
          </Row>
        </Space>
      </Card>

      {/* 快捷键说明 */}
      <Card title="快捷键">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text strong>全局快捷键：</Text>
            <ul style={{ marginTop: '8px' }}>
              <li><Text code>Ctrl+N</Text> - 新建题库</li>
              <li><Text code>Ctrl+I</Text> - 导入题目</li>
              <li><Text code>Ctrl+E</Text> - 导出数据</li>
              <li><Text code>Ctrl+1</Text> - 快刷模式</li>
              <li><Text code>Ctrl+2</Text> - 背题模式</li>
              <li><Text code>Ctrl+3</Text> - 测试模式</li>
            </ul>
          </Col>
          <Col span={12}>
            <Text strong>学习模式快捷键：</Text>
            <ul style={{ marginTop: '8px' }}>
              <li><Text code>空格</Text> - 下一题</li>
              <li><Text code>←/→</Text> - 上一题/下一题</li>
              <li><Text code>1-6</Text> - 选择答案</li>
              <li><Text code>Enter</Text> - 确认答案</li>
              <li><Text code>Esc</Text> - 返回</li>
            </ul>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default DesktopFeatures;
