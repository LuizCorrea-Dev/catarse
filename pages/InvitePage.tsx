import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../backend/supabase';
import { communityService, Community } from '../backend/CommunityService';
import { Loader2, Users, Shield, Globe, Lock, ArrowRight, Check } from 'lucide-react';

const InvitePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  // State for community invite
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const fetchCommunity = async () => {
      setIsLoading(true);
      if (!code) {
        setError('Código de convite inválido.');
        setIsLoading(false);
        return;
      }

      try {
        const comm = await communityService.getCommunityByInviteCode(code);
        if (!comm) {
          setError('Comunidade não encontrada ou convite expirado.');
        } else {
          setCommunity(comm);
        }
      } catch (err) {
        console.error(err);
        setError('Ocorreu um erro ao buscar o convite.');
      }
      setIsLoading(false);
    };

    fetchCommunity();
  }, [code]);

  const handleAction = async () => {
    if (!community) return;

    if (!session) {
      // Se não estiver logado, redireciona para login (Home)
      navigate('/');
      return;
    }

    if (community.isMember) {
      navigate(`/communities/${community.id}`);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await communityService.joinCommunity(community.id);
      if (result.success) {
        if (result.role === 'PENDING') {
          alert('Solicitação de acesso enviada com sucesso! Aguarde a aprovação dos moderadores.');
        } else {
          navigate(`/communities/${community.id}`);
        }
      } else {
        alert('Ocorreu um erro ao processar sua solicitação.');
      }
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro.');
    }
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#50c878]" size={40} />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700 max-w-md w-full text-center shadow-2xl backdrop-blur-sm">
          <Globe className="mx-auto mb-4 text-slate-500" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">Convite Inválido</h1>
          <p className="text-slate-400 mb-8">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-[#50c878] hover:bg-[#50c878]/90 text-[#0f172a] px-6 py-3 rounded-full font-bold transition-all w-full"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  const isPublic = community.privacy === 'PUBLIC';

  return (
    <div className="min-h-screen bg-[#0f172a] relative overflow-hidden flex flex-col justify-center items-center p-4">
      {/* Background Banner Blur */}
      <div className="absolute inset-0 z-0">
        <img 
          src={community.bannerUrl} 
          alt="Background" 
          className="w-full h-full object-cover opacity-20 blur-xl scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/80 via-[#0f172a]/90 to-[#0f172a]"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        {/* Catarse Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-700/50 mb-4 backdrop-blur-md">
            <span className="text-[#50c878] font-bold">CATARSE</span>
            <span className="text-slate-400 text-sm">Convite Especial</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Junte-se à jornada.
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Você foi convidado para participar de um espaço exclusivo. Descubra, conecte-se e evolua junto com a comunidade.
          </p>
        </div>

        {/* Community Card */}
        <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden relative">
          <div className="h-32 w-full relative">
            <img src={community.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b]/80 to-transparent"></div>
          </div>
          
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex justify-between items-end mb-4 -mt-12 relative z-10">
              <img 
                src={community.avatarUrl} 
                alt="Logo" 
                className="w-24 h-24 rounded-2xl border-4 border-[#1e293b] object-cover bg-slate-800 shadow-lg"
              />
              <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {isPublic ? <Globe size={14} className="text-[#50c878]" /> : <Lock size={14} className="text-amber-500" />}
                {isPublic ? 'PÚBLICA' : 'PRIVADA'}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{community.name}</h2>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed line-clamp-3">
              {community.description}
            </p>

            {community.tags && community.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {community.tags.slice(0, 3).map((tag, idx) => (
                  <span key={idx} className="text-xs text-[#50c878] bg-[#50c878]/10 px-2 py-1 rounded border border-[#50c878]/20">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium bg-slate-900/50 p-3 rounded-xl border border-slate-800 mb-6">
              <Users size={16} />
              <span>{community.memberCount} Membros na comunidade</span>
            </div>

            <button
              onClick={handleAction}
              disabled={isProcessing}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                community.isMember
                  ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                  : 'bg-[#50c878] hover:bg-[#50c878]/90 text-[#0f172a]'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={24} />
              ) : !session ? (
                <>Fazer Login para Participar <ArrowRight size={20} /></>
              ) : community.isMember ? (
                <>Acessar Comunidade <ArrowRight size={20} /></>
              ) : isPublic ? (
                <>Participar Agora <Shield size={20} /></>
              ) : (
                <>Solicitar Acesso <Lock size={20} /></>
              )}
            </button>
            
            {!session && (
              <p className="text-center text-slate-500 text-xs mt-4">
                Você precisará de uma conta Catarse para acessar este grupo.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
