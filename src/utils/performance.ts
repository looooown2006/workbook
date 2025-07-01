/**
 * 性能监控工具
 */

import React from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  bundleSize?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    renderTime: 0
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 记录页面加载时间
   */
  recordLoadTime(): void {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
      }
    }
  }

  /**
   * 记录组件渲染时间
   */
  recordRenderTime(startTime: number): void {
    this.metrics.renderTime = performance.now() - startTime;
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): number | undefined {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return undefined;
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * 打印性能报告
   */
  printReport(): void {
    const metrics = this.getMetrics();
    console.group('🚀 性能监控报告');
    console.log(`📊 页面加载时间: ${metrics.loadTime.toFixed(2)}ms`);
    console.log(`⚡ 渲染时间: ${metrics.renderTime.toFixed(2)}ms`);
    if (metrics.memoryUsage) {
      console.log(`💾 内存使用: ${metrics.memoryUsage.toFixed(2)}MB`);
    }
    console.groupEnd();
  }

  /**
   * 监控长任务
   */
  observeLongTasks(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // 超过50ms的任务
              console.warn(`⚠️ 检测到长任务: ${entry.duration.toFixed(2)}ms`);
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('长任务监控不支持:', error);
      }
    }
  }

  /**
   * 监控首次内容绘制(FCP)
   */
  observeFCP(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              console.log(`🎨 首次内容绘制(FCP): ${entry.startTime.toFixed(2)}ms`);
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('FCP监控不支持:', error);
      }
    }
  }

  /**
   * 启动性能监控
   */
  startMonitoring(): void {
    this.recordLoadTime();
    this.observeLongTasks();
    this.observeFCP();
    
    // 5秒后打印报告
    setTimeout(() => {
      this.printReport();
    }, 5000);
  }
}

/**
 * 性能计时器装饰器
 */
export function measurePerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = method.apply(this, args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const end = performance.now();
        console.log(`⏱️ ${propertyName} 执行时间: ${(end - start).toFixed(2)}ms`);
      });
    } else {
      const end = performance.now();
      console.log(`⏱️ ${propertyName} 执行时间: ${(end - start).toFixed(2)}ms`);
      return result;
    }
  };
  
  return descriptor;
}

/**
 * React组件性能监控Hook
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now();
  
  React.useEffect(() => {
    const endTime = performance.now();
    console.log(`🔧 ${componentName} 组件渲染时间: ${(endTime - startTime).toFixed(2)}ms`);
  }, [componentName, startTime]);
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

// 在开发环境下自动启动监控
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.startMonitoring();
}
