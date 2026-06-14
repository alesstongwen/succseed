import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/plants`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 8) return;
    setVerifying(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error) {
      setError(error.message);
      setVerifying(false);
    }
    // on success, onAuthStateChange in useAuth fires and logs the user in automatically
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-leaf-50 to-soil-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2 text-leaf-400">✿</div>
          <h1 className="text-3xl font-bold text-leaf-700">Succseed</h1>
          <p className="text-stone-500 text-sm mt-1">Your shared plant journal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {sent ? (
            <div className="py-2">
              <div className="text-center mb-4">
                <div className="text-4xl mb-3 text-leaf-400">✉</div>
                <h2 className="font-semibold text-stone-800 mb-1">Check your email</h2>
                <p className="text-stone-500 text-sm">
                  We sent a code to <span className="font-medium text-stone-700">{email}</span>.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Enter the 8-digit code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="12345678"
                    autoFocus
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-leaf-400"
                  />
                </div>

                {error && (
                  <p className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={verifying || otp.length !== 8}
                  className="w-full bg-leaf-600 hover:bg-leaf-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {verifying ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <p className="text-xs text-center text-stone-400 mt-4">
                Or tap the magic link in the email to sign in on this browser.
              </p>

              <button
                onClick={() => { setSent(false); setEmail(''); setOtp(''); setError(null); }}
                className="mt-3 w-full text-sm text-stone-400 hover:text-stone-600"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
                />
              </div>

              {error && (
                <p className="text-sm rounded-lg px-3 py-2 bg-red-50 text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-leaf-600 hover:bg-leaf-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '...' : 'Send code'}
              </button>
              <p className="text-xs text-center text-stone-400">
                Works for both new and existing accounts
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
