/**
 * 字符串工具函数
 * 提供字符串相似度计算、规范化等通用功能
 */

/**
 * 计算 Levenshtein 编辑距离
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 编辑距离
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j] + 1      // 删除
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * 计算两个字符串的相似度
 * 使用 Levenshtein 距离算法，带 smoothing factor 避免短字符串过度惩罚
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 相似度 (0.0 - 1.0)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  // smoothing factor (+1) 避免短字符串过度惩罚
  return 1 - (distance / (maxLength + 1));
}

/**
 * 规范化规则名称
 * 移除多余空格、转换为小写、移除标点符号
 * @param name 原始名称
 * @returns 规范化后的名称
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')              // 多个空格替换为单个空格
    .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 移除标点符号，保留中文字符
    .replace(/\s/g, '');               // 移除所有空格
}
