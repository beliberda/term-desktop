import type { SftpEntry } from '@/types';
import { safeInvoke } from './client';

export async function sftpListDir(
  connectionId: string,
  path: string,
): Promise<SftpEntry[]> {
  return safeInvoke<SftpEntry[]>('sftp_list_dir', { connectionId, path });
}

export async function sftpUpload(
  connectionId: string,
  localPath: string,
  remotePath: string,
): Promise<void> {
  await safeInvoke('sftp_upload', { connectionId, localPath, remotePath });
}

export async function sftpDownload(
  connectionId: string,
  remotePath: string,
  localPath: string,
  isDirectory: boolean,
): Promise<void> {
  await safeInvoke('sftp_download', {
    connectionId,
    remotePath,
    localPath,
    isDirectory,
  });
}

export async function sftpMkdir(
  connectionId: string,
  remotePath: string,
): Promise<void> {
  await safeInvoke('sftp_mkdir', { connectionId, remotePath });
}
