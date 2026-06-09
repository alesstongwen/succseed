type Tab = 'plants' | 'propagations' | 'journal';

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

export default function BottomNav({ active, onChange }: Props) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'plants', label: 'Plants', icon: 'M' },
    { id: 'propagations', label: 'Propagate', icon: 'P' },
    { id: 'journal', label: 'Journal', icon: 'J' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 flex z-20 pb-safe">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
            active === t.id ? 'text-leaf-600' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <NavIcon id={t.id} active={active === t.id} />
          <span className="text-xs font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function NavIcon({ id, active }: { id: string; active: boolean }) {
  const cls = `w-6 h-6 ${active ? 'text-leaf-600' : 'text-stone-400'}`;
  if (id === 'plants') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4-4-7-8-7-12a7 7 0 0114 0c0 4-3 8-7 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v12M9 12c1-1 3-1.5 3-3" />
    </svg>
  );
  if (id === 'propagations') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 0c0-3 3-5 6-4M12 9c0-3-3-5-6-4M12 9v12" />
      <circle cx="12" cy="18" r="2" strokeWidth={1.8} />
    </svg>
  );
  if (id === 'journal') return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
  return null;
}
