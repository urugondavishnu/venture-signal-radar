import { useState } from 'react';
import {
  Company,
  storeCompanySSE,
  deleteCompany as apiDeleteCompany,
} from '../api/client';

interface CompaniesTabProps {
  companies: Company[];
  onCompanyAdded: () => void;
  onRunCompany: (company: Company) => void;
  activeRunIds: string[];
}

const MAX_COMPANIES = 5;

export function CompaniesTab({
  companies,
  onCompanyAdded,
  onRunCompany,
  activeRunIds,
}: CompaniesTabProps) {
  const [url, setUrl] = useState('');
  const [storing, setStoring] = useState(false);
  const [storeMsg, setStoreMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleStore = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (companies.length >= MAX_COMPANIES) {
      alert(
        `Maximum capacity is ${MAX_COMPANIES} companies. Please delete a company before adding another.`,
      );
      return;
    }

    // Normalize URL
    let finalUrl = trimmed;
    if (!finalUrl.startsWith('http')) finalUrl = `https://${finalUrl}`;

    setStoring(true);
    setStoreMsg('Storing company...');

    storeCompanySSE(
      finalUrl,
      (event) => {
        if (event.type === 'company_stored') {
          setStoreMsg('Company stored! Running discovery...');
        }
      },
      () => {
        setStoring(false);
        setStoreMsg('');
        setUrl('');
        onCompanyAdded();
      },
      (err) => {
        setStoring(false);
        setStoreMsg(`Error: ${err}`);
      },
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDeleteCompany(id);
      setDeleteConfirm(null);
      onCompanyAdded(); // refresh list
    } catch {
      alert('Failed to delete company.');
    }
  };

  return (
    <div className="tab-panel">
      {/* Add Company Form */}
      <form onSubmit={handleStore} className="company-form">
        <div className="form-row">
          <input
            type="text"
            className="input"
            placeholder="Enter company website URL (e.g. stripe.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={storing}
          />
          <button type="submit" className="btn btn-primary" disabled={storing || !url.trim()}>
            {storing ? 'Storing...' : 'Store'}
          </button>
        </div>
        {storeMsg && (
          <p className={`form-msg ${storeMsg.startsWith('Error') ? 'error' : ''}`}>{storeMsg}</p>
        )}
        <p className="form-hint">
          {companies.length}/{MAX_COMPANIES} companies tracked
        </p>
      </form>

      {/* Company List */}
      {companies.length === 0 ? (
        <div className="empty-state">
          <h3>No Companies Tracked</h3>
          <p>Enter a company website above to start tracking.</p>
        </div>
      ) : (
        <div className="company-list">
          {companies.map((c) => {
            const isRunning = activeRunIds.includes(c.company_id);
            return (
              <div key={c.company_id} className="card company-card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{c.company_name}</div>
                    <div className="card-subtitle">
                      {c.domain}
                      {c.industry ? ` · ${c.industry}` : ''}
                    </div>
                  </div>
                  <div className="company-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onRunCompany(c)}
                      disabled={isRunning}
                    >
                      {isRunning ? 'Running...' : 'Run'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteConfirm(c.company_id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {c.description && (
                  <p className="company-desc">{c.description}</p>
                )}
                {c.last_agent_run && (
                  <p className="company-meta">
                    Last run: {new Date(c.last_agent_run).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Company</h2>
            <p>This will remove the company and all its reports and signals. Continue?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
