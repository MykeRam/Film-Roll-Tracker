import { useMemo, useState } from 'react';
import { RollForm } from './components/RollForm';
import { RollTable } from './components/RollTable';
import { StatCard } from './components/StatCard';
import { mockRolls } from './data/mockRolls';
import type { FilmRoll, RollDraft, RollStatus } from './types';

const initialDraft: RollDraft = {
  title: '',
  camera: '',
  lens: '',
  filmStock: '',
  iso: '400',
  status: 'loaded',
  dateLoaded: new Date().toISOString().slice(0, 10),
  notes: '',
};

const statusOrder: RollStatus[] = ['loaded', 'shot', 'developed', 'scanned'];

function formatCount(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function toId(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now());
  return `${prefix}-${suffix}`;
}

export default function App() {
  const [rolls, setRolls] = useState<FilmRoll[]>(mockRolls);
  const [draft, setDraft] = useState<RollDraft>(initialDraft);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RollStatus | 'all'>('all');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  const cameraOptions = useMemo(() => [...new Set(rolls.map((roll) => roll.camera))].sort(), [rolls]);
  const stockOptions = useMemo(() => [...new Set(rolls.map((roll) => roll.filmStock))].sort(), [rolls]);

  const visibleRolls = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rolls.filter((roll) => {
      const matchesStatus = statusFilter === 'all' || roll.status === statusFilter;
      const matchesCamera = cameraFilter === 'all' || roll.camera === cameraFilter;
      const matchesStock = stockFilter === 'all' || roll.filmStock === stockFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [roll.title, roll.camera, roll.lens, roll.filmStock, roll.notes].join(' ').toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesCamera && matchesStock && matchesQuery;
    });
  }, [cameraFilter, query, rolls, stockFilter, statusFilter]);

  const stats = useMemo(() => {
    const rollCount = rolls.length;
    const loadedRolls = rolls.filter((roll) => roll.status === 'loaded').length;
    const shotRolls = rolls.filter((roll) => roll.status === 'shot').length;
    const developedRolls = rolls.filter((roll) => roll.status === 'developed').length;
    const scannedRolls = rolls.filter((roll) => roll.status === 'scanned').length;

    const cameraCounts = new Map<string, number>();
    const filmCounts = new Map<string, number>();
    const statusCounts = new Map<RollStatus, number>();

    for (const roll of rolls) {
      cameraCounts.set(roll.camera, (cameraCounts.get(roll.camera) ?? 0) + 1);
      filmCounts.set(roll.filmStock, (filmCounts.get(roll.filmStock) ?? 0) + 1);
      statusCounts.set(roll.status, (statusCounts.get(roll.status) ?? 0) + 1);
    }

    const favoriteCamera = [...cameraCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'No camera yet';
    const favoriteFilm = [...filmCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'No film yet';
    const developmentRate = rollCount === 0 ? 0 : Math.round(((developedRolls + scannedRolls) / rollCount) * 100);

    return {
      rollCount,
      loadedRolls,
      shotRolls,
      developedRolls,
      scannedRolls,
      favoriteCamera,
      favoriteFilm,
      developmentRate,
      statusCounts,
    };
  }, [rolls]);

  const handleFieldChange = (field: keyof RollDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetDraft = () => {
    setEditingId(null);
    setDraft(initialDraft);
  };

  const handleSubmit = () => {
    const isoValue = Number(draft.iso);

    if (
      !draft.title.trim() ||
      !draft.camera.trim() ||
      !draft.lens.trim() ||
      !draft.filmStock.trim() ||
      !draft.dateLoaded.trim() ||
      Number.isNaN(isoValue)
    ) {
      return;
    }

    if (editingId) {
      setRolls((current) =>
        current.map((roll) =>
          roll.id === editingId
            ? {
                ...roll,
                title: draft.title.trim(),
                camera: draft.camera.trim(),
                lens: draft.lens.trim(),
                filmStock: draft.filmStock.trim(),
                iso: isoValue,
                status: draft.status,
                dateLoaded: draft.dateLoaded,
                notes: draft.notes.trim(),
              }
            : roll,
        ),
      );
    } else {
      const nextRoll: FilmRoll = {
        id: toId('roll'),
        title: draft.title.trim(),
        camera: draft.camera.trim(),
        lens: draft.lens.trim(),
        filmStock: draft.filmStock.trim(),
        iso: isoValue,
        status: draft.status,
        dateLoaded: draft.dateLoaded,
        notes: draft.notes.trim(),
      };

      setRolls((current) => [nextRoll, ...current]);
    }

    resetDraft();
  };

  const handleEdit = (roll: FilmRoll) => {
    setEditingId(roll.id);
    setDraft({
      title: roll.title,
      camera: roll.camera,
      lens: roll.lens,
      filmStock: roll.filmStock,
      iso: String(roll.iso),
      status: roll.status,
      dateLoaded: roll.dateLoaded,
      notes: roll.notes,
    });
  };

  const updateStatus = (id: string, status: RollStatus) => {
    setRolls((current) => current.map((roll) => (roll.id === id ? { ...roll, status } : roll)));
  };

  const deleteRoll = (id: string) => {
    setRolls((current) => current.filter((roll) => roll.id !== id));
    if (editingId === id) {
      resetDraft();
    }
  };

  return (
    <div className="app-shell">
      <main className="app">
        <header className="hero panel">
          <div className="hero__copy">
            <p className="eyebrow">Portfolio project scaffold</p>
            <h1>Film Roll Tracker</h1>
            <p className="hero__lede">
              A portfolio-ready tracker for film photographers to log rolls, record camera, lens, stock, and date
              loaded, update development status, and review shooting history from a single dashboard.
            </p>

            <div className="hero__actions">
              <a className="primary-button" href="#roll-form">
                Add a roll
              </a>
              <a className="secondary-button" href="#roll-library">
                View library
              </a>
            </div>

            <div className="mini-summary">
              <div>
                <span>Core focus</span>
                <strong>CRUD + dashboard UX</strong>
              </div>
              <div>
                <span>Future layer</span>
                <strong>Auth, API, analytics</strong>
              </div>
            </div>
          </div>

          <aside className="hero__panel">
            <div className="hero__panel-inner">
              <p className="eyebrow">Current snapshot</p>
              <div className="snapshot-grid">
                <StatCard
                  label="Rolls logged"
                  value={formatCount(stats.rollCount, 'roll')}
                  detail={`${stats.loadedRolls + stats.shotRolls} still active`}
                  tone="gold"
                />
                <StatCard label="Most-used camera" value={stats.favoriteCamera} detail="Based on the current log" tone="sage" />
                <StatCard label="Favorite stock" value={stats.favoriteFilm} detail="Most frequent film in the archive" tone="clay" />
                <StatCard
                  label="Development rate"
                  value={`${stats.developmentRate}%`}
                  detail={`${stats.developedRolls + stats.scannedRolls} rolls past the darkroom`}
                  tone="gold"
                />
              </div>
            </div>
          </aside>
        </header>

        <section className="dashboard-grid">
          <article className="panel insight-panel">
            <div className="section-heading">
              <p className="eyebrow">Workflow</p>
              <h2>Build a roll pipeline that feels real</h2>
              <p>
                The app tracks a roll from loading through scanning, which makes it easy to show product thinking and a
                believable data model in your portfolio.
              </p>
            </div>

            <div className="workflow-bars" aria-label="Workflow status breakdown">
              {statusOrder.map((status) => {
                const count = stats.statusCounts.get(status) ?? 0;
                const percent = rolls.length === 0 ? 0 : (count / rolls.length) * 100;

                return (
                  <div className="workflow-row" key={status}>
                    <div className="workflow-row__meta">
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="workflow-track">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="insight-callout">
              <strong>{formatCount(stats.loadedRolls + stats.shotRolls, 'active roll')}</strong>
              <span>{formatCount(stats.scannedRolls, 'scanned roll')} already archived in the library</span>
            </div>
          </article>

          <article className="panel filters-panel">
            <div className="section-heading">
              <p className="eyebrow">Search</p>
              <h2>Find rolls quickly</h2>
            </div>

            <label className="field">
              <span>Search log</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Camera, lens, film stock, notes..." />
            </label>
            <label className="field">
              <span>Status filter</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as RollStatus | 'all')}>
                <option value="all">All rolls</option>
                <option value="loaded">Loaded</option>
                <option value="shot">Shot</option>
                <option value="developed">Developed</option>
                <option value="scanned">Scanned</option>
              </select>
            </label>
            <label className="field">
              <span>Camera filter</span>
              <select value={cameraFilter} onChange={(event) => setCameraFilter(event.target.value)}>
                <option value="all">All cameras</option>
                {cameraOptions.map((camera) => (
                  <option key={camera} value={camera}>
                    {camera}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Film stock filter</span>
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
                <option value="all">All stocks</option>
                {stockOptions.map((stock) => (
                  <option key={stock} value={stock}>
                    {stock}
                  </option>
                ))}
              </select>
            </label>
            <p className="panel-note">
              {visibleRolls.length} of {rolls.length} rolls match the current filters.
            </p>
          </article>
        </section>

        <section className="stats-grid" aria-label="Dashboard summary">
          <StatCard label="Loaded rolls" value={formatCount(stats.loadedRolls, 'roll')} detail="Still waiting to be shot" tone="gold" />
          <StatCard label="Shot rolls" value={formatCount(stats.shotRolls, 'roll')} detail="Finished shooting, not yet developed" tone="sage" />
          <StatCard label="Developed rolls" value={formatCount(stats.developedRolls, 'roll')} detail="Processed in the darkroom" tone="clay" />
          <StatCard label="Scanned rolls" value={formatCount(stats.scannedRolls, 'roll')} detail="Ready for sharing or archiving" tone="gold" />
        </section>

        <RollForm
          draft={draft}
          mode={editingId ? 'edit' : 'create'}
          onFieldChange={handleFieldChange}
          onStatusChange={(value) => handleFieldChange('status', value)}
          onSubmit={handleSubmit}
          onCancel={resetDraft}
        />

        <RollTable rolls={visibleRolls} onEdit={handleEdit} onStatusChange={updateStatus} onDelete={deleteRoll} />

        <section className="panel roadmap-panel">
          <div className="section-heading">
            <p className="eyebrow">Roadmap</p>
            <h2>Scaffold ready for the next layer</h2>
            <p>
              The front-end foundation is in place. The next step is wiring this model to a database, then layering on
              authentication, uploads, activity history, and better analytics.
            </p>
          </div>

          <div className="roadmap-list">
            <div>
              <span>Data model</span>
              <strong>Rolls, cameras, lenses, film stocks, and status history</strong>
            </div>
            <div>
              <span>Insights</span>
              <strong>Most-used camera, favorite stock, and progress trends</strong>
            </div>
            <div>
              <span>Full-stack path</span>
              <strong>REST API, JWT auth, persistence, and user profiles</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
