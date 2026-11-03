/** Types for the shared JavaScript components the Real Estate module reuses. */
declare module '*/components/common/PageShell.jsx' {
  import type { ComponentType, ReactNode } from 'react';
  const PageShell: ComponentType<{
    title: ReactNode; eyebrow?: ReactNode; intro?: ReactNode; crumbs?: [string | null, string][];
    actions?: ReactNode; children?: ReactNode; narrow?: boolean; bare?: boolean; className?: string;
  }>;
  export default PageShell;
  export const EmptyState: ComponentType<{ icon?: string; title: ReactNode; children?: ReactNode }>;
  export const SkeletonGrid: ComponentType<{ count?: number }>;
}

declare module '*/components/common/LoadingSpinner.jsx' {
  import type { ComponentType } from 'react';
  const LoadingSpinner: ComponentType<{ size?: 'sm' | 'md' | 'lg'; text?: string; className?: string }>;
  export default LoadingSpinner;
}

declare module '*/pages/NotFoundPage.jsx' {
  import type { ComponentType } from 'react';
  const NotFoundPage: ComponentType;
  export default NotFoundPage;
}
