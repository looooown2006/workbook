import React, { useState, useEffect } from 'react';
import { Button, Space } from 'antd';
import { MinusOutlined, BorderOutlined, CloseOutlined, CopyOutlined } from '@ant-design/icons';
import './CustomTitleBar.css';

interface CustomTitleBarProps {
  title?: string;
}

const CustomTitleBar: React.FC<CustomTitleBarProps> = ({ title = '刷题软件' }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // 检查是否在Electron环境中
    const checkElectron = () => {
      return typeof window !== 'undefined' && window.electronAPI;
    };
    
    setIsElectron(!!checkElectron());

    if (checkElectron()) {
      // 检查窗口是否最大化
      window.electronAPI?.isMaximized().then(setIsMaximized);
    }
  }, []);

  const handleMinimize = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.maximizeWindow().then(() => {
        // 切换最大化状态
        setIsMaximized(!isMaximized);
      });
    }
  };

  const handleClose = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  // 如果不是Electron环境，不显示标题栏
  if (!isElectron) {
    return null;
  }

  return (
    <div className="custom-title-bar">
      <div className="title-bar-drag-region">
        <div className="title-bar-title">
          {title}
        </div>
      </div>
      <div className="title-bar-controls">
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<MinusOutlined />}
            className="title-bar-button minimize-button"
            onClick={handleMinimize}
          />
          <Button
            type="text"
            size="small"
            icon={isMaximized ? <CopyOutlined /> : <BorderOutlined />}
            className="title-bar-button maximize-button"
            onClick={handleMaximize}
          />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            className="title-bar-button close-button"
            onClick={handleClose}
          />
        </Space>
      </div>
    </div>
  );
};

export default CustomTitleBar;
