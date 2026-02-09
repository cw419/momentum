import { isTauri } from '../platform';
import { logger } from '../logger';

export async function checkForUpdates(): Promise<void> {
  if (!isTauri) return;

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (update) {
      logger.info('UPDATER', `Update available: ${update.version}`);
      await update.downloadAndInstall();
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('UPDATER', 'Failed to check for updates', undefined, err);
  }
}
