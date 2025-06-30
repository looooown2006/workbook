import React from 'react';
import { Typography, Card } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import SmartRecommendation from '../components/WrongQuestionBook/SmartRecommendation';

const { Title } = Typography;

const SmartRecommendationPage: React.FC = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <BulbOutlined style={{ marginRight: '8px' }} />
          智能推荐
        </Title>
      </div>
      
      <Card>
        <SmartRecommendation />
      </Card>
    </div>
  );
};

export default SmartRecommendationPage;
