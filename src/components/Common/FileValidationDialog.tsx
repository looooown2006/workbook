/**
 * 文件验证错误对话框组件
 * 提供友好的文件格式错误提示和建议
 */

import React from 'react';
import { Modal, Typography, List, Space, Button, Alert, Divider } from 'antd';
import { 
  ExclamationCircleOutlined, 
  FileImageOutlined, 
  FilePdfOutlined, 
  FileWordOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { FileValidationResult } from '../../utils/fileValidator';

const { Title, Text, Paragraph } = Typography;

interface FileValidationDialogProps {
  visible: boolean;
  onClose: () => void;
  validationResult: FileValidationResult | null;
  onRetry?: () => void;
}

const FileValidationDialog: React.FC<FileValidationDialogProps> = ({
  visible,
  onClose,
  validationResult,
  onRetry
}) => {
  if (!validationResult) return null;

  const getSeverityIcon = () => {
    if (!validationResult.isValid) {
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '24px' }} />;
    } else if (validationResult.warnings.length > 0) {
      return <InfoCircleOutlined style={{ color: '#faad14', fontSize: '24px' }} />;
    } else {
      return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '24px' }} />;
    }
  };

  const getTitle = () => {
    if (!validationResult.isValid) {
      return '文件验证失败';
    } else if (validationResult.warnings.length > 0) {
      return '文件验证通过（有警告）';
    } else {
      return '文件验证成功';
    }
  };

  const getSupportedFormats = () => [
    {
      category: '图片文件',
      icon: <FileImageOutlined style={{ color: '#52c41a' }} />,
      formats: ['JPG', 'JPEG', 'PNG', 'WebP'],
      description: '支持常见图片格式，建议使用高分辨率图片以获得更好的OCR识别效果'
    },
    {
      category: 'PDF文档',
      icon: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
      formats: ['PDF'],
      description: '支持标准PDF文档，包含文字和图片的PDF都可以处理'
    },
    {
      category: 'Word文档',
      icon: <FileWordOutlined style={{ color: '#1890ff' }} />,
      formats: ['DOC', 'DOCX'],
      description: '支持Microsoft Word文档，可以提取文字内容和题目结构'
    }
  ];

  return (
    <Modal
      title={
        <Space>
          {getSeverityIcon()}
          <span>{getTitle()}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        ...(onRetry ? [
          <Button key="retry" type="primary" onClick={onRetry}>
            重新选择文件
          </Button>
        ] : [])
      ]}
    >
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {/* 文件信息 */}
        <Alert
          message="文件信息"
          description={
            <div>
              <Text strong>文件名：</Text>{validationResult.fileInfo.name}<br />
              <Text strong>文件大小：</Text>{(validationResult.fileInfo.size / 1024 / 1024).toFixed(2)} MB<br />
              <Text strong>文件类型：</Text>{validationResult.fileInfo.type || '未知'}<br />
              <Text strong>文件类别：</Text>{validationResult.fileInfo.category}
            </div>
          }
          type="info"
          style={{ marginBottom: '16px' }}
        />

        {/* 错误信息 */}
        {validationResult.errors.length > 0 && (
          <>
            <Title level={5} style={{ color: '#ff4d4f', marginBottom: '8px' }}>
              <ExclamationCircleOutlined /> 发现问题
            </Title>
            <List
              size="small"
              dataSource={validationResult.errors}
              renderItem={(error) => (
                <List.Item>
                  <Text type="danger">• {error}</Text>
                </List.Item>
              )}
              style={{ marginBottom: '16px' }}
            />
          </>
        )}

        {/* 警告信息 */}
        {validationResult.warnings.length > 0 && (
          <>
            <Title level={5} style={{ color: '#faad14', marginBottom: '8px' }}>
              <InfoCircleOutlined /> 注意事项
            </Title>
            <List
              size="small"
              dataSource={validationResult.warnings}
              renderItem={(warning) => (
                <List.Item>
                  <Text type="warning">• {warning}</Text>
                </List.Item>
              )}
              style={{ marginBottom: '16px' }}
            />
          </>
        )}

        {/* 建议 */}
        {validationResult.suggestions.length > 0 && (
          <>
            <Title level={5} style={{ marginBottom: '8px' }}>
              💡 建议
            </Title>
            <List
              size="small"
              dataSource={validationResult.suggestions}
              renderItem={(suggestion) => (
                <List.Item>
                  <Text>• {suggestion}</Text>
                </List.Item>
              )}
              style={{ marginBottom: '16px' }}
            />
          </>
        )}

        <Divider />

        {/* 支持的文件格式 */}
        <Title level={5} style={{ marginBottom: '16px' }}>
          📁 支持的文件格式
        </Title>
        
        {getSupportedFormats().map((category, index) => (
          <div key={index} style={{ marginBottom: '16px' }}>
            <Space style={{ marginBottom: '8px' }}>
              {category.icon}
              <Text strong>{category.category}</Text>
            </Space>
            <div style={{ paddingLeft: '24px' }}>
              <Space wrap>
                {category.formats.map((format) => (
                  <span
                    key={format}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  >
                    .{format.toLowerCase()}
                  </span>
                ))}
              </Space>
              <Paragraph 
                type="secondary" 
                style={{ fontSize: '12px', marginTop: '4px', marginBottom: '0' }}
              >
                {category.description}
              </Paragraph>
            </div>
          </div>
        ))}

        {/* 使用提示 */}
        <Alert
          message="使用提示"
          description={
            <div>
              <Text>• 文件大小建议不超过50MB</Text><br />
              <Text>• 图片建议使用高分辨率，确保文字清晰</Text><br />
              <Text>• PDF文档建议包含可选择的文字内容</Text><br />
              <Text>• Word文档建议使用标准格式，避免复杂排版</Text>
            </div>
          }
          type="info"
          showIcon
        />
      </div>
    </Modal>
  );
};

export default FileValidationDialog;
