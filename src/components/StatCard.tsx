import type { CSSProperties, ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'gold' | 'sage' | 'clay';
  style?: CSSProperties;
  className?: string;
};

export function StatCard({ label, value, detail, tone = 'gold', style, className }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}${className ? ` ${className}` : ''}`} style={style}>
      <p className="stat-card__label">{label}</p>
      <h3 className="stat-card__value">{value}</h3>
      <p className="stat-card__detail">{detail}</p>
    </article>
  );
}
