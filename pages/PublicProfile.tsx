
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VirtuosoGrid } from 'react-virtuoso';
import { 
    Check, Activity, MessageCircle, UserPlus, Zap, 
    BarChart2, Users, Grid, Sparkles, Building2, Loader2,
    ArrowLeft, Footprints
} from 'lucide-react';
import { supabase } from '../backend/supabase';
import { connectionService } from '../backend/ConnectionService';
import { transactionService } from '../backend/TransactionService';
import { postService, Post } from '../backend/PostService';
import { atrioService, AtrioItem } from '../backend/AtrioService';
import { communityService, Community } from '../backend/CommunityService';

interface UserProfileData {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    banner_url: string;
    bio: string;
    vibes: number;
}

const PublicProfile: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'posts' | 'atrio' | 'groups'>('posts');
    const [isProcessing, setIsProcessing] = useState(false);

    // --- QUERIES ---

    // 1. Profile Info
    const { data: profile, isLoading: isLoadingProfile } = useQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (error) throw error;
            return data as UserProfileData;
        },
        enabled: !!userId
    });

    // 2. Stats & Relationship
    const { data: followers = [] } = useQuery({
        queryKey: ['followers', userId],
        queryFn: () => connectionService.getFollowers(userId),
        enabled: !!userId
    });
    const { data: friends = [] } = useQuery({
        queryKey: ['friends', userId],
        queryFn: () => connectionService.getFriends(userId),
        enabled: !!userId
    });
    const { data: isFollowing } = useQuery({
        queryKey: ['followState', 'current_user', userId],
        queryFn: () => connectionService.getFollowState(userId!),
        enabled: !!userId
    });
    const { data: fStatusRaw } = useQuery({
        queryKey: ['friendshipStatus', 'current_user', userId],
        queryFn: () => connectionService.getFriendshipStatus(userId!),
        enabled: !!userId
    });

    // 3. Content
    const { data: posts = [] } = useQuery({
        queryKey: ['userPosts', userId],
        queryFn: () => postService.getUserPosts(userId!, 'post'),
        enabled: !!userId
    });
    const { data: atrioItems = [] } = useQuery({
        queryKey: ['userAtrio', userId],
        queryFn: () => atrioService.getUserItems(userId!),
        enabled: !!userId
    });
    const { data: groups = [] } = useQuery({
        queryKey: ['userGroups', userId],
        queryFn: () => communityService.getUserCommunities(userId!),
        enabled: !!userId
    });

    const isLoading = isLoadingProfile || !userId;
    const followersCount = followers.length;
    const friendsCount = friends.length;
    const friendStatus = fStatusRaw === 'pending_sent' || fStatusRaw === 'pending_received' ? 'pending' : fStatusRaw === 'accepted' ? 'accepted' : 'none';

    const handleFollow = async () => {
        if (!profile) return;
        setIsProcessing(true);
        if (isFollowing) {
            await transactionService.processUnfollow(profile.id);
        } else {
            await transactionService.processFollow(profile.id);
        }
        queryClient.invalidateQueries({ queryKey: ['followers', profile.id] });
        queryClient.invalidateQueries({ queryKey: ['followState', 'current_user', profile.id] });
        setIsProcessing(false);
    };

    const handleAddFriend = async () => {
        if (!profile) return;
        if (friendStatus !== 'none') return;
        
        setIsProcessing(true);
        const res = await connectionService.requestFriendship(profile.id);
        if (res.success) {
            queryClient.invalidateQueries({ queryKey: ['friendshipStatus', 'current_user', profile.id] });
        } else {
            alert(res.message);
        }
        setIsProcessing(false);
    };

    const handleChat = async () => {
        // Simple navigation to connections page - ideally would open specific chat
        navigate('/connections');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#2ecc71]" size={40} />
            </div>
        );
    }

    if (!profile) {
        return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Usuário não encontrado.</div>;
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 font-sans pb-20">
            {/* Header / Nav Mock */}
            <div className="p-4 md:hidden flex items-center gap-4 text-slate-400">
                <button onClick={() => navigate(-1)}><ArrowLeft /></button>
                <span className="font-bold text-white">Perfil</span>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl mb-8 relative overflow-hidden group">
                    
                    {/* BANNER BACKGROUND WITH GRADIENT FADE */}
                    <div className="absolute inset-0 z-0">
                        <img 
                            src={profile.banner_url || 'https://picsum.photos/800/400'} 
                            alt="Banner" 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity duration-700" 
                        />
                        {/* Gradient Overlay: Transparent at top, Dark at bottom */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-[#1e293b]/90 to-transparent"></div>
                    </div>

                    {/* Content Container (z-10 to stay above banner) */}
                    <div className="relative z-10 p-8">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full p-[4px]" style={{ background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' }}>
                                    <img 
                                        alt={`Avatar de ${profile.full_name}`} 
                                        className="w-full h-full object-cover rounded-full border-4 border-white dark:border-[#1e293b]" 
                                        src={profile.avatar_url || 'https://picsum.photos/200'} 
                                    />
                                </div>
                                <div className="absolute bottom-1 right-1 bg-[#2ecc71] text-white p-1 rounded-full border-2 border-white dark:border-[#1e293b] flex items-center justify-center">
                                    <Check size={14} strokeWidth={4} />
                                </div>
                            </div>
                            
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-bold mb-2 text-white drop-shadow-md">{profile.full_name || profile.username}</h1>
                                <p className="text-slate-200 text-sm leading-relaxed max-w-lg mb-6 drop-shadow-sm font-medium">
                                    {profile.bio || "Explorando as fronteiras entre design, tecnologia e bem-estar humano. Criador por natureza."}
                                </p>
                                
                                <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-8">
                                    <button 
                                        onClick={handleFollow}
                                        disabled={isProcessing}
                                        className={`px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg ${
                                            isFollowing 
                                            ? 'bg-transparent border-2 border-[#2ecc71] text-[#2ecc71] hover:bg-[#2ecc71]/10' 
                                            : 'bg-[#2ecc71] hover:bg-[#2ecc71]/90 text-[#1e293b]'
                                        }`}
                                    >
                                        {isFollowing ? <Footprints size={18} /> : <Activity size={18} />}
                                        {isFollowing ? 'Seguindo' : 'Seguir Caminho'}
                                    </button>
                                    
                                    <button 
                                        onClick={handleChat}
                                        className="bg-slate-800/80 hover:bg-slate-700/80 text-white border border-slate-600 transition-colors px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 active:scale-95 backdrop-blur-sm"
                                    >
                                        <MessageCircle size={18} />
                                        Conversar
                                    </button>
                                    
                                    <button 
                                        onClick={handleAddFriend}
                                        disabled={friendStatus !== 'none' || isProcessing}
                                        className={`bg-slate-800/80 hover:bg-slate-700/80 text-white border border-slate-600 transition-colors px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 active:scale-95 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {friendStatus === 'accepted' ? <Check size={18} /> : <UserPlus size={18} />}
                                        {friendStatus === 'none' ? 'Add Amigo' : friendStatus === 'pending' ? 'Pendente' : 'Amigos'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-700/50">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">
                                    <Zap size={14} fill="currentColor" />
                                    Vibes
                                </div>
                                <div className="text-2xl font-bold text-white drop-shadow-sm">{profile.vibes >= 1000 ? (profile.vibes / 1000).toFixed(1) + 'k' : profile.vibes}</div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-[#2ecc71] text-xs font-bold uppercase tracking-wider mb-1">
                                    <BarChart2 size={14} />
                                    Seguidores
                                </div>
                                <div className="text-2xl font-bold text-white drop-shadow-sm">{followersCount}</div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-blue-500 text-xs font-bold uppercase tracking-wider mb-1">
                                    <Users size={14} />
                                    Amigos
                                </div>
                                <div className="text-2xl font-bold text-white drop-shadow-sm">{friendsCount}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-8 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('posts')}
                        className={`pb-3 border-b-2 font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'posts' ? 'text-[#2ecc71] border-[#2ecc71]' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        <Grid size={18} />
                        Publicações
                    </button>
                    <button 
                        onClick={() => setActiveTab('atrio')}
                        className={`pb-3 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'atrio' ? 'text-[#2ecc71] border-[#2ecc71]' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        <Sparkles size={18} />
                        Átrio
                    </button>
                    <button 
                        onClick={() => setActiveTab('groups')}
                        className={`pb-3 border-b-2 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'groups' ? 'text-[#2ecc71] border-[#2ecc71]' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        <Building2 size={18} />
                        Grupos
                    </button>
                </div>

                {/* Grid Content */}
                <div className="min-h-[300px]">
                    {activeTab === 'posts' && (
                        <div className="h-[60vh] min-h-[400px]">
                            {posts.length > 0 ? (
                                <VirtuosoGrid
                                    totalCount={posts.length}
                                    listClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                                    itemContent={(index) => {
                                        const post = posts[index];
                                        return (
                                            <div key={post.id} className="aspect-square group relative overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-700/50">
                                                {post.mediaUrl ? (
                                                    <img alt="Post content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={post.mediaUrl} />
                                                ) : (
                                                    <div className="w-full h-full p-6 flex items-center justify-center text-center text-slate-500 text-xs">
                                                        {post.content.substring(0, 100)}...
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold">
                                                    <span className="flex items-center gap-1"><Zap size={16} fill="currentColor" /> {post.totalVibesReceived}</span>
                                                    <span className="flex items-center gap-1"><MessageCircle size={16} fill="currentColor" /> {post.totalComments}</span>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                            ) : (
                                <div className="col-span-full py-12 text-center text-slate-500">Nenhuma publicação ainda.</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'atrio' && (
                        <div className="h-[60vh] min-h-[400px]">
                            {atrioItems.length > 0 ? (
                                <VirtuosoGrid
                                    totalCount={atrioItems.length}
                                    listClassName="grid grid-cols-2 md:grid-cols-3 gap-4"
                                    itemContent={(index) => {
                                        const item = atrioItems[index];
                                        return (
                                            <div key={item.id} className="relative group rounded-xl overflow-hidden cursor-pointer aspect-[3/4] pb-4">
                                                <img src={item.url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                    <h3 className="text-white font-bold text-sm truncate">{item.title}</h3>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                            ) : (
                                <div className="col-span-full py-12 text-center text-slate-500">Átrio vazio.</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'groups' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.length > 0 ? (
                                groups.map(group => (
                                    <div key={group.id} className="flex items-center gap-4 bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <img src={group.avatarUrl} className="w-12 h-12 rounded-lg object-cover" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 dark:text-white truncate">{group.name}</h3>
                                            <p className="text-xs text-slate-500 truncate">{group.description}</p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 uppercase">
                                            {group.currentUserRole}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center text-slate-500">Nenhum grupo público.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;
