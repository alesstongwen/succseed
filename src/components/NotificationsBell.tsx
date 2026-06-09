import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

type Props = { userId: string };

export default function NotificationsBell({ userId }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifs((data ?? []) as Notification[]);
  }

  useEffect(() => {
    load();
    const sub = supabase.channel('notifications-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, load)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [userId]);

  // Close panel when clicking outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  async function markAllRead() {
    const unreadIds = notifs.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  async function openPanel() {
    setOpen(o => !o);
    if (!open) markAllRead();
  }

  const unreadCount = notifs.filter(n => !n.read_at).length;

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={openPanel} className="relative p-2 text-stone-400 hover:text-stone-600">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800 text-sm">Notifications</h3>
            {notifs.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-stone-400 hover:text-stone-600">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-8">No notifications yet</p>
            ) : (
              notifs.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-stone-50 ${!n.read_at ? 'bg-leaf-50' : ''}`}>
                  <p className="text-sm font-medium text-stone-800">{n.title}</p>
                  {n.body && <p className="text-xs text-stone-500 mt-0.5">{n.body}</p>}
                  <p className="text-xs text-stone-300 mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
