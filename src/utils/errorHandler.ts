/**
 * 统一的错误处理工具
 * 用于处理各种错误情况并提供用户友好的错误信息
 */

import { message } from 'antd';

/**
 * 错误类型常量
 */
export const ErrorType = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: string;
  code?: string | number;
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  /**
   * 处理错误并显示用户友好的消息
   */
  static handle(error: unknown, context?: string): ErrorInfo {
    const errorInfo = this.parseError(error);
    
    // 记录错误到控制台（开发环境）
    if (import.meta.env.DEV) {
      console.error(`[${context || 'Unknown'}] Error:`, error);
    }
    
    // 显示用户友好的错误消息
    this.showUserMessage(errorInfo, context);
    
    return errorInfo;
  }

  /**
   * 解析错误对象
   */
  private static parseError(error: unknown): ErrorInfo {
    if (error instanceof Error) {
      return this.parseErrorObject(error);
    }
    
    if (typeof error === 'string') {
      return {
        type: ErrorType.UNKNOWN,
        message: error
      };
    }
    
    return {
      type: ErrorType.UNKNOWN,
      message: '发生了未知错误'
    };
  }

  /**
   * 解析Error对象
   */
  private static parseErrorObject(error: Error): ErrorInfo {
    const message = error.message.toLowerCase();
    
    // 网络错误
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return {
        type: ErrorType.NETWORK,
        message: '网络连接失败，请检查网络设置',
        details: error.message
      };
    }
    
    // 权限错误
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        type: ErrorType.PERMISSION,
        message: '权限不足，请检查相关设置',
        details: error.message
      };
    }
    
    // 验证错误
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        type: ErrorType.VALIDATION,
        message: '数据验证失败，请检查输入内容',
        details: error.message
      };
    }
    
    // 404错误
    if (message.includes('not found') || message.includes('404')) {
      return {
        type: ErrorType.NOT_FOUND,
        message: '请求的资源不存在',
        details: error.message
      };
    }
    
    // 服务器错误
    if (message.includes('server') || message.includes('500') || message.includes('503')) {
      return {
        type: ErrorType.SERVER,
        message: '服务器错误，请稍后重试',
        details: error.message
      };
    }
    
    return {
      type: ErrorType.CLIENT,
      message: error.message || '操作失败',
      details: error.stack
    };
  }

  /**
   * 显示用户消息
   */
  private static showUserMessage(errorInfo: ErrorInfo, context?: string): void {
    const contextPrefix = context ? `${context}: ` : '';
    
    switch (errorInfo.type) {
      case ErrorType.NETWORK:
        message.error(`${contextPrefix}${errorInfo.message}`);
        break;
      case ErrorType.VALIDATION:
        message.warning(`${contextPrefix}${errorInfo.message}`);
        break;
      case ErrorType.PERMISSION:
        message.error(`${contextPrefix}${errorInfo.message}`);
        break;
      case ErrorType.NOT_FOUND:
        message.warning(`${contextPrefix}${errorInfo.message}`);
        break;
      case ErrorType.SERVER:
        message.error(`${contextPrefix}${errorInfo.message}`);
        break;
      default:
        message.error(`${contextPrefix}${errorInfo.message}`);
    }
  }

  /**
   * 静默处理错误（不显示消息）
   */
  static handleSilently(error: unknown, context?: string): ErrorInfo {
    const errorInfo = this.parseError(error);
    
    // 只记录错误到控制台
    if (import.meta.env.DEV) {
      console.error(`[${context || 'Unknown'}] Silent Error:`, error);
    }
    
    return errorInfo;
  }

  /**
   * 检查是否为网络错误
   */
  static isNetworkError(error: unknown): boolean {
    const errorInfo = this.parseError(error);
    return errorInfo.type === ErrorType.NETWORK;
  }

  /**
   * 检查是否为验证错误
   */
  static isValidationError(error: unknown): boolean {
    const errorInfo = this.parseError(error);
    return errorInfo.type === ErrorType.VALIDATION;
  }

  /**
   * 创建自定义错误
   */
  static createError(type: ErrorType, message: string, details?: string): ErrorInfo {
    return {
      type,
      message,
      details
    };
  }
}

/**
 * 便捷的错误处理函数
 */
export const handleError = (error: unknown, context?: string): ErrorInfo => {
  return ErrorHandler.handle(error, context);
};

export const handleSilentError = (error: unknown, context?: string): ErrorInfo => {
  return ErrorHandler.handleSilently(error, context);
};

/**
 * 异步操作错误处理装饰器
 */
export const withErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      return null;
    }
  };
};

/**
 * 同步操作错误处理装饰器
 */
export const withSyncErrorHandling = <T extends unknown[], R>(
  fn: (...args: T) => R,
  context?: string
) => {
  return (...args: T): R | null => {
    try {
      return fn(...args);
    } catch (error) {
      handleError(error, context);
      return null;
    }
  };
};
