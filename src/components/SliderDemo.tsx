import React, { useState } from 'react';
import { PureDOMSlider } from './PureDOMSlider';
import { useI18n } from '../i18n';

/**
 * 滑块演示组件 - 展示移动端优化效果
 * 用于测试和验证触摸体验改进
 */
export const SliderDemo: React.FC = () => {
  const { tr } = useI18n();
  const [value1, setValue1] = useState(50);
  const [value2, setValue2] = useState(25);
  const [value3, setValue3] = useState(75);

  return (
    <div className="space-y-8 p-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{tr('移动端优化滑块演示', 'Mobile slider demo')}</h2>
        <p className="text-gray-600 dark:text-gray-400">
          {tr('在移动设备上测试触摸体验改进', 'Test the improved touch experience on mobile devices')}
        </p>
      </div>

      <div className="space-y-6">
        {/* 基础滑块 */}
        <div className="bento-card">
          <h3 className="text-lg font-semibold mb-4">{tr('基础滑块', 'Basic slider')}</h3>
          <PureDOMSlider
            min={0}
            max={100}
            initialValue={value1}
            onValueChange={setValue1}
            showValue={true}
            valueFormatter={(v) => `${v}%`}
          />
          <p className="text-sm text-gray-500 mt-2">
            {tr('当前值', 'Current')}: {value1}% {tr('- 基础触摸优化', '— basic touch improvements')}
          </p>
        </div>

        {/* 带防抖的滑块 */}
        <div className="bento-card">
          <h3 className="text-lg font-semibold mb-4">{tr('防抖滑块', 'Debounced slider')}</h3>
          <PureDOMSlider
            min={0}
            max={100}
            initialValue={value2}
            onValueChange={setValue2}
            showValue={true}
            valueFormatter={(v) => `${v}°`}
            debounceMs={300}
          />
          <p className="text-sm text-gray-500 mt-2">
            {tr('当前值', 'Current')}: {value2}° {tr('- 300ms防抖延迟', '— 300ms debounce')}
          </p>
        </div>

        {/* 细粒度控制滑块 */}
        <div className="bento-card">
          <h3 className="text-lg font-semibold mb-4">{tr('精确控制滑块', 'Precision slider')}</h3>
          <PureDOMSlider
            min={0}
            max={1}
            step={0.01}
            initialValue={value3 / 100}
            onValueChange={(v) => setValue3(v * 100)}
            showValue={true}
            valueFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <p className="text-sm text-gray-500 mt-2">
            {tr('当前值', 'Current')}: {value3.toFixed(0)}% {tr('- 0.01步长精确控制', '— 0.01 step')}
          </p>
        </div>

        {/* 禁用状态滑块 */}
        <div className="bento-card">
          <h3 className="text-lg font-semibold mb-4">{tr('禁用状态滑块', 'Disabled slider')}</h3>
          <PureDOMSlider
            min={0}
            max={100}
            initialValue={60}
            onValueChange={() => {}}
            disabled={true}
            showValue={true}
            valueFormatter={(v) => `${v}%`}
          />
          <p className="text-sm text-gray-500 mt-2">
            {tr('禁用状态演示 - 无法交互', 'Disabled demo — not interactive')}
          </p>
        </div>
      </div>

      {/* 移动端提示 */}
      <div className="bento-card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h4 className="text-md font-semibold text-blue-800 dark:text-blue-200 mb-2">
          {tr('📱 移动端优化特性', '📱 Mobile optimizations')}
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>{tr('44px最小触摸区域', '44px minimum touch target')}</strong> - {tr('符合WCAG无障碍标准', 'WCAG-friendly')}</li>
          <li>• <strong>{tr('触摸反馈动画', 'Touch feedback animation')}</strong> - {tr('提供视觉和触觉反馈', 'visual + tactile feel')}</li>
          <li>• <strong>{tr('防意外触摸', 'Accidental-touch prevention')}</strong> - {tr('优化的touch-action属性', 'optimized touch-action')}</li>
          <li>• <strong>{tr('自适应大小', 'Adaptive sizing')}</strong> - {tr('根据设备屏幕自动调整', 'auto-adjusts to screen')}</li>
          <li>• <strong>{tr('高精度控制', 'High-precision control')}</strong> - {tr('支持精确的数值调节', 'fine-grained values')}</li>
          <li>• <strong>{tr('防抖优化', 'Debounce optimization')}</strong> - {tr('减少不必要的更新调用', 'reduces needless updates')}</li>
        </ul>
      </div>
    </div>
  );
};
