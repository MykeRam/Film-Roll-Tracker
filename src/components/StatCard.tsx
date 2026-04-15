import type { CSSProperties, ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'gold' | 'sage' | 'clay';
  animate?: boolean;
  delayMs?: number;
  reveal?: boolean;
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
  reveal = false,
  style,
  className,
}: StatCardProps) {
  return (
    <article
      className={`stat-card stat-card--${tone}${reveal ? ' stat-card--reveal' : ''}${className ? ` ${className}` : ''}`}
      style={{
        animation: animate ? undefined : 'none',
        animationDelay: animate ? `${delayMs}ms` : undefined,
        transitionDelay: reveal ? `${delayMs}ms` : undefined,
        ...style,
      }}
    >
      <p className="stat-card__label">{label}</p>
      <h3 className="stat-card__value">{value}</h3>
      <p className="stat-card__detail">{detail}</p>
    </article>
  );
}
