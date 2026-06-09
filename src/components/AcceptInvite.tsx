import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Props = { inviteId: string };

type InviteStatus = 'loading' | 'ready' | 'signin' | 'sent' | 'processing' | 'done' | 'already' | 'expired' | 'error';

export default function AcceptInvite({ inviteId }: Props) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [plantName, setPlantName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    async function checkInvite() {
      const { data: invite, error } = await supabase
        .from('plant_invites')
        .select('id, plant_id, accepted_at, plants(species, nickname)')
        .eq('id', inviteId)
        .maybeSingle();

      if (error || !invite) { setStatus('expired'); return; }
      if (invite.accepted_at) { setStatus('already'); return; }

      const p = (invite as any).plants;
      setPlantName(p?.nickname ?? p?.species ?? 'a plant');

      // If already signed in, process immediately
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        processInvite(session.user.id);
      } else {
        setStatus('ready');
      }
    }
    checkInvite();
  }, [inviteId]);

  // Listen for sign-in after magic link click
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && (status === 'ready' || status === 'signin' || status === 'sent')) {
        processInvite(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [status]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSendingLink(true);
    const redirectTo = window.location.href;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setSendingLink(false);
    if (error) { setErrorMsg(error.message); return; }
    setStatus('sent');
  }

  async function processInvite(userId: string) {
    setStatus('processing');

    const { data: invite, error } = await supabase
      .from('plant_invites')
      .select('id, plant_id, accepted_at')
      .eq('id', inviteId)
      .maybeSingle();

    if (error || !invite) { setStatus('expired'); return; }
    if (invite.accepted_at) { setStatus('already'); return; }

    const { error: insertErr } = await supabase
      .from('plant_caretakers')
      .insert({ plant_id: invite.plant_id, user_id: userId, role: 'COPARENT' });

    if (insertErr && (insertErr as any).code !== '23505') {
      setErrorMsg(insertErr.message);
      setStatus('error');
      return;
    }

    await supabase
      .from('plant_invites')
      .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq('id', inviteId);

    setStatus('done');
    setTimeout(() => navigate('/plants'), 2000);
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-6 text-center">
        <div className="text-4xl mb-4 text-leaf-400">✿</div>

        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-stone-500">Loading invite...</p>
          </>
        )}

        {status === 'ready' && (
          <>
            <h1 className="text-xl font-bold text-stone-800 mb-2">You are invited!</h1>
            <p className="text-stone-500 text-sm mb-6">
              Sign in to become a co-parent of <span className="font-medium text-stone-700">{plantName}</span>.
            </p>
            <button
              onClick={() => setStatus('signin')}
              className="w-full bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl py-3 font-medium transition-colors"
            >
              Sign in / Sign up
            </button>
          </>
        )}

        {status === 'signin' && (
          <>
            <h1 className="text-xl font-bold text-stone-800 mb-2">Enter your email</h1>
            <p className="text-stone-500 text-sm mb-4">
              We will send you a magic link — no password needed.
            </p>
            <form onSubmit={sendMagicLink} className="space-y-3 text-left">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-400"
              />
              {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
              <button
                type="submit"
                disabled={sendingLink}
                className="w-full bg-leaf-600 hover:bg-leaf-700 text-white rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
              >
                {sendingLink ? 'Sending...' : 'Send magic link'}
              </button>
            </form>
          </>
        )}

        {status === 'sent' && (
          <>
            <h1 className="text-xl font-bold text-stone-800 mb-2">Check your email</h1>
            <p className="text-stone-500 text-sm">
              We sent a link to <span className="font-medium text-stone-700">{email}</span>. Tap it and you will be added as co-parent of <span className="font-medium text-stone-700">{plantName}</span> automatically.
            </p>
          </>
        )}

        {status === 'processing' && (
          <>
            <div className="w-8 h-8 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-stone-500">Adding you as co-parent...</p>
          </>
        )}

        {status === 'done' && (
          <>
            <h1 className="text-xl font-bold text-stone-800 mb-2">You are in!</h1>
            <p className="text-stone-500 text-sm">
              <span className="font-medium text-stone-700">{plantName}</span> has been added to your plants. Redirecting...
            </p>
          </>
        )}

        {status === 'already' && (
          <>
            <h1 className="text-xl font-bold text-stone-800 mb-2">Already accepted</h1>
            <p className="text-stone-500 text-sm mb-4">This invite has already been used.</p>
            <button onClick={() => navigate('/plants')} className="w-full bg-leaf-600 text-white rounded-xl py-3 font-medium">
              Go to my plants
            </button>
          </>
        )}

        {status === 'expired' && (
          <>
            <h1 className="text-xl font-bold text-stone-800 mb-2">Invite not found</h1>
            <p className="text-stone-500 text-sm mb-4">This invite link is invalid or has expired.</p>
            <button onClick={() => navigate('/plants')} className="w-full bg-leaf-600 text-white rounded-xl py-3 font-medium">
              Go to my plants
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-bold text-stone-800 mb-2">Something went wrong</h1>
            <p className="text-stone-500 text-sm mb-4">{errorMsg}</p>
            <button onClick={() => navigate('/plants')} className="w-full bg-stone-200 text-stone-700 rounded-xl py-3 font-medium">
              Go home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
