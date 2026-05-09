import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, AlertCircle, Trash2, Loader2, X, Camera, Image, Smile } from "lucide-react";
import { transactionService } from "../backend/TransactionService";
import { postService, Comment } from "../backend/PostService";
import { VibeManager } from "./VibeManager";
import { supabase } from "../backend/supabase";

// Novos Componentes de Mídia
import CameraCapture from "./media-pickers/CameraCapture";
import GalleryPicker from "./media-pickers/GalleryPicker";
import EmojiPicker from "./media-pickers/EmojiPicker";
import GifPicker from "./media-pickers/GifPicker";

interface CommentSectionProps {
  postId: string;
  authorId: string; // Autor do Post
  onVibeTransfer?: (newBalance: number) => void;
  canDelete?: boolean;
  children?: React.ReactNode;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, authorId, onVibeTransfer, canDelete, children }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para mídia selecionada
  const [selectedMedia, setSelectedMedia] = useState<{file?: File, url?: string, type: 'image' | 'video' | 'gif'} | null>(null);

  const queryClient = useQueryClient();
  const minChars = 100;
  const progress = Math.min((newComment.length / minChars) * 100, 100);

  // 1. Busca e Realtime
  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(false);
      const data = await postService.getPostComments(postId);
      setComments(data);
    };
    fetchComments();
  }, [postId]);

  // 2. Handlers para Mídia
  const handleMediaSelect = (file: File) => {
    const isVideo = file.type.startsWith('video/');
    setSelectedMedia({
      file,
      url: URL.createObjectURL(file), // Preview temporário
      type: isVideo ? 'video' : 'image'
    });
  };

  const handleGifSelect = (gifUrl: string) => {
    setSelectedMedia({
      url: gifUrl,
      type: 'gif'
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewComment(prev => prev + emoji);
  };

  const clearMedia = () => {
    if (selectedMedia?.url && selectedMedia.type !== 'gif') {
      URL.revokeObjectURL(selectedMedia.url);
    }
    setSelectedMedia(null);
  };

  // 2. Lógica de Envio (Vibe Transfer correta)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.length < minChars) return;
    setIsSubmitting(true);

    // DESTINATÁRIO: Se for resposta, paga ao autor do comentário. Se for raiz, ao autor do post.
    const recipientId = replyingTo ? replyingTo.userId : authorId;

    try {
      let result;
      if (replyingTo) {
        // Resposta: Transferência direta (Vibe vai para o autor do comentário)
        result = await transactionService.transferVibe(recipientId, 1);
      } else {
        // Raiz: Fluxo padrão (Vibe vai para o autor do post)
        result = await transactionService.processCommentTransaction(postId, "current_user", authorId, newComment);
      }

   if (result.success) {
  // Criamos o objeto primeiro para garantir que ele segue a interface Comment
  const newCommentObj: Comment = {
    id: Date.now().toString(),
    postId,
    userId: "current_user",
    parentId: replyingTo?.id || null,
    authorName: "Você",
    authorAvatar: "https://picsum.photos/seed/me/50/50",
    content: newComment,
    createdAt: new Date().toISOString(),
    vibes: 0,
  };

  // Chamamos o serviço (mesmo que ele retorne void, nós já temos o objeto)
  await postService.addComment(newCommentObj);

  // Atualizamos o estado usando o objeto que criamos manualmente
  setComments((prev) => [...prev, newCommentObj]);
  setNewComment("");
  setReplyingTo(null);
  clearMedia();
  } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Erro na transação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderização Recursiva
  const renderComment = (comment: Comment, isReply = false) => {
    const replies = comments.filter(c => c.parentId === comment.id);
    return (
      <div key={comment.id} className={`${isReply ? "ml-8 mt-3 border-l-2 border-slate-800 pl-3" : "mt-6"}`}>
        <div className="flex gap-3 group">
          <img src={comment.authorAvatar} className="w-8 h-8 rounded-full shrink-0" alt="" />
          <div className="flex-1 min-w-0">
            <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[#50c878] text-[10px] font-bold">{comment.authorName}</span>
                <VibeManager entityId={comment.id} authorId={comment.userId} initialCount={comment.vibes} type="comment" />
              </div>
              <p className="text-slate-300 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
            </div>
            <button onClick={() => setReplyingTo(comment)} className="mt-1 ml-2 text-[10px] text-slate-500 font-bold hover:text-[#50c878]">RESPONDER</button>
            {replies.map(r => renderComment(r, true))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scroll Único: Conteúdo (children) + Comentários */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
        {/* Conteúdo do Post (Texto, Tags, etc) inserido aqui */}
        {children && <div className="mb-8">{children}</div>}

        <header className="py-4 border-b border-slate-800/50 flex gap-2 items-center">
            <span className="bg-slate-700/50 px-2 py-0.5 rounded text-[9px] font-black text-slate-400">1 VIBE / COMENTÁRIO</span>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase">Discussão ({comments.length})</h3>
        </header>
        
        {isLoading ? <Loader2 className="animate-spin mx-auto mt-10 text-slate-700" /> : 
         comments.filter(c => !c.parentId).map(c => renderComment(c))}
      </div>

      {/* FORMULÁRIO FIXO NO RODAPÉ DO COMPONENTE */}
      <div className="bg-[#0f172a] border-t border-slate-800 p-3 pb-safe z-20 relative">
        {/* Preview de Mídia Selecionada */}
        {selectedMedia && (
          <div className="relative w-20 h-20 mb-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-800/50 group">
            {selectedMedia.type === 'video' ? (
              <video src={selectedMedia.url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={selectedMedia.url} alt="Selected" className="w-full h-full object-cover" />
            )}
            <button 
              onClick={clearMedia}
              className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {replyingTo && (
          <div className="flex items-center justify-between bg-slate-800/80 px-3 py-1.5 text-[10px] text-slate-300 rounded-t-lg border-x border-t border-slate-700">
            <span>Respondendo a <strong className="text-[#50c878]">{replyingTo.authorName}</strong></span>
            <button onClick={() => setReplyingTo(null)} className="p-1"><X size={12}/></button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {/* Nível 1: Texto */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-700 focus-within:border-[#50c878]/40">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Sua resposta..." : "Adicione valor à conversa..."}
              className="w-full bg-transparent text-slate-200 text-sm p-3 min-h-[44px] max-h-[120px] outline-none resize-none"
              rows={1}
            />
          </div>

          {/* Nível 2: Ações e Botão */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5 text-slate-500">
              <CameraCapture onMediaSelect={handleMediaSelect} disabled={isSubmitting} />
              <GalleryPicker onMediaSelect={handleMediaSelect} disabled={isSubmitting} />
              <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={isSubmitting} />
              <GifPicker onGifSelect={handleGifSelect} disabled={isSubmitting} />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || newComment.length < minChars}
              className={`p-2.5 rounded-full transition-all ${newComment.length >= minChars ? "bg-[#50c878] text-slate-900" : "bg-slate-800 text-slate-600"}`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
            </button>
          </div>

          {/* Nível 3: Progresso e Contador */}
          <div className="px-1">
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${newComment.length >= minChars ? "bg-[#50c878]" : "bg-amber-500"}`} style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-[9px] font-bold">
              {error ? <span className="text-red-400 flex items-center gap-1"><AlertCircle size={10}/> {error}</span> : 
              <span className="text-slate-500 uppercase">{newComment.length < minChars ? `Faltam ${minChars - newComment.length}` : 'Pronto'}</span>}
              <span className={newComment.length >= minChars ? "text-[#50c878]" : "text-slate-500"}>{newComment.length}/{minChars}</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};


export default CommentSection;