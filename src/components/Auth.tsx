import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) {
        setMsg({ text: error.message, error: true });
      } else {
        setMsg({ text: 'Check your email to confirm your account!', error: false });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ text: error.message, error: true });
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-leaf-50 to-soil-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🌱</div>
          <h1 className="text-3xl font-bold text-leaf-700">Succseed</h1>
          <p className="text-stone-500 text-sm mt-1">Your shared plant journal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex rounded-lg bg-stone-100 p-1 mb-6">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setMsg(null); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  mode === m
                    ? 'bg-white text-leaf-700 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
                />
              </div>
            )}
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
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
              />
            </div>

            {msg && (
              <p className={`text-sm rounded-lg px-3 py-2 ${msg.error ? 'bg-red-50 text-red-600' : 'bg-leaf-50 text-leaf-700'}`}>
                {msg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-leaf-600 hover:bg-leaf-700 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '...' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
