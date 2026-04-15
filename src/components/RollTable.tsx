import type { FilmRoll, RollStatus } from '../types';

type RollTableProps = {
  rolls: FilmRoll[];
  currentUserId: string | null;
  onEdit: (roll: FilmRoll) => void;
  onStatusChange: (id: string, status: RollStatus) => void;
  onDelete: (id: string) => void;
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

export function RollTable({ rolls, currentUserId, onEdit, onStatusChange, onDelete }: RollTableProps) {
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
            {rolls.map((roll) => (
              <tr key={roll.id}>
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
                    <button className="secondary-button" type="button" onClick={() => onEdit(roll)} disabled={roll.userId !== currentUserId}>
                      Edit
                    </button>
                    <button className="ghost-button" type="button" onClick={() => onDelete(roll.id)} disabled={roll.userId !== currentUserId}>
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
