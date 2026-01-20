
import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, Settings, MessageSquare, MessageCircle, // Added MessageCircle
  Edit3, Trash2, X, Save, Camera, Image as ImageIcon, Loader2, LogOut, AlertTriangle,
  Lock, Mail, Phone, Bell, Shield, Users, UserPlus, UserCheck, Heart, Grid, Building2, User, Clock, ArrowRight, UserMinus, Upload, Plus, Sparkles, Hash, Globe, EyeOff, Eye, Bookmark, LayoutGrid, List, ChevronLeft, Check, Smartphone, Flag, Power, Maximize2, Crown, AlertOctagon, Filter, CheckCircle, Menu, Share2, Copy
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../backend/supabase';
import { transactionService } from '../backend/TransactionService';
import { postService, Post, CreatePostData } from '../backend/PostService';
import { atrioService, AtrioItem, AtrioList } from '../backend/AtrioService';
import { communityService, Community, RoleType } from '../backend/CommunityService';
import { connectionService, Friend } from '../backend/ConnectionService';
import { AtrioModal, CreateAtrioModal } from './AtrioLeveza'; 
import PostCard from '../components/PostCard';

interface UserProfileProps {
  onLogout?: () => void;
}

interface UserData {
    id?: string;
    name: string; // Nome de Exibição (Full Name)
    username: string; // Handle (@username)
    status: string;
    bio: string;
    email: string;
    phone: string;
    countryCode: string; 
    avatarUrl: string;
    bannerUrl: string;
    notifications: boolean;
    isSuspended: boolean;
    lastUsernameChange?: string; // Timestamp
}

type Connection = Friend;

const UserProfile: React.FC<UserProfileProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'posts' | 'atrio' | 'groups' | 'following' | 'connections'>('posts');
  const [networkSubTab, setNetworkSubTab] = useState<'following' | 'followers'>('following');
  const [connectionsSubTab, setConnectionsSubTab] = useState<'friends' | 'pending'>('friends');
  const [atrioSubTab, setAtrioSubTab] = useState<'created' | 'saved'>('created');
  
  const [userBalance, setUserBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [atrioPosts, setAtrioPosts] = useState<AtrioItem[]>([]);
  const [sanctuaryLists, setSanctuaryLists] = useState<AtrioList[]>([]);
  const [userGroups, setUserGroups] = useState<Community[]>([]);
  
  const [userData, setUserData] = useState<UserData>({
      id: '',
      name: '',
      username: '',
      status: '',
      bio: '',
      email: '',
      phone: '',
      countryCode: '+55',
      avatarUrl: '',
      bannerUrl: '',
      notifications: true,
      isSuspended: false
  });

  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingConnections, setPendingConnections] = useState<Connection[]>([]);
  const [following, setFollowing] = useState<Connection[]>([]);
  const [followers, setFollowers] = useState<Connection[]>([]);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [viewingPost, setViewingPost] = useState<Post | null>(null); // New state for viewing post details
  const [editAtrio, setEditAtrio] = useState<AtrioItem | null>(null);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreateAtrioOpen, setIsCreateAtrioOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [editingList, setEditingList] = useState<AtrioList | null>(null);
  const [viewingList, setViewingList] = useState<AtrioList | null>(null);
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean, type: 'delete_connection' | 'unfollow' | 'delete_list', targetId: string, message: string }>({ 
      isOpen: false, type: 'unfollow', targetId: '', message: '' 
  });
  
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profile) {
              setUserData({
                  id: user.id,
                  name: profile.full_name || 'Usuário',
                  username: profile.username || 'usuario',
                  status: profile.status || 'Em busca de equilíbrio.',
                  bio: profile.bio || '',
                  email: user.email || '',
                  phone: profile.phone || '', 
                  countryCode: profile.country_code || '+55',
                  avatarUrl: profile.avatar_url || 'https://picsum.photos/200',
                  bannerUrl: profile.banner_url || 'https://picsum.photos/800/300',
                  notifications: true,
                  isSuspended: profile.is_suspended || false,
                  lastUsernameChange: profile.last_username_change
              });
              setUserBalance(profile.vibes || 0);
          }
      }

      const posts = await postService.getUserPosts('current_user', 'post');
      const atrioItems = await atrioService.getUserItems('current_user');
      const groups = await communityService.getUserCommunities('current_user');
      const lists = await atrioService.getLists();
      
      const myFollowers = await connectionService.getFollowers('current_user'); 
      const myFollowing = await connectionService.getFollowing('current_user'); 
      const myFriends = await connectionService.getFriends('current_user');     
      const myPending = await connectionService.getPendingRequests('current_user'); 

      setUserPosts(posts);
      setAtrioPosts(atrioItems);
      setUserGroups(groups);
      setSanctuaryLists(lists);
      
      setFollowers(myFollowers);
      setFollowing(myFollowing);
      setConnections(myFriends); 
      setPendingConnections(myPending);
      
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleFollowBack = async (id: string) => {
      const res = await transactionService.processFollowTransaction('current_user', id);
      if (res.success) {
          alert("Agora você segue de volta!");
          setFollowers(prev => prev.map(f => f.id === id ? { ...f, isFollowing: true } : f));
          const newFollowing = await connectionService.getFollowing('current_user');
          setFollowing(newFollowing);
      } else {
          alert(res.message);
      }
  };

  const handleRequestFriendship = async (id: string) => {
      const res = await connectionService.requestFriendship(id);
      if (res.success) {
          alert("Solicitação de amizade enviada!");
          setFollowing(prev => prev.map(f => f.id === id ? { ...f, friendshipStatus: 'pending_sent' } : f));
      } else {
          alert(res.message);
      }
  };

  const handleUpdateProfile = async (updatedData: Partial<UserData>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {};
      if (updatedData.name !== undefined) updates.full_name = updatedData.name;
      if (updatedData.username !== undefined && updatedData.username !== userData.username) {
          updates.username = updatedData.username;
          updates.last_username_change = new Date().toISOString();
      }
      if (updatedData.status !== undefined) updates.status = updatedData.status;
      if (updatedData.bio !== undefined) updates.bio = updatedData.bio;
      if (updatedData.avatarUrl !== undefined) updates.avatar_url = updatedData.avatarUrl;
      if (updatedData.bannerUrl !== undefined) updates.banner_url = updatedData.bannerUrl;
      if (updatedData.phone !== undefined) updates.phone = updatedData.phone;
      if (updatedData.countryCode !== undefined) updates.country_code = updatedData.countryCode;
      if (updatedData.isSuspended !== undefined) updates.is_suspended = updatedData.isSuspended;

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

      if (!error) {
          setUserData(prev => ({ 
              ...prev, 
              ...updatedData, 
              lastUsernameChange: updates.last_username_change || prev.lastUsernameChange 
          }));
          alert("Perfil atualizado com sucesso!");
      } else {
          console.error("Erro ao atualizar perfil:", JSON.stringify(error));
          alert('Erro ao atualizar perfil. Tente novamente.');
      }
  };

  const handleDeleteAccount = async () => {
      if (onLogout) onLogout();
      navigate('/');
  };

  const handleAcceptConnection = async (id: string) => {
      const success = await connectionService.acceptFriendship(id);
      if (success) {
          const acceptedFriend = pendingConnections.find(p => p.id === id);
          if (acceptedFriend) {
              const newFriend = { ...acceptedFriend, friendshipStatus: 'accepted' as 'accepted' };
              setConnections(prev => [...prev, newFriend]);
              setPendingConnections(prev => prev.filter(p => p.id !== id));
          }
          alert("Conexão aceita!");
      } else {
          alert("Erro ao aceitar conexão.");
      }
  };

  const openRemoveConnectionModal = (id: string) => { /* Mock */ };
  
  const openUnfollowModal = (id: string) => {
      setConfirmData({
          isOpen: true,
          type: 'unfollow',
          targetId: id,
          message: 'Deixar de seguir este usuário? Você receberá 1 Vibe de volta.'
      });
  };
  
  const openDeleteListModal = (id: string) => {
      setConfirmData({
          isOpen: true,
          type: 'delete_list',
          targetId: id,
          message: 'Tem certeza que deseja excluir esta lista? Os itens não serão apagados.'
      });
  };

  const handleConfirmAction = async () => {
      if (confirmData.type === 'delete_list') {
          await atrioService.deleteList(confirmData.targetId);
          setSanctuaryLists(prev => prev.filter(l => l.id !== confirmData.targetId));
      } else if (confirmData.type === 'unfollow') {
          await transactionService.processUnfollowTransaction('current_user', confirmData.targetId);
          setFollowing(prev => prev.filter(f => f.id !== confirmData.targetId));
      }
      setConfirmData({ ...confirmData, isOpen: false });
  };

  const handleSavePost = async (id: string, content: string, tags: string[], mediaUrl?: string) => { 
      await postService.updatePost(id, content, tags, mediaUrl); 
      const updatedPosts = await postService.getUserPosts('current_user', 'post'); 
      setUserPosts(updatedPosts); 
      setEditPost(null); 
      setViewingPost(null); // Close view modal if open
  };

  const handleDeletePost = async (id: string) => { 
      await postService.deletePost(id); 
      setUserPosts(prev => prev.filter(p => p.id !== id)); 
      setEditPost(null); 
      setViewingPost(null); // Close view modal if open
  };
  
  const handleSaveAtrio = async (id: any, updates: Partial<AtrioItem>) => { 
      await atrioService.updateItem(id, updates); 
      const updatedAtrio = await atrioService.getUserItems('current_user'); 
      setAtrioPosts(updatedAtrio); 
      setEditAtrio(null); 
  };
  const handleDeleteAtrio = async (id: any) => { 
      await atrioService.deleteItem(id); 
      setAtrioPosts(prev => prev.filter(i => i.id !== id)); 
      setEditAtrio(null); 
  };

  const handleCreatePost = async (data: CreatePostData) => { 
      await postService.createPost(data); 
      await transactionService.processPostCreationVibe('current_user'); 
      const updatedPosts = await postService.getUserPosts('current_user', 'post'); 
      setUserPosts(updatedPosts); 
      setIsCreatePostOpen(false); 
  };

  const handleCreateAtrio = async (item: Omit<AtrioItem, 'id' | 'vibes' | 'authorId'>) => { await atrioService.addItem(item); const updatedAtrio = await atrioService.getUserItems('current_user'); setAtrioPosts(updatedAtrio); setIsCreateAtrioOpen(false); };
  
  const handleCreateList = async (name: string, description: string, tags: string[]) => { 
      const newList = await atrioService.createList(name, description, tags); 
      setSanctuaryLists(prev => [...prev, newList]); 
      setIsCreateListOpen(false); 
  };
  const handleEditList = async (id: string, name: string, description: string, tags: string[]) => { 
      await atrioService.updateList(id, { name, description, tags }); 
      const updatedLists = await atrioService.getLists(); 
      setSanctuaryLists(updatedLists); 
      setEditingList(null); 
  };
  
  const handleUserClick = (userId: string) => { 
      navigate(`/u/${userId}`); 
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-24 overflow-x-hidden">
      
      {/* Header Profile Section - (No changes) */}
      <div className={`bg-[#1e293b] rounded-3xl overflow-hidden border border-slate-700 mb-8 relative shadow-xl ${userData.isSuspended ? 'grayscale opacity-75' : ''}`}>
        <div className="h-48 bg-slate-800 relative">
            <img src={userData.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1e293b]/90"></div>
            <button onClick={() => setIsSettingsOpen(true)} className="absolute top-4 right-4 bg-black/40 hover:bg-[#50c878] text-white p-2.5 rounded-full backdrop-blur-md border border-white/10 transition-all z-20 pointer-events-auto">
                <Settings size={20} />
            </button>
        </div>

        <div className="px-6 pb-6 md:px-10 relative -mt-16 flex flex-col md:flex-row items-center md:items-start gap-6">
             <div className="relative">
                 <img src={userData.avatarUrl} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#1e293b] bg-slate-800 object-cover shadow-2xl" alt="Profile" />
                 <div className="absolute bottom-2 right-2 w-6 h-6 bg-[#50c878] border-4 border-[#1e293b] rounded-full"></div>
             </div>
             <div className="flex-1 text-center md:text-left mt-2 md:mt-16">
                 <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                     {userData.name}<span className="text-[#50c878]"><Zap size={20} fill="currentColor" /></span>
                 </h1>
                 <p className="text-slate-400 text-sm mb-1">@{userData.username}</p>
                 <p className="text-[#50c878] font-medium text-sm mb-2">{userData.status}</p>
                 <p className="text-slate-400 text-sm max-w-2xl leading-relaxed mx-auto md:mx-0">{userData.bio}</p>
                 <div className="flex items-center justify-center md:justify-start gap-6 mt-4 text-sm font-bold text-slate-300">
                     <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors"><strong className="text-white">{userPosts.length + atrioPosts.length}</strong> Publicações</span>
                     <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors"><strong className="text-white">{following.length}</strong> Seguindo</span>
                     <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors"><strong className="text-white">{connections.length}</strong> Conexões</span>
                 </div>
             </div>
        </div>
      </div>

      <div className="flex border-b border-slate-700 mb-6 overflow-x-auto no-scrollbar gap-2">
        <TabButton active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon={Grid} label="Posts" />
        <TabButton active={activeTab === 'atrio'} onClick={() => setActiveTab('atrio')} icon={Sparkles} label="Átrio" />
        <TabButton active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} icon={Building2} label="Grupos" />
        <TabButton active={activeTab === 'following'} onClick={() => setActiveTab('following')} icon={Heart} label="Rede" />
        <TabButton active={activeTab === 'connections'} onClick={() => setActiveTab('connections')} icon={Users} label="Conexões" />
      </div>

      <div className="min-h-[300px]">
          {isLoading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#50c878]" size={40} /></div>
          ) : (
             <>
                {activeTab === 'posts' && (
                    <PostsGrid 
                        posts={userPosts} 
                        onView={(post) => setViewingPost(post)} 
                        onCreate={() => setIsCreatePostOpen(true)} 
                    />
                )}
                {/* ... (Other tabs remain unchanged) ... */}
                {activeTab === 'atrio' && (
                    <div className="space-y-6">
                        {!viewingList && (
                             <div className="flex justify-center md:justify-start">
                                 <div className="bg-slate-800 p-1 rounded-xl flex gap-1">
                                     <button onClick={() => setAtrioSubTab('created')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${atrioSubTab === 'created' ? 'bg-[#50c878] text-[#1e293b] shadow-lg' : 'text-slate-400 hover:text-white'}`}>Meu Átrio</button>
                                     <button onClick={() => setAtrioSubTab('saved')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${atrioSubTab === 'saved' ? 'bg-[#FFC300] text-[#1e293b] shadow-lg' : 'text-slate-400 hover:text-white'}`}><Bookmark size={14} fill={atrioSubTab === 'saved' ? "currentColor" : "none"} /> Santuário</button>
                                 </div>
                             </div>
                        )}

                        {atrioSubTab === 'created' && !viewingList && (
                            <AtrioGrid items={atrioPosts} onEdit={(item) => setEditAtrio(item)} onCreate={() => setIsCreateAtrioOpen(true)} />
                        )}

                        {atrioSubTab === 'saved' && (
                            viewingList ? (
                                <SanctuaryListView list={viewingList} onBack={() => setViewingList(null)} />
                            ) : (
                                <SanctuaryListsGrid 
                                    lists={sanctuaryLists} 
                                    onCreate={() => setIsCreateListOpen(true)}
                                    onEdit={(list) => setEditingList(list)}
                                    onDelete={(id) => openDeleteListModal(id)}
                                    onView={(list) => setViewingList(list)}
                                />
                            )
                        )}
                    </div>
                )}
                {activeTab === 'groups' && <GroupsList groups={userGroups} />}
                {activeTab === 'following' && (
                    <div className="space-y-6">
                        <div className="flex justify-center md:justify-start">
                             <div className="bg-slate-800 p-1 rounded-xl flex gap-1">
                                 <button onClick={() => setNetworkSubTab('following')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${networkSubTab === 'following' ? 'bg-[#50c878] text-[#1e293b] shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                     Seguindo <span className="ml-1 opacity-75">({following.length})</span>
                                 </button>
                                 <button onClick={() => setNetworkSubTab('followers')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${networkSubTab === 'followers' ? 'bg-[#50c878] text-[#1e293b] shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                     Seguidores <span className="ml-1 opacity-75">({followers.length})</span>
                                 </button>
                             </div>
                        </div>
                        {networkSubTab === 'following' && <FollowingList list={following} onUnfollow={openUnfollowModal} onRequestFriendship={handleRequestFriendship} onUserClick={handleUserClick} />}
                        {networkSubTab === 'followers' && <FollowersList list={followers} onFollowBack={handleFollowBack} onUserClick={handleUserClick} />}
                    </div>
                )}
                {activeTab === 'connections' && (
                    <div className="space-y-6">
                        <div className="flex justify-center md:justify-start">
                             <div className="bg-slate-800 p-1 rounded-xl flex gap-1">
                                 <button onClick={() => setConnectionsSubTab('friends')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${connectionsSubTab === 'friends' ? 'bg-[#50c878] text-[#1e293b] shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                     Amigos <span className="ml-1 opacity-75">({connections.length})</span>
                                 </button>
                                 <button onClick={() => setConnectionsSubTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${connectionsSubTab === 'pending' ? 'bg-[#50c878] text-[#1e293b] shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                     Pendentes <span className="ml-1 opacity-75">({pendingConnections.length})</span>
                                 </button>
                             </div>
                        </div>
                        {connectionsSubTab === 'friends' && <ConnectionsList list={connections} onAccept={() => {}} onRemove={openRemoveConnectionModal} onUserClick={handleUserClick} />}
                        {connectionsSubTab === 'pending' && <ConnectionsList list={pendingConnections} onAccept={handleAcceptConnection} onRemove={openRemoveConnectionModal} onUserClick={handleUserClick} />}
                    </div>
                )}
             </>
          )}
      </div>

      {isSettingsOpen && (
          <SettingsModal 
             isOpen={isSettingsOpen} 
             onClose={() => setIsSettingsOpen(false)} 
             userData={userData} 
             onUpdate={handleUpdateProfile} 
             onLogout={onLogout} 
             onDeleteAccount={handleDeleteAccount} 
          />
      )}

      {selectedProfileId && <PublicProfileModal userId={selectedProfileId} onClose={() => setSelectedProfileId(null)} onUserClick={(id) => setSelectedProfileId(id)} />}
      
      {/* Create Post Modal */}
      {isCreatePostOpen && (
          <CreatePostModal 
            onClose={() => setIsCreatePostOpen(false)} 
            onSave={handleCreatePost} 
          />
      )}

      {/* Edit Post Modal */}
      {editPost && (
          <EditPostModal 
            post={editPost} 
            onClose={() => setEditPost(null)} 
            onSave={handleSavePost} 
            onDelete={() => handleDeletePost(editPost.id)} 
          />
      )}

      {/* View Post Detail Modal */}
      {viewingPost && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-fade-in" onClick={() => setViewingPost(null)}>
              <div className="w-full max-w-xl max-h-screen overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                      {/* Floating Action Buttons for Owner */}
                      <div className="absolute top-2 right-12 z-50 flex gap-2">
                          <button 
                            onClick={() => { setEditPost(viewingPost); setViewingPost(null); }}
                            className="p-2 bg-slate-800/80 hover:bg-[#50c878] text-white rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg"
                            title="Editar"
                          >
                              <Edit3 size={18} />
                          </button>
                      </div>
                      <button onClick={() => setViewingPost(null)} className="absolute top-2 right-2 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><X size={20} /></button>
                      
                      <PostCard 
                        {...viewingPost} 
                        userHasLiked={viewingPost.userHasLiked} 
                        canDelete={true} 
                        onDelete={() => { handleDeletePost(viewingPost.id); }}
                      />
                  </div>
              </div>
          </div>
      )}

      {isCreateAtrioOpen && <CreateAtrioModal onClose={() => setIsCreateAtrioOpen(false)} onCreate={handleCreateAtrio} />}
      {isCreateListOpen && <CreateListModal onClose={() => setIsCreateListOpen(false)} onSave={handleCreateList} />}
      {editingList && <CreateListModal isEdit initialName={editingList.name} initialDesc={editingList.description} initialTags={editingList.tags} onClose={() => setEditingList(null)} onSave={(name, desc, tags) => handleEditList(editingList.id, name, desc, tags)} onDelete={() => openDeleteListModal(editingList.id)} />}
      
      {/* Edit Atrio Modal */}
      {editAtrio && (
          <EditAtrioModal 
            item={editAtrio} 
            onClose={() => setEditAtrio(null)} 
            onSave={handleSaveAtrio} 
            onDelete={handleDeleteAtrio} 
          />
      )}
      
      {confirmData.isOpen && <ConfirmModal isOpen={confirmData.isOpen} message={confirmData.message} onConfirm={handleConfirmAction} onCancel={() => setConfirmData({ ...confirmData, isOpen: false })} />}
    </div>
  );
};

// ... (GroupsList, PublicProfileModal, TabButton remain the same) ...
const GroupsList: React.FC<{ groups: Community[] }> = ({ groups }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | RoleType | 'SUSPENDED'>('ALL');
    const filteredGroups = groups.filter(group => {
        const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesRole = true;
        if (roleFilter === 'SUSPENDED') { matchesRole = !!group.isSuspended; } 
        else if (roleFilter !== 'ALL') { matchesRole = group.currentUserRole === roleFilter; }
        return matchesSearch && matchesRole;
    });
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg flex items-center px-3 py-2 transition-colors focus-within:border-[#50c878]">
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar grupos..." className="bg-transparent text-sm text-white w-full focus:outline-none placeholder-slate-500"/>
                </div>
                <div className="relative group">
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#50c878]">
                        <option value="ALL">Todos</option><option value="OWNER">Dono</option><option value="MODERATOR">Moderador</option><option value="MEMBER">Membro</option><option value="SUSPENDED">Suspensos</option>
                    </select>
                    <Filter size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGroups.map(group => {
                    const isSuspended = group.isSuspended;
                    return (
                        <Link to={`/communities/${group.id}`} key={group.id} className={`bg-slate-800 p-4 rounded-xl flex items-center gap-4 transition-colors border border-slate-700 relative overflow-hidden group hover:bg-slate-700 ${isSuspended ? 'grayscale opacity-75' : ''}`}>
                            <img src={group.avatarUrl} className="w-12 h-12 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><h3 className="text-white font-bold truncate">{group.name}</h3>{isSuspended && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded font-bold uppercase flex items-center gap-0.5 shadow-sm border border-red-400"><AlertOctagon size={10} /> Suspenso</span>}</div><p className="text-slate-400 text-xs truncate">{group.description}</p></div>
                            <div className="absolute top-2 right-2">{group.currentUserRole === 'OWNER' && (<div className="bg-[#FFC300] text-[#1e293b] px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm flex items-center gap-1"><Crown size={10} fill="currentColor" /> Dono</div>)}{group.currentUserRole === 'MODERATOR' && (<div className="bg-[#50c878] text-[#1e293b] px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm flex items-center gap-1"><Shield size={10} fill="currentColor" /> Moderador</div>)}{group.currentUserRole === 'MEMBER' && (<div className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm flex items-center gap-1 border border-slate-600"><User size={10} /> Membro</div>)}</div>
                        </Link>
                    );
                })}
                {filteredGroups.length === 0 && <div className="text-center text-slate-500 col-span-full py-8 text-sm">Nenhum grupo encontrado.</div>}
            </div>
        </div>
    );
};

const PublicProfileModal: React.FC<{ userId: string; onClose: () => void; onUserClick: (id: string) => void }> = ({ userId, onClose, onUserClick }) => { return null; };
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon: Icon, label }) => (<button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${active ? 'border-[#50c878] text-[#50c878]' : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-t-lg'}`}><Icon size={18} className="hidden md:block" /><span className="font-bold text-sm hidden md:inline">{label}</span><span className="md:hidden"><Icon size={20} /></span></button>);

// --- NEW POSTS GRID ---
const PostsGrid: React.FC<{ posts: Post[]; onView: (post: Post) => void; onCreate: () => void }> = ({ posts, onView, onCreate }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Create New Post Card */}
            <div 
                onClick={onCreate} 
                className="aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-[#50c878] flex flex-col items-center justify-center cursor-pointer group bg-slate-800/30 transition-all hover:bg-slate-800/50"
            >
                <div className="p-4 rounded-full bg-slate-800 group-hover:bg-[#50c878]/20 text-slate-400 group-hover:text-[#50c878] transition-colors mb-2 shadow-lg">
                    <Plus size={32} />
                </div>
                <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">Novo Post</span>
            </div>

            {posts.map(post => (
                <div key={post.id} onClick={() => onView(post)} className="aspect-square group relative overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-700/50 cursor-pointer">
                    {post.mediaUrl ? (
                        <img alt="Post content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={post.mediaUrl} />
                    ) : (
                        <div className="w-full h-full p-6 flex items-center justify-center text-center text-slate-500 text-xs bg-slate-900">
                            {post.content.substring(0, 80)}...
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold">
                        <span className="flex items-center gap-1"><Zap size={16} fill="currentColor" /> {post.totalVibesReceived}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={16} fill="currentColor" /> {post.totalComments}</span>
                    </div>
                </div>
            ))}
        </div>
        {posts.length === 0 && <div className="text-center py-10 text-slate-500 col-span-full">Seu diário está vazio.</div>}
    </div>
);

// --- CREATE POST MODAL ---
const CreatePostModal: React.FC<{ onClose: () => void; onSave: (data: CreatePostData) => Promise<void> }> = ({ onClose, onSave }) => {
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const uploadImageToSupabase = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `posts/${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error } = await supabase.storage.from('media').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('media').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async () => {
        if (!content.trim() && !mediaFile) return;
        setIsSubmitting(true);
        try {
            let finalMediaUrl = undefined;
            if (mediaFile) {
                finalMediaUrl = await uploadImageToSupabase(mediaFile);
            }
            
            const formattedTags = tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t.length > 0);
            
            await onSave({
                userId: 'current_user',
                content,
                tags: formattedTags,
                mediaUrl: finalMediaUrl
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert("Erro ao criar post.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1001] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6 relative animate-scale-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
                <h2 className="text-xl font-bold text-white mb-6">Criar Vibe</h2>
                
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="O que está fluindo em sua mente?"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#50c878] resize-none h-32 mb-4"
                />

                {mediaPreview ? (
                    <div className="relative mb-4 rounded-xl overflow-hidden group border border-slate-700">
                        <img src={mediaPreview} className="w-full max-h-60 object-cover" />
                        <button onClick={() => { setMediaPreview(null); setMediaFile(null); }} className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full"><X size={16} /></button>
                    </div>
                ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="mb-4 border-2 border-dashed border-slate-700 hover:border-[#50c878] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/30">
                        <ImageIcon size={24} className="text-slate-500 mb-2" />
                        <span className="text-xs text-slate-400">Adicionar Mídia</span>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-3 mb-6 focus-within:border-[#50c878]">
                    <Hash size={16} className="text-slate-500" />
                    <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (ex: paz, natureza)" className="w-full bg-transparent text-white text-sm focus:outline-none" />
                </div>

                <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Publicar'}
                </button>
            </div>
        </div>
    );
};

// --- EDIT POST MODAL ---
const EditPostModal: React.FC<{ post: Post; onClose: () => void; onSave: (id: string, content: string, tags: string[], mediaUrl?: string) => Promise<void>; onDelete: () => Promise<void>; }> = ({ post, onClose, onSave, onDelete }) => {
    const [content, setContent] = useState(post.content);
    const [tags, setTags] = useState(post.tags.join(', '));
    const [mediaPreview, setMediaPreview] = useState<string | null>(post.mediaUrl || null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const uploadImageToSupabase = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `posts/${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error } = await supabase.storage.from('media').upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from('media').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            let finalMediaUrl = post.mediaUrl;
            if (mediaFile) {
                finalMediaUrl = await uploadImageToSupabase(mediaFile);
            } else if (!mediaPreview) {
                finalMediaUrl = undefined; // Removed image
            }
            
            const formattedTags = tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t.length > 0);
            
            await onSave(post.id, content, formattedTags, finalMediaUrl);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Erro ao atualizar post.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1001] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6 relative animate-scale-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
                <h2 className="text-xl font-bold text-white mb-6">Editar Vibe</h2>
                
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#50c878] resize-none h-32 mb-4"
                />

                {mediaPreview ? (
                    <div className="relative mb-4 rounded-xl overflow-hidden group border border-slate-700">
                        <img src={mediaPreview} className="w-full max-h-60 object-cover" />
                        <button onClick={() => { setMediaPreview(null); setMediaFile(null); }} className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full"><X size={16} /></button>
                        <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1"><Edit3 size={12} /> Alterar</button>
                    </div>
                ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="mb-4 border-2 border-dashed border-slate-700 hover:border-[#50c878] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/30">
                        <ImageIcon size={24} className="text-slate-500 mb-2" />
                        <span className="text-xs text-slate-400">Adicionar Mídia</span>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-3 mb-6 focus-within:border-[#50c878]">
                    <Hash size={16} className="text-slate-500" />
                    <input value={tags} onChange={e => setTags(e.target.value)} className="w-full bg-transparent text-white text-sm focus:outline-none" />
                </div>

                <div className="flex gap-3">
                    <button onClick={onDelete} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/30"><Trash2 size={20} /></button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ... (CreateListModal, SettingsModal, etc. remain unchanged) ...
export const CreateListModal: React.FC<{ isEdit?: boolean; initialName?: string; initialDesc?: string; initialTags?: string[]; onClose: () => void; onSave: (name: string, desc: string, tags: string[]) => Promise<void>; onDelete?: () => void; }> = ({ isEdit, initialName = '', initialDesc = '', initialTags = [], onClose, onSave, onDelete }) => {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDesc);
    const [tags, setTags] = useState(Array.isArray(initialTags) ? initialTags.join(', ') : '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);
        const tagsArray = tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t);
        await onSave(name, description, tagsArray);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[1001] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6 relative animate-scale-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    {isEdit ? <Edit3 size={20} className="text-[#FFC300]" /> : <Plus size={20} className="text-[#FFC300]" />}
                    {isEdit ? 'Editar Lista' : 'Nova Lista de Santuário'}
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nome da Lista</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#FFC300] transition-colors" placeholder="Ex: Inspirações Diárias" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Descrição</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#FFC300] transition-colors resize-none h-24" placeholder="O que esta coleção representa para você?" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Tags</label>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-3 focus-within:border-[#FFC300] transition-colors">
                            <Hash size={16} className="text-slate-500" />
                            <input value={tags} onChange={e => setTags(e.target.value)} className="w-full bg-transparent text-white focus:outline-none text-sm" placeholder="paz, natureza, arte..." />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    {isEdit && onDelete && (
                        <button onClick={onDelete} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/30" title="Excluir Lista">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button onClick={handleSubmit} disabled={isSubmitting || !name} className="flex-1 bg-[#FFC300] hover:bg-[#FFC300]/90 text-[#1e293b] font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (isEdit ? 'Salvar Alterações' : 'Criar Lista')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- SETTINGS MODAL (Restored) ---
const SettingsModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  userData: UserData; 
  onUpdate: (data: Partial<UserData>) => Promise<void>; 
  onLogout?: () => void; 
  onDeleteAccount: () => void; 
}> = ({ isOpen, onClose, userData, onUpdate, onLogout, onDeleteAccount }) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'public' | 'security' | 'privacy'>('edit');
  const [formData, setFormData] = useState(userData);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Username check state
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [daysUntilChange, setDaysUntilChange] = useState<number>(0);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setFormData(userData); }, [userData]);

  // Check if username can be changed (30 days lock)
  useEffect(() => {
      if (userData.lastUsernameChange) {
          const lastChange = new Date(userData.lastUsernameChange);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - lastChange.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 30) {
              setDaysUntilChange(30 - diffDays);
          } else {
              setDaysUntilChange(0);
          }
      }
  }, [userData.lastUsernameChange]);

  useEffect(() => {
      if (isOpen) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = 'unset';
      return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
      setIsLoading(true);
      setUsernameError(null);

      // Verifica unicidade se o username mudou
      if (formData.username !== userData.username) {
          const { data } = await supabase.from('profiles').select('id').eq('username', formData.username).single();
          if (data) {
              setUsernameError('Este nome de usuário já está em uso.');
              setIsLoading(false);
              return;
          }
      }

      await onUpdate(formData);
      setIsLoading(false);
      onClose();
  };

  const handleChange = (field: keyof UserData, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const fileExt = file.name.split('.').pop();
              const fileName = `${type}/${Math.random().toString(36).substring(2)}.${fileExt}`;
              const { error } = await supabase.storage.from('media').upload(fileName, file);
              if (!error) {
                  const { data } = supabase.storage.from('media').getPublicUrl(fileName);
                  handleChange(type === 'avatar' ? 'avatarUrl' : 'bannerUrl', data.publicUrl);
              }
          } catch (err) {
              console.error("Upload failed", err);
          }
      }
  };

  const publicProfileUrl = `catarse.life/${userData.username}`;

  return (
      <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-fade-in">
          <div className="bg-[#1e293b] w-full h-full md:max-w-5xl md:h-[85vh] md:rounded-3xl border-0 md:border border-slate-700 shadow-2xl flex relative overflow-hidden">
              
              <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-4 z-20 shadow-lg">
                  <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-400 hover:text-white p-2">
                      <Menu size={24} />
                  </button>
                  <span className="font-bold text-white text-lg">Configurações</span>
                  <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
                      <X size={24} />
                  </button>
              </div>

              <div className={`
                  absolute inset-y-0 left-0 w-72 bg-[#0f172a] border-r border-slate-800 z-30 transition-transform duration-300 ease-in-out
                  ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
                  md:relative md:translate-x-0 md:flex md:flex-col md:justify-between md:shrink-0 md:shadow-none
                  pt-16 md:pt-0
              `}>
                  <div>
                      <div className="hidden md:block p-6 border-b border-slate-800">
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              <Settings className="text-[#50c878]" /> Configurações
                          </h2>
                      </div>
                      <nav className="p-4 space-y-2">
                          <button 
                              onClick={() => { setActiveTab('edit'); setIsMobileMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'edit' ? 'bg-[#50c878]/10 text-[#50c878]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                          >
                              <User size={18} /> Editar Perfil
                          </button>
                          <button 
                              onClick={() => { setActiveTab('public'); setIsMobileMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'public' ? 'bg-[#50c878]/10 text-[#50c878]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                          >
                              <Globe size={18} /> Perfil Público
                          </button>
                          <button 
                              onClick={() => { setActiveTab('security'); setIsMobileMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'security' ? 'bg-[#50c878]/10 text-[#50c878]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                          >
                              <Lock size={18} /> Dados & Segurança
                          </button>
                          <button 
                              onClick={() => { setActiveTab('privacy'); setIsMobileMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === 'privacy' ? 'bg-[#50c878]/10 text-[#50c878]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                          >
                              <Shield size={18} /> Privacidade
                          </button>
                      </nav>
                  </div>
                  
                  <div className="p-4 border-t border-slate-800">
                      <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm text-red-400 hover:bg-red-500/10">
                          <LogOut size={18} /> Sair da Conta
                      </button>
                  </div>
              </div>

              {isMobileMenuOpen && <div className="absolute inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}

              <div className="flex-1 flex flex-col bg-[#1e293b] relative w-full h-full pt-16 md:pt-0 overflow-hidden">
                  <div className="hidden md:block absolute top-6 right-6 z-10">
                      <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                      
                      {/* TAB: EDIT PROFILE */}
                      {activeTab === 'edit' && (
                          <div className="max-w-2xl mx-auto animate-fade-in pb-20 md:pb-0">
                              <h2 className="text-2xl font-bold text-white mb-8 hidden md:block">Informações Públicas</h2>
                              
                              <div className="flex flex-col items-center mb-8">
                                  <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                      <img src={formData.avatarUrl} className="w-32 h-32 rounded-full object-cover border-4 border-slate-700 group-hover:border-[#50c878] transition-colors" />
                                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Camera className="text-white" size={24} />
                                      </div>
                                  </div>
                                  <p className="text-slate-500 text-xs mt-3">Toque para alterar foto</p>
                                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                              </div>

                              <div className="mb-8">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Capa do Perfil</label>
                                  <div className="h-32 w-full rounded-xl bg-slate-800 border border-slate-700 relative overflow-hidden cursor-pointer group" onClick={() => bannerInputRef.current?.click()}>
                                      <img src={formData.bannerUrl} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className="text-white text-sm font-bold flex items-center gap-2"><Upload size={16} /> Alterar Capa</span>
                                      </div>
                                  </div>
                                  <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                              </div>

                              <div className="space-y-6">
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nome de Exibição (Full Name)</label>
                                      <input 
                                          value={formData.name} 
                                          onChange={(e) => handleChange('name', e.target.value)}
                                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#50c878] transition-colors"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nome de Usuário (@username)</label>
                                      <div className="relative">
                                          <input 
                                              value={formData.username} 
                                              onChange={(e) => handleChange('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
                                              disabled={daysUntilChange > 0}
                                              className={`w-full bg-slate-900 border rounded-xl p-3 text-white focus:outline-none transition-colors ${usernameError ? 'border-red-500' : 'border-slate-700 focus:border-[#50c878]'} ${daysUntilChange > 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                                          />
                                          {daysUntilChange > 0 && (
                                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs flex items-center gap-1">
                                                  <Lock size={12} />
                                                  Disponível em {daysUntilChange}d
                                              </div>
                                          )}
                                      </div>
                                      {usernameError ? (
                                          <p className="text-xs text-red-400 mt-1">{usernameError}</p>
                                      ) : (
                                          <p className="text-[10px] text-slate-500 mt-1">O nome de usuário deve ser único. Você só pode alterá-lo a cada 30 dias.</p>
                                      )}
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
                                      <input value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#50c878] transition-colors" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Bio / Descrição</label>
                                      <textarea value={formData.bio} onChange={(e) => handleChange('bio', e.target.value)} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#50c878] transition-colors resize-none" />
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* TAB: PUBLIC PROFILE */}
                      {activeTab === 'public' && (
                          <div className="max-w-2xl mx-auto animate-fade-in pb-20 md:pb-0">
                              <h2 className="text-2xl font-bold text-white mb-8 hidden md:block">Perfil Público</h2>
                              
                              <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 text-center mb-8">
                                  <Globe size={48} className="text-[#50c878] mx-auto mb-4" />
                                  <h3 className="text-xl font-bold text-white mb-2">Compartilhe sua Jornada</h3>
                                  <p className="text-slate-400 text-sm mb-6">Este é o link direto para o seu perfil público no Catarse.</p>
                                  
                                  <div className="bg-black/30 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-4 mb-4">
                                      <span className="text-slate-300 font-mono text-sm truncate">{publicProfileUrl}</span>
                                      <button 
                                          onClick={() => navigator.clipboard.writeText(publicProfileUrl)}
                                          className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                                          title="Copiar Link"
                                      >
                                          <Copy size={18} />
                                      </button>
                                  </div>
                                  
                                  <button className="text-[#50c878] font-bold text-sm flex items-center justify-center gap-2 hover:underline">
                                      <Share2 size={16} /> Compartilhar em outras redes
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* TAB: DATA & SECURITY (Preserved) */}
                      {activeTab === 'security' && (
                          <div className="max-w-2xl mx-auto animate-fade-in pb-20 md:pb-0">
                              <h2 className="text-2xl font-bold text-white mb-8 hidden md:block">Dados Pessoais</h2>
                              <div className="space-y-6 mb-10">
                                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Email</label><div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"><Mail size={18} className="text-slate-500" /><input value={formData.email} readOnly className="bg-transparent w-full focus:outline-none text-slate-300 cursor-not-allowed" /></div></div>
                                  <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Telefone</label><div className="flex gap-2"><div className="w-24 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-white font-mono text-sm"><span className="text-slate-500 mr-1">PT</span><input value={formData.countryCode} onChange={(e) => handleChange('countryCode', e.target.value)} className="bg-transparent w-10 focus:outline-none font-bold text-center" /></div><input value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#50c878] transition-colors font-bold tracking-wider" /></div></div>
                                  <button className="w-full py-4 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-white transition-all font-bold flex items-center justify-center gap-2"><Lock size={18} /> Redefinir Senha</button>
                              </div>
                              <div className="border border-red-500/30 bg-red-500/5 rounded-2xl p-6"><h3 className="text-red-500 font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-2"><AlertTriangle size={16} /> Zona de Perigo</h3><div className="flex items-center justify-between mb-6"><div><p className="text-white font-bold">Suspender Conta</p><p className="text-slate-400 text-xs">Oculta perfil, mas mantém dados.</p></div><div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in"><input type="checkbox" checked={formData.isSuspended} onChange={(e) => handleChange('isSuspended', e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: formData.isSuspended ? '0' : 'auto', left: formData.isSuspended ? 'auto' : '0' }} /><div onClick={() => handleChange('isSuspended', !formData.isSuspended)} className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.isSuspended ? 'bg-slate-500' : 'bg-slate-700'}`}></div></div></div><button onClick={onDeleteAccount} className="text-red-500 hover:text-red-400 text-sm font-bold flex items-center gap-2 transition-colors"><Power size={16} /> Excluir Conta Permanentemente</button></div>
                          </div>
                      )}

                      {/* TAB: PRIVACY (Preserved) */}
                      {activeTab === 'privacy' && (
                          <div className="max-w-2xl mx-auto animate-fade-in pb-20 md:pb-0">
                              <h2 className="text-2xl font-bold text-white mb-8 hidden md:block">Preferências</h2>
                              <div className="space-y-4">
                                  <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-[#50c878]/10 rounded-full text-[#50c878]"><Bell size={20} /></div><div><p className="text-white font-bold">Notificações Push</p><p className="text-slate-400 text-xs">Receber alertas de vibes e conexões</p></div></div><div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in cursor-pointer" onClick={() => handleChange('notifications', !formData.notifications)}><div className={`w-12 h-6 rounded-full transition-colors ${formData.notifications ? 'bg-[#50c878]' : 'bg-slate-600'}`}></div><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform transform ${formData.notifications ? 'translate-x-7' : 'translate-x-1'}`}></div></div></div>
                                  <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl flex items-center justify-between"><div className="flex items-center gap-4"><div className="p-3 bg-slate-700/50 rounded-full text-slate-300"><EyeOff size={20} /></div><div><p className="text-white font-bold">Perfil Privado</p><p className="text-slate-400 text-xs">Apenas conexões podem ver seus posts</p></div></div><div className="relative inline-block w-12 align-middle select-none transition duration-200 ease-in cursor-pointer"><div className={`w-12 h-6 rounded-full transition-colors bg-slate-600`}></div><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform transform translate-x-1`}></div></div></div>
                              </div>
                          </div>
                      )}

                  </div>

                  <div className="p-4 md:p-6 bg-[#1e293b] border-t border-slate-800 flex justify-end shrink-0 absolute bottom-0 left-0 right-0 md:relative w-full z-10">
                      <button onClick={handleSave} disabled={isLoading || (daysUntilChange > 0 && formData.username !== userData.username)} className="w-full md:w-auto bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">{isLoading ? <Loader2 size={20} className="animate-spin" /> : <><Save size={20} /> Salvar Alterações</>}</button>
                  </div>
              </div>
          </div>
      </div>
  );
};

const EditAtrioModal: React.FC<{ item: AtrioItem; onClose: () => void; onSave: (id: any, updates: Partial<AtrioItem>) => Promise<void>; onDelete: (id: any) => Promise<void>; }> = ({ item, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState(item.title);
    const [description, setDescription] = useState(item.description);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        await onSave(item.id, { title, description });
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[1001] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6 relative animate-scale-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Edit3 size={20} className="text-[#FFC300]" /> Editar Contemplação
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Título</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#FFC300] transition-colors" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Descrição</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#FFC300] transition-colors resize-none h-32" />
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                     <button onClick={() => onDelete(item.id)} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/30" title="Excluir">
                        <Trash2 size={20} />
                    </button>
                    <button onClick={handleSave} disabled={isSubmitting} className="flex-1 bg-[#FFC300] hover:bg-[#FFC300]/90 text-[#1e293b] font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmModal: React.FC<{ isOpen: boolean; message: string; onConfirm: () => void; onCancel: () => void; }> = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1e293b] w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 relative animate-scale-up text-center">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 mx-auto border border-slate-700">
                    <AlertTriangle size={24} className="text-[#FFC300]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Confirmação</h3>
                <p className="text-slate-400 text-sm mb-6">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-slate-700 text-white hover:bg-slate-600 transition-colors">Cancelar</button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-[#FFC300] text-[#1e293b] hover:bg-[#FFC300]/90 transition-colors">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const AtrioGrid: React.FC<{ items: AtrioItem[]; onEdit: (item: AtrioItem) => void; onCreate: () => void }> = ({ items, onEdit, onCreate }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div onClick={onCreate} className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-700 hover:border-[#50c878] flex flex-col items-center justify-center cursor-pointer group bg-slate-800/30 transition-all hover:bg-slate-800/50">
            <div className="p-4 rounded-full bg-slate-800 group-hover:bg-[#50c878]/20 text-slate-400 group-hover:text-[#50c878] transition-colors mb-2 shadow-lg">
                <Plus size={32} />
            </div>
            <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">Adicionar</span>
        </div>
        {items.map(item => (
            <div key={item.id} className="relative group rounded-xl overflow-hidden cursor-pointer aspect-[3/4] border border-slate-700/50">
                <img src={item.url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <h3 className="text-white font-bold text-sm truncate">{item.title}</h3>
                    <div className="flex justify-end mt-2">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 bg-slate-800/80 hover:bg-[#50c878] text-white rounded-full backdrop-blur-md transition-colors">
                            <Edit3 size={14} />
                        </button>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const SanctuaryListsGrid: React.FC<{ lists: AtrioList[]; onCreate: () => void; onEdit: (list: AtrioList) => void; onDelete: (id: string) => void; onView: (list: AtrioList) => void }> = ({ lists, onCreate, onEdit, onDelete, onView }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div onClick={onCreate} className="h-40 rounded-xl border-2 border-dashed border-slate-700 hover:border-[#FFC300] flex flex-col items-center justify-center cursor-pointer group bg-slate-800/30 transition-all hover:bg-slate-800/50">
            <div className="p-3 rounded-full bg-slate-800 group-hover:bg-[#FFC300]/20 text-slate-400 group-hover:text-[#FFC300] transition-colors mb-2">
                <Plus size={24} />
            </div>
            <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">Nova Lista</span>
        </div>
        {lists.map(list => (
            <div key={list.id} onClick={() => onView(list)} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-[#FFC300]/50 transition-all group cursor-pointer relative h-40 flex flex-col">
                <div className="h-2/3 relative overflow-hidden bg-slate-900">
                    {list.coverUrl ? (
                         <img src={list.coverUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600"><Sparkles size={24} /></div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(list); }} className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-[#50c878]"><Edit3 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(list.id); }} className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-red-500"><Trash2 size={12} /></button>
                    </div>
                </div>
                <div className="flex-1 p-3 flex flex-col justify-center">
                    <h3 className="text-white font-bold text-sm truncate">{list.name}</h3>
                    <p className="text-slate-500 text-xs">{list.itemIds.length} itens</p>
                </div>
            </div>
        ))}
    </div>
);

const SanctuaryListView: React.FC<{ list: AtrioList; onBack: () => void }> = ({ list, onBack }) => {
    const [items, setItems] = useState<AtrioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewItem, setViewItem] = useState<AtrioItem | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await atrioService.getItemsByIds(list.itemIds);
            setItems(data);
            setLoading(false);
        };
        load();
    }, [list.itemIds]);

    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><ChevronLeft size={24} /></button>
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">{list.name} <Bookmark size={16} className="text-[#FFC300] fill-[#FFC300]" /></h2>
                    <p className="text-slate-400 text-sm">{list.description}</p>
                </div>
            </div>
            
            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#FFC300]" /></div> : (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                    {items.map(item => (
                        <div key={item.id} onClick={() => setViewItem(item)} className="relative group rounded-xl overflow-hidden cursor-pointer break-inside-avoid border border-slate-700/50">
                            <img src={item.url} alt={item.title} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" />
                        </div>
                    ))}
                    {items.length === 0 && <div className="col-span-full text-center text-slate-500 py-10">Esta lista está vazia.</div>}
                </div>
            )}
            
            {viewItem && <AtrioModal item={viewItem} onClose={() => setViewItem(null)} onShowToast={(msg) => alert(msg)} />}
        </div>
    );
};

const FollowingList: React.FC<{ list: Connection[]; onUnfollow: (id: string) => void; onRequestFriendship: (id: string) => void; onUserClick: (id: string) => void }> = ({ list, onUnfollow, onRequestFriendship, onUserClick }) => (
    <div className="space-y-2">
        {list.map(user => (
            <div key={user.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(user.id)}>
                    <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                        <h4 className="font-bold text-white text-sm">{user.name}</h4>
                        <span className="text-[10px] text-slate-400">Seguindo</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Only show 'Add Friend' if not friend/pending */}
                    {user.friendshipStatus === 'none' && (
                        <button onClick={() => onRequestFriendship(user.id)} className="p-2 bg-slate-700 hover:bg-[#50c878] text-slate-300 hover:text-[#1e293b] rounded-lg transition-colors" title="Adicionar Amigo"><UserPlus size={16} /></button>
                    )}
                     {user.friendshipStatus === 'pending_sent' && (
                        <button disabled className="p-2 bg-slate-700/50 text-slate-500 rounded-lg cursor-default" title="Solicitação Enviada"><Clock size={16} /></button>
                    )}
                    <button onClick={() => onUnfollow(user.id)} className="p-2 bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white rounded-lg transition-colors" title="Deixar de Seguir"><UserMinus size={16} /></button>
                </div>
            </div>
        ))}
        {list.length === 0 && <div className="text-center text-slate-500 py-4">Você ainda não segue ninguém.</div>}
    </div>
);

const FollowersList: React.FC<{ list: Connection[]; onFollowBack: (id: string) => void; onUserClick: (id: string) => void }> = ({ list, onFollowBack, onUserClick }) => (
    <div className="space-y-2">
         {list.map(user => (
            <div key={user.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(user.id)}>
                    <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                    <h4 className="font-bold text-white text-sm">{user.name}</h4>
                </div>
                {!user.isFollowing && (
                    <button onClick={() => onFollowBack(user.id)} className="px-3 py-1.5 bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold text-xs rounded-lg transition-colors">Seguir de Volta</button>
                )}
            </div>
        ))}
        {list.length === 0 && <div className="text-center text-slate-500 py-4">Você ainda não tem seguidores.</div>}
    </div>
);

const ConnectionsList: React.FC<{ list: Connection[]; onAccept: (id: string) => void; onRemove: (id: string) => void; onUserClick: (id: string) => void }> = ({ list, onAccept, onRemove, onUserClick }) => (
    <div className="space-y-2">
        {list.map(user => (
            <div key={user.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onUserClick(user.id)}>
                    <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                        <h4 className="font-bold text-white text-sm">{user.name}</h4>
                        {user.friendshipStatus === 'pending_received' && <span className="text-[10px] text-[#50c878] font-bold uppercase">Solicitação</span>}
                    </div>
                </div>
                <div className="flex gap-2">
                    {user.friendshipStatus === 'pending_received' ? (
                        <>
                            <button onClick={() => onAccept(user.id)} className="p-2 bg-[#50c878]/20 hover:bg-[#50c878] text-[#50c878] hover:text-[#1e293b] rounded-lg transition-colors" title="Aceitar"><Check size={16} /></button>
                            <button onClick={() => onRemove(user.id)} className="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors" title="Recusar"><X size={16} /></button>
                        </>
                    ) : (
                        <button onClick={() => onRemove(user.id)} className="p-2 bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white rounded-lg transition-colors" title="Remover Amigo"><UserMinus size={16} /></button>
                    )}
                </div>
            </div>
        ))}
         {list.length === 0 && <div className="text-center text-slate-500 py-4">Nenhuma conexão encontrada.</div>}
    </div>
);

export default UserProfile;
