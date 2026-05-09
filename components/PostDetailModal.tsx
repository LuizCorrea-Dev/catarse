import React, { useEffect } from "react";
import { X, Send, Share2, MoreHorizontal, Maximize2 } from "lucide-react";
import { Post } from "../backend/PostService";
import { VibeManager } from "./VibeManager";
import CommentSection from "./CommentSection";

interface PostDetailModalProps {
  post: Post;
  onClose: () => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleShareClick = async () => {
    const url = window.location.href; // Or build specific post URL if routing exists
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vibe de ${post.authorName}`,
          text: post.content,
          url,
        });
      } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copiado!");
    }
  };

return (
  <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm animate-fade-in flex items-center justify-center p-0 md:p-4">
    <div className="bg-[#0f172a] w-full max-w-[98vw] h-full md:h-[95vh] md:rounded-xl border border-slate-800 shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
      
      {/* Botão Fechar Mobile */}
      <button onClick={onClose} className="md:hidden absolute top-4 right-4 z-50 p-2 bg-black/40 rounded-full text-white backdrop-blur-md">
        <X size={24} />
      </button>

      {/* LADO ESQUERDO: Mídia (70% Web) */}
      <div className="w-full h-[30vh] md:w-1/2 lg:w-[70%] md:h-full bg-black relative flex flex-col justify-center items-center shrink-0 border-b md:border-b-0 md:border-r border-slate-800">
        {post.mediaUrl ? (
          <img src={post.mediaUrl} alt="Post" className="w-full h-full object-contain" />
        ) : (
          <div className="p-8 md:p-16 w-full h-full flex flex-col justify-center items-center bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-900">
            <p className="text-xl md:text-3xl text-slate-200 font-light leading-relaxed max-w-2xl italic">
              "{post.content}"
            </p>
          </div>
        )}
      </div>
{/* --- LADO DIREITO: SIDEBAR --- */}
        <div className="w-full flex-1 md:w-1/2 lg:w-[30%] lg:min-w-[30%] lg:max-w-[30%] h-full bg-[#0f172a] flex flex-col overflow-hidden relative">
          
          {/* Header da Sidebar (Fixo no topo e fora do scroll do CommentSection se quisermos, 
              MAS CommentSection tem overflow-y-auto no corpo. 
              Se Header ficar fora, ele fica fixo. É o desejado. */}
          <div className="p-3 border-b border-slate-700/50 flex items-center justify-between shrink-0 bg-[#0f172a] z-20">
            <div className="flex items-center gap-3">
              <img src={post.authorAvatar} className="w-8 h-8 rounded-full border border-slate-600" alt="" />
              <h3 className="font-bold text-slate-100 text-sm truncate">{post.authorName}</h3>
            </div>
            <button onClick={onClose} className="hidden md:flex p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          {/* CommentSection ocupa o resto e gerencia o scroll do conteúdo (via children) e comentários, + rodapé fixo */}
          <div className="flex-1 overflow-hidden relative">
             <CommentSection postId={post.id} authorId={post.authorId}>
                {/* Conteúdo do Post passado como Children para rolar junto com comentários */}
                <div className="flex flex-col gap-6 pt-2">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-300 text-sm">{post.content}</p>
                  </div>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-[10px] text-[#50c878] font-bold bg-[#50c878]/10 px-2 py-0.5 rounded">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Área de Interação Social */}
                  <div className="py-4 border-y border-slate-800 flex items-center justify-between">
                    <VibeManager entityId={post.id} authorId={post.authorId} initialCount={post.totalVibesReceived} type="post" />
                    <div className="flex gap-1">
                      <button onClick={handleShareClick} className="p-2 text-slate-400 hover:text-emerald-400 rounded-full transition-all"><Share2 size={20}/></button>
                      <button className="p-2 text-slate-400 hover:text-blue-400 rounded-full transition-all"><Send size={20}/></button>
                    </div>
                  </div>
                </div>
             </CommentSection>
          </div>
        </div>
    </div>
  </div>
);
};
