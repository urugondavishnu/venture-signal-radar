import { useState, useEffect } from 'react';
import { getUserSettings, setEmailFrequency, EmailFrequency } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const FREQUENCY_OPTIONS: { value: EmailFrequency; label: string; desc: string }[] = [
  { value: 'daily', label: 'Daily', desc: 'Every day at 7:00 AM' },
  { value: 'every_3_days', label: 'Every 3 Days', desc: 'Once every 3 days' },
  { value: 'weekly', label: 'Weekly', desc: 'Once a week' },
  { value: 'monthly', label: 'Monthly', desc: 'Once a month' },
  { value: 'only_on_run', label: 'Only On Run', desc: 'Only when you manually run agents' },
];

export function SettingsTab() {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<EmailFrequency>('only_on_run');

  useEffect(() => {
    getUserSettings().then((s) => {
      if (s.email_frequency) setFrequency(s.email_frequency);
    });
  }, []);

  const handleFrequencyChange = async (freq: EmailFrequency) => {
    setFrequency(freq);
    try {
      await setEmailFrequency(freq);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="tab-panel">
      <div className="settings-section">
        <h3 className="section-header">Report Email</h3>
        <p className="settings-desc">
          Intelligence reports will be sent to your account email:
        </p>
        <div className="form-row">
          <input
            type="email"
            className="input"
            value={user?.email || ''}
            disabled
            style={{ opacity: 0.7 }}
          />
        </div>
        <p className="form-hint" style={{ marginTop: 4 }}>
          This is the email you signed up with. Reports are sent here automatically.
        </p>
      </div>

      <div className="settings-section">
        <h3 className="section-header">Report Frequency</h3>
        <p className="settings-desc">
          How often should intelligence agents automatically run and send reports?
        </p>
        <div className="frequency-grid">
          {FREQUENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`frequency-btn ${frequency === opt.value ? 'active' : ''}`}
              onClick={() => handleFrequencyChange(opt.value)}
            >
              <span className="frequency-label">{opt.label}</span>
              <span className="frequency-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
