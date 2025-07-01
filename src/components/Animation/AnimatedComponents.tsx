import React, { useState, useEffect, useRef } from 'react';
import { Card, Button } from 'antd';
import './AnimatedComponents.css';

/**
 * 淡入动画组件
 */
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const FadeIn: React.FC<FadeInProps> = React.memo(({ 
  children, 
  delay = 0, 
  duration = 300,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [delay]);

  return (
    <div
      ref={elementRef}
      className={`fade-in ${isVisible ? 'visible' : ''} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
});

FadeIn.displayName = 'FadeIn';

/**
 * 滑入动画组件
 */
interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
}

export const SlideIn: React.FC<SlideInProps> = React.memo(({ 
  children, 
  direction = 'up',
  delay = 0, 
  duration = 500,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [delay]);

  return (
    <div
      ref={elementRef}
      className={`slide-in slide-in-${direction} ${isVisible ? 'visible' : ''} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
});

SlideIn.displayName = 'SlideIn';

/**
 * 缩放动画组件
 */
interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const ScaleIn: React.FC<ScaleInProps> = React.memo(({ 
  children, 
  delay = 0, 
  duration = 400,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [delay]);

  return (
    <div
      ref={elementRef}
      className={`scale-in ${isVisible ? 'visible' : ''} ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
});

ScaleIn.displayName = 'ScaleIn';

/**
 * 悬浮卡片组件
 */
interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const FloatingCard: React.FC<FloatingCardProps> = React.memo(({ 
  children, 
  className = '',
  onClick,
  hoverable = true
}) => {
  return (
    <Card
      className={`floating-card ${hoverable ? 'hoverable' : ''} ${className}`}
      onClick={onClick}
      hoverable={false} // 使用自定义悬浮效果
    >
      {children}
    </Card>
  );
});

FloatingCard.displayName = 'FloatingCard';

/**
 * 渐变按钮组件
 */
interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const GradientButton: React.FC<GradientButtonProps> = React.memo(({ 
  children,
  onClick,
  type = 'primary',
  size = 'middle',
  disabled = false,
  loading = false,
  icon,
  className = ''
}) => {
  return (
    <Button
      className={`gradient-btn gradient-btn-${type} ${className}`}
      onClick={onClick}
      size={size}
      disabled={disabled}
      loading={loading}
      icon={icon}
    >
      {children}
    </Button>
  );
});

GradientButton.displayName = 'GradientButton';

/**
 * 粒子背景组件
 */
interface ParticleBackgroundProps {
  particleCount?: number;
  className?: string;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = React.memo(({ 
  particleCount = 50,
  className = ''
}) => {
  const particles = Array.from({ length: particleCount }, (_, i) => (
    <div
      key={i}
      className="particle"
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 20}s`,
        animationDuration: `${20 + Math.random() * 20}s`
      }}
    />
  ));

  return (
    <div className={`particle-background ${className}`}>
      {particles}
    </div>
  );
});

ParticleBackground.displayName = 'ParticleBackground';

/**
 * 波浪动画组件
 */
interface WaveAnimationProps {
  className?: string;
  color?: string;
}

export const WaveAnimation: React.FC<WaveAnimationProps> = React.memo(({ 
  className = '',
  color = 'var(--primary-color)'
}) => {
  return (
    <div className={`wave-animation ${className}`}>
      <svg
        className="wave-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
          opacity=".25"
          fill={color}
        />
        <path
          d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
          opacity=".5"
          fill={color}
        />
        <path
          d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
          fill={color}
        />
      </svg>
    </div>
  );
});

WaveAnimation.displayName = 'WaveAnimation';

/**
 * 计数动画组件
 */
interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = React.memo(({ 
  end,
  start = 0,
  duration = 2000,
  suffix = '',
  prefix = '',
  className = ''
}) => {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const increment = (end - start) / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, start, end, duration]);

  return (
    <span ref={elementRef} className={`count-up ${className}`}>
      {prefix}{count}{suffix}
    </span>
  );
});

CountUp.displayName = 'CountUp';
