import { useState } from 'react';
import { setEmail } from '../api/client';

interface EmailSetupProps {
  onComplete: (email: string) => void;
}

export function EmailSetup({ onComplete }: EmailSetupProps) {
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await setEmail(trimmed, 'only_on_run');
      onComplete(trimmed);
    } catch {
      setError('Failed to save email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <span className="setup-icon">📡</span>
          <h1>Venture Signal Radar</h1>
          <p className="setup-subtitle">Startup Intelligence Platform</p>
        </div>

        <div className="setup-info">
          <h3>Set Up Your Email</h3>
          <p>
            Please enter the email address you've used to sign in at{' '}
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer">
              resend.com
            </a>
            . If you haven't signed in yet, please create an account at Resend
            with your preferred email, then enter the same email below. This is
            where your intelligence reports will be delivered.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && <p className="setup-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Saving...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}
