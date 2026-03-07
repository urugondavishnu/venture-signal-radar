import { useState, useEffect } from 'react';
import {
  getUserSettings,
  setEmail,
  setEmailFrequency,
  EmailFrequency,
} from '../api/client';

const FREQUENCY_OPTIONS: { value: EmailFrequency; label: string; desc: string }[] = [
  { value: 'daily', label: 'Daily', desc: 'Every day at 7:00 AM' },
  { value: 'every_3_days', label: 'Every 3 Days', desc: 'Once every 3 days' },
  { value: 'weekly', label: 'Weekly', desc: 'Once a week' },
  { value: 'monthly', label: 'Monthly', desc: 'Once a month' },
  { value: 'only_on_run', label: 'Only On Run', desc: 'Only when you manually run agents' },
];

export function SettingsTab() {
  const [email, setEmailState] = useState('');
  const [frequency, setFrequency] = useState<EmailFrequency>('only_on_run');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getUserSettings().then((s) => {
      if (s.email) setEmailState(s.email);
      if (s.email_frequency) setFrequency(s.email_frequency);
    });
  }, []);

  const handleSaveEmail = async () => {
    if (!email.trim()) return;
    setSaving(true);
    setMsg('');
    try {
      await setEmail(email.trim());
      setMsg('Email saved!');
    } catch {
      setMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

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
      {/* Email Section */}
      <div className="settings-section">
        <h3 className="section-header">Report Email</h3>
        <p className="settings-desc">
          Intelligence reports will be sent to this email. Make sure it's the same
          email you used to sign in at resend.com.
        </p>
        <div className="form-row">
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmailState(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleSaveEmail} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        {msg && <p className="form-msg">{msg}</p>}
      </div>

      {/* Frequency Section */}
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
