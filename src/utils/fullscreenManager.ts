/**
 * 全屏模式管理器
 * 处理全屏模式的检测、切换和样式调整
 */

export interface FullscreenState {
  isFullscreen: boolean;
  isSupported: boolean;
  element: Element | null;
}

export class FullscreenManager {
  private static instance: FullscreenManager;
  private listeners: Array<(state: FullscreenState) => void> = [];
  private currentState: FullscreenState = {
    isFullscreen: false,
    isSupported: false,
    element: null
  };

  static getInstance(): FullscreenManager {
    if (!FullscreenManager.instance) {
      FullscreenManager.instance = new FullscreenManager();
    }
    return FullscreenManager.instance;
  }

  constructor() {
    this.init();
  }

  /**
   * 初始化全屏管理器
   */
  private init(): void {
    // 检查浏览器支持
    this.currentState.isSupported = this.checkSupport();
    
    // 监听全屏状态变化
    this.addEventListeners();
    
    // 初始状态检查
    this.updateState();
    
    // 添加CSS类管理
    this.initCSSClasses();
  }

  /**
   * 检查浏览器是否支持全屏API
   */
  private checkSupport(): boolean {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }

  /**
   * 添加事件监听器
   */
  private addEventListeners(): void {
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];

    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateState();
      });
    });

    // 监听键盘事件（ESC键退出全屏）
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.currentState.isFullscreen) {
        this.exitFullscreen();
      }
    });
  }

  /**
   * 更新全屏状态
   */
  private updateState(): void {
    const fullscreenElement = 
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;

    this.currentState = {
      ...this.currentState,
      isFullscreen: !!fullscreenElement,
      element: fullscreenElement
    };

    // 更新CSS类
    this.updateCSSClasses();

    // 通知监听器
    this.notifyListeners();
  }

  /**
   * 初始化CSS类管理
   */
  private initCSSClasses(): void {
    // 确保body有必要的CSS类
    if (!document.body.classList.contains('fullscreen-capable')) {
      document.body.classList.add('fullscreen-capable');
    }
  }

  /**
   * 更新CSS类
   */
  private updateCSSClasses(): void {
    const body = document.body;
    const html = document.documentElement;

    if (this.currentState.isFullscreen) {
      body.classList.add('fullscreen-active');
      html.classList.add('fullscreen-active');
      
      // 添加特定的全屏样式
      this.applyFullscreenStyles();
    } else {
      body.classList.remove('fullscreen-active');
      html.classList.remove('fullscreen-active');
      
      // 移除全屏样式
      this.removeFullscreenStyles();
    }
  }

  /**
   * 应用全屏模式样式
   */
  private applyFullscreenStyles(): void {
    const style = document.getElementById('fullscreen-styles') || document.createElement('style');
    style.id = 'fullscreen-styles';
    style.textContent = `
      .fullscreen-active .main-header {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        z-index: 9999 !important;
        background: rgba(0, 21, 41, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        border-bottom: 1px solid rgba(24, 144, 255, 0.3) !important;
      }

      .fullscreen-active .function-sidebar {
        top: 64px !important;
        height: calc(100vh - 64px) !important;
        z-index: 9998 !important;
        background: rgba(0, 21, 41, 0.95) !important;
        backdrop-filter: blur(10px) !important;
      }

      .fullscreen-active .main-content,
      .fullscreen-active .page-content {
        margin-top: 64px !important;
        height: calc(100vh - 64px) !important;
        z-index: 1 !important;
      }

      .fullscreen-active .bank-sidebar,
      .fullscreen-active .chapter-sidebar {
        top: 64px !important;
        height: calc(100vh - 64px) !important;
        z-index: 100 !important;
        background: rgba(240, 242, 245, 0.95) !important;
        backdrop-filter: blur(10px) !important;
      }

      /* 全屏模式下的动画效果 */
      .fullscreen-active * {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }

      /* 全屏模式下隐藏滚动条 */
      .fullscreen-active::-webkit-scrollbar {
        display: none !important;
      }

      .fullscreen-active {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
      }
    `;

    if (!document.head.contains(style)) {
      document.head.appendChild(style);
    }
  }

  /**
   * 移除全屏模式样式
   */
  private removeFullscreenStyles(): void {
    const style = document.getElementById('fullscreen-styles');
    if (style) {
      style.remove();
    }
  }

  /**
   * 进入全屏模式
   */
  async enterFullscreen(element?: Element): Promise<boolean> {
    if (!this.currentState.isSupported) {
      console.warn('浏览器不支持全屏API');
      return false;
    }

    const targetElement = element || document.documentElement;

    try {
      if (targetElement.requestFullscreen) {
        await targetElement.requestFullscreen();
      } else if ((targetElement as any).webkitRequestFullscreen) {
        await (targetElement as any).webkitRequestFullscreen();
      } else if ((targetElement as any).mozRequestFullScreen) {
        await (targetElement as any).mozRequestFullScreen();
      } else if ((targetElement as any).msRequestFullscreen) {
        await (targetElement as any).msRequestFullscreen();
      }
      return true;
    } catch (error) {
      console.error('进入全屏模式失败:', error);
      return false;
    }
  }

  /**
   * 退出全屏模式
   */
  async exitFullscreen(): Promise<boolean> {
    if (!this.currentState.isFullscreen) {
      return true;
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      return true;
    } catch (error) {
      console.error('退出全屏模式失败:', error);
      return false;
    }
  }

  /**
   * 切换全屏模式
   */
  async toggleFullscreen(element?: Element): Promise<boolean> {
    if (this.currentState.isFullscreen) {
      return await this.exitFullscreen();
    } else {
      return await this.enterFullscreen(element);
    }
  }

  /**
   * 获取当前全屏状态
   */
  getState(): FullscreenState {
    return { ...this.currentState };
  }

  /**
   * 添加状态变化监听器
   */
  addListener(callback: (state: FullscreenState) => void): void {
    this.listeners.push(callback);
  }

  /**
   * 移除状态变化监听器
   */
  removeListener(callback: (state: FullscreenState) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('全屏状态监听器执行失败:', error);
      }
    });
  }

  /**
   * 检查元素是否在全屏模式下
   */
  isElementFullscreen(element: Element): boolean {
    return this.currentState.element === element;
  }

  /**
   * 获取全屏元素
   */
  getFullscreenElement(): Element | null {
    return this.currentState.element;
  }
}

// 导出单例实例
export const fullscreenManager = FullscreenManager.getInstance();
