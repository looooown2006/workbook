// Electron API 类型声明
declare global {
  interface Window {
    electronAPI?: {
      isMaximized: () => Promise<boolean>;
      minimizeWindow: () => void;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => void;
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
    };
    appDataAPI?: {
      getUserDataPath: () => string;
    };
    process?: {
      type?: string;
    };
  }
}

export {};
