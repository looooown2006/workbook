/**
 * 图片预处理器
 * 优化图片质量以提高OCR识别准确率
 */

export interface PreprocessOptions {
  scale?: number;
  contrast?: number;
  brightness?: number;
  blur?: number;
  sharpen?: boolean;
  denoise?: boolean;
  autoRotate?: boolean;
  grayscale?: boolean;
  binarize?: boolean;
  binarizeThreshold?: number;
  gamma?: number;
  saturation?: number;
}

export interface ImageAnalysis {
  width: number;
  height: number;
  avgBrightness: number;
  contrastRange: number;
  isLowContrast: boolean;
  isDark: boolean;
  isBright: boolean;
  isLowRes: boolean;
}

export class ImagePreprocessor {
  /**
   * 智能预处理图片
   */
  static async preprocess(
    file: File,
    options: PreprocessOptions = {}
  ): Promise<HTMLCanvasElement> {
    // 首先分析图片特征
    const analysis = await this.analyzeImage(file);

    // 根据分析结果调整预处理参数
    const optimizedOptions = this.optimizeOptions(options, analysis);

    return this.processWithOptions(file, optimizedOptions);
  }

  /**
   * 分析图片特征
   */
  private static async analyzeImage(file: File): Promise<ImageAnalysis> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 计算图片统计信息
        let totalBrightness = 0;
        let totalContrast = 0;
        let minBrightness = 255;
        let maxBrightness = 0;

        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          totalBrightness += brightness;
          minBrightness = Math.min(minBrightness, brightness);
          maxBrightness = Math.max(maxBrightness, brightness);
        }

        const avgBrightness = totalBrightness / (data.length / 4);
        const contrastRange = maxBrightness - minBrightness;

        resolve({
          width: canvas.width,
          height: canvas.height,
          avgBrightness,
          contrastRange,
          isLowContrast: contrastRange < 100,
          isDark: avgBrightness < 100,
          isBright: avgBrightness > 180,
          isLowRes: canvas.width < 800 || canvas.height < 600
        });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 根据图片分析结果优化预处理参数
   */
  private static optimizeOptions(
    options: PreprocessOptions,
    analysis: ImageAnalysis
  ): PreprocessOptions {
    const optimized = { ...options };

    // 根据分辨率调整缩放
    if (analysis.isLowRes) {
      optimized.scale = Math.max(optimized.scale || 2.0, 3.0);
    }

    // 根据亮度调整
    if (analysis.isDark) {
      optimized.brightness = Math.max(optimized.brightness || 110, 130);
      optimized.gamma = Math.min(optimized.gamma || 1.0, 0.8);
    } else if (analysis.isBright) {
      optimized.brightness = Math.min(optimized.brightness || 110, 90);
      optimized.gamma = Math.max(optimized.gamma || 1.0, 1.2);
    }

    // 根据对比度调整
    if (analysis.isLowContrast) {
      optimized.contrast = Math.max(optimized.contrast || 150, 180);
      optimized.sharpen = true;
    }

    // 默认启用去噪和锐化
    if (optimized.denoise === undefined) optimized.denoise = true;
    if (optimized.sharpen === undefined) optimized.sharpen = true;

    return optimized;
  }

  /**
   * 使用指定参数处理图片
   */
  private static async processWithOptions(
    file: File,
    options: PreprocessOptions
  ): Promise<HTMLCanvasElement> {
    const {
      scale = 2.0,
      contrast = 150,
      brightness = 110,
      blur = 0,
      sharpen = true,
      denoise = true,
      autoRotate = true,
      grayscale = false,
      binarize = false,
      binarizeThreshold = 128,
      gamma = 1.0,
      saturation = 100
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // 设置画布尺寸
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          // 应用基础滤镜
          let filter = '';
          if (contrast !== 100) filter += `contrast(${contrast}%) `;
          if (brightness !== 100) filter += `brightness(${brightness}%) `;
          if (saturation !== 100) filter += `saturate(${saturation}%) `;
          if (blur > 0) filter += `blur(${blur}px) `;

          ctx.filter = filter.trim();

          // 绘制图片
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // 重置滤镜以便后续处理
          ctx.filter = 'none';

          // 应用Gamma校正
          if (gamma !== 1.0) {
            this.applyGammaCorrection(ctx, canvas.width, canvas.height, gamma);
          }

          // 应用灰度转换
          if (grayscale) {
            this.toGrayscale(ctx, canvas.width, canvas.height);
          }

          // 应用锐化
          if (sharpen) {
            this.applySharpen(ctx, canvas.width, canvas.height);
          }

          // 应用去噪
          if (denoise) {
            this.applyDenoise(ctx, canvas.width, canvas.height);
          }

          // 应用二值化
          if (binarize) {
            this.binarize(ctx, canvas.width, canvas.height, binarizeThreshold);
          }

          // 自动旋转校正
          if (autoRotate) {
            // 这里可以实现更复杂的方向检测算法
            // 目前保持原图
          }

          resolve(canvas);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 应用锐化滤镜
   */
  private static applySharpen(
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    
    // 锐化卷积核
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB通道
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          newData[idx] = Math.max(0, Math.min(255, sum));
        }
      }
    }
    
    const newImageData = new ImageData(newData, width, height);
    ctx.putImageData(newImageData, 0, 0);
  }

  /**
   * 应用去噪滤镜
   */
  private static applyDenoise(
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    
    // 简单的中值滤波
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB通道
          const values: number[] = [];
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              values.push(data[idx]);
            }
          }
          
          values.sort((a, b) => a - b);
          const median = values[Math.floor(values.length / 2)];
          
          const idx = (y * width + x) * 4 + c;
          newData[idx] = median;
        }
      }
    }
    
    const newImageData = new ImageData(newData, width, height);
    ctx.putImageData(newImageData, 0, 0);
  }

  /**
   * 检测图片方向并自动旋转
   */
  static async autoRotate(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    // 这里可以实现更复杂的方向检测算法
    // 目前返回原图
    return canvas;
  }

  /**
   * 应用Gamma校正
   */
  private static applyGammaCorrection(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    gamma: number
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 创建Gamma查找表
    const gammaTable = new Array(256);
    for (let i = 0; i < 256; i++) {
      gammaTable[i] = Math.pow(i / 255, 1 / gamma) * 255;
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = gammaTable[data[i]];     // R
      data[i + 1] = gammaTable[data[i + 1]]; // G
      data[i + 2] = gammaTable[data[i + 2]]; // B
      // Alpha通道保持不变
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 转换为灰度图
   */
  private static toGrayscale(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = gray;     // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
      // Alpha通道保持不变
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 二值化处理
   */
  private static binarize(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    threshold: number = 128
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const binary = gray > threshold ? 255 : 0;
      data[i] = binary;     // R
      data[i + 1] = binary; // G
      data[i + 2] = binary; // B
      // Alpha通道保持不变
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 自适应二值化（Otsu算法）
   */
  static calculateOtsuThreshold(canvas: HTMLCanvasElement): number {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 计算灰度直方图
    const histogram = new Array(256).fill(0);
    const totalPixels = canvas.width * canvas.height;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      histogram[gray]++;
    }

    // Otsu算法计算最佳阈值
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;

      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];

      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const varBetween = wB * wF * (mB - mF) * (mB - mF);

      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = t;
      }
    }

    return threshold;
  }

  /**
   * 边缘增强
   */
  static enhanceEdges(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);

    // Sobel边缘检测算子
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * canvas.width + (x + kx)) * 4;
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);

            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const idx = (y * canvas.width + x) * 4;

        newData[idx] = Math.min(255, magnitude);
        newData[idx + 1] = Math.min(255, magnitude);
        newData[idx + 2] = Math.min(255, magnitude);
      }
    }

    const newImageData = new ImageData(newData, canvas.width, canvas.height);
    ctx.putImageData(newImageData, 0, 0);
    return canvas;
  }
}
