import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthPanel, type AuthFormState, type AuthMode } from './components/AuthPanel';
import { RollForm } from './components/RollForm';
import { RollTable } from './components/RollTable';
import { StatCard } from './components/StatCard';
import {
  createRoll,
  deleteRoll as apiDeleteRoll,
  getSession,
  isRollOwner,
  listRolls,
  login,
  register,
  updateRoll,
} from './lib/api';
import type { AuthSession, FilmRoll, RollDraft, RollStatus, User } from './types';

const TOKEN_KEY = 'film-roll-tracker-token';

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialDraft(): RollDraft {
  return {
    title: '',
    camera: '',
    lens: '',
    filmStock: '',
    iso: '400',
    status: 'loaded',
    dateLoaded: todayValue(),
    notes: '',
  };
}

function createInitialAuthForm(): AuthFormState {
  return {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatAuthError(message: string, mode: AuthMode) {
  if (mode !== 'login') {
    return message;
  }

  if (message.includes('8 character') || message.includes('Validation failed')) {
    return 'Invalid email or password.';
  }

  return message;
}

const statusOrder: RollStatus[] = ['loaded', 'shot', 'developed', 'scanned'];

const landingDemoMetrics = [
  { label: 'Loaded rolls', value: '6 loaded', percent: 25, tone: 'gold' },
  { label: 'Developed rolls', value: '16 developed', percent: 67, tone: 'sage' },
  { label: 'Scanned rolls', value: '8 scanned', percent: 33, tone: 'clay' },
  { label: 'Private access', value: 'JWT protected', percent: 100, tone: 'gold' },
] as const;

const landingDemoBadges = ['24 rolls logged', '3 camera bodies', '5 film stocks', 'Owners-only edits'];

function formatCount(value: number, noun: string) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

export default function App() {
  const [appLoading, setAppLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [rolls, setRolls] = useState<FilmRoll[]>([]);
  const [draft, setDraft] = useState<RollDraft>(createInitialDraft);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RollStatus | 'all'>('all');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [authForm, setAuthForm] = useState<AuthFormState>(createInitialAuthForm);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [rollLoading, setRollLoading] = useState(false);
  const [rollError, setRollError] = useState<string | null>(null);
  const authNoticeTimerRef = useRef<number | null>(null);

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setSessionUser(null);
    setRolls([]);
    setDraft(createInitialDraft());
    setEditingId(null);
    setAuthError(null);
    setAuthNotice(null);
    setRollError(null);
  };

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!token || sessionUser) {
        if (active) {
          setAppLoading(false);
        }
        return;
      }

      try {
        const [session, userRolls] = await Promise.all([getSession(token), listRolls(token)]);

        if (!active) {
          return;
        }

        if (!session.user) {
          clearSession();
          return;
        }

        setSessionUser(session.user);
        setRolls(userRolls);
      } catch {
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setAppLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [sessionUser, token]);

  useEffect(() => {
    return () => {
      if (authNoticeTimerRef.current) {
        window.clearTimeout(authNoticeTimerRef.current);
      }
    };
  }, []);

  const handleAuthFieldChange = (field: keyof AuthFormState, value: string) => {
    setAuthForm((current) => ({
      ...current,
      [field]: value,
    }));
    setAuthError(null);
  };

  const handleAuthModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError(null);
  };

  const authCanSubmit = useMemo(() => {
    const email = authForm.email.trim();
    const password = authForm.password;
    const name = authForm.name.trim();
    const emailIsValid = isValidEmail(email);

    if (authMode === 'register') {
      return Boolean(name) && emailIsValid && password.length >= 8 && password === authForm.confirmPassword;
    }

    return emailIsValid && Boolean(password);
  }, [authForm.confirmPassword, authForm.email, authForm.name, authForm.password, authMode]);

  const authEmailError = useMemo(() => {
    const email = authForm.email.trim();

    if (!email) {
      return null;
    }

    return isValidEmail(email) ? null : 'Please enter a valid email address.';
  }, [authForm.email]);

  const handleAuthSubmit = async () => {
    const email = authForm.email.trim();
    const password = authForm.password;
    const name = authForm.name.trim();

    if (authMode === 'register') {
      if (!name) {
        setAuthError('Please enter your name.');
        return;
      }
    } else {
      if (!password) {
        setAuthError('Please enter your password.');
        return;
      }
    }

    if (!email) {
      setAuthError('Please enter your email.');
      return;
    }

    if (!isValidEmail(email)) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8 && authMode === 'register') {
      setAuthError('Password must be at least 8 characters.');
      return;
    }

    if (authMode === 'register' && password !== authForm.confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const session: AuthSession =
        authMode === 'register'
          ? await register({
              name,
              email,
              password,
            })
          : await login({
              email,
              password,
            });
      localStorage.setItem(TOKEN_KEY, session.token);
      setToken(session.token);
      setSessionUser(session.user);
      setAuthForm(createInitialAuthForm());
      setDraft(createInitialDraft());
      setEditingId(null);
      setAppLoading(false);
      setAuthNotice(authMode === 'register' ? 'Account created. Welcome to your dashboard.' : 'Logged in. Welcome back.');

      if (authNoticeTimerRef.current) {
        window.clearTimeout(authNoticeTimerRef.current);
      }

      authNoticeTimerRef.current = window.setTimeout(() => {
        setAuthNotice(null);
        authNoticeTimerRef.current = null;
      }, 2800);

      try {
        setRolls(await listRolls(session.token));
      } catch {
        setRollError('Signed in, but we could not load your rolls yet.');
      }

      setAuthLoading(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to authenticate.';
      setAuthError(formatAuthError(message, authMode));
      setAuthLoading(false);
    } finally {
      setAppLoading(false);
    }
  };

  const handleLogout = () => {
    if (authNoticeTimerRef.current) {
      window.clearTimeout(authNoticeTimerRef.current);
      authNoticeTimerRef.current = null;
    }
    clearSession();
    setAuthError(null);
    setRollError(null);
    setAuthForm(createInitialAuthForm());
    setAuthMode('login');
  };

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
    setDraft(createInitialDraft());
    setRollError(null);
  };

  const requireToken = () => {
    if (!token || !sessionUser) {
      throw new Error('You need to sign in again.');
    }

    return token;
  };

  const buildRollPayload = (current: RollDraft) => ({
    title: current.title.trim(),
    camera: current.camera.trim(),
    lens: current.lens.trim(),
    filmStock: current.filmStock.trim(),
    iso: current.iso,
    status: current.status,
    dateLoaded: current.dateLoaded,
    notes: current.notes.trim(),
  });

  const handleSubmit = async () => {
    const currentToken = requireToken();
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

    setRollLoading(true);
    setRollError(null);

    try {
      const payload = buildRollPayload(draft);

      if (editingId) {
        const existingRoll = rolls.find((roll) => roll.id === editingId);

        if (!existingRoll) {
          throw new Error('Roll not found.');
        }

        if (!isRollOwner(existingRoll, sessionUser?.id)) {
          throw new Error('You can only edit your own rolls.');
        }

        const updatedRoll = await updateRoll(currentToken, editingId, payload);
        setRolls((current) => current.map((roll) => (roll.id === editingId ? updatedRoll : roll)));
      } else {
        const createdRoll = await createRoll(currentToken, payload);
        setRolls((current) => [createdRoll, ...current]);
      }

      resetDraft();
    } catch (error) {
      setRollError(error instanceof Error ? error.message : 'Unable to save this roll.');
    } finally {
      setRollLoading(false);
    }
  };

  const handleEdit = (roll: FilmRoll) => {
    if (!isRollOwner(roll, sessionUser?.id)) {
      setRollError('You can only edit your own rolls.');
      return;
    }

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
    setRollError(null);
  };

  const updateStatus = async (id: string, status: RollStatus) => {
    const currentToken = requireToken();
    const targetRoll = rolls.find((roll) => roll.id === id);

    if (!targetRoll) {
      return;
    }

    if (!isRollOwner(targetRoll, sessionUser?.id)) {
      setRollError('You can only edit your own rolls.');
      return;
    }

    setRollError(null);

    try {
      const updatedRoll = await updateRoll(currentToken, id, {
        title: targetRoll.title,
        camera: targetRoll.camera,
        lens: targetRoll.lens,
        filmStock: targetRoll.filmStock,
        iso: String(targetRoll.iso),
        status,
        dateLoaded: targetRoll.dateLoaded,
        notes: targetRoll.notes,
      });

      setRolls((current) => current.map((roll) => (roll.id === id ? updatedRoll : roll)));
    } catch (error) {
      setRollError(error instanceof Error ? error.message : 'Unable to update this roll.');
    }
  };

  const deleteRoll = async (id: string) => {
    const currentToken = requireToken();
    const targetRoll = rolls.find((roll) => roll.id === id);

    if (!targetRoll) {
      return;
    }

    if (!isRollOwner(targetRoll, sessionUser?.id)) {
      setRollError('You can only delete your own rolls.');
      return;
    }

    setRollError(null);

    try {
      await apiDeleteRoll(currentToken, id);
      setRolls((current) => current.filter((roll) => roll.id !== id));

      if (editingId === id) {
        resetDraft();
      }
    } catch (error) {
      setRollError(error instanceof Error ? error.message : 'Unable to delete this roll.');
    }
  };

  if (appLoading) {
    return (
      <div className="app-shell">
        <main className="app">
          <section className="panel auth-panel auth-panel--loading">
            <p className="eyebrow">Film Roll Tracker</p>
            <h1>Loading your workspace</h1>
            <p className="hero__lede">Restoring your session and roll library.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="app-shell">
        <main className="landing-shell">
          <section className="landing-hero panel">
            <img className="landing-hero__image" src="/hero.jpg" alt="" aria-hidden="true" />
            <div className="landing-hero__overlay" />
            <div className="landing-hero__content">
              <header className="landing-header">
                <span className="landing-brand">Film Roll Tracker</span>
                <button
                  className="primary-button landing-signup-button"
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Sign up
                </button>
              </header>

              <div className="landing-hero__center">
                <h1>Film Roll Tracker</h1>
                <p className="landing-hero__subtitle">
                  Track every roll and organize your shooting history.
                </p>
              </div>
            </div>
          </section>
          <section className="landing-split">
            <div className="landing-split__grid app">
              <aside className="panel landing-demo" aria-label="Demo stats">
                <div className="section-heading">
                  <p className="eyebrow">Demo stats</p>
                  <h2>See what the app can track</h2>
                  <p>
                    This example shows the kind of roll history, workflow tracking, and analytics a logged-in user can
                    manage inside their own account.
                  </p>
                </div>

                <div className="landing-demo__progress">
                  {landingDemoMetrics.map((metric) => (
                    <article key={metric.label} className={`demo-progress demo-progress--${metric.tone}`}>
                      <div className="demo-progress__row">
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </div>
                      <div className="demo-progress__track" aria-hidden="true">
                        <div className="demo-progress__fill" style={{ width: `${metric.percent}%` }} />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="landing-demo__badges" aria-label="Example highlights">
                  {landingDemoBadges.map((badge) => (
                    <span key={badge} className="demo-badge">
                      {badge}
                    </span>
                  ))}
                </div>
              </aside>

              <div className="landing-auth-column" id="signup">
              <AuthPanel
                mode={authMode}
                form={authForm}
                loading={authLoading}
                error={authError}
                emailError={authEmailError}
                canSubmit={authCanSubmit}
                onModeChange={handleAuthModeChange}
                onFieldChange={handleAuthFieldChange}
                onSubmit={() => {
                  void handleAuthSubmit();
                }}
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app">
        {authNotice ? <p className="dashboard-notice">{authNotice}</p> : null}
        <header className="hero panel">
          <div className="hero__copy">
            <p className="eyebrow">Welcome back, {sessionUser.name}!</p>
            <h1>Film Roll Tracker</h1>
            <p className="hero__lede">
              A portfolio-ready tracker for film photographers to log rolls, record camera, lens, stock, and date
              loaded, update development status, and keep editing rights scoped to the signed-in user.
            </p>

            <div className="hero__actions">
              <a className="primary-button" href="#roll-form">
                Add a roll
              </a>
              <a className="secondary-button" href="#roll-library">
                View library
              </a>
              <button className="ghost-button" type="button" onClick={handleLogout}>
                Log out
              </button>
            </div>

            <div className="mini-summary">
              <div>
                <span>Access control</span>
                <strong>Only owners can edit and delete</strong>
              </div>
              <div>
                <span>Session</span>
                <strong>{sessionUser.email}</strong>
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
                <StatCard label="Most-used camera" value={stats.favoriteCamera} detail="Based on your library" tone="sage" />
                <StatCard label="Favorite stock" value={stats.favoriteFilm} detail="Most frequent film in your account" tone="clay" />
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
              <span>{formatCount(stats.scannedRolls, 'scanned roll')} already archived in your account</span>
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

        {rollError ? <p className="panel-note panel-note--error">{rollError}</p> : null}

        <RollForm
          draft={draft}
          mode={editingId ? 'edit' : 'create'}
          loading={rollLoading}
          onFieldChange={handleFieldChange}
          onStatusChange={(value) => handleFieldChange('status', value)}
          onSubmit={() => {
            void handleSubmit();
          }}
          onCancel={resetDraft}
        />

        <RollTable
          rolls={visibleRolls}
          currentUserId={sessionUser.id}
          onEdit={handleEdit}
          onStatusChange={(id, status) => {
            void updateStatus(id, status);
          }}
          onDelete={(id) => {
            void deleteRoll(id);
          }}
        />

        <section className="panel roadmap-panel">
          <div className="section-heading">
            <p className="eyebrow">Roadmap</p>
            <h2>Scaffold ready for the next layer</h2>
            <p>
              The front-end foundation is in place. The next step is wiring this model to a database, then connecting
              the frontend to uploads, activity history, and deeper analytics.
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
