import React from 'react';
import { Typography, Card } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import StudyPlanManager from '../components/StudyPlan/StudyPlanManager';

const { Title } = Typography;

const StudyPlanPage: React.FC = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <CalendarOutlined style={{ marginRight: '8px' }} />
          学习计划
        </Title>
      </div>
      
      <Card>
        <StudyPlanManager />
      </Card>
    </div>
  );
};

export default StudyPlanPage;
