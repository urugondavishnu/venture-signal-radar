import { useState, useEffect } from 'react';
import { getUserSettings, setEmail, setEmailFrequency } from '../api/client';

interface SettingsTabProps {
  userEmail: string | null;
  onEmailChange: (email: string) => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Every day' },
  { value: 'every_3_days', label: 'Every 3 days' },
  { value: 'weekly', label: 'Once a week' },
  { value: 'monthly', label: 'Once a month' },
  { value: 'only_on_run', label: 'Only when I run manually' },
];

const CACHE_KEY = 'cachedSettings';

export function SettingsTab({ userEmail, onEmailChange }: SettingsTabProps) {
  const [email, setEmailValue] = useState(userEmail || '');
  const [frequency, setFrequency] = useState('daily');
  const [saving, setSaving] = useState(false);
  const [savingFreq, setSavingFreq] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load from cache first
    try {
      chrome.storage.local.get(CACHE_KEY, (result) => {
        if (result[CACHE_KEY]) {
          if (result[CACHE_KEY].email) setEmailValue(result[CACHE_KEY].email);
          if (result[CACHE_KEY].email_frequency) setFrequency(result[CACHE_KEY].email_frequency);
        }
        // Then refresh from API
        loadSettings();
      });
    } catch {
      loadSettings();
    }
  }, []);

  const loadSettings = () => {
    getUserSettings()
      .then((settings) => {
        if (settings.email) setEmailValue(settings.email);
        if (settings.email_frequency) setFrequency(settings.email_frequency);
        // Update cache
        try { chrome.storage.local.set({ [CACHE_KEY]: settings }); } catch {}
      })
      .catch(() => {});
  };

  const handleSaveEmail = async () => {
    if (!email || !email.includes('@')) {
      setMessage('Please enter a valid email');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await setEmail(email);
      onEmailChange(email);
      setMessage('Email saved successfully');
      // Update cache
      try {
        chrome.storage.local.get(CACHE_KEY, (result) => {
          const cached = result[CACHE_KEY] || {};
          chrome.storage.local.set({ [CACHE_KEY]: { ...cached, email } });
        });
      } catch {}
    } catch {
      setMessage('Failed to save email');
    } finally {
      setSaving(false);
    }
  };

  const handleFrequencyChange = async (newFreq: string) => {
    setFrequency(newFreq);
    setSavingFreq(true);
    try {
      await setEmailFrequency(newFreq);
      // Update cache
      try {
        chrome.storage.local.get(CACHE_KEY, (result) => {
          const cached = result[CACHE_KEY] || {};
          chrome.storage.local.set({ [CACHE_KEY]: { ...cached, email_frequency: newFreq } });
        });
      } catch {}
    } catch {
      // Silent fail
    } finally {
      setSavingFreq(false);
    }
  };

  return (
    <div>
      <div className="section-header">Email Settings</div>

      {/* Email Address */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Report Email Address
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input
            className="input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmailValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEmail()}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSaveEmail}
            disabled={saving}
            style={{ whiteSpace: 'nowrap' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        {message && (
          <div style={{
            fontSize: 11,
            color: message.includes('success') ? 'var(--success)' : 'var(--error)',
          }}>
            {message}
          </div>
        )}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          Intelligence reports will be sent to this email.
        </div>
      </div>

      {/* Email Frequency */}
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          Report Frequency
          {savingFreq && <span className="spinner" style={{ fontSize: 10 }}>&#8635;</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FREQUENCY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                background: frequency === opt.value ? 'rgba(59,130,246,0.1)' : 'transparent',
                border: `1px solid ${frequency === opt.value ? 'var(--accent)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              <input
                type="radio"
                name="frequency"
                value={opt.value}
                checked={frequency === opt.value}
                onChange={() => handleFrequencyChange(opt.value)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span style={{
                fontSize: 12,
                color: frequency === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: frequency === opt.value ? 600 : 400,
              }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Info about automatic reports */}
      <div style={{
        fontSize: 10,
        color: 'var(--text-muted)',
        marginTop: 12,
        padding: '8px 10px',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-sm)',
      }}>
        Automatic reports run on the backend at 7:00 AM daily (based on your frequency setting).
        The backend server must be running for scheduled reports to work — no browser needed.
      </div>
    </div>
  );
}
