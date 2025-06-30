import React, { useState } from 'react';
import { Upload, Button, message, Progress, Typography, Space, Alert } from 'antd';
import { UploadOutlined, FileImageOutlined, FilePdfOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';

const { Text } = Typography;

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  loading?: boolean;
  progress?: number;
  accept?: string;
  maxSize?: number; // MB
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  onFileRemove,
  loading = false,
  progress = 0,
  accept = '.jpg,.jpeg,.png,.webp,.pdf',
  maxSize = 50
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const beforeUpload = (file: File) => {
    // 检查文件类型
    const isValidType = accept.split(',').some(type => 
      file.type.includes(type.replace('.', '')) || file.name.toLowerCase().endsWith(type)
    );
    
    if (!isValidType) {
      message.error(`不支持的文件格式，请选择: ${accept}`);
      return false;
    }

    // 检查文件大小
    const isValidSize = file.size / 1024 / 1024 < maxSize;
    if (!isValidSize) {
      message.error(`文件大小不能超过 ${maxSize}MB`);
      return false;
    }

    // 更新文件列表
    const uploadFile: UploadFile = {
      uid: file.name,
      name: file.name,
      status: 'done',
      originFileObj: file as any
    };
    
    setFileList([uploadFile]);
    onFileSelect(file);
    
    return false; // 阻止自动上传
  };

  const handleRemove = () => {
    setFileList([]);
    onFileRemove();
  };

  const uploadProps: UploadProps = {
    beforeUpload,
    onRemove: handleRemove,
    fileList,
    maxCount: 1,
    showUploadList: {
      showRemoveIcon: !loading,
      removeIcon: <DeleteOutlined />
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return <FileImageOutlined style={{ color: '#52c41a' }} />;
      default:
        return <FileImageOutlined />;
    }
  };

  return (
    <div>
      <Upload.Dragger
        {...uploadProps}
        style={{
          backgroundColor: dragOver ? '#f0f8ff' : undefined,
          borderColor: dragOver ? '#1890ff' : undefined
        }}

        disabled={loading}
      >
        <div style={{ padding: '20px' }}>
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">
            <Text strong>点击或拖拽文件到此区域上传</Text>
          </p>
          <p className="ant-upload-hint">
            <Text type="secondary">
              支持格式：图片 (JPG, PNG, WebP) 和 PDF 文件
              <br />
              文件大小限制：{maxSize}MB
            </Text>
          </p>
        </div>
      </Upload.Dragger>

      {fileList.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getFileIcon(fileList[0].name)}
              <Text>{fileList[0].name}</Text>
              <Text type="secondary">
                ({(fileList[0].originFileObj?.size || 0 / 1024 / 1024).toFixed(2)} MB)
              </Text>
            </div>
            
            {loading && (
              <div>
                <Progress 
                  percent={Math.round(progress)} 
                  size="small" 
                  status={progress === 100 ? 'success' : 'active'}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {progress < 50 ? '正在处理图片...' : 
                   progress < 80 ? '正在识别文字...' : 
                   '正在解析题目...'}
                </Text>
              </div>
            )}
          </Space>
        </div>
      )}

      <Alert
        message="使用提示"
        description={
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>图片要求：文字清晰、对比度高、无倾斜</li>
            <li>PDF文件：支持可选择文本和扫描版PDF</li>
            <li>建议分辨率：至少300DPI，文字大小≥12pt</li>
            <li>处理时间：图片约5-10秒，PDF约10-30秒</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginTop: '16px' }}
      />
    </div>
  );
};

export default FileUploader;
