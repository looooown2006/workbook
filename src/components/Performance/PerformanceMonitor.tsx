import React, { useState, useEffect } from 'react';
import { Card, Switch, Typography, Row, Col, Progress, Alert } from 'antd';
import { useMemoryMonitor } from '../../hooks/useMemoryOptimization';

const { Title, Text } = Typography;

interface PerformanceMetrics {
  memoryUsage: number;
  memoryLimit: number;
  renderTime: number;
  componentCount: number;
  fps: number;
}

const PerformanceMonitor: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    memoryLimit: 0,
    renderTime: 0,
    componentCount: 0,
    fps: 0
  });

  useMemoryMonitor(enabled);

  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measurePerformance = () => {
      const now = performance.now();
      frameCount++;

      // 每秒更新一次指标
      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;

        // 获取内存信息
        const memory = (performance as any).memory;
        if (memory) {
          setMetrics(prev => ({
            ...prev,
            memoryUsage: memory.usedJSHeapSize / 1024 / 1024,
            memoryLimit: memory.jsHeapSizeLimit / 1024 / 1024,
            fps
          }));
        }
      }

      animationId = requestAnimationFrame(measurePerformance);
    };

    animationId = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [enabled]);

  const memoryUsagePercent = metrics.memoryLimit > 0 
    ? Math.round((metrics.memoryUsage / metrics.memoryLimit) * 100)
    : 0;

  const getPerformanceStatus = () => {
    if (memoryUsagePercent > 80 || metrics.fps < 30) {
      return { type: 'error' as const, message: '性能警告：内存使用过高或帧率过低' };
    } else if (memoryUsagePercent > 60 || metrics.fps < 45) {
      return { type: 'warning' as const, message: '性能提示：建议优化内存使用' };
    } else {
      return { type: 'success' as const, message: '性能良好' };
    }
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <Card 
      title="性能监控" 
      size="small"
      style={{ 
        position: 'fixed', 
        top: '80px', 
        right: '20px', 
        width: '300px',
        zIndex: 1000,
        display: enabled ? 'block' : 'none'
      }}
    >
      <Row gutter={[8, 8]} align="middle" style={{ marginBottom: '12px' }}>
        <Col span={12}>
          <Text strong>启用监控</Text>
        </Col>
        <Col span={12}>
          <Switch 
            checked={enabled} 
            onChange={setEnabled}
            size="small"
          />
        </Col>
      </Row>

      {enabled && (
        <>
          <Alert
            message={performanceStatus.message}
            type={performanceStatus.type}

            style={{ marginBottom: '12px' }}
          />

          <Row gutter={[8, 8]}>
            <Col span={24}>
              <Text strong>内存使用</Text>
              <Progress
                percent={memoryUsagePercent}
                size="small"
                strokeColor={
                  memoryUsagePercent > 80 ? '#ff4d4f' :
                  memoryUsagePercent > 60 ? '#faad14' : '#52c41a'
                }
                format={() => `${metrics.memoryUsage.toFixed(1)}MB`}
              />
            </Col>
          </Row>

          <Row gutter={[8, 8]} style={{ marginTop: '8px' }}>
            <Col span={12}>
              <Text type="secondary">FPS</Text>
              <br />
              <Text strong style={{ 
                color: metrics.fps < 30 ? '#ff4d4f' : 
                       metrics.fps < 45 ? '#faad14' : '#52c41a' 
              }}>
                {metrics.fps}
              </Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">内存限制</Text>
              <br />
              <Text strong>{metrics.memoryLimit.toFixed(1)}MB</Text>
            </Col>
          </Row>

          <Row gutter={[8, 8]} style={{ marginTop: '8px' }}>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                提示：高内存使用或低帧率可能影响应用性能
              </Text>
            </Col>
          </Row>
        </>
      )}

      {!enabled && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Switch 
            checked={enabled} 
            onChange={setEnabled}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
          <br />
          <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px' }}>
            开启性能监控
          </Text>
        </div>
      )}
    </Card>
  );
};

export default PerformanceMonitor;
