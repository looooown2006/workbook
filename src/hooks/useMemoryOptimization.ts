import { useEffect, useRef, useCallback, useState } from 'react';

// 防抖Hook
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // 更新回调引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// 节流Hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  // 更新回调引用
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    },
    [delay]
  ) as T;

  return throttledCallback;
}

// 内存监控Hook
export function useMemoryMonitor(enabled: boolean = false) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !('memory' in performance)) {
      return;
    }

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const used = memory.usedJSHeapSize / 1024 / 1024; // MB
        const total = memory.totalJSHeapSize / 1024 / 1024; // MB
        const limit = memory.jsHeapSizeLimit / 1024 / 1024; // MB
        
        console.log(`Memory Usage: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB (Limit: ${limit.toFixed(2)}MB)`);
        
        // 如果内存使用超过80%，发出警告
        if (used / limit > 0.8) {
          console.warn('High memory usage detected!');
        }
      }
    };

    intervalRef.current = setInterval(checkMemory, 5000); // 每5秒检查一次

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled]);
}

// 图片懒加载Hook
export function useLazyImage(src: string, options: IntersectionObserverInit = {}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          img.src = src;
          observerRef.current?.unobserve(img);
        }
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, options]);

  return imgRef;
}

// 组件卸载清理Hook
export function useCleanup(cleanup: () => void) {
  const cleanupRef = useRef(cleanup);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
}

// 大数据分页Hook
export function usePagination<T>(
  data: T[],
  pageSize: number = 50
) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data.slice(startIndex, endIndex);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    currentPage,
    totalPages,
    currentData,
    goToPage,
    nextPage,
    prevPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}

// 异步数据加载Hook
export function useAsyncData<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cancelRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    cancelRef.current = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFunction();
        if (!cancelled && !cancelRef.current) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled && !cancelRef.current) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled && !cancelRef.current) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
      cancelRef.current = true;
    };
  }, dependencies);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { data, loading, error, cancel };
}

// 窗口大小监听Hook
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = useThrottle(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }, 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

// 滚动位置Hook
export function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState({
    x: window.pageXOffset,
    y: window.pageYOffset
  });

  useEffect(() => {
    const handleScroll = useThrottle(() => {
      setScrollPosition({
        x: window.pageXOffset,
        y: window.pageYOffset
      });
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollPosition;
}


