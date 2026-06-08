import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';
import Auth from './components/Auth';
import PlantList from './components/PlantList';
import PlantDetail from './components/PlantDetail';
import PropagationList from './components/PropagationList';
import PropagationDetail from './components/PropagationDetail';
import Journal from './components/Journal';
import BottomNav from './components/BottomNav';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.startsWith('/propagations') ? 'propagations'
    : location.pathname.startsWith('/journal') ? 'journal'
    : 'plants';

  return (
    <div className="pb-16">
      {children}
      <BottomNav active={tab} onChange={(t) => navigate(`/${t === 'plants' ? 'plants' : t}`)} />
    </div>
  );
}

function ProtectedRoutes({ userId, userName }: { userId: string; userName: string | null }) {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/plants" replace />} />
        <Route path="/plants" element={<PlantList userId={userId} userName={userName} onSignOut={() => supabase.auth.signOut()} />} />
        <Route path="/plants/:id" element={<PlantDetailWrapper userId={userId} />} />
        <Route path="/propagations" element={<PropagationList userId={userId} />} />
        <Route path="/propagations/:id" element={<PropagationDetailWrapper userId={userId} />} />
        <Route path="/journal" element={<Journal userId={userId} />} />
        <Route path="*" element={<Navigate to="/plants" replace />} />
      </Routes>
    </Layout>
  );
}

function PlantDetailWrapper({ userId }: { userId: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <PlantDetail
      plantId={id!}
      userId={userId}
      onBack={() => navigate('/plants')}
      onDeleted={() => navigate('/plants')}
    />
  );
}

function PropagationDetailWrapper({ userId }: { userId: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <PropagationDetail
      propagationId={id!}
      userId={userId}
      onBack={() => navigate('/propagations')}
    />
  );
}

function useParams() {
  const location = useLocation();
  const parts = location.pathname.split('/');
  return { id: parts[parts.length - 1] };
}

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
    if (!loading && user && location.pathname === '/login') {
      navigate('/plants', { replace: true });
    }
  }, [user, loading, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-10 h-10 border-4 border-leaf-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Auth />;

  const userName = user.user_metadata?.full_name ?? user.email ?? null;

  return <ProtectedRoutes userId={user.id} userName={userName} />;
}
