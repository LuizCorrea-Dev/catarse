
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Phone, Video, MoreVertical, Send, Image as ImageIcon, 
  ArrowLeft, Circle, CheckCheck, Loader2, Paperclip, Star, Shield, Check, Clock
} from 'lucide-react';
import { connectionService, Friend, PrivateMessage, MessageType } from '../backend/ConnectionService';
import { communityService } from '../backend/CommunityService';
import { chatService } from '../backend/ChatService';
import { supabase } from '../backend/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Virtuoso } from 'react-virtuoso';

const ConnectionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [sidebarTab, setSidebarTab] = useState<'friends' | 'dms'>('friends');
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // 1. Query para Conexões (Conversas + Amigos)
  const { data: connections = { items: [], unreadTotal: 0 }, isLoading: isLoadingList } = useQuery({
    queryKey: ['connections', sidebarTab],
    queryFn: async () => {
      const conversations = await connectionService.getConversations();
      const myFriends = await connectionService.getFriends();
      const friendIds = new Set(myFriends.map(f => f.id));
      const unreadTotal = conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);

      let items: Friend[] = [];
      if (sidebarTab === 'friends') {
        items = myFriends.map(friend => {
          const conversation = conversations.find(c => c.id === friend.id);
          return conversation ? { ...friend, ...conversation, status: friend.status } : friend;
        });
        items.sort((a, b) => (a.lastMessageTime && !b.lastMessageTime ? -1 : 1));
      } else {
        items = conversations.filter(conv => !friendIds.has(conv.id));
      }
      return { items, unreadTotal };
    },
    refetchInterval: 10000,
  });

  // 2. Query para Mensagens do Chat Ativo
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', activeFriend?.id],
    queryFn: () => activeFriend ? connectionService.getMessages(activeFriend.id) : Promise.resolve([]),
    enabled: !!activeFriend,
    refetchInterval: 5000,
  });

  // 3. Realtime DM Subscription
  useEffect(() => {
    if (!currentUserId) return;

    const subscription = chatService.subscribeToDMs(currentUserId, (newMsg) => {
        // 1. Invalidate connections list to update unread counts / moving to top
        queryClient.invalidateQueries({ queryKey: ['connections'] });

        // 2. If active chat is with the sender, update messages immediately
        if (activeFriend && activeFriend.id === newMsg.senderId) {
             queryClient.setQueryData(['messages', activeFriend.id], (old: PrivateMessage[] | undefined) => {
                 if (!old) return [newMsg]; // Converters might be needed if types mismatch, but let's check
                 // Conversion: ChatService Message -> PrivateMessage 
                 const convertedMsg: PrivateMessage = {
                     id: newMsg.id,
                     senderId: newMsg.senderId,
                     receiverId: newMsg.receiverId || currentUserId,
                     content: newMsg.content,
                     timestamp: new Date(newMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                     type: newMsg.type as MessageType,
                     mediaUrl: newMsg.mediaUrl,
                     isRead: false
                 };
                 if (old.some(m => m.id === convertedMsg.id)) return old;
                 return [...old, convertedMsg];
             });
             
             // Mark as read immediately if open? 
             connectionService.markMessagesAsRead(activeFriend.id);
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, [currentUserId, activeFriend, queryClient]);

  // 3. Mutation para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async ({ friendId, content, type, mediaUrl }: { friendId: string, content: string, type: MessageType, mediaUrl?: string }) => {
      return connectionService.sendMessage(friendId, content, type, mediaUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeFriend?.id] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      setInputText('');
    }
  });

  const handleBackToList = () => {
    setShowChatOnMobile(false);
  };

  const handleSelectFriend = async (friend: Friend) => {
    setActiveFriend(friend);
    setShowChatOnMobile(true);
    if (friend.unreadCount > 0) {
      await connectionService.markMessagesAsRead(friend.id);
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    }
  };

  const handleToggleCloseFriend = async (e: React.MouseEvent, friend: Friend) => {
    e.stopPropagation();
    await connectionService.toggleCloseFriend(friend.id);
    queryClient.invalidateQueries({ queryKey: ['connections'] });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeFriend) return;
    sendMessageMutation.mutate({ friendId: activeFriend.id, content: inputText, type: 'text' });
  };

  // Função auxiliar para Upload
  const uploadMediaToSupabase = async (file: File): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const fileName = `private-chat/${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error } = await supabase.storage.from('media').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(fileName);
      return data.publicUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeFriend) {
          setIsUploading(true);
          try {
              const publicUrl = await uploadMediaToSupabase(file);
              const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
              
              await connectionService.sendMessage(activeFriend.id, "Mídia", type as MessageType, publicUrl);
              queryClient.invalidateQueries({ queryKey: ['messages', activeFriend.id] });
              queryClient.invalidateQueries({ queryKey: ['connections'] });
          } catch (error) {
              console.error("Erro no upload:", error);
              alert("Falha ao enviar mídia.");
          } finally {
              setIsUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };

  const handleAcceptPromotion = async (messageId: string, communityId: string) => {
      if(!activeFriend) return;
      setActionLoading(messageId);
      const success = await communityService.acceptModeration(communityId, 'current_user');
      if (success) {
          alert("Convite aceito com sucesso!");
      } else {
          alert("Erro ao aceitar convite.");
      }
      setActionLoading(null);
  };

  const filteredList = (connections.items || []).filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-80px-5rem)] xl:h-[calc(100vh-80px)] overflow-hidden bg-[#1e293b]">
      
      {/* SIDEBAR LISTA */}
      <div className={`w-full md:w-80 lg:w-96 bg-[#0f172a] border-r border-slate-800 flex flex-col ${showChatOnMobile ? 'hidden md:flex' : 'flex'}`}>
        
        <div className="p-4 border-b border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-white">Conexões</h2>
            
            <div className="flex bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setSidebarTab('friends')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${sidebarTab === 'friends' ? 'bg-[#50c878] text-[#1e293b] shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    Amigos
                </button>
                <button onClick={() => setSidebarTab('dms')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative ${sidebarTab === 'dms' ? 'bg-[#50c878] text-[#1e293b] shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    DMs {connections.unreadTotal > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}
                </button>
            </div>

            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#50c878]" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#50c878]"
                />
            </div>
        </div>

        <div className="flex-1 min-h-0">
            {isLoadingList ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#50c878]" /></div>
            ) : filteredList.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                    {sidebarTab === 'friends' ? 'Nenhum amigo encontrado.' : 'Nenhuma DM encontrada.'}
                </div>
            ) : (
                <Virtuoso
                    style={{ height: '100%' }}
                    data={filteredList}
                    itemContent={(index, item) => (
                        <div 
                            key={item.id}
                            onClick={() => handleSelectFriend(item)}
                            className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-slate-800/50 hover:bg-slate-800/50 ${activeFriend?.id === item.id ? 'bg-slate-800 border-l-4 border-l-[#50c878]' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div className="relative">
                                <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-full object-cover bg-slate-700" />
                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f172a] ${item.status === 'online' ? 'bg-[#50c878]' : item.status === 'busy' ? 'bg-red-500' : 'bg-slate-500'}`}></span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className={`font-bold text-sm truncate flex items-center gap-1 ${item.unreadCount > 0 ? 'text-white' : 'text-slate-300'}`}>
                                        {item.name}
                                        {item.isCloseFriend && <Star size={10} className="text-[#FFC300] fill-[#FFC300]" />}
                                    </h3>
                                    <span className={`text-[10px] ${item.unreadCount > 0 ? 'text-[#50c878] font-bold' : 'text-slate-500'}`}>{item.lastMessageTime}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-xs truncate ${item.unreadCount > 0 ? 'text-white font-medium' : 'text-slate-400'}`}>
                                        {item.lastMessage || 'Clique para conversar'}
                                    </p>
                                    {item.unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center shadow-lg">{item.unreadCount}</span>}
                                </div>
                            </div>
                            {sidebarTab === 'friends' && (
                                <button 
                                    onClick={(e) => handleToggleCloseFriend(e, item)}
                                    className={`p-2 rounded-full hover:bg-white/10 transition-colors ${item.isCloseFriend ? 'text-[#FFC300]' : 'text-slate-600'}`}
                                    title="Melhor Amigo"
                                >
                                    <Star size={16} fill={item.isCloseFriend ? "currentColor" : "none"} />
                                </button>
                            )}
                        </div>
                    )}
                />
            )}
        </div>
      </div>

      {/* ÁREA PRINCIPAL (CHAT) */}
      <div className={`flex-1 flex flex-col bg-[#1e293b] relative ${!showChatOnMobile ? 'hidden md:flex' : 'flex'}`}>
        {activeFriend ? (
            <>
                <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-[#1e293b]/95 backdrop-blur z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={handleBackToList} className="md:hidden text-slate-400 hover:text-white"><ArrowLeft size={24} /></button>
                        <img src={activeFriend.avatar} className="w-10 h-10 rounded-full" />
                        <div>
                            <h3 className="font-bold text-white leading-tight flex items-center gap-2">
                                {activeFriend.name}
                                {activeFriend.isCloseFriend && <Star size={12} className="text-[#FFC300] fill-[#FFC300]" />}
                            </h3>
                            <span className="text-xs text-slate-400 flex items-center gap-1"><Circle size={8} fill="currentColor" className={activeFriend.status === 'online' ? 'text-[#50c878]' : 'text-slate-500'} />{activeFriend.status === 'online' ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-400 hover:text-[#50c878] hover:bg-slate-800 rounded-full transition-colors"><Phone size={20} /></button>
                        <button className="p-2 text-slate-400 hover:text-[#50c878] hover:bg-slate-800 rounded-full transition-colors"><Video size={20} /></button>
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"><MoreVertical size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 bg-slate-900/30">
                    <Virtuoso
                        style={{ height: '100%' }}
                        data={messages}
                        initialTopMostItemIndex={messages.length - 1}
                        followOutput="auto"
                        itemContent={(index, msg) => {
                            const isMe = msg.senderId === currentUserId;
                            let inviteData = null;
                            if (msg.type === 'promotion_request') {
                                try { inviteData = JSON.parse(msg.content); } catch (e) {
                                    inviteData = { text: msg.content };
                                }
                            }
                            let bubbleClass = isMe ? 'bg-[#50c878] text-[#1e293b] rounded-tr-none' : 'bg-slate-800 text-white rounded-tl-none';
                            if (msg.type === 'promotion_request' && isMe) {
                                bubbleClass = 'bg-orange-500 text-white rounded-tr-none';
                            }

                            return (
                                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} p-4`}>
                                    <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl p-3 shadow-md ${bubbleClass}`}>
                                        {msg.type === 'image' && <img src={msg.mediaUrl} className="rounded-lg mb-2 max-h-60 object-cover" />}
                                        {msg.type !== 'promotion_request' && <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                                        {msg.type === 'promotion_request' && inviteData && (
                                            <div className={`rounded-xl p-3 border ${isMe ? 'bg-black/10 border-white/20' : 'bg-slate-900/50 border-slate-700'}`}>
                                                <div className={`flex items-center gap-2 mb-2 ${isMe ? 'text-white' : 'text-[#50c878]'}`}>
                                                    <Shield size={18} />
                                                    <span className="font-bold text-xs uppercase tracking-wide">Convite Oficial</span>
                                                </div>
                                                <p className="text-sm mb-4 font-medium">{inviteData.text}</p>
                                                {!isMe ? (
                                                    <button 
                                                        onClick={() => inviteData.communityId && handleAcceptPromotion(msg.id, inviteData.communityId)}
                                                        className="w-full py-2 bg-[#50c878] text-[#1e293b] rounded-lg font-bold text-xs hover:bg-[#50c878]/90 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        {actionLoading === msg.id ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Aceitar Cargo</>}
                                                    </button>
                                                ) : (
                                                    <div className="text-center text-xs opacity-90 italic flex items-center justify-center gap-1">
                                                        <Clock size={12} /> Aguardando resposta...
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'opacity-80' : 'text-slate-400'}`}><span>{msg.timestamp}</span>{isMe && <CheckCheck size={12} />}</div>
                                    </div>
                                </div>
                            );
                        }}
                    />
                </div>

                <div className="p-4 bg-[#1e293b] border-t border-slate-800">
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2 bg-slate-800 p-2 rounded-2xl border border-slate-700 focus-within:border-[#50c878] transition-colors">
                        <div className="flex pb-2 pl-1 gap-1">
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,video/*,audio/*" />
                        </div>
                        <textarea value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Digite sua mensagem..." className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none px-2 py-3 max-h-32 resize-none custom-scrollbar text-sm" rows={1} />
                        <button type="submit" disabled={!inputText.trim()} className="p-3 bg-[#50c878] text-[#1e293b] rounded-xl hover:bg-[#50c878]/90 disabled:opacity-50 transition-all"><Send size={20} /></button>
                    </form>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4"><Paperclip size={40} className="text-slate-600" /></div>
                <h3 className="text-xl font-bold text-white mb-2">Suas Conexões</h3>
                <p className="text-center max-w-xs">Selecione uma conversa ou amigo para interagir.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionsPage;
