const { contextBridge, ipcRenderer } = require('electron');

// 检查是否在Electron环境中
if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
  console.log('Preload script running in Electron environment');
} else {
  console.warn('Preload script loaded in non-Electron environment');
}

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 文件对话框
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // 消息框
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // 应用控制
  restartApp: () => ipcRenderer.invoke('restart-app'),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  
  // 菜单事件监听
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action));
  },
  
  // 移除菜单事件监听
  removeMenuActionListener: () => {
    ipcRenderer.removeAllListeners('menu-action');
  },
  
  // 平台信息
  platform: process.platform,
  
  // 环境变量
  isDev: process.env.NODE_ENV === 'development'
});

// 暴露文件系统API（安全的）
contextBridge.exposeInMainWorld('fileAPI', {
  // 读取文件
  readFile: async (filePath) => {
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 写入文件
  writeFile: async (filePath, content) => {
    try {
      const fs = require('fs').promises;
      await fs.writeFile(filePath, content, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 检查文件是否存在
  fileExists: async (filePath) => {
    try {
      const fs = require('fs').promises;
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },
  
  // 创建目录
  createDirectory: async (dirPath) => {
    try {
      const fs = require('fs').promises;
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
});

// 暴露路径工具
contextBridge.exposeInMainWorld('pathAPI', {
  join: (...paths) => require('path').join(...paths),
  dirname: (path) => require('path').dirname(path),
  basename: (path) => require('path').basename(path),
  extname: (path) => require('path').extname(path),
  resolve: (...paths) => require('path').resolve(...paths)
});

// 暴露操作系统信息
contextBridge.exposeInMainWorld('osAPI', {
  platform: () => require('os').platform(),
  arch: () => require('os').arch(),
  homedir: () => require('os').homedir(),
  tmpdir: () => require('os').tmpdir()
});

// 安全的控制台日志
contextBridge.exposeInMainWorld('logAPI', {
  info: (message) => console.log('[INFO]', message),
  warn: (message) => console.warn('[WARN]', message),
  error: (message) => console.error('[ERROR]', message),
  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', message);
    }
  }
});

// 性能监控API
contextBridge.exposeInMainWorld('performanceAPI', {
  getMemoryUsage: () => {
    if (process.memoryUsage) {
      return process.memoryUsage();
    }
    return null;
  },
  
  getCPUUsage: () => {
    if (process.cpuUsage) {
      return process.cpuUsage();
    }
    return null;
  },
  
  mark: (name) => {
    if (performance.mark) {
      performance.mark(name);
    }
  },
  
  measure: (name, startMark, endMark) => {
    if (performance.measure) {
      performance.measure(name, startMark, endMark);
    }
  },
  
  getEntriesByType: (type) => {
    if (performance.getEntriesByType) {
      return performance.getEntriesByType(type);
    }
    return [];
  }
});

// 应用数据目录API
contextBridge.exposeInMainWorld('appDataAPI', {
  getUserDataPath: () => {
    const { app } = require('electron');
    return app.getPath('userData');
  },
  
  getDocumentsPath: () => {
    const { app } = require('electron');
    return app.getPath('documents');
  },
  
  getDownloadsPath: () => {
    const { app } = require('electron');
    return app.getPath('downloads');
  },
  
  getDesktopPath: () => {
    const { app } = require('electron');
    return app.getPath('desktop');
  }
});

// 网络状态API
contextBridge.exposeInMainWorld('networkAPI', {
  isOnline: () => navigator.onLine,
  
  onOnline: (callback) => {
    window.addEventListener('online', callback);
  },
  
  onOffline: (callback) => {
    window.addEventListener('offline', callback);
  },
  
  removeOnlineListener: (callback) => {
    window.removeEventListener('online', callback);
  },
  
  removeOfflineListener: (callback) => {
    window.removeEventListener('offline', callback);
  }
});

// 窗口控制API
contextBridge.exposeInMainWorld('windowAPI', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', (event, state) => callback(state));
  },
  
  removeWindowStateListener: () => {
    ipcRenderer.removeAllListeners('window-state-changed');
  }
});

// 主题API
contextBridge.exposeInMainWorld('themeAPI', {
  getSystemTheme: () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  
  onSystemThemeChange: (callback) => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => callback(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
});

// 安全检查：确保只在Electron环境中运行
if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
  console.log('Preload script loaded successfully');
} else {
  console.warn('Preload script loaded in non-Electron environment');
}
