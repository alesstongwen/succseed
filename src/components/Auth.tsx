import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
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
            <div className="text-center py-4">
              <div className="text-4xl mb-3 text-leaf-400">✉</div>
              <h2 className="font-semibold text-stone-800 mb-2">Check your email</h2>
              <p className="text-stone-500 text-sm">
                We sent a magic link to <span className="font-medium text-stone-700">{email}</span>. Tap it to sign in — no password needed.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-4 text-sm text-stone-400 hover:text-stone-600"
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
                {loading ? '...' : 'Send magic link'}
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
