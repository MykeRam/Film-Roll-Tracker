type AuthMode = 'login' | 'register';

type AuthFormState = {
  name: string;
  email: string;
  password: string;
};

type AuthPanelProps = {
  mode: AuthMode;
  form: AuthFormState;
  loading: boolean;
  error: string | null;
  onModeChange: (mode: AuthMode) => void;
  onFieldChange: (field: keyof AuthFormState, value: string) => void;
  onSubmit: () => void;
};

export function AuthPanel({ mode, form, loading, error, onModeChange, onFieldChange, onSubmit }: AuthPanelProps) {
  return (
    <section className="panel auth-panel">
      <div className="section-heading">
        <p className="eyebrow">Private workspace</p>
        <h2>Sign up or log in to manage your own rolls</h2>
        <p>
          Every account gets its own roll library. Only the signed-in user can edit or delete the rolls they own, and
          starter rolls are created automatically on sign up.
        </p>
      </div>

      <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          className={mode === 'register' ? 'primary-button' : 'secondary-button'}
          onClick={() => onModeChange('register')}
        >
          Sign up
        </button>
        <button
          type="button"
          className={mode === 'login' ? 'primary-button' : 'secondary-button'}
          onClick={() => onModeChange('login')}
        >
          Log in
        </button>
      </div>

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {mode === 'register' ? (
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(event) => onFieldChange('name', event.target.value)} placeholder="Myke Ramirez" />
          </label>
        ) : null}
        <label className="field">
          <span>Email</span>
          <input value={form.email} onChange={(event) => onFieldChange('email', event.target.value)} placeholder="you@example.com" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            value={form.password}
            onChange={(event) => onFieldChange('password', event.target.value)}
            type="password"
            placeholder="At least 8 characters"
          />
        </label>

        {error ? <p className="auth-error">{error}</p> : <p className="form-hint">Use the same account to keep your rolls, filters, and edits private.</p>}

        <div className="form-actions">
          <span className="form-hint">JWT auth keeps access scoped to the signed-in user.</span>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Working...' : mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </div>
      </form>
    </section>
  );
}

export type { AuthMode, AuthFormState };
