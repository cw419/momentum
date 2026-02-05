/**
 * 设置区域组件
 * 提供统一的设置区域布局和样式
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SettingSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  description?: string;
}

export const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  icon,
  children,
  className = '',
  collapsible = false,
  defaultExpanded = true,
  description
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const headerContent = (
    <>
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 font-chinese">
            {description}
          </p>
        )}
      </div>
    </>
  );

  return (
    <section className={`setting-section space-y-6 ${className}`}>
      <div className="section-header">
        {collapsible ? (
          <button
            type="button"
            className="flex items-center space-x-3 w-full cursor-pointer text-left focus-ring rounded-2xl group"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {headerContent}
            <span
              className="p-2 rounded-lg transition-colors group-hover:bg-gray-100 dark:group-hover:bg-slate-700"
              aria-hidden="true"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </span>
          </button>
        ) : (
          <div className="flex items-center space-x-3">
            {headerContent}
          </div>
        )}
      </div>
      
      {(!collapsible || isExpanded) && (
        <div className="section-content space-y-6">
          {children}
        </div>
      )}
    </section>
  );
};
