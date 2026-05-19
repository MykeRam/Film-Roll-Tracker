import type { FilmRoll, RollStatus } from '../types';

type RollTableProps = {
  rolls: FilmRoll[];
  currentUserId: string | null;
  selectedRollId: string | null;
  deleteNotice: { title: string; closing: boolean } | null;
  onEdit: (roll: FilmRoll) => void;
  onStatusChange: (id: string, status: RollStatus) => void;
  onDeleteRequest: (id: string) => void;
  onSelect: (roll: FilmRoll) => void;
};

const statusLabels: Record<RollStatus, string> = {
  loaded: 'Loaded',
  shot: 'Shot',
  developed: 'Developed',
  scanned: 'Scanned',
};

const statusOptions: RollStatus[] = ['loaded', 'shot', 'developed', 'scanned'];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function RollTable({
  rolls,
  currentUserId,
  selectedRollId,
  deleteNotice,
  onEdit,
  onStatusChange,
  onDeleteRequest,
  onSelect,
}: RollTableProps) {
  return (
    <section className="panel table-panel" id="roll-library">
      <div className="section-heading">
        <p className="eyebrow">Roll library</p>
        <h2>Track every roll in one place</h2>
        <p>Use filters and row actions to move rolls through the workflow, edit entries, and remove rolls when needed.</p>
      </div>

      <div className="table-wrap" role="region" aria-label="Film roll table" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Roll</th>
              <th>Gear</th>
              <th>Film</th>
              <th>Status</th>
              <th>Date loaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deleteNotice ? (
              <tr className={`table-banner-row${deleteNotice.closing ? ' table-banner-row--closing' : ''}`}>
                <td className="table-banner-cell" colSpan={6}>
                  <div className="table-banner" role="status" aria-live="polite">
                    <span className="table-banner__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M5 12.5l4.5 4.5L19 8.5" />
                      </svg>
                    </span>
                    <span>{deleteNotice.title} has been deleted</span>
                  </div>
                </td>
              </tr>
            ) : null}
            {rolls.map((roll) => (
              <tr key={roll.id} className={roll.id === selectedRollId ? 'table-row--selected' : undefined}>
                <td>
                  <div className="table-primary">
                    <strong>{roll.title}</strong>
                    <span>{roll.notes || 'No notes yet'}</span>
                  </div>
                </td>
                <td>
                  <div className="table-primary">
                    <strong>{roll.camera}</strong>
                    <span>{roll.lens}</span>
                  </div>
                </td>
                <td>
                  <div className="table-primary">
                    <strong>{roll.filmStock}</strong>
                    <span>ISO {roll.iso}</span>
                  </div>
                </td>
                <td>
                  <select
                    className="table-status-select"
                    value={roll.status}
                    aria-label={`Change status for ${roll.title}`}
                    disabled={roll.userId !== currentUserId}
                    onChange={(event) => onStatusChange(roll.id, event.target.value as RollStatus)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{formatDate(roll.dateLoaded)}</td>
                <td>
                  <div className="row-actions">
                    <button className="ghost-button" type="button" onClick={() => onSelect(roll)}>
                      History
                    </button>
                    <button className="secondary-button" type="button" onClick={() => onEdit(roll)} disabled={roll.userId !== currentUserId}>
                      Edit
                    </button>
                    <button className="ghost-button" type="button" onClick={() => onDeleteRequest(roll.id)} disabled={roll.userId !== currentUserId}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
