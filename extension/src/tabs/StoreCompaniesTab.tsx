import { useState, useEffect } from 'react';
import { CompanyCard } from '../components/CompanyCard';
import {
  getCompanies,
  storeCompany,
  readSSEStream,
  deleteCompany,
} from '../api/client';
import { ActiveRun } from '../popup/App';

interface StoreCompaniesTabProps {
  onStartRun: (companyId: string, companyName: string) => void;
  activeRuns: ActiveRun[];
}

interface CompanyData {
  company_id: string;
  company_name: string;
  website_url: string;
  domain: string;
  industry?: string | null;
  description?: string | null;
  last_agent_run?: string | null;
}

const CACHE_KEY = 'cachedCompanies';

export function StoreCompaniesTab({
  onStartRun,
  activeRuns,
}: StoreCompaniesTabProps) {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [storing, setStoring] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [discoveringIds, setDiscoveringIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  // Derive running state from activeRuns (persisted across popup open/close)
  const runningIds = new Set(
    activeRuns.filter((r) => !r.isComplete).map((r) => r.companyId),
  );

  useEffect(() => {
    // Load from cache first, then refresh from API
    try {
      chrome.storage.local.get(CACHE_KEY, (result) => {
        if (result[CACHE_KEY]?.length) {
          setCompanies(result[CACHE_KEY]);
          setLoading(false);
        }
        // Then refresh from API
        loadCompanies();
      });
    } catch {
      loadCompanies();
    }
  }, []);

  const loadCompanies = async () => {
    try {
      const { companies: data } = await getCompanies();
      setCompanies(data || []);
      // Update cache
      try { chrome.storage.local.set({ [CACHE_KEY]: data || [] }); } catch {}
    } catch {
      // Backend offline — keep cached data
    } finally {
      setLoading(false);
    }
  };

  const storeCurrentPage = async () => {
    setStoring(true);
    setError('');

    try {
      let url = '';
      let title = '';

      try {
        const response: { url: string; title: string } = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'GET_PAGE_INFO' }, resolve);
        });
        url = response.url;
        title = response.title;
      } catch {
        // Not in extension context
      }

      if (!url && urlInput) {
        url = urlInput;
      }

      if (!url) {
        setError('No URL detected. Enter a URL below or visit a company website.');
        setStoring(false);
        return;
      }

      const response = await storeCompany(url, title);

      await readSSEStream(response, {
        onEvent: (event) => {
          if (event.type === 'company_stored') {
            const companyData = event.data as unknown as CompanyData;
            setCompanies((prev) => {
              const exists = prev.find((c) => c.company_id === companyData.company_id);
              if (exists) return prev;
              const updated = [companyData, ...prev];
              // Update cache
              try { chrome.storage.local.set({ [CACHE_KEY]: updated }); } catch {}
              return updated;
            });
            setDiscoveringIds((prev) => new Set(prev).add(companyData.company_id));
            setStoring(false);
          }
        },
        onError: (err) => setError(err),
        onComplete: () => {
          // Discovery runs in background on the server — refresh after a delay to pick up enriched data
          setTimeout(() => {
            loadCompanies().then(() => {
              setDiscoveringIds(new Set());
            });
          }, 15000);
        },
      });

      setUrlInput('');
    } catch {
      setError('Failed to store company. Is the backend running?');
    } finally {
      setStoring(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      await deleteCompany(companyId);
      setCompanies((prev) => {
        const updated = prev.filter((c) => c.company_id !== companyId);
        try { chrome.storage.local.set({ [CACHE_KEY]: updated }); } catch {}
        return updated;
      });
    } catch {
      // Silent fail
    }
  };

  const handleRunAgents = (companyId: string, companyName: string) => {
    onStartRun(companyId, companyName);
  };

  return (
    <div>
      {/* Store Company Section */}
      <div className="card" style={{ marginBottom: 12, borderColor: 'var(--accent)', borderStyle: 'dashed' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Bookmark a Company
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            className="input"
            placeholder="Enter company URL (or click Store from their website)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && storeCurrentPage()}
          />
          <button
            className="btn btn-primary"
            onClick={storeCurrentPage}
            disabled={storing}
            style={{ whiteSpace: 'nowrap' }}
          >
            {storing ? (
              <>
                <span className="spinner">&#8635;</span> Storing...
              </>
            ) : (
              'Store Company'
            )}
          </button>
        </div>
        {error && (
          <div style={{ fontSize: 11, color: 'var(--error)' }}>{error}</div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Visit a company website and click Store, or paste a URL above.
        </div>
      </div>

      {/* Companies List */}
      <div className="section-header">
        Tracked Companies ({companies.length})
      </div>

      {loading ? (
        <div className="empty-state">
          <span className="spinner" style={{ fontSize: 20 }}>&#8635;</span>
          <p style={{ marginTop: 8 }}>Loading companies...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="empty-state">
          <h3>No companies tracked yet</h3>
          <p>Bookmark your first company above to get started.</p>
        </div>
      ) : (
        companies.map((company) => (
          <CompanyCard
            key={company.company_id}
            company={company}
            onRun={handleRunAgents}
            onDelete={handleDeleteCompany}
            isRunning={runningIds.has(company.company_id)}
            runDisabled={false}
            isDiscovering={discoveringIds.has(company.company_id)}
          />
        ))
      )}
    </div>
  );
}
