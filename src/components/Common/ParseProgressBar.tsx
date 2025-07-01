import React from 'react';
import { Progress, Card, Typography, Space, Button } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, ExclamationCircleOutlined, StopOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export interface ParseProgress {
  stage: 'preparing' | 'parsing' | 'validating' | 'completed' | 'error';
  currentChunk: number;
  totalChunks: number;
  processedQuestions: number;
  totalEstimatedQuestions: number;
  currentStageProgress: number; // 0-100
  overallProgress: number; // 0-100
  message: string;
  errors: string[];
  canCancel: boolean;
}

interface ParseProgressBarProps {
  progress: ParseProgress;
  onCancel?: () => void;
  visible: boolean;
}

const ParseProgressBar: React.FC<ParseProgressBarProps> = ({
  progress,
  onCancel,
  visible
}) => {
  if (!visible) return null;

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'preparing':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'parsing':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'validating':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <LoadingOutlined />;
    }
  };

  const getStageText = () => {
    switch (progress.stage) {
      case 'preparing':
        return '准备解析';
      case 'parsing':
        return '正在解析';
      case 'validating':
        return '验证结果';
      case 'completed':
        return '解析完成';
      case 'error':
        return '解析失败';
      default:
        return '处理中';
    }
  };

  const getProgressStatus = () => {
    switch (progress.stage) {
      case 'completed':
        return 'success';
      case 'error':
        return 'exception';
      default:
        return 'active';
    }
  };

  return (
    <Card 
      style={{ 
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 480,
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
      bodyStyle={{ padding: '24px' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 标题和状态 */}
        <div style={{ textAlign: 'center' }}>
          <Space>
            {getStageIcon()}
            <Title level={4} style={{ margin: 0 }}>
              {getStageText()}
            </Title>
          </Space>
        </div>

        {/* 总体进度 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>总体进度</Text>
            <Text>{progress.overallProgress}%</Text>
          </div>
          <Progress 
            percent={progress.overallProgress} 
            status={getProgressStatus()}
            strokeWidth={8}
          />
        </div>

        {/* 分片进度（如果有多个分片） */}
        {progress.totalChunks > 1 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>分片进度</Text>
              <Text>{progress.currentChunk}/{progress.totalChunks}</Text>
            </div>
            <Progress 
              percent={(progress.currentChunk / progress.totalChunks) * 100} 
              status={getProgressStatus()}
              size="small"
            />
          </div>
        )}

        {/* 当前阶段进度 */}
        {progress.stage === 'parsing' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text>当前阶段</Text>
              <Text>{progress.currentStageProgress}%</Text>
            </div>
            <Progress 
              percent={progress.currentStageProgress} 
              status="active"
              size="small"
            />
          </div>
        )}

        {/* 题目统计 */}
        {progress.processedQuestions > 0 && (
          <div style={{ 
            background: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <Text>已处理题目</Text>
            <Text strong>{progress.processedQuestions} 题</Text>
          </div>
        )}

        {/* 状态消息 */}
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">{progress.message}</Text>
        </div>

        {/* 错误信息 */}
        {progress.errors.length > 0 && (
          <div style={{ 
            background: '#fff2f0', 
            border: '1px solid #ffccc7',
            padding: '12px', 
            borderRadius: '6px',
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            <Text type="danger" strong>错误信息：</Text>
            {progress.errors.map((error, index) => (
              <div key={index} style={{ marginTop: 4 }}>
                <Text type="danger" style={{ fontSize: '12px' }}>
                  • {error}
                </Text>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ textAlign: 'center' }}>
          {progress.canCancel && progress.stage !== 'completed' && progress.stage !== 'error' && (
            <Button 
              icon={<StopOutlined />}
              onClick={onCancel}
              type="default"
            >
              取消解析
            </Button>
          )}
          
          {(progress.stage === 'completed' || progress.stage === 'error') && (
            <Button 
              type="primary"
              onClick={onCancel} // 复用取消回调来关闭对话框
            >
              {progress.stage === 'completed' ? '完成' : '关闭'}
            </Button>
          )}
        </div>
      </Space>
    </Card>
  );
};

export default ParseProgressBar;

// 进度管理器类
export class ParseProgressManager {
  private listeners: ((progress: ParseProgress) => void)[] = [];
  private currentProgress: ParseProgress = {
    stage: 'preparing',
    currentChunk: 0,
    totalChunks: 1,
    processedQuestions: 0,
    totalEstimatedQuestions: 0,
    currentStageProgress: 0,
    overallProgress: 0,
    message: '准备开始解析...',
    errors: [],
    canCancel: true
  };

  addListener(listener: (progress: ParseProgress) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (progress: ParseProgress) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  updateProgress(updates: Partial<ParseProgress>) {
    this.currentProgress = { ...this.currentProgress, ...updates };
    this.notifyListeners();
  }

  setStage(stage: ParseProgress['stage'], message?: string) {
    const updates: Partial<ParseProgress> = { stage };
    if (message) updates.message = message;
    
    // 根据阶段自动计算总体进度
    switch (stage) {
      case 'preparing':
        updates.overallProgress = 10;
        break;
      case 'parsing':
        updates.overallProgress = 20 + (this.currentProgress.currentChunk / this.currentProgress.totalChunks) * 60;
        break;
      case 'validating':
        updates.overallProgress = 85;
        break;
      case 'completed':
        updates.overallProgress = 100;
        updates.canCancel = false;
        break;
      case 'error':
        updates.canCancel = false;
        break;
    }
    
    this.updateProgress(updates);
  }

  setChunkProgress(currentChunk: number, totalChunks: number) {
    const overallProgress = 20 + (currentChunk / totalChunks) * 60;
    this.updateProgress({
      currentChunk,
      totalChunks,
      overallProgress,
      message: `正在处理第 ${currentChunk}/${totalChunks} 个分片...`
    });
  }

  addError(error: string) {
    const errors = [...this.currentProgress.errors, error];
    this.updateProgress({ errors });
  }

  addProcessedQuestions(count: number) {
    const processedQuestions = this.currentProgress.processedQuestions + count;
    this.updateProgress({ processedQuestions });
  }

  reset() {
    this.currentProgress = {
      stage: 'preparing',
      currentChunk: 0,
      totalChunks: 1,
      processedQuestions: 0,
      totalEstimatedQuestions: 0,
      currentStageProgress: 0,
      overallProgress: 0,
      message: '准备开始解析...',
      errors: [],
      canCancel: true
    };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentProgress));
  }

  getCurrentProgress(): ParseProgress {
    return { ...this.currentProgress };
  }
}
