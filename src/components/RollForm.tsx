import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { RollDraft, RollStatus } from '../types';

type RollFormProps = {
  draft: RollDraft;
  mode: 'create' | 'edit';
  loading: boolean;
  submitSuccessTick: number;
  errors: Partial<Record<keyof RollDraft, string>>;
  cameraOptions: ReadonlyArray<{ name: string; imageSrc: string }>;
  cameraPreviewSrc: string | null;
  cameraPreviewLabel: string;
  filmStockOptions: ReadonlyArray<{ name: string; imageSrc?: string }>;
  filmStockPreviewSrc: string | null;
  filmStockPreviewLabel: string;
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

const promptOrder: Array<keyof RollDraft> = ['camera', 'lens', 'filmStock', 'dateLoaded', 'status', 'notes'];

function inferIso(value: string) {
  return value.match(/\d{2,5}/)?.[0] ?? '';
}

export function RollForm({
  draft,
  mode,
  loading,
  submitSuccessTick,
  errors,
  cameraOptions,
  cameraPreviewSrc,
  cameraPreviewLabel,
  filmStockOptions,
  filmStockPreviewSrc,
  filmStockPreviewLabel,
  onFieldChange,
  onStatusChange,
  onSubmit,
  onCancel,
}: RollFormProps) {
  const [visiblePromptCount, setVisiblePromptCount] = useState(mode === 'edit' ? promptOrder.length : 1);
  const [formReady, setFormReady] = useState(mode === 'edit');
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);
  const [successBadgeFading, setSuccessBadgeFading] = useState(false);
  const [successBadgeKey, setSuccessBadgeKey] = useState(0);
  const promptRefs = useRef<Partial<Record<keyof RollDraft, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const successTimersRef = useRef<number[]>([]);
  const visiblePrompts = promptOrder.slice(0, mode === 'edit' ? promptOrder.length : visiblePromptCount);

  useEffect(() => {
    if (mode === 'edit') {
      setVisiblePromptCount(promptOrder.length);
      setFormReady(true);
      setShowSuccessBadge(false);
      setSuccessBadgeFading(false);
      return;
    }

    if (!draft.camera.trim() && !draft.lens.trim() && !draft.filmStock.trim() && !loading) {
      setVisiblePromptCount(1);
      setFormReady(false);
    }
  }, [draft.camera, draft.filmStock, draft.lens, loading, mode]);

  useEffect(() => {
    return () => {
      for (const timer of successTimersRef.current) {
        window.clearTimeout(timer);
      }
      successTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (mode !== 'create' || submitSuccessTick === 0) {
      return;
    }

    for (const timer of successTimersRef.current) {
      window.clearTimeout(timer);
    }
    successTimersRef.current = [];

    setSuccessBadgeKey(submitSuccessTick);
    setShowSuccessBadge(true);
    setSuccessBadgeFading(false);

    const fadeTimer = window.setTimeout(() => {
      setSuccessBadgeFading(true);
    }, 1400);

    const hideTimer = window.setTimeout(() => {
      setShowSuccessBadge(false);
      setSuccessBadgeFading(false);
    }, 2400);

    successTimersRef.current = [fadeTimer, hideTimer];

    return () => {
      for (const timer of [fadeTimer, hideTimer]) {
        window.clearTimeout(timer);
      }
    };
  }, [mode, submitSuccessTick]);

  const focusPrompt = (field: keyof RollDraft) => {
    window.requestAnimationFrame(() => {
      promptRefs.current[field]?.focus();
    });
  };

  const revealNextPrompt = (index: number) => {
    const nextField = promptOrder[index + 1];

    if (!nextField) {
      return;
    }

    if (promptOrder[index] === 'dateLoaded') {
      setVisiblePromptCount(promptOrder.length);
      setFormReady(true);
      focusPrompt('status');
      return;
    }

    setVisiblePromptCount((current) => Math.max(current, index + 2));
    focusPrompt(nextField);
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, index: number) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (index === promptOrder.length - 1) {
      setFormReady(true);
      return;
    }

    revealNextPrompt(index);
  };

  const renderPrompt = (field: keyof RollDraft, index: number) => {
    switch (field) {
      case 'camera':
        return (
          <label className="field prompt-field" key={field}>
            <span>Camera *</span>
            <input
              ref={(node) => {
                promptRefs.current.camera = node;
              }}
              value={draft.camera}
              onChange={(event) => onFieldChange('camera', event.target.value)}
              onKeyDown={(event) => handlePromptKeyDown(event, index)}
              placeholder="Nikon FM2"
              list="camera-options"
            />
            <datalist id="camera-options">
              {cameraOptions.map((camera) => (
                <option key={camera.name} value={camera.name} />
              ))}
            </datalist>
            {errors.camera ? <span className="field-error">{errors.camera}</span> : null}
          </label>
        );
      case 'lens':
        return (
          <label className="field prompt-field" key={field}>
            <span>Lens *</span>
            <input
              ref={(node) => {
                promptRefs.current.lens = node;
              }}
              value={draft.lens}
              onChange={(event) => onFieldChange('lens', event.target.value)}
              onKeyDown={(event) => handlePromptKeyDown(event, index)}
              placeholder="50mm f/1.8"
            />
            {errors.lens ? <span className="field-error">{errors.lens}</span> : null}
          </label>
        );
      case 'filmStock':
        return (
          <label className="field prompt-field" key={field}>
            <span>Film stock / ISO *</span>
            <input
              ref={(node) => {
                promptRefs.current.filmStock = node;
              }}
              value={draft.filmStock}
              onChange={(event) => {
                const value = event.target.value;
                onFieldChange('filmStock', value);
                onFieldChange('iso', inferIso(value));
              }}
              onKeyDown={(event) => handlePromptKeyDown(event, index)}
              placeholder="Kodak Portra 400"
              list="film-stock-options"
            />
            <datalist id="film-stock-options">
              {filmStockOptions.map((filmStock) => (
                <option key={filmStock.name} value={filmStock.name} />
              ))}
            </datalist>
            {errors.filmStock ? <span className="field-error">{errors.filmStock}</span> : null}
            {errors.iso ? <span className="field-error">{errors.iso}</span> : null}
          </label>
        );
      case 'dateLoaded':
        return (
          <label className="field prompt-field" key={field}>
            <span>Date loaded *</span>
            <input
              ref={(node) => {
                promptRefs.current.dateLoaded = node;
              }}
              value={draft.dateLoaded}
              onChange={(event) => onFieldChange('dateLoaded', event.target.value)}
              onKeyDown={(event) => handlePromptKeyDown(event, index)}
              type="date"
            />
            {errors.dateLoaded ? <span className="field-error">{errors.dateLoaded}</span> : null}
          </label>
        );
      case 'status':
        return (
          <label className="field prompt-field" key={field}>
            <span>Status</span>
            <select
              ref={(node) => {
                promptRefs.current.status = node;
              }}
              value={draft.status}
              onChange={(event) => onStatusChange(event.target.value as RollStatus)}
              onKeyDown={(event) => handlePromptKeyDown(event, index)}
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        );
      case 'notes':
        return (
          <label className="field prompt-field prompt-field--full" key={field}>
            <span>Notes</span>
            <textarea
              ref={(node) => {
                promptRefs.current.notes = node;
              }}
              value={draft.notes}
              onChange={(event) => onFieldChange('notes', event.target.value)}
              onKeyDown={(event) => handlePromptKeyDown(event, index)}
              placeholder="Metering notes, lighting setup, favorite frames, development reminders..."
              rows={4}
            />
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <form
      className="panel form-panel"
      id="roll-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="form-panel__intro">
        <div className="section-heading">
          <p className="eyebrow">Quick add</p>
          <div className="section-heading__title-row">
            <h2>{mode === 'edit' ? 'Edit roll entry' : 'Log a new roll'}</h2>
            {mode === 'create' && showSuccessBadge ? (
              <span
                key={successBadgeKey}
                className={`submission-badge${successBadgeFading ? ' submission-badge--fading' : ''}`}
                role="status"
                aria-live="polite"
                aria-label="Roll saved"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Saved
              </span>
            ) : null}
          </div>
          <p>Capture the roll, then update the status as it moves from loaded to scanned.</p>
          <p className="form-note">Fields marked * are required.</p>
        </div>

        <div className="stock-preview-row" aria-live="polite">
          <div className="stock-preview">
            {cameraPreviewSrc ? (
              <>
                <img className="stock-preview__camera" src={cameraPreviewSrc} alt={cameraPreviewLabel ? `${cameraPreviewLabel} camera` : 'Selected camera'} />
                {cameraPreviewLabel ? <span>{cameraPreviewLabel}</span> : null}
              </>
            ) : null}
          </div>

          <div className="stock-preview">
            {filmStockPreviewSrc ? (
              <>
                <img
                  className="stock-preview__film"
                  src={filmStockPreviewSrc}
                  alt={filmStockPreviewLabel ? `${filmStockPreviewLabel} film stock` : 'Selected film stock'}
                />
                {filmStockPreviewLabel ? <span>{filmStockPreviewLabel}</span> : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="prompt-stack" aria-live="polite">
        {visiblePrompts.map((field, index) => renderPrompt(field, index))}
      </div>

      {formReady ? (
        <div className="form-actions">
          <p className="form-hint">Review the roll details, then save it to your library.</p>
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
      ) : null}
    </form>
  );
}
