import { safeInvoke } from './client';

export async function openInEditor(
  localPath: string,
  editorPath?: string,
): Promise<void> {
  const trimmed = editorPath?.trim();
  await safeInvoke('open_in_editor', {
    localPath,
    editorPath: trimmed && trimmed.length > 0 ? trimmed : null,
  });
}
