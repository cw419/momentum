import { logger } from '../logger';
import { getFileAdapter } from '../platform-adapters';
import type { PlatformCapabilities, PlatformCapabilityCenter } from './types';

export function createFileCapability(
  getCapabilities: () => Promise<PlatformCapabilities>,
): PlatformCapabilityCenter['file'] {
  return {
    saveFile: async (data, defaultName) => {
      if (!(await getCapabilities()).file.canSaveFile) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Save-file operation is not supported on this platform',
          { defaultName },
        );
        return false;
      }
      try {
        return await (await getFileAdapter()).saveFile(data, defaultName);
      } catch (error) {
        const normalized =
          error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to save file',
          { defaultName },
          normalized,
        );
        return false;
      }
    },
    openFile: async (extensions) => {
      if (!(await getCapabilities()).file.canOpenFile) {
        logger.warn(
          'PLATFORM_CAPABILITIES',
          'Open-file operation is not supported on this platform',
          { extensions },
        );
        return null;
      }
      try {
        return await (await getFileAdapter()).openFile(extensions);
      } catch (error) {
        const normalized =
          error instanceof Error ? error : new Error(String(error));
        logger.error(
          'PLATFORM_CAPABILITIES',
          'Failed to open file',
          { extensions },
          normalized,
        );
        return null;
      }
    },
  };
}
