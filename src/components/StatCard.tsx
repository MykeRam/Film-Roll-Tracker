import type { CSSProperties, ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'gold' | 'sage' | 'clay';
  animate?: boolean;
  delayMs?: number;
  style?: CSSProperties;
  className?: string;
};

export function StatCard({
  label,
  value,
  detail,
  tone = 'gold',
  animate = true,
  delayMs = 0,
  style,
  className,
}: StatCardProps) {
  return (
    <article
      className={`stat-card stat-card--${tone}${className ? ` ${className}` : ''}`}
      style={{
        animation: animate ? undefined : 'none',
        animationDelay: animate ? `${delayMs}ms` : undefined,
        ...style,
      }}
    >
      <p className="stat-card__label">{label}</p>
      <h3 className="stat-card__value">{value}</h3>
      <p className="stat-card__detail">{detail}</p>
    </article>
  );
}
