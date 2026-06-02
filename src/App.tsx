import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';
import Auth from './components/Auth';
import PlantList from './components/PlantList';
import PlantDetail from './components/PlantDetail';

type View = { screen: 'list' } | { screen: 'detail'; plantId: string };

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>({ screen: 'list' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <span className="text-5xl animate-pulse">🌱</span>
      </div>
    );
  }

  if (!user) return <Auth />;

  const userName = user.user_metadata?.full_name ?? user.email ?? null;

  if (view.screen === 'detail') {
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
    <PlantList
      userId={user.id}
      userName={userName}
      onSelect={(plantId) => setView({ screen: 'detail', plantId })}
      onSignOut={() => supabase.auth.signOut()}
    />
  );
}
