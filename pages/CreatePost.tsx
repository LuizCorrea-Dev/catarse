
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, X, Send, Hash, Plus, Loader2 } from 'lucide-react';
import { postService, CreatePostData } from '../backend/PostService';
import { transactionService } from '../backend/TransactionService';

interface CreatePostProps {
  onPostCreatedAndVibeGained?: (newBalance: number) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreatedAndVibeGained }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Cria uma URL local para preview mockado
      const objectUrl = URL.createObjectURL(file);
      setMediaPreview(objectUrl);
    }
  };

  const removeMedia = () => {
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaPreview) return;

    setIsSubmitting(true);

    // Processa tags (remove espaços e # se o usuário colocar)
    const formattedTags = tags
      .split(',')
      .map(tag => tag.trim().replace(/^#/, ''))
      .filter(tag => tag.length > 0);

    const postData: CreatePostData = {
      userId: 'current_user',
      content: content,
      mediaUrl: mediaPreview || undefined,
      tags: formattedTags
    };

    const result = await postService.createPost(postData);

    if (result.success) {
      // 1. Recompensa o usuário com VIBE
      const vibeResult = await transactionService.processPostCreationVibe('current_user');
      
      // 2. Atualiza o saldo global via callback
      if (onPostCreatedAndVibeGained) {
        onPostCreatedAndVibeGained(vibeResult.newBalance);
      }

      // 3. Redireciona
      navigate('/');
    } else {
      alert(result.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Criar Nova Vibe</h1>
        <p className="text-slate-400 text-sm">Compartilhe sua jornada de leveza (+1 VIBE).</p>
      </div>

      <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-6 shadow-xl">
        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que está fluindo em sua mente hoje?"
          className="w-full bg-transparent text-white text-lg placeholder-slate-500 focus:outline-none resize-none min-h-[150px] mb-6 custom-scrollbar"
        />

        {/* Media Preview Area */}
        {mediaPreview ? (
          <div className="relative mb-6 rounded-2xl overflow-hidden group">
            <img src={mediaPreview} alt="Preview" className="w-full max-h-96 object-cover" />
            <button
              onClick={removeMedia}
              className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="mb-6 border-2 border-dashed border-slate-700 hover:border-[#50c878] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group bg-slate-900/30"
          >
            <div className="bg-slate-800 group-hover:bg-[#50c878]/10 p-4 rounded-full mb-3 transition-colors">
              <Plus size={32} className="text-slate-400 group-hover:text-[#50c878]" />
            </div>
            <p className="text-slate-400 group-hover:text-slate-200 text-sm font-medium">Adicionar foto ou vídeo</p>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          className="hidden"
        />

        {/* Tags Input */}
        <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 mb-8 focus-within:border-[#50c878] transition-colors">
          <Hash size={20} className="text-slate-500" />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (separadas por vírgula, ex: gratidão, meditação)"
            className="w-full bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 text-slate-400 hover:text-white font-medium transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content && !mediaPreview)}
            className="bg-[#50c878] hover:bg-[#50c878]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#1e293b] font-bold px-8 py-2.5 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(80,200,120,0.3)]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                Publicar <Send size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
