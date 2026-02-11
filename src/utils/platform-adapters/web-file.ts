import type { PlatformFileAdapter } from './types';

export const webFileAdapter: PlatformFileAdapter = {
  getCapabilities() {
    return {
      canSaveFile: typeof document !== 'undefined',
      canOpenFile: typeof document !== 'undefined',
    };
  },

  async saveFile(data: string, defaultName: string): Promise<boolean> {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  },

  async openFile(extensions: string[]): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = extensions.map((e) => `.${e}`).join(',');

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  },
};
