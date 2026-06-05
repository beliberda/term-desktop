import { z } from 'zod';

export const sftpEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  size: z.number(),
  modifiedAt: z.string().optional(),
});

export type SftpEntry = z.infer<typeof sftpEntrySchema>;
