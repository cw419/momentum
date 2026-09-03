import { useMemo } from 'react';
import type { RSIPGroupFrame } from './useRSIPLayout';

export interface RSIPGroupConnector {
  id: string;
  d: string;
}

function value(
  style: React.CSSProperties,
  property: 'left' | 'top' | 'width' | 'height',
) {
  return Number(style[property]) || 0;
}

export function useRSIPGroupConnectors(
  groupFrames: RSIPGroupFrame[],
): RSIPGroupConnector[] {
  return useMemo(() => {
    const frameById = new Map(groupFrames.map((frame) => [frame.id, frame]));
    return groupFrames.flatMap((child) => {
      if (!child.parentGroupId) return [];
      const parent = frameById.get(child.parentGroupId);
      if (!parent) return [];

      const parentLeft = value(parent.style, 'left');
      const parentTop = value(parent.style, 'top');
      const parentWidth = value(parent.style, 'width');
      const parentHeight = value(parent.style, 'height');
      const childLeft = value(child.style, 'left');
      const childTop = value(child.style, 'top');
      const childWidth = value(child.style, 'width');
      const childHeight = value(child.style, 'height');
      const parentCenterY = parentTop + parentHeight / 2;
      const childCenterY = childTop + childHeight / 2;
      const flowsDown = parentCenterY <= childCenterY;
      const start = {
        x: parentLeft + parentWidth / 2,
        y: flowsDown ? parentTop + parentHeight : parentTop,
      };
      const end = {
        x: childLeft + childWidth / 2,
        y: flowsDown ? childTop : childTop + childHeight,
      };
      const bend = Math.max(48, Math.abs(end.y - start.y) / 2);

      return [
        {
          id: `group-${parent.id}-${child.id}`,
          d: `M ${start.x} ${start.y} C ${start.x} ${start.y + (flowsDown ? bend : -bend)} ${end.x} ${end.y + (flowsDown ? -bend : bend)} ${end.x} ${end.y}`,
        },
      ];
    });
  }, [groupFrames]);
}
