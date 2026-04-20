import type { AnalyticsOverview } from '../types';
import { StatCard } from './StatCard';

type AnalyticsPanelProps = {
  analytics: AnalyticsOverview | null;
  loading: boolean;
};

function formatEventType(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function AnalyticsPanel({ analytics, loading }: AnalyticsPanelProps) {
  return (
    <section className="panel analytics-panel">
      <div className="section-heading">
        <p className="eyebrow">Analytics</p>
        <h2>Deeper roll signals from live data</h2>
        <p>
          These cards are powered by the database-backed activity, upload, and roll tables. They summarize progress,
          usage patterns, and the latest changes in the account.
        </p>
      </div>

      {loading ? <p className="panel-note">Loading analytics...</p> : null}

      {analytics ? (
        <>
          <div className="analytics-stats">
            <StatCard label="Total rolls" value={analytics.summary.totalRolls} detail="Across the account" tone="gold" />
            <StatCard label="Open rolls" value={analytics.summary.openRolls} detail="Still loaded or shot" tone="sage" />
            <StatCard label="Uploads" value={analytics.summary.totalUploads} detail="Scan previews attached" tone="clay" />
            <StatCard
              label="Average age"
              value={analytics.summary.averageRollAgeDays === null ? 'N/A' : `${analytics.summary.averageRollAgeDays} days`}
              detail="Average time since loading"
              tone="gold"
            />
          </div>

          <div className="analytics-layout">
            <div className="analytics-stack">
              <article className="analytics-card">
                <h3>Top cameras</h3>
                <ul className="analytics-list">
                  {analytics.topCameras.length > 0 ? (
                    analytics.topCameras.map((bucket) => (
                      <li key={bucket.label}>
                        <span>{bucket.label}</span>
                        <strong>{bucket.count}</strong>
                      </li>
                    ))
                  ) : (
                    <li className="analytics-empty">No cameras yet.</li>
                  )}
                </ul>
              </article>

              <article className="analytics-card">
                <h3>Top film stocks</h3>
                <ul className="analytics-list">
                  {analytics.topFilmStocks.length > 0 ? (
                    analytics.topFilmStocks.map((bucket) => (
                      <li key={bucket.label}>
                        <span>{bucket.label}</span>
                        <strong>{bucket.count}</strong>
                      </li>
                    ))
                  ) : (
                    <li className="analytics-empty">No film stocks yet.</li>
                  )}
                </ul>
              </article>
            </div>

            <div className="analytics-stack">
              <article className="analytics-card">
                <h3>Monthly rolls</h3>
                <div className="analytics-bars">
                  {analytics.monthlyRolls.length > 0 ? (
                    analytics.monthlyRolls.map((bucket) => (
                      <div key={bucket.label} className="analytics-bar">
                        <div className="analytics-bar__meta">
                          <span>{bucket.label}</span>
                          <strong>{bucket.count}</strong>
                        </div>
                        <div className="analytics-bar__track" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, bucket.count * 18)}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="analytics-empty">No roll activity yet.</p>
                  )}
                </div>
              </article>

              <article className="analytics-card">
                <h3>Monthly uploads</h3>
                <div className="analytics-bars">
                  {analytics.monthlyUploads.length > 0 ? (
                    analytics.monthlyUploads.map((bucket) => (
                      <div key={bucket.label} className="analytics-bar">
                        <div className="analytics-bar__meta">
                          <span>{bucket.label}</span>
                          <strong>{bucket.count}</strong>
                        </div>
                        <div className="analytics-bar__track" aria-hidden="true">
                          <span style={{ width: `${Math.min(100, bucket.count * 18)}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="analytics-empty">No uploads yet.</p>
                  )}
                </div>
              </article>
            </div>
          </div>

          <article className="analytics-card analytics-card--wide">
            <h3>Recent activity</h3>
            <ul className="activity-feed">
              {analytics.recentActivity.length > 0 ? (
                analytics.recentActivity.map((activity) => (
                  <li key={activity.id} className="activity-feed__item">
                    <div className="activity-feed__meta">
                      <span>{formatEventType(activity.eventType)}</span>
                      <time dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
                    </div>
                    <strong>{activity.summary}</strong>
                  </li>
                ))
              ) : (
                <li className="analytics-empty">No activity yet.</li>
              )}
            </ul>
          </article>
        </>
      ) : null}
    </section>
  );
}
