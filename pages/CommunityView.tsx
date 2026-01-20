
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Hash, Volume2, Settings, MessageSquare, ChevronDown, 
  Menu, X, Send, Image, Mic, Phone, Video, Loader2, Info,
  Bell, BellOff, Check, Shield, Users, Trash2, Save, ExternalLink,
  Edit3, Camera, Copy, AlertTriangle, ChevronRight, Monitor, LogOut, Upload, Link as LinkIcon, Lock, Clock, Crown, RotateCcw, Filter, UserMinus, ShieldCheck, ShieldAlert, Pin, AlertOctagon
} from 'lucide-react';
import { communityService, Community, Channel, CommunityMessage, CommunityMember, RoleType } from '../backend/CommunityService';
import PostCard from '../components/PostCard';
import { postService, Post } from '../backend/PostService'; 
import { supabase } from '../backend/supabase';

interface CommunityViewProps {
  onVibeUpdate?: (newBalance: number) => void;
}

const CommunityView: React.FC<CommunityViewProps> = ({ onVibeUpdate }) => {
  const { id, channelId } = useParams();
  const navigate = useNavigate();
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isJoining, setIsJoining] = useState(false);

  const [sidebarTab, setSidebarTab] = useState<'channels' | 'members'>('channels');
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  
  // Real User Data for Sidebar
  const [currentUserProfile, setCurrentUserProfile] = useState<{username: string, avatar_url: string} | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    const commData = await communityService.getCommunityById(id);
    const chanData = await communityService.getChannels(id);
    
    if (commData) {
      setCommunity(commData);
      setChannels(chanData);
      
      if (!activeChannel || (channelId && activeChannel.id !== channelId)) {
        if (channelId) {
            const found = chanData.find(c => c.id === channelId);
            setActiveChannel(found || chanData[0]);
        } else if (chanData.length > 0) {
            setActiveChannel(chanData[0]);
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Fetch current user profile for sidebar
    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
            if (data) {
                setCurrentUserProfile(data);
            }
        }
    };
    fetchUser();
  }, [id, channelId]);

  // Mark channel as read when entered
  useEffect(() => {
      if (activeChannel) {
          communityService.markChannelAsRead(activeChannel.id);
          // Locally update to remove badge
          setChannels(prev => prev.map(c => c.id === activeChannel.id ? { ...c, hasUnread: false } : c));
      }
  }, [activeChannel]);

  useEffect(() => {
      if (sidebarTab === 'members' && community?.id) {
          refreshMembers();
      }
  }, [sidebarTab, community?.id]);

  const refreshMembers = async () => {
      if (!community?.id) return;
      setIsLoadingMembers(true);
      const data = await communityService.getMembers(community.id);
      setMembers(data);
      setIsLoadingMembers(false);
  }

  const handleChannelSelect = (channel: Channel) => {
    setActiveChannel(channel);
    setIsSidebarOpen(false);
  };
  
  const handleSettingsUpdate = () => {
    fetchData();
  };

  const handleDeleteCommunity = () => {
      navigate('/communities');
  };

  const handleJoinCommunity = async () => {
      if (!community) return;
      setIsJoining(true);
      
      const result = await communityService.joinCommunity(community.id);
      
      if (result.success) {
          setCommunity(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  currentUserRole: result.role,
                  isMember: result.role === 'MEMBER' || result.role === 'OWNER' || result.role === 'MODERATOR'
              };
          });
      } else {
          alert("Não foi possível participar da comunidade.");
      }
      setIsJoining(false);
  };

  // Logic for Pending Requests
  const handleApprove = async (userId: string) => {
      if(!community) return;
      await communityService.approveAccess(community.id, userId);
      refreshMembers();
  };

  const handleReject = async (userId: string) => {
      if(!community) return;
      await communityService.rejectAccess(community.id, userId);
      refreshMembers();
  };

  const handleUndoReject = async (userId: string) => {
      if(!community) return;
      await communityService.undoRejectAccess(community.id, userId);
      refreshMembers();
  };

  const hasModerationPower = community?.currentUserRole === 'OWNER' || community?.currentUserRole === 'MODERATOR';
  const isPending = community?.currentUserRole === 'PENDING';
  const isMember = community?.isMember;

  // Group members for Sidebar
  const owners = members.filter(m => m.role === 'OWNER');
  const moderators = members.filter(m => m.role === 'MODERATOR');
  const regularMembers = members.filter(m => m.role === 'MEMBER');
  const pendingMembers = members.filter(m => m.role === 'PENDING');
  const rejectedMembers = members.filter(m => m.role === 'REJECTED'); // To show greyed out

  if (isLoading && !community) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-[#50c878]" size={40} /></div>;
  if (!community) return <div className="p-8 text-center text-slate-500">Comunidade não encontrada.</div>;

  return (
    // FIX: Exact height calculation to prevent double scrollbars. 
    // Header (73px) + MobileNav (approx 80px on mobile) removed from 100vh.
    <div className="flex flex-col md:flex-row h-[calc(100vh-73px-80px)] xl:h-[calc(100vh-73px)] overflow-hidden max-w-[100%] mx-auto relative">
      
      {/* JOIN / PENDING BANNER FOR NON-MEMBERS */}
      {!isMember && (
          <div className="absolute bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:min-w-[400px] z-[70] animate-fade-in-up">
              <div className="bg-[#1e293b]/95 backdrop-blur-xl border border-slate-600 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                      {community.privacy === 'PRIVATE' ? <Lock size={20} className="text-slate-400" /> : <Users size={20} className="text-[#50c878]" />}
                      <div>
                          <p className="text-white font-bold text-sm">
                              {isPending ? 'Solicitação Pendente' : 'Você está visitando'}
                          </p>
                          <p className="text-slate-400 text-xs">
                              {isPending ? 'Aguarde aprovação dos moderadores.' : 'Junte-se para interagir!'}
                          </p>
                      </div>
                  </div>
                  
                  <button 
                    onClick={handleJoinCommunity}
                    disabled={isPending || isJoining}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 ${
                        isPending 
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600' 
                        : 'bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] active:scale-95'
                    }`}
                  >
                      {isJoining ? <Loader2 className="animate-spin" size={16} /> : (
                          <>
                              {isPending ? (
                                  <>Aguardando <Clock size={16} /></>
                              ) : (
                                  <>Participar <Check size={16} /></>
                              )}
                          </>
                      )}
                  </button>
              </div>
          </div>
      )}

      <div className="md:hidden flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2 font-bold text-white overflow-hidden">
           <img src={community.avatarUrl} className="w-8 h-8 rounded-lg shrink-0" alt={community.name} />
           <span className="truncate">{community.name}</span>
           {community.isMuted && <BellOff size={16} className="text-slate-500 shrink-0 ml-1" />}
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-300">
            <Menu />
        </button>
      </div>

      <aside className={`
        fixed top-[73px] bottom-0 left-0 z-[60] w-64 bg-[#0f172a] 
        md:bg-slate-800/30 md:relative md:inset-auto md:h-full md:w-64 md:translate-x-0 
        transition-transform duration-300 border-r border-slate-700 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-700/50 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-white truncate flex-1">{community.name}</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X /></button>
            </div>
            
            {/* Show tabs only if member */}
            {isMember ? (
                <div className="flex bg-slate-900/50 p-1 rounded-lg">
                    <button 
                        onClick={() => setSidebarTab('channels')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sidebarTab === 'channels' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                        Canais
                    </button>
                    <button 
                        onClick={() => setSidebarTab('members')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${sidebarTab === 'members' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                        Membros
                    </button>
                </div>
            ) : (
                <div className="text-center py-2 bg-slate-900/30 rounded-lg border border-slate-700/50">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Modo Visitante</span>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
            {/* SUSPENDED WARNING FOR STAFF */}
            {community.isSuspended && hasModerationPower && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 mx-2">
                    <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wide mb-1">
                        <AlertOctagon size={14} /> Grupo Suspenso
                    </div>
                    <p className="text-[10px] text-red-300">
                        Este grupo está oculto para o público e membros. Apenas a staff tem acesso.
                    </p>
                </div>
            )}
            
            {/* CHANNELS VIEW */}
            {sidebarTab === 'channels' && (
                <>
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Canais de Texto</h3>
                        <div className="space-y-1">
                            {channels
                                .filter(c => c.type === 'FEED' || c.type === 'CHAT')
                                // Only show Chat channels to members. Feed was technically public but now we strictly isolate content.
                                .map(channel => (
                                <button
                                    key={channel.id}
                                    onClick={() => handleChannelSelect(channel)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        activeChannel?.id === channel.id 
                                        ? 'bg-[#50c878]/10 text-[#50c878]' 
                                        : channel.hasUnread 
                                            ? 'text-white bg-white/5 font-bold hover:bg-slate-700/50' 
                                            : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                                    }`}
                                >
                                    {channel.type === 'FEED' ? <MessageSquare size={16} /> : <Hash size={16} />}
                                    <span className="truncate flex-1 text-left">{channel.name}</span>
                                    {channel.hasUnread && <span className="w-2 h-2 bg-white rounded-full"></span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Voice Channels - Only for Members */}
                    {isMember && (
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-2">Canais de Voz</h3>
                            <div className="space-y-1">
                                {channels.filter(c => c.type === 'VOICE').map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => handleChannelSelect(channel)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            activeChannel?.id === channel.id 
                                            ? 'bg-[#50c878]/10 text-[#50c878]' 
                                            : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                                        }`}
                                    >
                                        <Volume2 size={16} />
                                        {channel.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* MEMBERS VIEW */}
            {sidebarTab === 'members' && isMember && (
                isLoadingMembers ? (
                    <div className="flex justify-center pt-4"><Loader2 className="animate-spin text-slate-500" size={20} /></div>
                ) : (
                    <div className="space-y-6">
                        {/* PENDING REQUESTS SECTION (Only visible to Owners/Mods) */}
                        {hasModerationPower && (pendingMembers.length > 0 || rejectedMembers.length > 0) && (
                            <div className="bg-slate-800/20 rounded-lg p-2 mb-4 border border-slate-700/50">
                                <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2 px-2 flex items-center gap-1">
                                    <Clock size={12} /> Pendentes
                                </h3>
                                <div className="space-y-2">
                                    {pendingMembers.map(m => (
                                        <div key={m.userId} className="flex items-center justify-between px-2 py-2 bg-slate-800/50 rounded-lg">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src={m.avatar || 'https://picsum.photos/50'} className="w-6 h-6 rounded-full" alt={m.name} />
                                                <span className="text-xs font-bold text-slate-200 truncate">{m.name}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleApprove(m.userId)} className="p-1 bg-[#50c878]/20 hover:bg-[#50c878] text-[#50c878] hover:text-black rounded transition-colors" title="Aprovar"><Check size={12} /></button>
                                                <button onClick={() => handleReject(m.userId)} className="p-1 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded transition-colors" title="Rejeitar"><X size={12} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Rejected (Greyed out for 24h concept) */}
                                    {rejectedMembers.map(m => (
                                        <div key={m.userId} className="flex items-center justify-between px-2 py-2 bg-slate-800/30 rounded-lg opacity-50 grayscale transition-all hover:opacity-80">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src={m.avatar || 'https://picsum.photos/50'} className="w-6 h-6 rounded-full" alt={m.name} />
                                                <span className="text-xs font-bold text-slate-400 truncate strike-through decoration-slate-500 line-through">{m.name}</span>
                                            </div>
                                            <button onClick={() => handleUndoReject(m.userId)} className="p-1 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors flex items-center gap-1 text-[10px]" title="Desfazer Rejeição">
                                                <RotateCcw size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {owners.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold text-[#FFC300] uppercase tracking-widest mb-2 px-2 flex items-center gap-1"><Crown size={12} /> Dono - {owners.length}</h3>
                                <div className="space-y-1">
                                    {owners.map(m => (
                                        <div key={m.userId} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-800/30 rounded-lg transition-colors">
                                            <div className="relative">
                                                <img src={m.avatar || 'https://picsum.photos/50'} className="w-8 h-8 rounded-full border border-[#FFC300]/30" alt={m.name} />
                                                <div className="absolute -bottom-1 -right-1 bg-[#FFC300] text-[#1e293b] rounded-full p-[2px] border border-[#1e293b]"><Crown size={8} fill="currentColor" /></div>
                                            </div>
                                            <span className="text-sm font-bold text-[#FFC300] truncate">{m.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {moderators.length > 0 && (
                            <div>
                                <h3 className="text-[10px] font-bold text-[#50c878] uppercase tracking-widest mb-2 px-2 flex items-center gap-1"><Shield size={12} /> Moderadores - {moderators.length}</h3>
                                <div className="space-y-1">
                                    {moderators.map(m => (
                                        <div key={m.userId} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-800/30 rounded-lg transition-colors">
                                            <div className="relative">
                                                <img src={m.avatar || 'https://picsum.photos/50'} className="w-8 h-8 rounded-full border border-[#50c878]/30" alt={m.name} />
                                                <div className="absolute -bottom-1 -right-1 bg-[#50c878] text-[#1e293b] rounded-full p-[2px] border border-[#1e293b]"><Shield size={8} fill="currentColor" /></div>
                                            </div>
                                            <span className="text-sm font-medium text-[#50c878] truncate">{m.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-2 flex items-center gap-1"><Users size={12} /> Membros - {regularMembers.length}</h3>
                            <div className="space-y-1">
                                {regularMembers.map(m => (
                                    <div key={m.userId} className="flex items-center gap-3 px-2 py-2 hover:bg-slate-800/30 rounded-lg transition-colors opacity-80 hover:opacity-100">
                                        <img src={m.avatar || 'https://picsum.photos/50'} className="w-8 h-8 rounded-full bg-slate-700" alt={m.name} />
                                        <span className="text-sm text-slate-300 truncate">{m.name}</span>
                                    </div>
                                ))}
                                {regularMembers.length === 0 && <p className="text-xs text-slate-600 px-2 italic">Nenhum membro encontrado.</p>}
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>

        <div className="p-3 bg-slate-900/50 border-t border-slate-700/50 flex items-center gap-3">
             <img 
                src={currentUserProfile?.avatar_url || "https://picsum.photos/100/100"} 
                className="w-9 h-9 rounded-full border border-slate-600 object-cover" 
                alt="Me" 
             />
             <div className="flex-1 min-w-0">
                 <div className="text-sm font-bold text-white truncate">{currentUserProfile?.username || "Você"}</div>
                 <div className="text-xs text-slate-500 truncate">Online</div>
             </div>
             
             {community.isMuted && (
                <div className="text-slate-500" title="Silenciado">
                    <BellOff size={16} />
                </div>
             )}

             {isMember && (
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
                    title="Configurações da Comunidade"
                 >
                    <Settings size={18} />
                 </button>
             )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#1e293b] relative overflow-hidden">
         <header className="h-14 border-b border-slate-700/50 flex items-center justify-between px-4 md:px-6 bg-[#1e293b]/95 backdrop-blur z-10 shrink-0">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
                {activeChannel?.type === 'VOICE' ? <Volume2 size={20} className="text-slate-400" /> : <Hash size={20} className="text-slate-400" />}
                {activeChannel?.name}
            </div>
            <div className="flex items-center gap-4 text-slate-400">
                <Info size={20} className="cursor-pointer hover:text-white" />
            </div>
         </header>

         {/* Fixed Scroll Area - Content only scrolls here */}
         <div className="flex-1 min-h-0 relative overflow-hidden">
            {/* STRICT ACCESS CONTROL: Only Members can see ANY content (Feed, Chat, Voice) */}
            {isMember ? (
                <div className="h-full overflow-y-auto">
                    {activeChannel?.type === 'FEED' && (
                        <FeedChannelView 
                            key={activeChannel.id} 
                            communityId={community.id}
                            channelId={activeChannel.id} 
                            canModeratorDelete={hasModerationPower} 
                            onVibeUpdate={onVibeUpdate}
                            isMember={true}
                        />
                    )}
                    {activeChannel?.type === 'CHAT' && (
                        <ChatChannelView 
                            key={activeChannel.id} 
                            channelId={activeChannel.id}
                            channelName={activeChannel.name}
                            canModeratorDelete={hasModerationPower} 
                            onVibeUpdate={onVibeUpdate}
                        />
                    )}
                    {activeChannel?.type === 'VOICE' && <VoiceChannelView key={activeChannel.id} channel={activeChannel} />}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center overflow-y-auto">
                    <Lock size={48} className="mb-4 text-slate-600" />
                    <h3 className="text-xl font-bold text-white mb-2">Acesso Restrito</h3>
                    <p className="max-w-md">
                        O Mural de Avisos, chats e canais de voz são exclusivos para membros desta comunidade. 
                        Junte-se à tribo para interagir!
                    </p>
                </div>
            )}
         </div>
      </main>

      {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {isSettingsOpen && (
          <SettingsModal 
            community={community} 
            onClose={() => setIsSettingsOpen(false)}
            onUpdate={handleSettingsUpdate}
            onDelete={handleDeleteCommunity}
          />
      )}
    </div>
  );
};

// ... (VoiceChannelView, FeedChannelView, ChatChannelView, CommunityPostInput... all preserved same)
const VoiceChannelView: React.FC<{ channel: Channel }> = ({ channel }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-[#50c878]/20 rounded-full animate-ping"></div>
                <Volume2 size={40} className="text-[#50c878] relative z-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{channel.name}</h2>
            <p className="text-slate-400 mb-8 max-w-md">Canal de voz ativo. Conecte-se para interagir em tempo real com os membros.</p>
            <button className="bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold px-8 py-3 rounded-full transition-all active:scale-95 shadow-lg flex items-center gap-2 cursor-pointer">
                <Mic size={20} /> Entrar na Sala
            </button>
        </div>
    );
};

const FeedChannelView: React.FC<{ communityId: string, channelId: string, canModeratorDelete: boolean, onVibeUpdate?: (newBalance: number) => void, isMember: boolean }> = ({ communityId, channelId, canModeratorDelete, onVibeUpdate, isMember }) => {
    const [posts, setPosts] = useState<Post[]>([]);

    const fetchPosts = async () => {
        const data = await postService.getPosts(undefined, communityId);
        setPosts(data);
    };

    const handlePin = async (postId: string, newStatus: boolean) => {
        await postService.togglePin(postId, newStatus);
        fetchPosts(); // Refresh to re-sort
    };

    useEffect(() => {
        fetchPosts();
    }, [communityId]);

    return (
        <div className="min-h-full p-4 custom-scrollbar pb-24">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700 border-dashed mb-4">
                    <h3 className="text-white font-bold mb-1">Mural de Avisos</h3>
                    <p className="text-slate-400 text-sm">Este mural é exclusivo desta comunidade.</p>
                </div>

                {isMember && <CommunityPostInput communityId={communityId} onPosted={fetchPosts} />}

                {posts.map(post => (
                    <PostCard 
                        key={post.id} 
                        {...post} 
                        userHasLiked={post.userHasLiked} 
                        canDelete={canModeratorDelete} 
                        onDelete={fetchPosts} 
                        onVibeTransfer={onVibeUpdate} 
                        canPin={canModeratorDelete}
                        isPinned={post.isPinned}
                        onPin={handlePin}
                    />
                ))}
                
                {posts.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-10">
                        Nenhum aviso postado ainda. Seja o primeiro!
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatChannelView: React.FC<{ channelId: string, channelName: string, canModeratorDelete: boolean, onVibeUpdate?: (newBalance: number) => void }> = ({ channelId, channelName, canModeratorDelete, onVibeUpdate }) => {
    const [messages, setMessages] = useState<CommunityMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const endRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [linkToOpen, setLinkToOpen] = useState<string | null>(null);
    
    useEffect(() => {
        const load = async () => {
            const msgs = await communityService.getMessages(channelId);
            setMessages(msgs);
        };
        load();
    }, [channelId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim()) return;
        const newMsg = await communityService.sendMessage(channelId, inputText);
        setMessages(prev => [...prev, newMsg]);
        setInputText('');
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            const newMsg = await communityService.sendMessage(channelId, "Enviou uma imagem", objectUrl);
            setMessages(prev => [...prev, newMsg]);
        }
    };

    const confirmExternalLink = () => {
        if (linkToOpen) {
            window.open(linkToOpen, '_blank');
            setLinkToOpen(null);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
               {messages.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                       <MessageSquare size={48} className="mb-2" />
                       <p>Nada por aqui ainda.</p>
                   </div>
               ) : (
                   messages.map(msg => {
                       const isMe = msg.userId === 'current_user'; 
                       return (
                        <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <img src={msg.userAvatar} className="w-8 h-8 rounded-full bg-slate-700" alt={msg.userName} />
                            <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-xs font-bold text-white">{msg.userName}</span>
                                    <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                                </div>
                                <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-[#50c878] text-[#1e293b] rounded-tr-none' : 'bg-slate-700 text-slate-200 rounded-tl-none'}`}>
                                    {msg.mediaUrl ? (
                                        <img src={msg.mediaUrl} alt="content" className="max-w-full rounded-lg mb-1" />
                                    ) : null}
                                    <p className="text-sm whitespace-pre-wrap">
                                        {parseTextWithLinks(msg.content, (url) => setLinkToOpen(url))}
                                    </p>
                                </div>
                            </div>
                        </div>
                       );
                   })
               )}
               <div ref={endRef} />
            </div>
            
             <div className="p-4 bg-[#1e293b] border-t border-slate-700/50">
                <form onSubmit={handleSend} className="flex items-end gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700 focus-within:border-[#50c878] transition-colors">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-white"><Image size={20} /></button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    
                    <textarea 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder={`Mensagem em #${channelName || 'geral'}`} 
                        className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none py-2 resize-none max-h-32 custom-scrollbar"
                        rows={1}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                    <button type="submit" disabled={!inputText.trim()} className="p-2 text-[#50c878] hover:bg-[#50c878]/10 rounded-lg disabled:opacity-50 transition-colors cursor-pointer">
                        <Send size={20} />
                    </button>
                </form>
             </div>

             {linkToOpen && (
                 <ExternalLinkWarningModal 
                    url={linkToOpen} 
                    onClose={() => setLinkToOpen(null)} 
                    onConfirm={confirmExternalLink} 
                 />
             )}
        </div>
    );
};

const CommunityPostInput: React.FC<{ communityId: string, onPosted: () => void }> = ({ communityId, onPosted }) => {
    const [content, setContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentUserAvatar, setCurrentUserAvatar] = useState('https://picsum.photos/seed/user-me/50/50');
    
    // File Upload States
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchAvatar = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
                if (data?.avatar_url) {
                    setCurrentUserAvatar(data.avatar_url);
                }
            }
        };
        fetchAvatar();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
            setIsExpanded(true); // Auto expand if image selected
        }
    };

    const handleRemoveMedia = () => {
        setMediaPreview(null);
        setMediaFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadMediaToSupabase = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `community-posts/${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error } = await supabase.storage.from('media').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('media').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async () => {
        if (!content.trim() && !mediaFile) return;
        setIsPosting(true);
        try {
            let finalMediaUrl = undefined;
            if (mediaFile) {
                finalMediaUrl = await uploadMediaToSupabase(mediaFile);
            }

            await postService.createPost({
                userId: 'current_user',
                content: content,
                tags: [],
                communityId: communityId,
                mediaUrl: finalMediaUrl
            });
            
            setContent('');
            handleRemoveMedia();
            setIsPosting(false);
            setIsExpanded(false);
            onPosted();
        } catch (e) {
            console.error(e);
            alert("Erro ao publicar.");
            setIsPosting(false);
        }
    };

    return (
        <div className={`mb-6 bg-slate-800/50 border border-slate-700 rounded-xl transition-all duration-300 ${isExpanded ? 'p-4 shadow-lg ring-1 ring-[#50c878]/30' : 'p-3 hover:bg-slate-800'}`}>
            <div className="flex items-start gap-3">
                <img src={currentUserAvatar} className="w-9 h-9 rounded-full bg-slate-700 object-cover" alt="me" />
                <div className="flex-1">
                    {!isExpanded ? (
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                placeholder="Postar no Mural de Avisos..." 
                                className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none py-2"
                                onFocus={() => setIsExpanded(true)}
                            />
                            <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-white p-1">
                                <Image size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <textarea 
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Escreva um aviso para a comunidade..."
                                className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none resize-none min-h-[80px]"
                                autoFocus
                            />
                            
                            {mediaPreview && (
                                <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-black/30 max-w-xs">
                                    <img src={mediaPreview} className="w-full h-auto max-h-40 object-contain" />
                                    <button onClick={handleRemoveMedia} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500/80 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        className="p-2 text-slate-400 hover:text-[#50c878] bg-slate-900/50 hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-[#50c878]/30"
                                        title="Anexar Imagem/Vídeo/Áudio"
                                    >
                                        <Image size={18} />
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*,audio/*" />
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIsExpanded(false)}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleSubmit}
                                        disabled={isPosting || (!content.trim() && !mediaFile)}
                                        className="px-4 py-1.5 bg-[#50c878] text-[#1e293b] text-xs font-bold rounded-lg hover:bg-[#50c878]/90 disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {isPosting ? <Loader2 size={12} className="animate-spin" /> : <><Send size={12} /> Postar</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const parseTextWithLinks = (text: string, onLinkClick: (url: string) => void) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return (<button key={index} onClick={() => onLinkClick(part)} className="text-[#50c878] underline hover:text-[#50c878]/80 text-left break-all">{part}</button>);
        }
        return <span key={index}>{part}</span>;
    });
};

const ExternalLinkWarningModal: React.FC<{ url: string, onClose: () => void, onConfirm: () => void }> = ({ url, onClose, onConfirm }) => (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#1e293b] max-w-sm w-full rounded-2xl border border-yellow-500/50 p-6 shadow-2xl animate-scale-up">
            <h3 className="text-lg font-bold text-white text-center mb-2">Link Externo</h3>
            <p className="text-sm text-slate-400 text-center mb-4">Você será redirecionado para: <br/><span className="text-xs text-slate-500 font-mono">{url}</span></p>
            <div className="flex gap-3 w-full"><button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold bg-slate-700 text-white hover:bg-slate-600 transition-colors">Cancelar</button><button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl font-bold bg-yellow-500 text-[#1e293b] hover:bg-yellow-400 transition-colors">Continuar</button></div>
        </div>
    </div>
);

interface SettingsModalProps {
  community: Community;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ community, onClose, onUpdate, onDelete }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isMuted, setIsMuted] = useState(community.isMuted);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const navigate = useNavigate();

    const toggleMute = async () => {
        setIsMuted(!isMuted);
    };

    const handleLeave = async () => {
        setShowLeaveConfirm(false);
        const success = await communityService.leaveCommunity(community.id);
        if (success) {
            navigate('/communities');
        } else {
            alert('Erro ao sair do grupo.');
        }
    };

    if (showAdvanced) {
        return <AdvancedManagementModal community={community} onClose={() => setShowAdvanced(false)} onUpdate={onUpdate} onDelete={onDelete} />;
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1e293b] w-full max-w-sm md:max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-scale-up">
                <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <Settings className="text-slate-400" size={20} />
                        <h2 className="font-bold text-white">Configurações</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6">
                    <div className="flex items-center gap-4 mb-8 bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
                        <img src={community.avatarUrl} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                            <h3 className="text-white font-bold">{community.name}</h3>
                            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                                {community.currentUserRole === 'OWNER' ? 'Dono' : community.currentUserRole === 'MODERATOR' ? 'Moderador' : 'Membro'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Device Settings Mock */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Dispositivos de Mídia</h4>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs text-slate-400 flex items-center gap-2 mb-1"><Mic size={12} /> Microfone</label>
                                    <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none">
                                        <option>Padrão - Microfone Interno</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 flex items-center gap-2 mb-1"><Camera size={12} /> Câmera</label>
                                    <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none">
                                        <option>Padrão - FaceTime HD Camera</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-700/50">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Notificações</h4>
                            <div className="bg-slate-900/50 p-3 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${isMuted ? 'bg-red-500/10 text-red-500' : 'bg-[#50c878]/10 text-[#50c878]'}`}>
                                        {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Silenciar Comunidade</p>
                                        <p className="text-[10px] text-slate-400">Desativar alertas push e sons</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={toggleMute}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${isMuted ? 'bg-slate-600' : 'bg-[#50c878]'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isMuted ? 'left-1' : 'right-1'}`}></div>
                                </button>
                            </div>
                        </div>

                        {(community.currentUserRole === 'OWNER' || community.currentUserRole === 'MODERATOR') && (
                            <button 
                                onClick={() => setShowAdvanced(true)}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 p-4 rounded-xl flex items-center justify-between group transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#50c878]/10 rounded-lg text-[#50c878] group-hover:bg-[#50c878]/20 transition-colors">
                                        <Shield size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-white">Painel Avançado</p>
                                        <p className="text-[10px] text-slate-400">Gerenciar membros e grupo</p>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                            </button>
                        )}

                        {/* Discrete Leave Button for Non-Owners */}
                        {community.currentUserRole !== 'OWNER' && (
                            <button 
                                onClick={() => setShowLeaveConfirm(true)}
                                className="w-full text-xs font-bold text-slate-500 hover:text-red-400 py-2 transition-colors flex items-center justify-center gap-1"
                            >
                                <LogOut size={12} /> Sair do Grupo
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
                    <button onClick={onClose} className="w-full bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95">
                        Salvar Preferências
                    </button>
                </div>
            </div>

            {showLeaveConfirm && (
                <ConfirmationModal 
                    title="Sair do Grupo?" 
                    message={`Tem certeza que deseja sair de "${community.name}"? Você perderá acesso aos canais privados.`}
                    icon={<LogOut size={24} className="text-orange-500" />}
                    confirmText="Sair do Grupo"
                    confirmColor="bg-orange-500 hover:bg-orange-600"
                    onCancel={() => setShowLeaveConfirm(false)}
                    onConfirm={handleLeave}
                />
            )}
        </div>
    );
};

const AdvancedManagementModal: React.FC<{ community: Community, onClose: () => void, onUpdate?: () => void, onDelete: () => void }> = ({ community, onClose, onUpdate, onDelete }) => {
    const [name, setName] = useState(community.name);
    const [desc, setDesc] = useState(community.description);
    const [bannerUrl, setBannerUrl] = useState(community.bannerUrl);
    const [avatarUrl, setAvatarUrl] = useState(community.avatarUrl);
    const [welcomeMessage, setWelcomeMessage] = useState(community.welcomeMessage || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // File State for upload
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    
    // Members Management State
    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | RoleType>('ALL');
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [confirmKickMember, setConfirmKickMember] = useState<CommunityMember | null>(null);
    
    // Danger Zone States
    const [showDangerZone, setShowDangerZone] = useState(false);
    const [confirmUnlockDanger, setConfirmUnlockDanger] = useState(false);
    const [confirmSuspend, setConfirmSuspend] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    
    // Permission Alert
    const [showPermissionDenied, setShowPermissionDenied] = useState(false);
    
    const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());

    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadMembers = async () => {
            const data = await communityService.getMembers(community.id);
            setMembers(data);
        };
        loadMembers();
    }, [community.id]);

    const uploadImage = async (file: File, folder: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error } = await supabase.storage.from('media').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('media').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let finalBannerUrl = bannerUrl;
            let finalAvatarUrl = avatarUrl;

            // Upload Banner if changed
            if (bannerFile) {
                finalBannerUrl = await uploadImage(bannerFile, 'community-banners');
            }

            // Upload Avatar if changed
            if (avatarFile) {
                finalAvatarUrl = await uploadImage(avatarFile, 'community-avatars');
            }

            await communityService.updateCommunity(community.id, { 
                name, 
                description: desc, 
                bannerUrl: finalBannerUrl, 
                avatarUrl: finalAvatarUrl, 
                welcomeMessage 
            });
            if (onUpdate) onUpdate();
            setIsSaving(false);
            onClose();
        } catch (e) {
            console.error(e);
            setIsSaving(false);
            alert('Erro ao salvar alterações');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setUrl: (url: string) => void, setFile: (f: File) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setUrl(url);
            setFile(file);
        }
    };

    // ... (Promotion/Demotion logic same as before) ...
    const handlePromote = async (member: CommunityMember) => {
        setIsActionLoading(member.userId);
        const result = await communityService.updateMemberRole(community.id, member.userId, 'MODERATOR');
        if (result.success) {
            if (result.message === 'invitation_sent') {
                setInvitedUsers(prev => new Set(prev).add(member.userId));
            } else {
                setMembers(prev => prev.map(m => m.userId === member.userId ? { ...m, role: 'MODERATOR' } : m));
            }
        }
        setIsActionLoading(null);
    };

    const handleDemote = async (member: CommunityMember) => {
        setIsActionLoading(member.userId);
        const result = await communityService.updateMemberRole(community.id, member.userId, 'MEMBER');
        if (result.success) {
            setMembers(prev => prev.map(m => m.userId === member.userId ? { ...m, role: 'MEMBER' } : m));
            setInvitedUsers(prev => {
                const next = new Set(prev);
                next.delete(member.userId);
                return next;
            });
        }
        setIsActionLoading(null);
    };

    const handleKick = async () => {
        if (!confirmKickMember) return;
        setIsActionLoading(confirmKickMember.userId);
        const success = await communityService.kickMember(community.id, confirmKickMember.userId);
        if (success) {
            setMembers(prev => prev.filter(m => m.userId !== confirmKickMember.userId));
        }
        setIsActionLoading(null);
        setConfirmKickMember(null);
    };

    // *** PERMISSION CHECKS FOR DANGER ZONE ***
    const handleSuspendClick = () => {
        if (community.currentUserRole !== 'OWNER') {
            setShowPermissionDenied(true);
            return;
        }
        setConfirmSuspend(true);
    };

    const handleDeleteClick = () => {
        if (community.currentUserRole !== 'OWNER') {
            setShowPermissionDenied(true);
            return;
        }
        setConfirmDelete(true);
    };

    const performSuspend = async () => {
        await communityService.updateCommunity(community.id, { isSuspended: !community.isSuspended });
        setConfirmSuspend(false);
        if (onUpdate) onUpdate(); // Refresh parent view
        onClose(); // Close modal
    };

    const performDelete = async () => {
        await communityService.deleteCommunity(community.id);
        setConfirmDelete(false);
        onDelete(); // Trigger navigation away
    };

    const inviteLink = `https://catarse.social/invite/${community.id.substring(0, 8)}`;

    const filteredMembers = members.filter(m => {
        if (m.role === 'PENDING' || m.role === 'REJECTED') return false;
        const matchesSearch = (m.name || '').toLowerCase().includes(memberSearch.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const isOwner = community.currentUserRole === 'OWNER';

    return (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1e293b] w-full max-w-5xl h-[90vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-scale-up">
                <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Shield className="text-[#50c878]" size={20} />
                        <h2 className="font-bold text-white text-lg">Gestão Avançada</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Voltar</button>
                        <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-full">
                        
                        {/* LEFT COLUMN: Settings */}
                        <div className="p-6 space-y-8 border-r border-slate-700/50">
                            {/* Visual Identity */}
                            <section>
                                <h3 className="text-xs font-bold text-[#50c878] uppercase tracking-widest mb-4 flex items-center gap-2"><Image size={14} /> Identidade Visual</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Banner da Comunidade</label>
                                        <div onClick={() => bannerInputRef.current?.click()} className="h-32 w-full rounded-xl overflow-hidden bg-slate-800 relative cursor-pointer group border border-slate-700 hover:border-[#50c878] transition-colors">
                                            <img src={bannerUrl} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="text-white drop-shadow-md" size={32} />
                                            </div>
                                            <input type="file" ref={bannerInputRef} onChange={(e) => handleFileChange(e, setBannerUrl, setBannerFile)} className="hidden" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div onClick={() => avatarInputRef.current?.click()} className="cursor-pointer group relative">
                                            <img src={avatarUrl} className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-600 group-hover:border-[#50c878] transition-colors" />
                                            <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="text-white" size={20} />
                                            </div>
                                            <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, setAvatarUrl, setAvatarFile)} className="hidden" />
                                        </div>
                                        <button onClick={() => avatarInputRef.current?.click()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-600 transition-colors">
                                            Selecionar Imagem
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Basic Info */}
                            <section>
                                <h3 className="text-xs font-bold text-[#50c878] uppercase tracking-widest mb-4 flex items-center gap-2"><Info size={14} /> Informações Básicas</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Nome do Grupo</label>
                                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-[#50c878] focus:outline-none transition-colors font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Descrição</label>
                                        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-[#50c878] focus:outline-none transition-colors h-24 resize-none text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Tags (separadas por vírgula)</label>
                                        <input defaultValue={community.tags.join(', ')} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-[#50c878] focus:outline-none transition-colors text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Mensagem de Boas-vindas</label>
                                        <textarea 
                                            value={welcomeMessage} 
                                            onChange={e => setWelcomeMessage(e.target.value)} 
                                            placeholder="Ex: Olá! Leia as regras no mural..." 
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-[#50c878] focus:outline-none transition-colors h-20 resize-none text-sm" 
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Invites */}
                            <section>
                                <h3 className="text-xs font-bold text-[#50c878] uppercase tracking-widest mb-4 flex items-center gap-2"><LinkIcon size={14} /> Convites</h3>
                                <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex items-center justify-between gap-4">
                                    <span className="text-slate-400 text-xs truncate flex-1 font-mono">{inviteLink}</span>
                                    <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="px-3 py-1.5 bg-[#50c878]/20 hover:bg-[#50c878] text-[#50c878] hover:text-[#1e293b] rounded-lg text-xs font-bold transition-colors">Copiar</button>
                                </div>
                            </section>

                            {/* Danger Zone */}
                            <section className="pt-6 border-t border-red-500/20">
                                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Zona de Perigo</h3>
                                {!showDangerZone ? (
                                    <button 
                                        onClick={() => setConfirmUnlockDanger(true)}
                                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Lock size={16} /> Acessar Zona de Perigo
                                    </button>
                                ) : (
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-4 animate-fade-in">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-bold text-sm">{community.isSuspended ? 'Reativar Grupo' : 'Suspender Grupo'}</p>
                                                <p className="text-[10px] text-slate-400">Ocultar da lista pública.</p>
                                            </div>
                                            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                                <input 
                                                    type="checkbox" 
                                                    name="toggle" 
                                                    id="toggle" 
                                                    checked={community.isSuspended}
                                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                                    onChange={(e) => {
                                                        e.preventDefault();
                                                        handleSuspendClick(); // Check permission inside
                                                    }}
                                                />
                                                <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${community.isSuspended ? 'bg-red-500' : 'bg-slate-700'}`}></label>
                                            </div>
                                        </div>
                                        <div className="h-px bg-red-500/10 w-full"></div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-bold text-sm">Excluir Grupo</p>
                                                <p className="text-[10px] text-slate-400">Ação irreversível.</p>
                                            </div>
                                            <button onClick={handleDeleteClick} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* RIGHT COLUMN: Members Management */}
                        <div className="p-6 bg-slate-900/30 flex flex-col h-full">
                            {/* ... (Same Member Management UI as restored previously) ... */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-bold text-[#50c878] uppercase tracking-widest flex items-center gap-2">
                                    <Users size={14} /> Membros ({filteredMembers.length})
                                </h3>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <div className="bg-slate-900 border border-slate-700 rounded-lg flex items-center px-3 py-2 flex-1 focus-within:border-[#50c878] transition-colors">
                                    <input 
                                        placeholder="Buscar membro..." 
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        className="bg-transparent text-sm text-white w-full focus:outline-none placeholder-slate-500"
                                    />
                                </div>
                                <div className="relative group">
                                    <select 
                                        value={roleFilter} 
                                        onChange={(e) => setRoleFilter(e.target.value as any)}
                                        className="appearance-none bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#50c878]"
                                    >
                                        <option value="ALL">Todos</option>
                                        <option value="OWNER">Donos</option>
                                        <option value="MODERATOR">Mods</option>
                                        <option value="MEMBER">Membros</option>
                                    </select>
                                    <Filter size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                {filteredMembers.map(member => (
                                    <div key={member.userId} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img src={member.avatar || 'https://picsum.photos/50'} className="w-10 h-10 rounded-full object-cover" />
                                                {member.role === 'OWNER' && <div className="absolute -bottom-1 -right-1 bg-[#FFC300] p-0.5 rounded-full border border-slate-800"><Crown size={8} className="text-[#1e293b]" fill="currentColor" /></div>}
                                                {member.role === 'MODERATOR' && <div className="absolute -bottom-1 -right-1 bg-[#50c878] p-0.5 rounded-full border border-slate-800"><Shield size={8} className="text-[#1e293b]" fill="currentColor" /></div>}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-bold text-sm">{member.name}</span>
                                                    {member.role === 'OWNER' && <span className="text-[10px] font-bold bg-[#FFC300] text-[#1e293b] px-1.5 py-0.5 rounded uppercase border border-[#FFC300]">OWNER</span>}
                                                    {member.role === 'MODERATOR' && <span className="text-[10px] font-bold bg-transparent text-[#50c878] px-1.5 py-0.5 rounded uppercase border border-[#50c878]">MODERATOR</span>}
                                                    {member.role === 'MEMBER' && <span className="text-[10px] font-bold bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded uppercase">MEMBER</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {isOwner && member.role !== 'OWNER' && (
                                            <div className="flex items-center gap-1">
                                                {isActionLoading === member.userId ? <Loader2 size={16} className="animate-spin text-slate-500" /> : (
                                                    <>
                                                        {member.role === 'MEMBER' && (
                                                            <button 
                                                                onClick={() => handlePromote(member)}
                                                                className={`p-1.5 rounded-lg transition-colors ${
                                                                    invitedUsers.has(member.userId) 
                                                                    ? 'text-[#FFC300] bg-[#FFC300]/10 hover:bg-[#FFC300]/20' 
                                                                    : 'text-slate-400 hover:text-[#50c878] hover:bg-[#50c878]/10'
                                                                }`}
                                                                title={invitedUsers.has(member.userId) ? "Convite Enviado" : "Promover a Moderador"}
                                                            >
                                                                <ShieldCheck size={16} fill={invitedUsers.has(member.userId) ? "currentColor" : "none"} />
                                                            </button>
                                                        )}
                                                        {member.role === 'MODERATOR' && (
                                                            <button 
                                                                onClick={() => handleDemote(member)}
                                                                className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors" 
                                                                title="Rebaixar a Membro"
                                                            >
                                                                <ShieldAlert size={16} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => setConfirmKickMember(member)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" 
                                                            title="Remover do Grupo"
                                                        >
                                                            <UserMinus size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {filteredMembers.length === 0 && (
                                    <div className="text-center py-10 text-slate-500 text-sm">Nenhum membro encontrado.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-[#50c878] border-t border-[#50c878] flex-shrink-0">
                    <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 text-[#1e293b] font-bold text-sm">
                        {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Aplicar Alterações</>}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal for Kicking */}
            {confirmKickMember && (
                <ConfirmationModal 
                    title="Remover Membro?" 
                    message={`Tem certeza que deseja remover ${confirmKickMember.name} da comunidade?`}
                    icon={<UserMinus size={24} className="text-red-500" />}
                    onCancel={() => setConfirmKickMember(null)}
                    onConfirm={handleKick}
                    isLoading={isActionLoading === confirmKickMember.userId}
                />
            )}

            {/* Confirmation Modal for Danger Zone Unlock */}
            {confirmUnlockDanger && (
                <ConfirmationModal 
                    title="Acessar Zona de Perigo" 
                    message="As ações nesta área podem ser irreversíveis. Deseja continuar?"
                    icon={<AlertTriangle size={24} className="text-orange-500" />}
                    confirmText="Acessar"
                    confirmColor="bg-red-500 hover:bg-red-600"
                    onCancel={() => setConfirmUnlockDanger(false)}
                    onConfirm={() => { setShowDangerZone(true); setConfirmUnlockDanger(false); }}
                />
            )}

            {/* Permission Denied Modal */}
            {showPermissionDenied && (
                <ConfirmationModal 
                    title="Permissão Negada" 
                    message="Você não tem permissão para isso. Apenas o Dono do grupo pode realizar esta ação."
                    icon={<ShieldAlert size={24} className="text-red-500" />}
                    confirmText="Entendi"
                    confirmColor="bg-slate-700 hover:bg-slate-600"
                    onCancel={() => setShowPermissionDenied(false)}
                    onConfirm={() => setShowPermissionDenied(false)}
                />
            )}

            {/* Confirmation Modal for Suspend */}
            {confirmSuspend && (
                <ConfirmationModal 
                    title={community.isSuspended ? "Reativar Grupo?" : "Suspender Grupo?"}
                    message={community.isSuspended ? "O grupo voltará a ser visível na lista pública e para todos os membros." : "O grupo ficará oculto para o público. Apenas a staff poderá acessá-lo."}
                    icon={<AlertTriangle size={24} className="text-orange-500" />}
                    confirmText="Confirmar"
                    confirmColor="bg-orange-500 hover:bg-orange-600"
                    onCancel={() => setConfirmSuspend(false)}
                    onConfirm={performSuspend}
                />
            )}

            {/* Confirmation Modal for Delete Group */}
            {confirmDelete && (
                <ConfirmationModal 
                    title="Excluir Grupo?" 
                    message="Esta ação é PERMANENTE e IRREVERSÍVEL. Todos os dados, canais e mensagens serão apagados."
                    icon={<Trash2 size={24} className="text-red-500" />}
                    confirmText="Excluir Definitivamente"
                    confirmColor="bg-red-500 hover:bg-red-600"
                    onCancel={() => setConfirmDelete(false)}
                    onConfirm={performDelete}
                />
            )}
        </div>
    );
};

const ConfirmationModal: React.FC<{ 
    title: string; 
    message: string; 
    icon: React.ReactNode; 
    confirmText?: string; 
    confirmColor?: string;
    isLoading?: boolean;
    onCancel: () => void; 
    onConfirm: () => void; 
}> = ({ title, message, icon, confirmText = "Confirmar", confirmColor = "bg-red-500 hover:bg-red-600", isLoading = false, onCancel, onConfirm }) => (
    <div className="absolute inset-0 z-[120] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#1e293b] w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 text-center animate-scale-up">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 mx-auto border border-slate-700">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                {message}
            </p>
            <div className="flex gap-3">
                <button 
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    onClick={onConfirm}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-colors flex items-center justify-center gap-2 ${confirmColor}`}
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : confirmText}
                </button>
            </div>
        </div>
    </div>
);

export default CommunityView;
