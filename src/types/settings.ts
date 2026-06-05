import { z } from 'zod';

export const appSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  theme: z.enum(['dark', 'light']),
  terminalFontSize: z.number().int().min(8).max(32),
  terminalFontFamily: z.string().min(1),
  defaultSshPort: z.number().int().min(1).max(65535),
  defaultFtpPort: z.number().int().min(1).max(65535),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export const defaultAppSettings: AppSettings = {
  schemaVersion: 1,
  theme: 'dark',
  terminalFontSize: 14,
  terminalFontFamily: 'Consolas, "Courier New", monospace',
  defaultSshPort: 22,
  defaultFtpPort: 21,
};
