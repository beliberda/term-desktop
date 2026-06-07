import { z } from 'zod';

export const SHORTCUT_IDS = [
  'connectSession',
  'reconnectTab',
  'closeTab',
  'toggleSidebarTab',
  'fileRefresh',
  'fileRename',
  'fileUpload',
  'fileDownload',
  'focusLocalPane',
  'focusRemotePane',
  'fileSelectAll',
  'toggleWorkspaceView',
] as const;

export type ShortcutId = (typeof SHORTCUT_IDS)[number];

export type ShortcutScope = 'global' | 'fileMode';

export const SHORTCUT_SCOPES: Record<ShortcutId, ShortcutScope> = {
  connectSession: 'global',
  reconnectTab: 'global',
  closeTab: 'global',
  toggleSidebarTab: 'global',
  fileRefresh: 'fileMode',
  fileRename: 'fileMode',
  fileUpload: 'fileMode',
  fileDownload: 'fileMode',
  focusLocalPane: 'fileMode',
  focusRemotePane: 'fileMode',
  fileSelectAll: 'fileMode',
  toggleWorkspaceView: 'fileMode',
};

export const shortcutIdSchema = z.enum(SHORTCUT_IDS);

export const defaultShortcuts: Record<ShortcutId, string> = {
  connectSession: 'Ctrl+T',
  reconnectTab: 'Ctrl+R',
  closeTab: 'Ctrl+W',
  toggleSidebarTab: 'Ctrl+B',
  fileRefresh: 'F5',
  fileRename: 'F2',
  fileUpload: 'Ctrl+U',
  fileDownload: 'Ctrl+D',
  focusLocalPane: 'Ctrl+1',
  focusRemotePane: 'Ctrl+2',
  fileSelectAll: 'Ctrl+A',
  toggleWorkspaceView: 'Ctrl+Shift+T',
};

export const shortcutsConfigSchema = z.object({
  connectSession: z.string(),
  reconnectTab: z.string(),
  closeTab: z.string(),
  toggleSidebarTab: z.string(),
  fileRefresh: z.string(),
  fileRename: z.string(),
  fileUpload: z.string(),
  fileDownload: z.string(),
  focusLocalPane: z.string(),
  focusRemotePane: z.string(),
  fileSelectAll: z.string(),
  toggleWorkspaceView: z.string(),
});

export type ShortcutsConfig = z.infer<typeof shortcutsConfigSchema>;
