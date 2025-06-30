import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Input,
  Switch,
  Button,
  Space,
  Alert,
  Divider,
  Typography,
  Slider,
  Tooltip,
  Spin,
  Tag,
  Row,
  Col,
  InputNumber,
  Radio,
  App
} from 'antd';
import {
  RobotOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import {
  AIConfig,
  AIConfigManager,
  AI_PROVIDERS,
  DEFAULT_AI_CONFIG
} from '../../utils/aiConfig';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Password } = Input;

const AISettings: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [config, setConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [maxTokensMode, setMaxTokensMode] = useState<'unlimited' | 'custom'>('unlimited');

  // 加载配置
  useEffect(() => {
    const savedConfig = AIConfigManager.getConfig();
    setConfig(savedConfig);
    setMaxTokensMode(savedConfig.maxTokens === null ? 'unlimited' : 'custom');
    form.setFieldsValue({
      ...savedConfig,
      maxTokensValue: savedConfig.maxTokens || 4096
    });
  }, [form]);

  // 获取当前选择的提供商和模型信息
  const currentProvider = AI_PROVIDERS.find(p => p.id === config.provider);
  const currentModel = currentProvider?.models.find(m => m.id === config.model);

  // 处理配置变更
  const handleConfigChange = (changedFields: any, allFields: any) => {
    const newConfig = { ...config, ...allFields };
    setConfig(newConfig);

    // 如果切换了提供商，重置模型选择
    if (changedFields.provider && changedFields.provider !== config.provider) {
      const newProvider = AI_PROVIDERS.find(p => p.id === changedFields.provider);
      if (newProvider && newProvider.models.length > 0) {
        const defaultModel = newProvider.models[0].id;
        form.setFieldValue('model', defaultModel);
        setConfig(prev => ({ ...prev, provider: changedFields.provider, model: defaultModel }));
      }
    }
  };

  // 保存配置
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      // 处理maxTokens
      const processedValues = {
        ...values,
        maxTokens: maxTokensMode === 'unlimited' ? null : values.maxTokensValue || values.maxTokens,
        customModel: values.model === 'custom' ? values.customModel : ''
      };

      // 移除临时字段
      delete processedValues.maxTokensValue;

      const newConfig = { ...config, ...processedValues };



      const validation = AIConfigManager.validateConfig(newConfig);
      if (!validation.valid) {
        message.error(validation.errors.join(', '));
        return;
      }

      AIConfigManager.saveConfig(newConfig);
      setConfig(newConfig);
      message.success('AI配置保存成功');
    } catch (error) {
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试连接
  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      
      const values = await form.validateFields();
      const testConfig = { ...config, ...values };
      
      const result = await AIConfigManager.testConnection(testConfig);
      setTestResult(result);
      
      if (result.success) {
        message.success('连接测试成功');
      } else {
        message.error('连接测试失败');
      }
    } catch (error) {
      setTestResult({ success: false, message: `测试失败: ${error}` });
      message.error('连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  // 重置配置
  const handleReset = () => {
    setConfig(DEFAULT_AI_CONFIG);
    form.setFieldsValue(DEFAULT_AI_CONFIG);
    setTestResult(null);
    message.info('配置已重置');
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={4}>
            <RobotOutlined style={{ marginRight: '8px' }} />
            AI智能解析配置
          </Title>
          <Paragraph type="secondary">
            配置AI服务来增强题目解析能力，支持识别各种复杂格式的题目文本。
          </Paragraph>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={config}
          onValuesChange={handleConfigChange}
        >
          {/* 启用AI解析 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Text strong>启用AI智能解析</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                开启后将使用AI模型进行题目解析，提高识别准确率
              </Text>
            </div>
            <Form.Item
              name="enabled"
              valuePropName="checked"
              style={{ margin: 0 }}
            >
              <Switch />
            </Form.Item>
          </div>

          <Divider />

          {/* AI服务提供商 */}
          <Form.Item
            label="AI服务提供商"
            name="provider"
            rules={[{ required: true, message: '请选择AI服务提供商' }]}
          >
            <Select placeholder="选择AI服务提供商">
              {AI_PROVIDERS.map(provider => (
                <Option key={provider.id} value={provider.id}>
                  <div>
                    <Text strong>{provider.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {provider.description}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* AI模型 */}
          {currentProvider && (
            <>
              <Form.Item
                label="AI模型"
                name="model"
                rules={[{ required: true, message: '请选择AI模型' }]}
              >
                <Select
                  placeholder="选择AI模型"
                  onChange={(value) => {
                    if (value !== 'custom') {
                      form.setFieldValue('customModel', '');
                    }
                  }}
                >
                  {currentProvider.models
                    .filter(model => model.category !== 'custom')
                    .map(model => (
                    <Option key={model.id} value={model.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>{model.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {model.description}
                          </Text>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Tag color="blue">
                            {model.maxTokens ? `${model.maxTokens} tokens` : '不限制'}
                          </Tag>
                          {model.costPer1kTokens > 0 && (
                            <Tag color="orange">
                              ¥{(model.costPer1kTokens / 100).toFixed(3)}/1k tokens
                            </Tag>
                          )}
                          {model.costPer1kTokens === 0 && (
                            <Tag color="green">免费</Tag>
                          )}
                        </div>
                      </div>
                    </Option>
                  ))}
                  <Option key="custom" value="custom">
                    <div>
                      <Text strong>🔧 自定义模型</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        输入任何硅基流动支持的模型名称
                      </Text>
                    </div>
                  </Option>
                </Select>
              </Form.Item>

              {/* 自定义模型输入 */}
              {form.getFieldValue('model') === 'custom' && (
                <Form.Item
                  label="自定义模型名称"
                  name="customModel"
                  rules={[
                    { required: true, message: '请输入模型名称' },
                    {
                      pattern: /^[a-zA-Z0-9\-_\/\.]+$/,
                      message: '模型名称格式不正确，请使用英文、数字、连字符、下划线、斜杠和点'
                    }
                  ]}
                  extra={
                    <div>
                      <Text type="secondary">
                        请输入完整的模型名称，例如：
                      </Text>
                      <br />
                      <Text code>Qwen/Qwen2.5-72B-Instruct</Text>
                      <br />
                      <Text code>deepseek-ai/DeepSeek-V2-Chat</Text>
                      <br />
                      <Text code>Pro/deepseek-ai/DeepSeek-R1</Text>
                    </div>
                  }
                >
                  <Input
                    placeholder="例如：Qwen/Qwen2.5-72B-Instruct"
                    style={{ fontFamily: 'monospace' }}
                  />
                </Form.Item>
              )}
            </>
          )}

          {/* API密钥 */}
          {currentProvider?.requiresApiKey && (
            <Form.Item
              label={
                <Space>
                  API密钥
                  <Tooltip title="请到对应AI服务商官网获取API密钥">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
              name="apiKey"
              rules={[
                { required: config.enabled && currentProvider.requiresApiKey, message: '请输入API密钥' }
              ]}
            >
              <Password placeholder="请输入API密钥" />
            </Form.Item>
          )}

          {/* 高级设置 */}
          <Divider orientation="left">高级设置</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    最大Token数
                    <Tooltip title="控制单次请求的最大token数量。选择'不限制'将使用模型提供商的默认值">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
              >
                <Radio.Group
                  value={maxTokensMode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    setMaxTokensMode(mode);
                    if (mode === 'unlimited') {
                      form.setFieldValue('maxTokens', null);
                    } else {
                      form.setFieldValue('maxTokens', form.getFieldValue('maxTokensValue') || 4096);
                    }
                  }}
                  style={{ marginBottom: '12px' }}
                >
                  <Radio value="unlimited">不限制（推荐）</Radio>
                  <Radio value="custom">自定义</Radio>
                </Radio.Group>

                {maxTokensMode === 'custom' && (
                  <Form.Item
                    name="maxTokensValue"
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={256}
                      max={32768}
                      step={256}
                      style={{ width: '100%' }}
                      placeholder="输入最大Token数"
                      onChange={(value) => {
                        form.setFieldValue('maxTokens', value);
                      }}
                    />
                  </Form.Item>
                )}

                {maxTokensMode === 'unlimited' && (
                  <Alert
                    message="使用模型默认值"
                    description="将使用AI模型提供商的默认最大Token数设置，通常能获得最佳性能"
                    type="info"
                    showIcon
                    style={{ marginTop: '8px' }}
                  />
                )}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    温度参数
                    <Tooltip title="控制AI输出的随机性，0表示确定性输出，1表示更有创造性">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="temperature"
              >
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  marks={{
                    0: '0',
                    0.5: '0.5',
                    1: '1'
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 测试结果 */}
          {testResult && (
            <Alert
              type={testResult.success ? 'success' : 'error'}
              message={testResult.success ? '连接测试成功' : '连接测试失败'}
              description={testResult.message}
              style={{ marginBottom: '16px' }}
              icon={testResult.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            />
          )}

          {/* 操作按钮 */}
          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SettingOutlined />}
                loading={loading}
                onClick={handleSave}
              >
                保存配置
              </Button>
              <Button
                icon={<CheckCircleOutlined />}
                loading={testing}
                onClick={handleTest}
                disabled={!config.enabled || config.provider === 'local'}
              >
                测试连接
              </Button>
              <Button onClick={handleReset}>
                重置配置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AISettings;
