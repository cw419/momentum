/**
 * 布局溢出检测Hook
 * 监控横向滚动问题，在开发模式下提供警告
 */

import { useEffect, useState, useCallback } from 'react';
import { isDev } from '../utils/env';
import { logger } from '../utils/logger';

interface OverflowInfo {
  hasHorizontalOverflow: boolean;
  hasVerticalOverflow: boolean;
  scrollWidth: number;
  scrollHeight: number;
  clientWidth: number;
  clientHeight: number;
}

export const useLayoutOverflowDetection = (
  enabled: boolean = isDev
) => {
  const [overflowInfo, setOverflowInfo] = useState<OverflowInfo>({
    hasHorizontalOverflow: false,
    hasVerticalOverflow: false,
    scrollWidth: 0,
    scrollHeight: 0,
    clientWidth: 0,
    clientHeight: 0
  });

  const checkOverflow = useCallback(() => {
    if (!enabled) return;

    const body = document.body;
    const documentElement = document.documentElement;
    
    const scrollWidth = Math.max(body.scrollWidth, documentElement.scrollWidth);
    const scrollHeight = Math.max(body.scrollHeight, documentElement.scrollHeight);
    const clientWidth = documentElement.clientWidth;
    const clientHeight = documentElement.clientHeight;
    
    const hasHorizontalOverflow = scrollWidth > clientWidth;
    const hasVerticalOverflow = scrollHeight > clientHeight;
    
    const newOverflowInfo: OverflowInfo = {
      hasHorizontalOverflow,
      hasVerticalOverflow,
      scrollWidth,
      scrollHeight,
      clientWidth,
      clientHeight
    };
    
    setOverflowInfo(newOverflowInfo);
    
    // 在开发模式下警告横向滚动
    if (hasHorizontalOverflow && isDev) {
      logger.warn('LAYOUT', '检测到横向滚动', {
        scrollWidth,
        clientWidth,
        overflow: scrollWidth - clientWidth
      });
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // 初始检查
    checkOverflow();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkOverflow);
    
    // 监听DOM变化（可能导致布局变化）
    const observer = new MutationObserver(checkOverflow);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // 监听滚动事件（可能表明有溢出）
    const handleScroll = () => {
      if (isDev && window.scrollX > 0) {
        logger.warn('LAYOUT', '检测到横向滚动行为', { scrollX: window.scrollX });
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [checkOverflow, enabled]);

  return {
    ...overflowInfo,
    checkOverflow
  };
};
