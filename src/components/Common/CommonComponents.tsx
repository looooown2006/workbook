import React from 'react';
import { Button, Space, Tag, Tooltip, Progress, Card, Typography, Row, Col } from 'antd';
import {
  HomeOutlined,
  StarOutlined,
  StarFilled,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  TrophyOutlined,
  BookOutlined
} from '@ant-design/icons';
import '../../styles/design-system.css';

const { Text, Title } = Typography;

/**
 * 通用的返回首页按钮
 */
interface BackToHomeButtonProps {
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const BackToHomeButton: React.FC<BackToHomeButtonProps> = React.memo(({
  onClick,
  style,
  className = ''
}) => (
  <Button
    icon={<HomeOutlined />}
    onClick={onClick}
    style={style}
    className={`modern-btn ${className}`}
  >
    返回首页
  </Button>
));

BackToHomeButton.displayName = 'BackToHomeButton';

/**
 * 现代化的斩题按钮
 */
interface MasteredButtonProps {
  isMastered: boolean;
  onClick: () => void;
  showText?: boolean;
  style?: React.CSSProperties;
}

export const MasteredButton: React.FC<MasteredButtonProps> = ({ 
  isMastered, 
  onClick, 
  showText = false,
  style 
}) => (
  <Tooltip title={isMastered ? '取消斩题' : '标记斩题'}>
    <Button
      type={showText ? undefined : "text"}
      icon={isMastered ? <StarFilled /> : <StarOutlined />}
      style={{ 
        color: isMastered ? '#faad14' : undefined,
        ...style 
      }}
      onClick={onClick}
    >
      {showText && (isMastered ? '取消斩题' : '标记斩题')}
    </Button>
  </Tooltip>
);

/**
 * 通用的导航按钮组
 */
interface NavigationButtonsProps {
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
  disabled?: boolean;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
  disabled = false
}) => (
  <Space size="large">
    <Button
      icon={<ArrowLeftOutlined />}
      onClick={onPrevious}
      disabled={disabled || currentIndex === 0}
    >
      上一题
    </Button>
    
    <Button
      type="primary"
      icon={<ArrowRightOutlined />}
      onClick={onNext}
      disabled={disabled || currentIndex === totalCount - 1}
    >
      下一题
    </Button>
  </Space>
);

/**
 * 通用的进度显示组件
 */
interface ProgressDisplayProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  style?: React.CSSProperties;
}

export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  current,
  total,
  showPercentage = true,
  style
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div style={style}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text>进度: {current}/{total}</Text>
        {showPercentage && (
          <Progress 
            percent={percentage} 
            size="small"
            showInfo={false}
          />
        )}
      </Space>
    </div>
  );
};

/**
 * 通用的模式标签
 */
interface ModeTagProps {
  mode: string;
  color?: string;
}

export const ModeTag: React.FC<ModeTagProps> = ({ mode, color = "green" }) => (
  <Tag color={color}>{mode}</Tag>
);

/**
 * 通用的操作栏组件
 */
interface ActionBarProps {
  title?: string;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  title,
  leftActions,
  rightActions,
  style
}) => (
  <Card style={{ marginBottom: '16px', ...style }}>
    <Row justify="space-between" align="middle">
      <Col>
        <Space>
          {title && <Text strong>{title}</Text>}
          {leftActions}
        </Space>
      </Col>
      <Col>
        {rightActions}
      </Col>
    </Row>
  </Card>
);

/**
 * 通用的学习操作按钮组
 */
interface StudyActionsProps {
  onStartReview: () => void;
  onViewStats: () => void;
  reviewDisabled?: boolean;
  reviewText?: string;
  statsText?: string;
}

export const StudyActions: React.FC<StudyActionsProps> = ({
  onStartReview,
  onViewStats,
  reviewDisabled = false,
  reviewText = "开始复习",
  statsText = "查看统计"
}) => (
  <Space>
    <Button 
      type="primary" 
      icon={<PlayCircleOutlined />}
      onClick={onStartReview}
      disabled={reviewDisabled}
    >
      {reviewText}
    </Button>
    <Button
      icon={<BarChartOutlined />}
      onClick={onViewStats}
    >
      {statsText}
    </Button>
  </Space>
);

/**
 * 通用的题目信息显示组件
 */
interface QuestionInfoProps {
  bankName: string;
  chapterName: string;
  mode?: string;
  currentIndex?: number;
  totalCount?: number;
  isMastered?: boolean;
  onToggleMastered?: () => void;
  onBackToHome?: () => void;
}

export const QuestionInfo: React.FC<QuestionInfoProps> = ({
  bankName,
  chapterName,
  mode,
  currentIndex,
  totalCount,
  isMastered,
  onToggleMastered,
  onBackToHome
}) => (
  <Card style={{ marginBottom: '16px' }}>
    <Row justify="space-between" align="middle">
      <Col>
        <Space>
          {onBackToHome && <BackToHomeButton onClick={onBackToHome} />}
          {mode && <ModeTag mode={mode} />}
          <Text strong>{bankName} - {chapterName}</Text>
        </Space>
      </Col>
      <Col>
        <Space>
          {typeof currentIndex === 'number' && typeof totalCount === 'number' && (
            <Text>进度: {currentIndex + 1}/{totalCount}</Text>
          )}
          {typeof isMastered === 'boolean' && onToggleMastered && (
            <MasteredButton 
              isMastered={isMastered} 
              onClick={onToggleMastered} 
            />
          )}
        </Space>
      </Col>
    </Row>
    {typeof currentIndex === 'number' && typeof totalCount === 'number' && (
      <Progress 
        percent={totalCount > 0 ? Math.round(((currentIndex + 1) / totalCount) * 100) : 0} 
        size="small"
        style={{ marginTop: '8px' }}
      />
    )}
  </Card>
);
