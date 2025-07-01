/**
 * AI解析诊断工具
 * 用于诊断AI解析按钮无响应问题
 */

import { AIConfigManager, AIConfig } from './aiConfig';
import { message } from 'antd';

export interface DiagnosticResult {
  success: boolean;
  issues: string[];
  suggestions: string[];
  configStatus: {
    enabled: boolean;
    provider: string;
    model: string;
    hasApiKey: boolean;
    isValid: boolean;
  };
}

export class AIDiagnostics {
  
  /**
   * 运行完整的AI解析诊断
   */
  static async runDiagnostics(): Promise<DiagnosticResult> {
    const result: DiagnosticResult = {
      success: true,
      issues: [],
      suggestions: [],
      configStatus: {
        enabled: false,
        provider: '',
        model: '',
        hasApiKey: false,
        isValid: false
      }
    };

    try {
      // 1. 检查AI配置
      const configCheck = this.checkAIConfig();
      result.configStatus = configCheck.status;
      
      if (!configCheck.success) {
        result.success = false;
        result.issues.push(...configCheck.issues);
        result.suggestions.push(...configCheck.suggestions);
      }

      // 2. 检查网络连接
      if (configCheck.success) {
        const networkCheck = await this.checkNetworkConnection(configCheck.config!);
        if (!networkCheck.success) {
          result.success = false;
          result.issues.push(...networkCheck.issues);
          result.suggestions.push(...networkCheck.suggestions);
        }
      }

      // 3. 检查API密钥有效性
      if (configCheck.success && result.configStatus.hasApiKey) {
        const apiCheck = await this.checkAPIKey(configCheck.config!);
        if (!apiCheck.success) {
          result.success = false;
          result.issues.push(...apiCheck.issues);
          result.suggestions.push(...apiCheck.suggestions);
        }
      }

    } catch (error) {
      result.success = false;
      result.issues.push(`诊断过程中发生错误: ${error}`);
      result.suggestions.push('请检查浏览器控制台获取更多信息');
    }

    return result;
  }

  /**
   * 检查AI配置
   */
  private static checkAIConfig(): {
    success: boolean;
    issues: string[];
    suggestions: string[];
    config?: AIConfig;
    status: DiagnosticResult['configStatus'];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    try {
      const config = AIConfigManager.getConfig();
      const validation = AIConfigManager.validateConfig(config);
      
      const status = {
        enabled: config.enabled,
        provider: config.provider,
        model: config.model,
        hasApiKey: !!config.apiKey.trim(),
        isValid: validation.valid
      };

      if (!config.enabled) {
        issues.push('AI解析功能未启用');
        suggestions.push('请在设置中启用AI解析功能');
      }

      if (config.provider === 'local') {
        issues.push('当前使用本地解析模式');
        suggestions.push('请在设置中选择AI服务提供商（如硅基流动）');
      }

      if (!validation.valid) {
        issues.push(`AI配置无效: ${validation.errors.join(', ')}`);
        suggestions.push('请检查AI设置中的配置项');
      }

      return {
        success: config.enabled && config.provider !== 'local' && validation.valid,
        issues,
        suggestions,
        config,
        status
      };

    } catch (error) {
      issues.push(`读取AI配置失败: ${error}`);
      suggestions.push('请尝试重新配置AI设置');
      
      return {
        success: false,
        issues,
        suggestions,
        status: {
          enabled: false,
          provider: '',
          model: '',
          hasApiKey: false,
          isValid: false
        }
      };
    }
  }

  /**
   * 检查网络连接
   */
  private static async checkNetworkConnection(config: AIConfig): Promise<{
    success: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const provider = AIConfigManager.getProvider(config.provider);
      if (!provider) {
        issues.push('无效的AI服务提供商');
        return { success: false, issues, suggestions };
      }

      // 测试网络连接（简单的HEAD请求）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(provider.apiEndpoint, {
          method: 'HEAD',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok && response.status !== 404) {
          issues.push(`无法连接到AI服务: ${response.status}`);
          suggestions.push('请检查网络连接或稍后重试');
          return { success: false, issues, suggestions };
        }

      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          issues.push('连接AI服务超时');
          suggestions.push('请检查网络连接或稍后重试');
        } else {
          issues.push(`网络连接失败: ${fetchError}`);
          suggestions.push('请检查网络连接和防火墙设置');
        }
        return { success: false, issues, suggestions };
      }

      return { success: true, issues, suggestions };

    } catch (error) {
      issues.push(`网络检查失败: ${error}`);
      suggestions.push('请检查网络连接');
      return { success: false, issues, suggestions };
    }
  }

  /**
   * 检查API密钥有效性
   */
  private static async checkAPIKey(config: AIConfig): Promise<{
    success: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const provider = AIConfigManager.getProvider(config.provider);
      if (!provider) {
        issues.push('无效的AI服务提供商');
        return { success: false, issues, suggestions };
      }

      // 发送一个简单的测试请求
      const testRequest = {
        model: config.model === 'custom' ? config.customModel : config.model,
        messages: [
          {
            role: 'user',
            content: 'test'
          }
        ],
        max_tokens: 1
      };

      const response = await fetch(`${provider.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(testRequest)
      });

      if (response.status === 401) {
        issues.push('API密钥无效或已过期');
        suggestions.push('请检查API密钥是否正确');
        return { success: false, issues, suggestions };
      }

      if (response.status === 403) {
        issues.push('API密钥权限不足');
        suggestions.push('请检查API密钥是否有足够的权限');
        return { success: false, issues, suggestions };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        issues.push(`API测试失败: ${response.status} ${errorData.error?.message || response.statusText}`);
        suggestions.push('请检查API配置或联系服务提供商');
        return { success: false, issues, suggestions };
      }

      return { success: true, issues, suggestions };

    } catch (error) {
      issues.push(`API密钥验证失败: ${error}`);
      suggestions.push('请检查API配置和网络连接');
      return { success: false, issues, suggestions };
    }
  }

  /**
   * 显示诊断结果
   */
  static showDiagnosticResults(result: DiagnosticResult): void {
    if (result.success) {
      message.success('AI解析配置正常，可以正常使用');
    } else {
      const issueText = result.issues.join('\n');
      const suggestionText = result.suggestions.join('\n');
      
      message.error({
        content: `发现问题: ${issueText}\n建议解决方案: ${suggestionText}`,
        duration: 10
      });
    }
  }

  /**
   * 快速修复常见问题
   */
  static async quickFix(): Promise<boolean> {
    try {
      const config = AIConfigManager.getConfig();
      
      // 如果AI未启用，自动启用
      if (!config.enabled) {
        config.enabled = true;
        AIConfigManager.saveConfig(config);
        message.info('已自动启用AI解析功能');
        return true;
      }

      // 如果使用本地解析，提示用户配置AI服务
      if (config.provider === 'local') {
        message.warning('请在设置中配置AI服务提供商');
        return false;
      }

      return true;
    } catch (error) {
      message.error(`快速修复失败: ${error}`);
      return false;
    }
  }
}
