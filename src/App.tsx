import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';
import Auth from './components/Auth';
import PlantList from './components/PlantList';
import PlantDetail from './components/PlantDetail';
import PropagationList from './components/PropagationList';
import Journal from './components/Journal';
import BottomNav from './components/BottomNav';

type Tab = 'plants' | 'propagations' | 'journal';
type View = { screen: 'list' } | { screen: 'detail'; plantId: string };

export default function App() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('plants');
  const [view, setView] = useState<View>({ screen: 'list' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Auth />;

  const userName = user.user_metadata?.full_name ?? user.email ?? null;

  if (tab === 'plants' && view.screen === 'detail') {
    return (
      <PlantDetail
        plantId={view.plantId}
        userId={user.id}
        onBack={() => setView({ screen: 'list' })}
        onDeleted={() => setView({ screen: 'list' })}
      />
    );
  }

  return (
    <div className="pb-16">
      {tab === 'plants' && (
        <PlantList
          userId={user.id}
          userName={userName}
          onSelect={(plantId) => setView({ screen: 'detail', plantId })}
          onSignOut={() => supabase.auth.signOut()}
        />
      )}
      {tab === 'propagations' && <PropagationList userId={user.id} />}
      {tab === 'journal' && <Journal userId={user.id} />}
      <BottomNav active={tab} onChange={(t) => { setTab(t); setView({ screen: 'list' }); }} />
    </div>
  );
}
