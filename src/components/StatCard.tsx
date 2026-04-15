import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'gold' | 'sage' | 'clay';
};

export function StatCard({ label, value, detail, tone = 'gold' }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <p className="stat-card__label">{label}</p>
      <h3 className="stat-card__value">{value}</h3>
      <p className="stat-card__detail">{detail}</p>
    </article>
  );
}
