import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather, Zap, Bell } from 'lucide-react';
import { supabase } from './backend/supabase';
import './design/design-tokens.css';

// Pages & Components
import FeedPrincipal from './pages/FeedPrincipal';
import AtrioLeveza from './pages/AtrioLeveza';
import UserProfile from './pages/UserProfile';
import PublicProfile from './pages/PublicProfile';
import CreatePost from './pages/CreatePost';
import CommunityCatalog from './pages/CommunityCatalog';
import CommunityView from './pages/CommunityView';
import ConnectionsPage from './pages/ConnectionsPage';
import { SideNavigation, MobileNavigation } from './components/SideNavigation';
import { AuthForm } from './components/AuthForm';
import { connectionService } from './backend/ConnectionService';

// Configuração do Cliente de Cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache fresco
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const queryClient = useQueryClient();

  // 1. Gestão de Sessão e Realtime
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) queryClient.clear(); // Limpa cache no logout
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // 2. Query de Saldo (Vibes)
  const { data: userBalance = 0 } = useQuery({
    queryKey: ['balance', session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('vibes')
        .eq('id', session?.user?.id)
        .single();
      return data?.vibes || 0;
    },
    enabled: !!session?.user?.id,
  });

  // 3. Query de Notificações
  const { data: notificationCount = 0 } = useQuery({
    queryKey: ['notifications', session?.user?.id],
    queryFn: () => connectionService.getGlobalNotificationCount(),
    enabled: !!session?.user?.id,
    refetchInterval: 30000, // Fallback a cada 30s
  });

  // 4. Inscrição em Tempo Real para Saldo
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`profile-changes-${session.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`
      }, () => {
        // Invalida o cache e força um refresh imediato do saldo
        queryClient.invalidateQueries({ queryKey: ['balance'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, queryClient]);

  const handleLogout = () => supabase.auth.signOut();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-[#50c878]">
        <Feather className="animate-bounce mr-2" /> Carregando Catarse...
      </div>
    );
  }

  return (
    <>
      {!session ? (
        <Routes>
          <Route path="*" element={<AuthPageWrapper />} />
        </Routes>
      ) : (
        <div className="flex flex-col min-h-screen bg-[#1e293b]">
          {/* HEADER FIXO */}
          <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#1e293b]/90 backdrop-blur-md border-b border-slate-700 px-4 md:px-6 py-4 flex justify-between items-center shadow-sm h-[73px]">
            <Link to="/" className="flex items-center gap-2 text-white group">
              <Feather className="text-[#50c878] group-hover:rotate-12 transition-transform" size={28} />
              <span className="text-xl font-bold tracking-tighter">CATARSE</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700 shadow-inner group hover:border-[#FFC300]/50 transition-all">
                <Zap className="text-[#FFC300] group-hover:scale-110 transition-transform" size={18} fill="#FFC300" />
                <span className="font-bold text-[#FFC300] tracking-wide">{userBalance} VIBES</span>
              </div>

              <Link to="/connections" className="relative p-2 text-slate-400 hover:text-white transition-colors group">
                <Bell size={24} className="group-hover:text-[#50c878] transition-colors" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#1e293b] animate-bounce">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Link>
            </div>
          </header>

          <div className="flex flex-1 relative pt-[73px]">
            <SideNavigation onLogout={handleLogout} />

            <main className="flex-grow min-w-0 overflow-x-hidden px-0 pb-24 xl:pb-8 xl:ml-24 transition-all duration-300">
              <Routes>
                <Route path="/" element={<FeedPrincipal />} />
                <Route path="/atrio" element={<AtrioLeveza />} />
                <Route path="/connections" element={<ConnectionsPage />} />
                <Route path="/profile" element={<UserProfile onLogout={handleLogout} />} />
                <Route path="/u/:username" element={<PublicProfile />} /> 
                <Route path="/create" element={<CreatePost />} />
                <Route path="/communities" element={<CommunityCatalog />} />
                <Route path="/communities/:id" element={<CommunityView />} />
                <Route path="/communities/:id/channel/:channelId" element={<CommunityView />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>

          <MobileNavigation onLogout={handleLogout} />
        </div>
      )}
    </>
  );
};

// --- ESTILOS VISUAIS DO LOGIN (MANTIDOS) ---
const AuthPageWrapper: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 overflow-hidden">
      <style>{`
        .area { background: linear-gradient(to bottom right, #0f172a, #1e293b); width: 100%; height: 100%; position: absolute; z-index: 0; top: 0; left: 0; }
        .circles { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; margin: 0; padding: 0; }
        .circles li { position: absolute; display: block; list-style: none; width: 20px; height: 20px; animation: animate 25s linear infinite; bottom: -150px; color: rgba(80, 200, 120, 0.15); }
        .circles li:nth-child(1){ left: 25%; width: 80px; height: 80px; animation-delay: 0s; }
        .circles li:nth-child(6){ left: 75%; width: 110px; height: 110px; animation-delay: 3s; }
        @keyframes animate { 0%{ transform: translateY(0) rotate(0deg); opacity: 1; } 100%{ transform: translateY(-1000px) rotate(720deg); opacity: 0; } }
      `}</style>
      <div className="area"><ul className="circles">{Array.from({ length: 10 }).map((_, i) => (<li key={i}><Feather style={{ width: '100%', height: '100%', strokeWidth: 1.5 }} /></li>))}</ul></div>
      <div className="relative z-10 flex flex-col items-center mb-8 animate-fade-in-down">
        <div className="bg-slate-800/50 p-4 rounded-full mb-4 border border-slate-700 shadow-xl backdrop-blur-sm">
          <Feather className="text-[#50c878]" size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">CATARSE</h1>
        <p className="text-slate-400 text-lg font-light italic text-center max-w-sm">"Sua jornada de leveza começa no agora"</p>
      </div>
      <div className="w-full flex justify-center relative z-10 animate-fade-in-up">
        <AuthForm />
      </div>
    </div>
  );
}

export default App;