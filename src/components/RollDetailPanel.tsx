import type { FilmRoll, RollActivity, RollUpload } from '../types';

type RollDetailPanelProps = {
  roll: FilmRoll | null;
  activity: RollActivity[];
  uploads: RollUpload[];
  loading: boolean;
  uploadLoading: boolean;
  error: string | null;
  uploadError: string | null;
  selectedFileName: string | null;
  selectedFilePreviewUrl: string | null;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  onDeleteUpload: (uploadId: string) => void;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatEventType(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function RollDetailPanel({
  roll,
  activity,
  uploads,
  loading,
  uploadLoading,
  error,
  uploadError,
  selectedFileName,
  selectedFilePreviewUrl,
  onFileChange,
  onUpload,
  onDeleteUpload,
}: RollDetailPanelProps) {
  return (
    <section className="panel roll-detail-panel" id="roll-history">
      <div className="section-heading">
        <p className="eyebrow">History</p>
        <h2>{roll ? roll.title : 'Select a roll to inspect uploads and activity'}</h2>
        <p>
          The selected roll pulls its uploads and event timeline from the database so the interface reflects real
          account history instead of local placeholders.
        </p>
      </div>

      {error ? <p className="panel-note panel-note--error">{error}</p> : null}

      {loading ? <p className="panel-note">Loading roll history...</p> : null}

      {roll ? (
        <div className="roll-detail">
          <div className="roll-detail__summary">
            <div>
              <span>Camera</span>
              <strong>{roll.camera}</strong>
            </div>
            <div>
              <span>Lens</span>
              <strong>{roll.lens}</strong>
            </div>
            <div>
              <span>Film</span>
              <strong>
                {roll.filmStock} · ISO {roll.iso}
              </strong>
            </div>
            <div>
              <span>Loaded</span>
              <strong>{roll.dateLoaded}</strong>
            </div>
          </div>

          <div className="roll-detail__split">
            <article className="roll-detail-card">
              <h3>Uploads</h3>
              <label className="field roll-upload-field">
                <span>Attach a scan preview</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                />
              </label>

              {selectedFileName ? (
                <div className="roll-upload-preview">
                  {selectedFilePreviewUrl ? <img src={selectedFilePreviewUrl} alt="" /> : null}
                  <div>
                    <strong>{selectedFileName}</strong>
                    <p>Ready to upload to this roll.</p>
                  </div>
                </div>
              ) : null}

              {uploadError ? <p className="panel-note panel-note--error">{uploadError}</p> : null}

              <div className="form-actions">
                <p className="form-hint">Uploads are stored as previews for now so the workflow stays entirely web-based.</p>
                <button className="primary-button" type="button" onClick={onUpload} disabled={uploadLoading || !selectedFileName}>
                  {uploadLoading ? 'Uploading...' : 'Upload preview'}
                </button>
              </div>

              <div className="upload-grid">
                {uploads.length > 0 ? (
                  uploads.map((upload) => (
                    <article key={upload.id} className="upload-card">
                      {upload.fileType.startsWith('image/') ? (
                        <img className="upload-card__image" src={upload.fileUrl} alt={upload.fileName} />
                      ) : (
                        <div className="upload-card__placeholder">File</div>
                      )}
                      <div className="upload-card__body">
                        <strong>{upload.fileName}</strong>
                        <span>
                          {upload.fileType} · {formatBytes(upload.fileSize)}
                        </span>
                        <span>{formatDateTime(upload.createdAt)}</span>
                      </div>
                      <button className="ghost-button" type="button" onClick={() => onDeleteUpload(upload.id)}>
                        Delete
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="analytics-empty">No uploads attached yet.</p>
                )}
              </div>
            </article>

            <article className="roll-detail-card">
              <h3>Activity timeline</h3>
              <ul className="activity-feed">
                {activity.length > 0 ? (
                  activity.map((entry) => (
                    <li key={entry.id} className="activity-feed__item">
                      <div className="activity-feed__meta">
                        <span>{formatEventType(entry.eventType)}</span>
                        <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                      </div>
                      <strong>{entry.summary}</strong>
                    </li>
                  ))
                ) : (
                  <li className="analytics-empty">No history recorded yet.</li>
                )}
              </ul>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}
