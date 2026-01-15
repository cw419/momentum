import React from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';

interface RSIPControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToContent: () => void;
  tr: (zh: string, en: string) => string;
}

export const RSIPControls: React.FC<RSIPControlsProps> = ({ onZoomIn, onZoomOut, onFitToContent, tr }) => {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
      <button
        type="button"
        onClick={onZoomIn}
        className="w-11 h-11 inline-flex items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all"
        aria-label={tr('放大', 'Zoom in')}
        title={tr('放大', 'Zoom in')}
      >
        <Plus size={18} />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="w-11 h-11 inline-flex items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all"
        aria-label={tr('缩小', 'Zoom out')}
        title={tr('缩小', 'Zoom out')}
      >
        <Minus size={18} />
      </button>
      <button
        type="button"
        onClick={onFitToContent}
        className="w-11 h-11 inline-flex items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all"
        aria-label={tr('适应内容', 'Fit to content')}
        title={tr('适应内容', 'Fit to content')}
      >
        <Maximize2 size={18} />
      </button>
    </div>
  );
};

