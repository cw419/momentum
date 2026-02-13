import { isTauriDesktop } from '../platform';
import { logger } from '../logger';
import { normalizeUnknownError } from '../errors/normalizeError';
import { getCurrentLanguage, tr } from '../runtimeI18n';
import { toast } from '../toast';

async function checkDesktopUpdates(): Promise<void> {
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return;

    logger.info('UPDATER', `Update available: ${update.version}`);
    const language = getCurrentLanguage();
    toast.info(
      tr(
        '检测到新版本，正在自动更新并重启…',
        'New version found. Updating and restarting…',
        language,
      ),
    );

    await update.downloadAndInstall();
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch (error) {
    logger.error(
      'UPDATER',
      'Failed to check desktop updates',
      undefined,
      normalizeUnknownError(error),
    );
  }
}

export async function checkForUpdates(): Promise<void> {
  if (!isTauriDesktop) return;
  await checkDesktopUpdates();
}
