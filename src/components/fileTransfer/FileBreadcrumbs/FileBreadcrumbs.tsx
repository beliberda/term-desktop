import styles from './FileBreadcrumbs.module.css';

interface Crumb {
  label: string;
  path: string;
}

interface FileBreadcrumbsProps {
  crumbs: Crumb[];
  onNavigate: (path: string) => void;
}

export function FileBreadcrumbs({ crumbs, onNavigate }: FileBreadcrumbsProps) {
  return (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className={styles.item}>
          {i > 0 && <span className={styles.sep}>/</span>}
          <button
            type="button"
            className={styles.link}
            onClick={() => onNavigate(crumb.path)}
            title={crumb.path}
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </nav>
  );
}
