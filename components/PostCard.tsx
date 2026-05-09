import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap, Share2, MessageCircle, AlertCircle, Trash2, Loader2, AlertTriangle, Pin } from 'lucide-react';
import { transactionService } from '../backend/TransactionService';
import { aiService } from '../backend/AIService';
import { postService, Post } from '../backend/PostService';
import { supabase } from '../backend/supabase'; 
import { VibeManager } from './VibeManager';
import CommentSection from './CommentSection';

interface PostCardProps extends Post {
  onVibeTransfer?: (newBalance: number) => void;
  onTagClick?: (tag: string) => void;
  canDelete?: boolean;
  onDelete?: () => void;
  canPin?: boolean;
  onPin?: (id: string, newStatus: boolean) => void;
  onClick?: () => void;
}

const PostCard: React.FC<PostCardProps> = (props) => {
  // Desestruturação usando os nomes exatos da sua Interface Post
  const { 
    id, authorId, authorName, authorAvatar, content, mediaUrl, tags,
    totalVibesReceived, totalComments, userHasLiked, onTagClick, canDelete, onDelete, isPinned 
  } = props;

  const queryClient = useQueryClient();
  const [risk, setRisk] = useState<'low' | 'high' | 'checking'>('checking');
  const [showComments, setShowComments] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Análise de Risco (AI)
  useEffect(() => {
    let isMounted = true;
    const checkRisk = async () => {
      try {
        const analysis = await aiService.analyzePostRisk(content);
        if (isMounted) setRisk(analysis.riskLevel);
      } catch (error) {
        if (isMounted) setRisk('low');
      }
    };
    checkRisk();
    return () => { isMounted = false; };
  }, [content]);

  // 2. Realtime Subscription (Granular) - Only for comments count or other non-vibe updates now
  // VibeManager handles Vibes. PostCard still handles totalComments if needed visually not in VibeManager
  // Actually, let's keep the subscription here too to update the cache for Comments Count etc.
  useEffect(() => {
    const channel = supabase
      .channel(`post-card-sub-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*", 
          schema: "public",
          table: "posts",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const newPost = payload.new as any;
          if (newPost) {
            queryClient.setQueryData(["posts"], (old: any) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page: Post[]) =>
                  page.map((post) =>
                    post.id === id
                      ? { 
                          ...post, 
                          // totalVibesReceived: newPost.likes_count ... VibeManager handles display, but cache update is good
                          totalComments: newPost.comments_count || newPost.totalComments 
                        }
                      : post
                  )
                ),
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await postService.deletePost(id);
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        if (onDelete) onDelete();
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div 
        onClick={props.onClick}
        className={`mx-auto w-full overflow-hidden rounded-2xl bg-slate-800/40 border border-slate-700 shadow-md mb-6 transition-all hover:border-slate-500 group cursor-pointer ${risk === 'high' ? 'opacity-60 grayscale' : ''}`}
      >
        <div className="flex flex-col relative">
          
          {isPinned && (
            <div className="absolute -top-1 -left-1 z-20 bg-[#FFC300] text-[#1e293b] px-3 py-1 rounded-br-xl shadow-md flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
              <Pin size={12} fill="currentColor" /> Fixado
            </div>
          )}

          {mediaUrl && (
            <div className="w-full bg-black/20 overflow-hidden relative">
              <img className="w-full h-auto max-h-[450px] object-cover block" src={mediaUrl} alt="Vibe" loading="lazy" />
              {canDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }} 
                  className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-2.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-20"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          )}
          
          <div className="p-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName}`} alt={authorName} className="h-9 w-9 rounded-full object-cover border border-slate-600" />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-100 truncate">{authorName}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Comunidade</p>
                </div>
                {risk === 'high' && <span title="Conteúdo em análise"><AlertCircle size={16} className="text-amber-500" /></span>}
              </div>
            </div>

            <p className="text-slate-200 p-2 text-sm md:text-base leading-relaxed mb-4 whitespace-pre-wrap">{content}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {tags?.map(tag => (
                <button key={tag} onClick={() => onTagClick?.(tag)} className="text-[10px] font-bold text-[#50c878] bg-[#50c878]/10 px-2 py-0.5 rounded uppercase hover:bg-[#50c878]/20">
                  #{tag}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                 <VibeManager 
                    entityId={id}
                    authorId={authorId}
                    initialCount={totalVibesReceived}
                    type="post"
                 />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }} 
                  className={`transition-colors p-2 rounded-full hover:bg-slate-700/50 flex items-center ${showComments ? 'text-[#50c878]' : 'text-slate-500 hover:text-white'}`}
                >
                  <MessageCircle size={20} />
                  {/* Real-time Comment Count */}
                  {totalComments > 0 && <span className="text-xs font-bold ml-1.5">{totalComments}</span>}
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); }} 
                    className="text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-700/50"
                >
                  <Share2 size={20} />
                </button>
              </div>
            </div>
            
            {showComments && (
                <div onClick={(e) => e.stopPropagation()}>
                    <CommentSection postId={id} authorId={authorId} canDelete={canDelete} />
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Deleção */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1e293b] w-full max-w-sm rounded-2xl border border-slate-700 p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Excluir Vibe?</h3>
              <p className="text-slate-400 text-sm mb-6">Esta ação removerá o post permanentemente do feed.</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors">Voltar</button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors">
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PostCard;
