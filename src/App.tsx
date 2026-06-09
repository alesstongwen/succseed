import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabaseClient';
import Auth from './components/Auth';
import PlantList from './components/PlantList';
import PlantDetail from './components/PlantDetail';
import PropagationList from './components/PropagationList';
import PropagationDetail from './components/PropagationDetail';
import Journal from './components/Journal';
import BottomNav from './components/BottomNav';
import AcceptInvite from './components/AcceptInvite';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = location.pathname.startsWith('/propagations') ? 'propagations'
    : location.pathname.startsWith('/journal') ? 'journal'
    : 'plants';

  return (
    <div className="pb-16">
      {children}
      <BottomNav active={tab} onChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}

function PlantDetailWrapper({ userId }: { userId: string }) {
  const { id } = useParams<{ id: string }>();
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  return (
    <PropagationDetail
      propagationId={id!}
      userId={userId}
      onBack={() => navigate('/propagations')}
    />
  );
}

function AcceptInviteWrapper() {
  const { id } = useParams<{ id: string }>();
  return <AcceptInvite inviteId={id!} />;
}

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && !location.pathname.startsWith('/accept-invite') && location.pathname !== '/login') {
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

  if (!user) {
    return (
      <Routes>
        <Route path="/accept-invite/:id" element={<AcceptInviteWrapper />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  const userName = user.user_metadata?.full_name ?? user.email ?? null;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/plants" replace />} />
        <Route path="/login" element={<Navigate to="/plants" replace />} />
        <Route path="/plants" element={<PlantList userId={user.id} userName={userName} onSignOut={() => supabase.auth.signOut()} />} />
        <Route path="/plants/:id" element={<PlantDetailWrapper userId={user.id} />} />
        <Route path="/propagations" element={<PropagationList userId={user.id} />} />
        <Route path="/propagations/:id" element={<PropagationDetailWrapper userId={user.id} />} />
        <Route path="/journal" element={<Journal userId={user.id} />} />
        <Route path="/accept-invite/:id" element={<AcceptInviteWrapper />} />
        <Route path="*" element={<Navigate to="/plants" replace />} />
      </Routes>
    </Layout>
  );
}
