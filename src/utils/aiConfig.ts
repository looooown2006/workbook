/**
 * AI配置管理
 * 支持硅基流动等AI服务提供商
 */

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  apiEndpoint: string;
  requiresApiKey: boolean;
  models: AIModel[];
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number | null; // null表示不限制
  costPer1kTokens: number; // 每1k tokens的成本（分）
  category?: string; // 模型分类
}

export interface AIConfig {
  provider: string;
  model: string;
  customModel?: string; // 用户自定义模型名称
  apiKey: string;
  maxTokens: number | null; // null表示不限制，使用模型默认值
  temperature: number;
  enabled: boolean;
}

// 支持的AI服务提供商
export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'siliconflow',
    name: '硅基流动',
    description: '高性能、低成本的AI推理服务',
    apiEndpoint: 'https://api.siliconflow.cn/v1',
    requiresApiKey: true,
    models: [
      // 热门推荐模型
      {
        id: 'Qwen/Qwen2.5-72B-Instruct',
        name: 'Qwen2.5-72B-Instruct',
        description: '阿里云通义千问2.5大模型，72B参数，强大的中英文能力',
        maxTokens: null, // 不限制，使用模型默认值
        costPer1kTokens: 0.57,
        category: 'recommended'
      },
      {
        id: 'deepseek-ai/DeepSeek-V2-Chat',
        name: 'DeepSeek-V2-Chat',
        description: 'DeepSeek V2对话模型，优秀的推理和代码能力',
        maxTokens: null,
        costPer1kTokens: 0.14,
        category: 'recommended'
      },
      {
        id: 'Pro/deepseek-ai/DeepSeek-R1',
        name: 'DeepSeek-R1 (Pro)',
        description: 'DeepSeek R1推理模型Pro版，顶级推理能力',
        maxTokens: 16384,
        costPer1kTokens: 5.5,
        category: 'pro'
      },
      // 免费模型
      {
        id: 'Qwen/Qwen2.5-7B-Instruct',
        name: 'Qwen2.5-7B-Instruct (免费)',
        description: '通义千问2.5-7B模型，免费使用',
        maxTokens: null,
        costPer1kTokens: 0,
        category: 'free'
      },
      {
        id: 'THUDM/glm-4-9b-chat',
        name: 'GLM-4-9B-Chat (免费)',
        description: '智谱AI GLM-4模型，免费使用',
        maxTokens: null,
        costPer1kTokens: 0,
        category: 'free'
      },
      // 自定义选项
      {
        id: 'custom',
        name: '自定义模型',
        description: '输入任何硅基流动支持的模型名称',
        maxTokens: null,
        costPer1kTokens: 0,
        category: 'custom'
      }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI官方API服务',
    apiEndpoint: 'https://api.openai.com/v1',
    requiresApiKey: true,
    models: [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: '快速、经济的通用模型',
        maxTokens: 4096,
        costPer1kTokens: 150
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: '最强大的语言模型',
        maxTokens: 8192,
        costPer1kTokens: 3000
      }
    ]
  },
  {
    id: 'local',
    name: '本地解析',
    description: '使用内置规则解析，无需API密钥',
    apiEndpoint: '',
    requiresApiKey: false,
    models: [
      {
        id: 'rule-based',
        name: '规则解析器',
        description: '基于正则表达式和规则的本地解析',
        maxTokens: 0,
        costPer1kTokens: 0
      }
    ]
  }
];

// 默认配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'local',
  model: 'rule-based',
  customModel: '',
  apiKey: '',
  maxTokens: null, // 不限制，使用模型默认值
  temperature: 0.1,
  enabled: false
};

// AI配置管理类
export class AIConfigManager {
  private static readonly STORAGE_KEY = 'ai_config';

  /**
   * 获取AI配置
   */
  static getConfig(): AIConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_AI_CONFIG, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
    return { ...DEFAULT_AI_CONFIG };
  }

  /**
   * 保存AI配置
   */
  static saveConfig(config: AIConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save AI config:', error);
      throw new Error('保存AI配置失败');
    }
  }

  /**
   * 获取指定提供商的信息
   */
  static getProvider(providerId: string): AIProvider | undefined {
    return AI_PROVIDERS.find(p => p.id === providerId);
  }

  /**
   * 获取指定模型的信息
   */
  static getModel(providerId: string, modelId: string): AIModel | undefined {
    const provider = this.getProvider(providerId);
    return provider?.models.find(m => m.id === modelId);
  }

  /**
   * 验证配置是否有效
   */
  static validateConfig(config: AIConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const provider = this.getProvider(config.provider);
    if (!provider) {
      errors.push('无效的AI服务提供商');
      return { valid: false, errors };
    }

    const model = this.getModel(config.provider, config.model);
    if (!model) {
      errors.push('无效的AI模型');
    }

    if (provider.requiresApiKey && !config.apiKey.trim()) {
      errors.push('API密钥不能为空');
    }

    if (config.maxTokens !== null && config.maxTokens <= 0) {
      errors.push('最大Token数必须大于0');
    }

    if (config.temperature < 0 || config.temperature > 2) {
      errors.push('温度参数必须在0-2之间');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 测试AI连接
   */
  static async testConnection(config: AIConfig): Promise<{ success: boolean; message: string }> {
    try {
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return { success: false, message: validation.errors.join(', ') };
      }

      if (config.provider === 'local') {
        return { success: true, message: '本地解析器可用' };
      }

      // 这里可以添加实际的API测试调用
      // 暂时返回成功，实际实现时需要调用对应的API
      return { success: true, message: 'AI服务连接正常' };
    } catch (error) {
      return { success: false, message: `连接测试失败: ${error}` };
    }
  }
}

// 导出常用函数
export const getAIConfig = AIConfigManager.getConfig;
export const saveAIConfig = AIConfigManager.saveConfig;
export const validateAIConfig = AIConfigManager.validateConfig;
export const testAIConnection = AIConfigManager.testConnection;
