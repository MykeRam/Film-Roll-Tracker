type AuthMode = 'login' | 'register';

type AuthFormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type AuthPanelProps = {
  mode: AuthMode;
  form: AuthFormState;
  loading: boolean;
  error: string | null;
  emailError: string | null;
  canSubmit: boolean;
  onModeChange: (mode: AuthMode) => void;
  onFieldChange: (field: keyof AuthFormState, value: string) => void;
  onSubmit: () => void;
};

export function AuthPanel({
  mode,
  form,
  loading,
  error,
  emailError,
  canSubmit,
  onModeChange,
  onFieldChange,
  onSubmit,
}: AuthPanelProps) {
  return (
    <section className="panel auth-panel">
      <div className="section-heading">
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
            <input
              value={form.name}
              onChange={(event) => onFieldChange('name', event.target.value)}
              autoComplete="name"
              placeholder="Myke Ramirez"
            />
          </label>
        ) : null}
        <label className="field">
          <span>Email</span>
          <input
            value={form.email}
            onChange={(event) => onFieldChange('email', event.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          {emailError ? <span className="field-error">{emailError}</span> : null}
        </label>
        <label className="field">
          <span>Password</span>
          <input
            value={form.password}
            onChange={(event) => onFieldChange('password', event.target.value)}
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            placeholder="At least 8 characters"
          />
        </label>
        {mode === 'register' ? (
          <label className="field">
            <span>Confirm password</span>
            <input
              value={form.confirmPassword}
              onChange={(event) => onFieldChange('confirmPassword', event.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
            />
          </label>
        ) : null}

        {error ? (
          <p className="auth-error">{error}</p>
        ) : (
          <p className="form-hint">Use the same account to keep your rolls, filters, and edits private.</p>
        )}

        <div className="form-actions">
          <span className="form-hint">JWT auth keeps access scoped to the signed-in user.</span>
          <button className="primary-button" type="submit" disabled={loading || !canSubmit}>
            {loading ? 'Working...' : mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </div>
      </form>
    </section>
  );
}

export type { AuthMode, AuthFormState };
