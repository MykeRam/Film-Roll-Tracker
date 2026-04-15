import type { RollDraft, RollStatus } from '../types';

type RollFormProps = {
  draft: RollDraft;
  mode: 'create' | 'edit';
  loading: boolean;
  errors: Partial<Record<keyof RollDraft, string>>;
  onFieldChange: (field: keyof RollDraft, value: string) => void;
  onStatusChange: (value: RollStatus) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

const statuses: { value: RollStatus; label: string }[] = [
  { value: 'loaded', label: 'Loaded' },
  { value: 'shot', label: 'Shot' },
  { value: 'developed', label: 'Developed' },
  { value: 'scanned', label: 'Scanned' },
];

export function RollForm({ draft, mode, loading, errors, onFieldChange, onStatusChange, onSubmit, onCancel }: RollFormProps) {
  return (
    <form
      className="panel form-panel"
      id="roll-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="section-heading">
        <p className="eyebrow">Quick add</p>
        <h2>{mode === 'edit' ? 'Edit roll entry' : 'Log a new roll'}</h2>
        <p>Capture the roll, then update the status as it moves from loaded to scanned. Fields marked * are required.</p>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Roll title *</span>
          <input
            value={draft.title}
            onChange={(event) => onFieldChange('title', event.target.value)}
            placeholder="City walk, studio test, road trip..."
          />
          {errors.title ? <span className="field-error">{errors.title}</span> : null}
        </label>
        <label className="field">
          <span>Camera *</span>
          <input value={draft.camera} onChange={(event) => onFieldChange('camera', event.target.value)} placeholder="Nikon FM2" />
          {errors.camera ? <span className="field-error">{errors.camera}</span> : null}
        </label>
        <label className="field">
          <span>Lens *</span>
          <input value={draft.lens} onChange={(event) => onFieldChange('lens', event.target.value)} placeholder="50mm f/1.8" />
          {errors.lens ? <span className="field-error">{errors.lens}</span> : null}
        </label>
        <label className="field">
          <span>Film stock *</span>
          <input
            value={draft.filmStock}
            onChange={(event) => onFieldChange('filmStock', event.target.value)}
            placeholder="Portra 400"
          />
          {errors.filmStock ? <span className="field-error">{errors.filmStock}</span> : null}
        </label>
        <label className="field">
          <span>ISO *</span>
          <input value={draft.iso} onChange={(event) => onFieldChange('iso', event.target.value)} inputMode="numeric" placeholder="400" />
          {errors.iso ? <span className="field-error">{errors.iso}</span> : null}
        </label>
        <label className="field">
          <span>Date loaded *</span>
          <input value={draft.dateLoaded} onChange={(event) => onFieldChange('dateLoaded', event.target.value)} type="date" />
          {errors.dateLoaded ? <span className="field-error">{errors.dateLoaded}</span> : null}
        </label>
        <label className="field">
          <span>Status</span>
          <select value={draft.status} onChange={(event) => onStatusChange(event.target.value as RollStatus)}>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field field--full">
        <span>Notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => onFieldChange('notes', event.target.value)}
          placeholder="Metering notes, lighting setup, favorite frames, development reminders..."
          rows={4}
        />
      </label>

      <div className="form-actions">
        <p className="form-hint">This scaffold is wired for local state now and can be switched to an API later.</p>
        <div className="form-actions__buttons">
          {mode === 'edit' ? (
            <button className="secondary-button" type="button" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          ) : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Saving...' : mode === 'edit' ? 'Update roll' : 'Save roll'}
          </button>
        </div>
      </div>
    </form>
  );
}
