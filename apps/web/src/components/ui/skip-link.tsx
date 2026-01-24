import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Skip link that becomes visible on focus for keyboard users.
 * Allows skipping to main content without tabbing through navigation.
 * WCAG 2.4.1: Bypass Blocks
 */
export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:fixed focus:top-4 focus:left-4 focus:z-[100]',
        'focus:px-4 focus:py-2 focus:rounded-md',
        'focus:bg-primary focus:text-primary-foreground',
        'focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'focus:outline-none',
        'font-medium text-sm',
        className
      )}
    >
      {children}
    </a>
  );
}
