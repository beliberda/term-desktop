import type { DragEvent, MouseEvent } from 'react';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import type { SftpEntry } from '@/types';
import type { LocalBrowserStore } from '@stores/LocalBrowserStore';
import type { RemoteBrowserStore } from '@stores/RemoteBrowserStore';
import { FileBreadcrumbs } from '@components/fileTransfer/FileBreadcrumbs/FileBreadcrumbs';
import { FileTable } from '@components/fileTransfer/FileTable/FileTable';
import { FilePaneContextMenu } from '@components/fileTransfer/FilePaneContextMenu/FilePaneContextMenu';
import styles from './FilePane.module.css';

type PaneStore = LocalBrowserStore | RemoteBrowserStore;

interface FilePaneProps {
  side: 'local' | 'remote';
  store: PaneStore;
  dropActive: boolean;
  onFocus: () => void;
  onDrop: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onUpload?: () => void;
  onDownload?: () => void;
  onOpen?: (entry: SftpEntry) => void;
}

export const FilePane = observer(function FilePane({
  side,
  store,
  dropActive,
  onFocus,
  onDrop,
  onDragOver,
  onUpload,
  onDownload,
  onOpen,
}: FilePaneProps) {
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState<{
    entry: SftpEntry | null;
    x: number;
    y: number;
  } | null>(null);

  const paneLabel =
    side === 'local'
      ? t('fileTransfer.localPane')
      : t('fileTransfer.remotePane');

  const handleContextMenu = (e: MouseEvent, entry: SftpEntry | null) => {
    e.preventDefault();
    setContextMenu({ entry, x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (e: DragEvent, entry: SftpEntry) => {
    e.dataTransfer.setData(
      'application/termassh-files',
      JSON.stringify({
        side,
        paths: [entry.path],
        names: [entry.name],
        isDirectories: [entry.isDirectory],
        sizes: [entry.size],
        modifiedAts: [entry.modifiedAt ?? ''],
      }),
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleOpen = (entry: SftpEntry) => {
    if (entry.isDirectory) {
      store.navigateTo(entry.path);
      return;
    }
    if (side === 'remote' && onOpen) {
      void onOpen(entry);
    }
  };

  return (
    <div className={styles.pane}>
      <div className={styles.paneTitle}>{paneLabel}</div>
      <FileBreadcrumbs
        crumbs={store.breadcrumbs}
        onNavigate={(path) => store.navigateTo(path)}
      />
      <FileTable
        entries={store.entries}
        cwd={store.cwd}
        selectedPaths={store.selectedPaths}
        renameTargetPath={store.renameTargetPath}
        renameDraft={store.renameDraft}
        isLoading={store.isLoading}
        focused={store.focused}
        paneLabel={paneLabel}
        onSelect={(entry, opts) => store.selectEntry(entry, opts)}
        onNavigateUp={() => store.navigateUp()}
        onOpen={handleOpen}
        onContextMenu={handleContextMenu}
        onRenameDraftChange={(v) => {
          store.renameDraft = v;
        }}
        onCommitRename={() => void store.commitRename()}
        onCancelRename={() => store.cancelRename()}
        onFocus={onFocus}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragStart={handleDragStart}
        dropActive={dropActive}
      />
      {contextMenu && (
        <FilePaneContextMenu
          side={side}
          entry={contextMenu.entry}
          anchor={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onRefresh={() => store.refresh()}
          onMkdir={() => {
            const name = window.prompt(t('files.mkdir.prompt'));
            if (name) void store.mkdir(name);
          }}
          onUpload={onUpload}
          onDownload={onDownload}
          onOpen={onOpen}
          onRename={(entry) => store.startRename(entry)}
          onDelete={(entry) => void store.deleteEntry(entry)}
          onCopyPath={(path) => void store.copyPath(path)}
        />
      )}
    </div>
  );
});
