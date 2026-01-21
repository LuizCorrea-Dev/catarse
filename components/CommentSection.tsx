import React, { useState, useEffect } from "react";
import {
  Send,
  AlertCircle,
  Clock,
  Zap,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { transactionService } from "../backend/TransactionService";
import { postService, Comment } from "../backend/PostService";

interface CommentSectionProps {
  postId: string;
  authorId: string;
  onVibeTransfer?: (newBalance: number) => void;
  canDelete?: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  authorId,
  onVibeTransfer,
  canDelete = false,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [likingComments, setLikingComments] = useState<Set<string>>(new Set());

  const charCount = newComment.length;
  const minChars = 100;
  const remaining = minChars - charCount;
  const progress = Math.min((charCount / minChars) * 100, 100);

  useEffect(() => {
    let isMounted = true;
    const fetchComments = async () => {
      setIsLoading(true);
      const data = await postService.getPostComments(postId);
      if (isMounted) {
        setComments(data);
        setIsLoading(false);
      }
    };
    fetchComments();
    return () => {
      isMounted = false;
    };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    if (charCount < minChars) {
      setError(
        `Faltam ${remaining} caracteres para atingir a profundidade mínima.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await transactionService.processCommentTransaction(
        postId,
        "current_user",
        authorId,
        newComment,
      );

      if (result.success) {
        const newCommentObj: Comment = {
          id: Date.now().toString(),
          postId: postId,
          userId: "current_user",
          authorName: "Você",
          authorAvatar: "https://picsum.photos/seed/user-me/50/50",
          content: newComment,
          createdAt: new Date().toISOString(),
          vibes: 0,
        };

        await postService.addComment(newCommentObj);

        setComments([newCommentObj, ...comments]);
        setNewComment("");

        if (onVibeTransfer) {
          onVibeTransfer(result.donorBalance);
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao processar transação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateDelete = (e: React.MouseEvent, comment: Comment) => {
    e.stopPropagation();
    e.preventDefault();
    setCommentToDelete(comment);
  };

  const confirmDelete = async () => {
    if (!commentToDelete) return;
    setIsDeleting(true);

    const commentatorId = commentToDelete.userId || "unknown";

    const updatedBalance = await transactionService.processCommentRefund(
      commentToDelete.id,
      commentatorId,
    );

    await postService.deleteComment(commentToDelete.id);

    setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id));

    if (onVibeTransfer) {
      onVibeTransfer(updatedBalance);
    }

    setIsDeleting(false);
    setCommentToDelete(null);
  };

  const handleLike = async (e: React.MouseEvent, comment: Comment) => {
    e.stopPropagation();

    const commentId = comment.id;
    if (likingComments.has(commentId)) return;

    const commentAuthorId = comment.userId || "unknown";

    setLikingComments((prev) => new Set(prev).add(commentId));

    try {
      const result = await transactionService.processLikeTransaction(
        commentId,
        "current_user",
        commentAuthorId,
        "comment",
      );

      if (result.success) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, vibes: c.vibes + 1 } : c,
          ),
        );
        if (onVibeTransfer) {
          onVibeTransfer(result.donorBalance);
        }
      } else {
        console.log(result.message);
      }
    } finally {
      setLikingComments((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return "Agora";
      if (diffInSeconds < 3600)
        return `${Math.floor(diffInSeconds / 60)}m atrás`;
      if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)}h atrás`;
      return `${Math.floor(diffInSeconds / 86400)}d atrás`;
    } catch (e) {
      return "Recentemente";
    }
  };

  return (
    <div
      className="mt-4 pt-4 border-t border-slate-700/50"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
        <span className="bg-slate-700/50 px-2 py-0.5 rounded text-xs">
          Transação: 1 VIBE
        </span>
        Comentários Profundos ({comments.length})
      </h3>

      <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="text-center py-4 text-slate-500 flex justify-center">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-slate-600 text-xs italic">
            Seja o primeiro a adicionar valor a esta conversa.
          </div>
        ) : (
          comments.map((comment) => {
            const isMyComment = comment.userId === "current_user";
            const showDelete = isMyComment || canDelete;
            const hasLikedLocal = transactionService.hasLiked(
              comment.id,
              "current_user",
            );
            const isLiking = likingComments.has(comment.id);
            const timeAgo = formatTime(comment.createdAt);

            return (
              <div key={comment.id} className="flex gap-3 group">
                <img
                  src={comment.authorAvatar}
                  alt={comment.authorName}
                  className="w-8 h-8 rounded-full object-cover mt-1 opacity-80"
                />
                <div className="bg-slate-900/40 p-3 rounded-r-xl rounded-bl-xl flex-1 border border-slate-700/30 relative hover:bg-slate-900/60 transition-colors">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[#50c878] text-xs font-bold">
                      {comment.authorName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Clock size={10} /> {timeAgo}
                      </span>

                      <button
                        onClick={(e) => handleLike(e, comment)}
                        disabled={isLiking || isMyComment}
                        className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                          hasLikedLocal
                            ? "text-[#FFC300] bg-[#FFC300]/10"
                            : "text-slate-500 hover:text-[#FFC300] hover:bg-[#FFC300]/10"
                        } ${isMyComment ? "opacity-50 cursor-default" : "cursor-pointer"}`}
                        title={
                          isMyComment
                            ? "Você não pode curtir seu próprio comentário"
                            : "Enviar Vibe (+1)"
                        }
                      >
                        <Zap
                          size={10}
                          fill={hasLikedLocal ? "currentColor" : "none"}
                        />
                        {comment.vibes}
                      </button>

                      {showDelete && (
                        <button
                          onClick={(e) => initiateDelete(e, comment)}
                          className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 cursor-pointer"
                          title="Excluir (Sem reembolso do custo)"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 focus-within:border-[#50c878]/50 transition-colors"
      >
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Adicione valor à conversa... (mínimo 100 caracteres)"
          className="w-full bg-transparent text-slate-200 text-sm placeholder-slate-500 focus:outline-none resize-none min-h-[80px]"
          disabled={isSubmitting}
        />

        <div className="h-1 w-full bg-slate-800 rounded-full mt-2 mb-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${charCount >= minChars ? "bg-[#50c878]" : "bg-slate-600"}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center">
          <span
            className={`text-xs ${charCount >= minChars ? "text-[#50c878]" : "text-slate-500"}`}
          >
            {charCount} / {minChars} caracteres
          </span>

          <button
            type="submit"
            disabled={isSubmitting || charCount < minChars}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer
              ${
                charCount >= minChars
                  ? "bg-[#50c878] text-[#1e293b] hover:bg-[#50c878]/90 shadow-[0_0_10px_rgba(80,200,120,0.2)]"
                  : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }
            `}
          >
            {isSubmitting ? (
              "Enviando..."
            ) : (
              <>
                <span>Enviar</span>
                <span className="bg-[#1e293b]/20 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5">
                  -1 <Zap size={8} fill="currentColor" />
                </span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 text-red-400 text-xs flex items-center gap-1 animate-pulse">
            <AlertCircle size={12} /> {error}
          </div>
        )}
      </form>

      {commentToDelete && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleting) setCommentToDelete(null);
          }}
        >
          <div
            className="bg-[#1e293b] w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                <Trash2 size={24} className="text-red-500" />
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Apagar comentário?
              </h3>

              <div className="text-slate-400 text-xs mb-6 leading-relaxed space-y-2">
                <p className="flex items-center justify-center gap-1 text-red-400 font-bold">
                  <AlertTriangle size={12} /> Atenção
                </p>
                <p>
                  A <strong>1 VIBE</strong> que você gastou para comentar{" "}
                  <strong>NÃO</strong> será devolvida.
                </p>
                <p className="text-slate-500">
                  Porém, qualquer VIBE que este comentário recebeu de outros
                  usuários será estornada para eles.
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setCommentToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                >
                  Manter
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Apagar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
