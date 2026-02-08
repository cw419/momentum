/**
 * 直接修复规则使用问题
 */

export function patchRuleSelection() {
  console.log('🔧 应用规则选择补丁...');

  // 等待页面加载完成
  setTimeout(() => {
    // 查找所有规则选择按钮
    const ruleButtons = document.querySelectorAll('[data-rule-id]');

    ruleButtons.forEach((button) => {
      const ruleId = button.getAttribute('data-rule-id');
      console.log('找到规则按钮:', ruleId);

      // 移除现有的点击事件监听器
      const newButton = button.cloneNode(true);
      button.parentNode?.replaceChild(newButton, button);

      // 添加新的点击事件
      newButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('🎯 直接使用规则:', ruleId);

        try {
          // 直接调用紧急使用规则
          const { emergencyUseRule } = await import('./emergencyFix');
          await emergencyUseRule(ruleId, 'pause'); // 假设是暂停操作

          console.log('✅ 规则使用成功');
        } catch (error) {
          console.error('❌ 规则使用失败:', error);
        }
      });
    });
  }, 5000);
}

// 自动应用补丁
if (typeof window !== 'undefined') {
  (window as any).patchRuleSelection = patchRuleSelection;

  // 延迟应用补丁
  setTimeout(patchRuleSelection, 2000);
}
