import type { ImportTranslator } from './types';
import { isRecord } from './coercions';

export function parseImportPayload(json: string, tr: ImportTranslator): Record<string, unknown> {
  const parsed = JSON.parse(json) as unknown;

  if (!isRecord(parsed)) {
    throw new Error(tr('导入数据格式错误：文件内容不是对象。', 'Invalid import format: file content is not an object.'));
  }

  return parsed;
}

