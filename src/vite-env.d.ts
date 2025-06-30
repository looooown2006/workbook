/// <reference types="vite/client" />

// Electron API类型定义
interface ElectronAPI {
  // 应用信息
  getAppVersion: () => Promise<string>;

  // 文件对话框
  showSaveDialog: (options: any) => Promise<any>;
  showOpenDialog: (options: any) => Promise<any>;

  // 消息框
  showMessageBox: (options: any) => Promise<any>;

  // 应用控制
  restartApp: () => Promise<void>;

  // 窗口控制
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // 菜单事件监听
  onMenuAction: (callback: (action: string) => void) => void;
  removeMenuActionListener: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
