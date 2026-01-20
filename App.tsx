
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Feather, Zap, Bell } from 'lucide-react';
import { supabase } from './backend/supabase';
import FeedPrincipal from './pages/FeedPrincipal';
import AtrioLeveza from './pages/AtrioLeveza';
import UserProfile from './pages/UserProfile';
import PublicProfile from './pages/PublicProfile'; // Importando a nova página
import CreatePost from './pages/CreatePost';
import CommunityCatalog from './pages/CommunityCatalog';
import CommunityView from './pages/CommunityView';
import ConnectionsPage from './pages/ConnectionsPage';
import { SideNavigation, MobileNavigation } from './components/SideNavigation';
import { AuthForm } from './components/AuthForm';
import { connectionService } from './backend/ConnectionService';

const App: React.FC = () => {
  const [session, setSession] = useState(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          fetchBalance(session.user.id);
          fetchNotifications();
      }
      setIsLoading(false);
    });

    // 2. Escutar mudanças de auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          fetchBalance(session.user.id);
          fetchNotifications();
      } else {
          setUserBalance(0);
          setNotificationCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchBalance = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('vibes')
      .eq('id', userId)
      .single();
    
    if (data) setUserBalance(data.vibes);
  };

  const fetchNotifications = async () => {
      const count = await connectionService.getGlobalNotificationCount();
      setNotificationCount(count);
  };

  // Intervalo para polling de notificações (simples para MVP)
  useEffect(() => {
      if (!session) return;
      const interval = setInterval(fetchNotifications, 10000); // Checa a cada 10s
      return () => clearInterval(interval);
  }, [session]);

  const handleBalanceUpdate = (newBalance: number) => {
    setUserBalance(newBalance);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
      return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-[#50c878]">Carregando Catarse...</div>;
  }

  return (
    <HashRouter>
      {!session ? (
        <Routes>
          <Route path="*" element={<AuthPageWrapper />} />
        </Routes>
      ) : (
        <div className="flex flex-col min-h-screen bg-[#1e293b]">
          <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#1e293b]/90 backdrop-blur-md border-b border-slate-700 px-4 md:px-6 py-4 flex justify-between items-center shadow-sm h-[73px]">
            <Link to="/" className="flex items-center gap-2 text-white group">
              <Feather className="text-[#50c878] group-hover:rotate-12 transition-transform" size={28} />
              <span className="text-xl font-bold tracking-tighter">CATARSE</span>
            </Link>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700 shadow-inner transition-all duration-300 hover:border-[#FFC300]/50">
                  <Zap className="text-[#FFC300]" size={18} fill="#FFC300" />
                  <span className="font-bold text-[#FFC300] tracking-wide">{userBalance} VIBES</span>
                </div>

                <Link to="/connections" onClick={fetchNotifications} className="relative p-2 text-slate-400 hover:text-white transition-colors group">
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
                <Route path="/" element={<FeedPrincipal onVibeUpdate={handleBalanceUpdate} />} />
                <Route path="/atrio" element={<AtrioLeveza />} />
                <Route path="/connections" element={<ConnectionsPage />} />
                <Route path="/profile" element={<UserProfile onLogout={handleLogout} />} />
                {/* Rota para Perfil Público */}
                <Route path="/u/:userId" element={<PublicProfile />} /> 
                <Route path="/create" element={<CreatePost onPostCreatedAndVibeGained={handleBalanceUpdate} />} />
                
                <Route path="/communities" element={<CommunityCatalog />} />
                <Route path="/communities/:id" element={<CommunityView onVibeUpdate={handleBalanceUpdate} />} />
                <Route path="/communities/:id/channel/:channelId" element={<CommunityView onVibeUpdate={handleBalanceUpdate} />} />

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>

          <MobileNavigation onLogout={handleLogout} />
        </div>
      )}
    </HashRouter>
  );
};

// Componente Auth Wrapper para manter o estilo visual original mas usar lógica real
const AuthPageWrapper: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[100] min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 overflow-hidden">
          <style>{`
            .area { background: linear-gradient(to bottom right, #0f172a, #1e293b); width: 100%; height: 100%; position: absolute; z-index: 0; top: 0; left: 0; }
            .circles { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; margin: 0; padding: 0; }
            .circles li { position: absolute; display: block; list-style: none; width: 20px; height: 20px; animation: animate 25s linear infinite; bottom: -150px; color: rgba(80, 200, 120, 0.15); }
            .circles li:nth-child(odd) { color: rgba(80, 200, 120, 0.15); }
            .circles li:nth-child(even) { color: rgba(255, 195, 0, 0.15); }
            .circles li:nth-child(1){ left: 25%; width: 80px; height: 80px; animation-delay: 0s; }
            .circles li:nth-child(2){ left: 10%; width: 20px; height: 20px; animation-delay: 2s; animation-duration: 12s; }
            .circles li:nth-child(3){ left: 70%; width: 20px; height: 20px; animation-delay: 4s; }
            .circles li:nth-child(4){ left: 40%; width: 60px; height: 60px; animation-delay: 0s; animation-duration: 18s; }
            .circles li:nth-child(5){ left: 65%; width: 20px; height: 20px; animation-delay: 0s; }
            .circles li:nth-child(6){ left: 75%; width: 110px; height: 110px; animation-delay: 3s; }
            .circles li:nth-child(7){ left: 35%; width: 150px; height: 150px; animation-delay: 7s; }
            .circles li:nth-child(8){ left: 50%; width: 25px; height: 25px; animation-delay: 15s; animation-duration: 45s; }
            .circles li:nth-child(9){ left: 20%; width: 15px; height: 15px; animation-delay: 2s; animation-duration: 35s; }
            .circles li:nth-child(10){ left: 85%; width: 150px; height: 150px; animation-delay: 0s; animation-duration: 11s; }
            @keyframes animate { 0%{ transform: translateY(0) rotate(0deg); opacity: 1; } 100%{ transform: translateY(-1000px) rotate(720deg); opacity: 0; } }
          `}</style>

          <div className="area"><ul className="circles">{Array.from({ length: 10 }).map((_, i) => (<li key={i}><Feather style={{ width: '100%', height: '100%', strokeWidth: 1.5 }} /></li>))}</ul></div>
    
          <div className="relative z-10 flex flex-col items-center mb-8 animate-fade-in-down">
            <div className="bg-slate-800/50 p-4 rounded-full mb-4 border border-slate-700 shadow-xl backdrop-blur-sm">
              <Feather className="text-[#50c878]" size={48} strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">CATARSE</h1>
            <p className="text-slate-400 text-lg font-light italic text-center max-w-sm">
              "Sua jornada de leveza começa no agora"
            </p>
          </div>
    
          <div className="w-full flex justify-center relative z-10 animate-fade-in-up">
            <AuthForm />
          </div>
    
          <footer className="absolute bottom-6 text-slate-600 text-xs text-center z-10">
            © 2026 Catarse Social. Respire fundo.
          </footer>
        </div>
      );
}

export default App;
