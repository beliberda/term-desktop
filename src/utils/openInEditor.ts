import { Command } from '@tauri-apps/plugin-shell';
import { openPath } from '@tauri-apps/plugin-opener';

export async function openInEditor(localPath: string, editorPath?: string) {
  const exe = editorPath?.trim();
  if (exe) {
    await Command.create(exe, [localPath]).execute();
    return;
  }
  await openPath(localPath);
}

