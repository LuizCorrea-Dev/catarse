
import React, { useState } from 'react';
import { Zap, Share2, MessageCircle, AlertCircle, Trash2, Loader2, AlertTriangle, Pin } from 'lucide-react';
import { transactionService } from '../backend/TransactionService';
import { aiService } from '../backend/AIService';
import CommentSection from './CommentSection';
import { postService, Post } from '../backend/PostService';

interface PostCardProps {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mediaUrl?: string;
  tags?: string[];
  initialVibes: number;
  userHasLiked?: boolean; 
  onVibeTransfer?: (newBalance: number) => void;
  onTagClick?: (tag: string) => void;
  canDelete?: boolean;
  onDelete?: () => void;
  isPinned?: boolean;
  canPin?: boolean;
  onPin?: (id: string, newStatus: boolean) => void;
}

const PostCard: React.FC<PostCardProps> = ({ 
  id, 
  authorId, 
  authorName, 
  authorAvatar, 
  content, 
  mediaUrl,
  tags,
  initialVibes, 
  userHasLiked = false,
  onVibeTransfer,
  onTagClick,
  canDelete = false,
  onDelete,
  isPinned = false,
  canPin = false,
  onPin
}) => {
  const [vibes, setVibes] = useState(initialVibes);
  const [isLiking, setIsLiking] = useState(false);
  const [hasLiked, setHasLiked] = useState(userHasLiked);
  const [risk, setRisk] = useState<'low' | 'high' | 'checking'>('checking');
  const [showComments, setShowComments] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [animateLike, setAnimateLike] = useState(false);

  React.useEffect(() => {
    const checkRisk = async () => {
      const analysis = await aiService.analyzePostRisk(content);
      setRisk(analysis.riskLevel);
    };
    checkRisk();
  }, [content]);

  const handleLike = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); 
    if (isLiking || hasLiked) return;
    
    setAnimateLike(true);
    setTimeout(() => setAnimateLike(false), 700);

    setIsLiking(true);
    
    const result = await transactionService.processLikeTransaction(id, 'current_user', authorId);
    
    if (result.success) {
      setVibes(prev => prev + 1);
      setHasLiked(true);
      if (onVibeTransfer) {
        onVibeTransfer(result.donorBalance);
      }
    } else {
      alert(result.message);
    }
    
    setIsLiking(false);
  };

  const handleClickDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
      setIsDeleting(true);
      try {
          const result = await postService.deletePost(id);
          if (result.success) {
              if (onVibeTransfer) {
                  onVibeTransfer(result.newBalance);
              }
              if (onDelete) {
                  onDelete();
              }
          }
      } catch (error) {
          console.error('Failed to delete post', error);
          alert('Erro ao excluir post. Tente novamente.');
      } finally {
          setIsDeleting(false);
          setShowDeleteModal(false);
      }
  };

  const toggleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(!showComments);
  };

  const togglePin = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onPin) onPin(id, !isPinned);
  };

  const isAuthor = authorId === 'current_user';
  const showDeleteButton = isAuthor || canDelete;

  return (
    <>
      <div className={`mx-auto w-full  overflow-hidden rounded-2xl bg-slate-800/40 border border-slate-700 shadow-md mb-6 transition-all hover:border-slate-500 group ${risk === 'high' ? 'opacity-60 grayscale' : ''}`}>
        <div className="flex flex-col relative">
          
          {isPinned && (
              <div className="absolute -top-1 -left-1 z-20 bg-[#FFC300] text-[#1e293b] px-3 py-1 rounded-br-xl shadow-md flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                  <Pin size={12} fill="currentColor" /> Fixado
              </div>
          )}

          {canPin && (
              <button 
                  onClick={togglePin}
                  className={`absolute top-2 right-12 z-20 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 ${isPinned ? 'text-[#FFC300] bg-[#FFC300]/10 hover:bg-[#FFC300]/20' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                  title={isPinned ? "Desafixar" : "Fixar no topo"}
              >
                  <Pin size={18} fill={isPinned ? "currentColor" : "none"} />
              </button>
          )}

          {mediaUrl && (
            <div className="w-full bg-black/20 overflow-hidden relative">
              <img
                className="w-full h-auto max-h-[450px] object-cover block"
                src={mediaUrl}
                alt="Conteúdo do post"
              />
              {showDeleteButton && (
                  <button 
                      onClick={handleClickDelete}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/90 text-white p-2.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-20 cursor-pointer hover:scale-110 shadow-lg"
                      title="Excluir (Estorno automático)"
                  >
                      <Trash2 size={18} />
                  </button>
              )}
            </div>
          )}
          
          <div className="p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                  <img src={authorAvatar} alt={authorName} className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-600" />
                  <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-slate-100 truncate">{authorName}</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">@usuario_catarse</p>
                  </div>
                  {risk === 'high' && <AlertCircle size={16} className="text-amber-500 shrink-0" />}
              </div>
              
              {showDeleteButton && !mediaUrl && (
                  <button 
                      onClick={handleClickDelete} 
                      className="text-slate-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-slate-700/50 cursor-pointer z-20"
                      title="Excluir Publicação"
                  >
                      <Trash2 size={18} />
                  </button>
              )}
            </div>

            <p className="text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words mb-4">
              {content}
            </p>

            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map(tag => (
                  <button 
                    key={tag}
                    onClick={(e) => { e.stopPropagation(); onTagClick && onTagClick(tag); }}
                    className="text-[10px] font-bold text-[#50c878] bg-[#50c878]/10 px-2 py-0.5 rounded transition-colors uppercase tracking-tighter cursor-pointer hover:bg-[#50c878]/20"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
              <button 
                onClick={handleLike}
                disabled={isLiking || risk === 'high' || hasLiked}
                className={`bubbly-button flex items-center gap-2 px-4 py-1.5 rounded-full transition-all relative cursor-pointer ${
                  hasLiked ? 'bg-[#FFC300]/20' : 'bg-slate-700/30 hover:bg-[#FFC300]/10'
                } ${animateLike ? 'animate' : ''}`}
              >
                <Zap className={`${hasLiked ? 'fill-[#FFC300] text-[#FFC300]' : 'text-slate-400'}`} size={18} />
                <span className={`font-bold text-sm ${hasLiked ? 'text-[#FFC300]' : 'text-slate-400'}`}>{vibes}</span>
              </button>

              <div className="flex gap-4">
                <button onClick={toggleComments} className={`transition-colors cursor-pointer ${showComments ? 'text-[#50c878]' : 'text-slate-500 hover:text-white'}`}>
                  <MessageCircle size={20} />
                </button>
                <button className="text-slate-500 hover:text-white transition-colors cursor-pointer">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
            
            {showComments && (
              <CommentSection 
                  postId={id} 
                  authorId={authorId} 
                  onVibeTransfer={onVibeTransfer} 
                  canDelete={canDelete} 
              />
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleting) setShowDeleteModal(false);
          }}
        >
          <div 
            className="bg-[#1e293b] w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Excluir Vibe?</h3>
              
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Essa ação é irreversível. As VIBES recebidas serão <span className="text-white font-bold">estornadas</span> para os doadores e seu saldo será atualizado.
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-700 text-white hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} /> Confirmar</>}
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
