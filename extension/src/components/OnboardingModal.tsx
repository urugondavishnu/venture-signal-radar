import { useState } from 'react';
import { setEmail } from '../api/client';

interface OnboardingModalProps {
  onComplete: (email: string) => void;
  onSkip: () => void;
}

export function OnboardingModal({ onComplete, onSkip }: OnboardingModalProps) {
  const [email, setEmailValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await setEmail(email);
      onComplete(email);
    } catch {
      setError('Failed to save email. Backend may be offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Welcome to Signal Tracker</h2>
        <p>
          Enter your email to receive daily intelligence reports about the
          startups you track.
        </p>
        <input
          className="input"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmailValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{ marginBottom: 8 }}
        />
        {error && (
          <div style={{ color: 'var(--error)', fontSize: 12, marginBottom: 8 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onSkip}>
            Skip for now
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
