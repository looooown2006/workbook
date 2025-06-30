import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  List,
  Progress,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Alert,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  message,
  Tooltip,
  Tag
} from 'antd';
import {
  CloudUploadOutlined,
  CloudDownloadOutlined,
  HistoryOutlined,
  SettingOutlined,
  DeleteOutlined,
  SyncOutlined,
  SafetyOutlined,
  FolderOpenOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../stores/useAppStore';
import { formatDate, formatFileSize } from '../../utils/helpers';

const { Title, Text } = Typography;
const { Option } = Select;

interface BackupRecord {
  id: string;
  name: string;
  size: number;
  createdTime: Date;
  type: 'manual' | 'auto';
  status: 'success' | 'failed' | 'in_progress';
  description?: string;
}

interface BackupSettings {
  autoBackup: boolean;
  backupInterval: 'daily' | 'weekly' | 'monthly';
  maxBackups: number;
  includeStats: boolean;
  includeSettings: boolean;
  cloudSync: boolean;
  cloudProvider?: 'local' | 'onedrive' | 'googledrive';
}

const DataBackup: React.FC = () => {
  const { questionBanks, wrongQuestions, userStats } = useAppStore();
  
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackup: false,
    backupInterval: 'weekly',
    maxBackups: 10,
    includeStats: true,
    includeSettings: true,
    cloudSync: false,
    cloudProvider: 'local'
  });
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadBackupRecords();
    loadBackupSettings();
  }, []);

  const loadBackupRecords = async () => {
    // 模拟加载备份记录
    const mockRecords: BackupRecord[] = [
      {
        id: '1',
        name: '自动备份_2024-01-15',
        size: 2048576, // 2MB
        createdTime: new Date('2024-01-15T10:30:00'),
        type: 'auto',
        status: 'success',
        description: '包含题库、错题记录和学习统计'
      },
      {
        id: '2',
        name: '手动备份_期末复习前',
        size: 1536000, // 1.5MB
        createdTime: new Date('2024-01-10T14:20:00'),
        type: 'manual',
        status: 'success',
        description: '期末考试前的完整备份'
      }
    ];
    setBackupRecords(mockRecords);
  };

  const loadBackupSettings = async () => {
    // 从本地存储加载设置
    const savedSettings = localStorage.getItem('backupSettings');
    if (savedSettings) {
      setBackupSettings(JSON.parse(savedSettings));
    }
  };

  const saveBackupSettings = (settings: BackupSettings) => {
    setBackupSettings(settings);
    localStorage.setItem('backupSettings', JSON.stringify(settings));
    message.success('备份设置已保存');
  };

  const handleCreateBackup = async (name?: string) => {
    setIsBackingUp(true);
    try {
      // 收集要备份的数据
      const backupData = {
        questionBanks: backupSettings.includeStats ? questionBanks : [],
        wrongQuestions: wrongQuestions,
        userStats: backupSettings.includeStats ? userStats : null,
        settings: backupSettings.includeSettings ? backupSettings : null,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      // 模拟备份过程
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newBackup: BackupRecord = {
        id: Date.now().toString(),
        name: name || `手动备份_${new Date().toLocaleDateString()}`,
        size: JSON.stringify(backupData).length,
        createdTime: new Date(),
        type: name ? 'manual' : 'auto',
        status: 'success',
        description: '完整数据备份'
      };

      setBackupRecords([newBackup, ...backupRecords]);
      message.success('备份创建成功');

      // 如果启用了云同步，上传到云端
      if (backupSettings.cloudSync) {
        await handleCloudSync(newBackup);
      }

    } catch (error) {
      message.error('备份创建失败');
      console.error('Backup failed:', error);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    Modal.confirm({
      title: '确认恢复备份',
      content: '恢复备份将覆盖当前所有数据，此操作不可撤销。确定要继续吗？',
      okText: '确认恢复',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setIsRestoring(true);
        try {
          // 模拟恢复过程
          await new Promise(resolve => setTimeout(resolve, 3000));
          message.success('数据恢复成功，请重启应用以生效');
        } catch (error) {
          message.error('数据恢复失败');
        } finally {
          setIsRestoring(false);
        }
      }
    });
  };

  const handleDeleteBackup = (backupId: string) => {
    Modal.confirm({
      title: '确认删除备份',
      content: '删除后无法恢复，确定要删除这个备份吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setBackupRecords(backupRecords.filter(record => record.id !== backupId));
        message.success('备份已删除');
      }
    });
  };

  const handleCloudSync = async (backup: BackupRecord) => {
    try {
      // 模拟云同步
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('已同步到云端');
    } catch (error) {
      message.error('云同步失败');
    }
  };

  const handleExportBackup = async (backupId: string) => {
    try {
      // 模拟导出过程
      const backup = backupRecords.find(r => r.id === backupId);
      if (!backup) return;

      // 在实际应用中，这里会调用Electron的文件保存对话框
      message.success(`备份 "${backup.name}" 已导出`);
    } catch (error) {
      message.error('导出失败');
    }
  };

  const handleImportBackup = async () => {
    try {
      // 在实际应用中，这里会调用Electron的文件选择对话框
      message.success('备份导入成功');
      loadBackupRecords(); // 重新加载备份列表
    } catch (error) {
      message.error('导入失败');
    }
  };

  const handleSettingsSubmit = async () => {
    try {
      const values = await form.validateFields();
      saveBackupSettings(values);
      setSettingsModalVisible(false);
    } catch (error) {
      console.error('Settings validation failed:', error);
    }
  };

  const getStatusColor = (status: BackupRecord['status']) => {
    switch (status) {
      case 'success': return 'green';
      case 'failed': return 'red';
      case 'in_progress': return 'blue';
      default: return 'default';
    }
  };

  const getStatusText = (status: BackupRecord['status']) => {
    switch (status) {
      case 'success': return '成功';
      case 'failed': return '失败';
      case 'in_progress': return '进行中';
      default: return '未知';
    }
  };

  const totalBackupSize = backupRecords.reduce((sum, record) => sum + record.size, 0);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <SafetyOutlined style={{ marginRight: '8px' }} />
              数据备份
            </Title>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ImportOutlined />} 
                onClick={handleImportBackup}
              >
                导入备份
              </Button>
              <Button 
                icon={<SettingOutlined />} 
                onClick={() => {
                  form.setFieldsValue(backupSettings);
                  setSettingsModalVisible(true);
                }}
              >
                备份设置
              </Button>
              <Button 
                type="primary" 
                icon={<CloudUploadOutlined />} 
                loading={isBackingUp}
                onClick={() => handleCreateBackup()}
              >
                立即备份
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 备份统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="备份总数"
              value={backupRecords.length}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="占用空间"
              value={formatFileSize(totalBackupSize)}
              prefix={<FolderOpenOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="云同步状态"
              value={backupSettings.cloudSync ? '已启用' : '未启用'}
              valueStyle={{ 
                color: backupSettings.cloudSync ? '#3f8600' : '#cf1322' 
              }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 自动备份状态 */}
      {backupSettings.autoBackup && (
        <Alert
          message="自动备份已启用"
          description={`系统将每${backupSettings.backupInterval === 'daily' ? '天' : 
                                   backupSettings.backupInterval === 'weekly' ? '周' : '月'}自动创建备份`}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 备份列表 */}
      <Card title="备份记录">
        <List
          dataSource={backupRecords}
          renderItem={(record) => (
            <List.Item
              actions={[
                <Tooltip title="恢复备份">
                  <Button
                    type="text"
                    icon={<CloudDownloadOutlined />}
                    loading={isRestoring}
                    onClick={() => handleRestoreBackup(record.id)}
                  />
                </Tooltip>,
                <Tooltip title="导出备份">
                  <Button
                    type="text"
                    icon={<ExportOutlined />}
                    onClick={() => handleExportBackup(record.id)}
                  />
                </Tooltip>,
                <Tooltip title="删除备份">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteBackup(record.id)}
                  />
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{record.name}</Text>
                    <Tag color={getStatusColor(record.status)}>
                      {getStatusText(record.status)}
                    </Tag>
                    <Tag color={record.type === 'auto' ? 'blue' : 'green'}>
                      {record.type === 'auto' ? '自动' : '手动'}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <div>{record.description}</div>
                    <Space style={{ marginTop: '4px' }}>
                      <Text type="secondary">
                        {formatDate(record.createdTime)}
                      </Text>
                      <Text type="secondary">
                        {formatFileSize(record.size)}
                      </Text>
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 备份设置模态框 */}
      <Modal
        title="备份设置"
        open={settingsModalVisible}
        onOk={handleSettingsSubmit}
        onCancel={() => setSettingsModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="autoBackup" label="自动备份" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.autoBackup !== currentValues.autoBackup
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('autoBackup') ? (
                <Form.Item name="backupInterval" label="备份频率">
                  <Select>
                    <Option value="daily">每天</Option>
                    <Option value="weekly">每周</Option>
                    <Option value="monthly">每月</Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="maxBackups" label="最大备份数量">
            <Select>
              <Option value={5}>5个</Option>
              <Option value={10}>10个</Option>
              <Option value={20}>20个</Option>
              <Option value={50}>50个</Option>
            </Select>
          </Form.Item>

          <Form.Item name="includeStats" label="包含学习统计" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="includeSettings" label="包含应用设置" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="cloudSync" label="云同步" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.cloudSync !== currentValues.cloudSync
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('cloudSync') ? (
                <Form.Item name="cloudProvider" label="云服务提供商">
                  <Select>
                    <Option value="local">本地网络</Option>
                    <Option value="onedrive">OneDrive</Option>
                    <Option value="googledrive">Google Drive</Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DataBackup;
