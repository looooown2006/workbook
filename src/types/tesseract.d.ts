declare module 'tesseract.js' {
  export interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
      words: Array<{
        text: string;
        confidence: number;
        bbox: {
          x0: number;
          y0: number;
          x1: number;
          y1: number;
        };
      }>;
    };
  }

  export interface Worker {
    recognize(image: string | File | HTMLCanvasElement): Promise<RecognizeResult>;
    setParameters(params: Record<string, any>): Promise<void>;
    terminate(): Promise<void>;
  }

  export interface CreateWorkerOptions {
    logger?: (m: any) => void;
  }

  export enum OEM {
    TESSERACT_ONLY = 0,
    LSTM_ONLY = 1,
    TESSERACT_LSTM_COMBINED = 2,
    DEFAULT = 3
  }

  export enum PSM {
    OSD_ONLY = 0,
    AUTO_OSD = 1,
    AUTO_ONLY = 2,
    AUTO = 3,
    SINGLE_COLUMN = 4,
    SINGLE_BLOCK_VERT_TEXT = 5,
    SINGLE_BLOCK = 6,
    SINGLE_LINE = 7,
    SINGLE_WORD = 8,
    CIRCLE_WORD = 9,
    SINGLE_CHAR = 10,
    SPARSE_TEXT = 11,
    SPARSE_TEXT_OSD = 12,
    RAW_LINE = 13
  }

  export function createWorker(
    language: string,
    oem?: number,
    options?: CreateWorkerOptions
  ): Promise<Worker>;

  export function recognize(
    image: string | File | HTMLCanvasElement,
    language?: string,
    options?: any
  ): Promise<RecognizeResult>;
}
