import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Hash, Plus, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postService, CreatePostData } from '../backend/PostService';
import { transactionService } from '../backend/TransactionService';
import VibeCelebration from '../components/VibeCelebration';

// Componente Interno para as Partículas de Vibe
// Internal particles removed in favor of VibeCelebration

interface CreatePostProps {
  onPostCreatedAndVibeGained?: (newBalance: number) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreatedAndVibeGained }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isDew, setIsDew] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  // Mutation para criar o post
  const { mutate: createPost, isPending: isSubmitting } = useMutation({
    mutationFn: async () => {
      // 1. Validação inicial
      if (!content.trim() && !selectedFile) return;

      let finalMediaUrl = '';

      // 2. Upload da Mídia
      if (selectedFile) {
        const uploadedUrl = await postService.uploadMedia(selectedFile);
        if (!uploadedUrl) throw new Error("Falha ao carregar a imagem.");
        finalMediaUrl = uploadedUrl;
      }

      // 3. Formatação das Tags
      const formattedTags = tags
        .split(',')
        .map(tag => tag.trim().replace(/^#/, ''))
        .filter(tag => tag.length > 0);

      // 4. Criação do Post
      const postData: CreatePostData = {
        userId: 'current_user',
        content: content,
        mediaUrl: finalMediaUrl,
        tags: formattedTags
      };

      const postResult = await postService.createPost(postData);
      if (!postResult.success) throw new Error(postResult.message);

      // 5. Processamento de Vibes
      return await transactionService.processPostCreationVibe('current_user');
    },
    onSuccess: (vibeResult) => {
      if (vibeResult?.success) {
        setRewardMessage(vibeResult.message);
        setIsDew(!!vibeResult.dewCollected);
        
        // Invalida cache para atualizar saldo e feed (Real-time reflect)
        queryClient.invalidateQueries({ queryKey: ['balance'] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });

        if (onPostCreatedAndVibeGained) {
          onPostCreatedAndVibeGained(vibeResult.newBalance);
        }

        // Always show celebration if dew collected or just reward
        if (vibeResult.dewCollected) {
          setShowCelebration(true);
        } else {
          // If no dew, still navigate but maybe show a smaller feedback? 
          // User asked for animation and reflecting real-time.
          navigate('/');
        }
      }
    },
    onError: (error: any) => {
      alert(error.message || "Ocorreu um erro ao publicar.");
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedFile(file); // Guarda o ficheiro real para o upload
    setMediaPreview(URL.createObjectURL(file));
  }
};

  const handleSubmit = () => {
    createPost();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 relative">
      {/* Overlay de Celebração */}
      <VibeCelebration 
        show={showCelebration} 
        message={rewardMessage} 
        isDew={isDew} 
        onComplete={() => navigate('/')} 
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Criar Nova Vibe</h1>
        <p className="text-slate-400 text-sm">Toda semente gera energia. Poste para colher.</p>
      </div>

      <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que está fluindo em sua mente hoje?"
          className="w-full bg-transparent text-white text-lg placeholder-slate-500 focus:outline-none resize-none min-h-[150px] mb-6"
        />

        {mediaPreview ? (
          <div className="relative mb-6 rounded-2xl overflow-hidden group border border-slate-700">
            <img src={mediaPreview} alt="Preview" className="w-full max-h-96 object-cover" />
            <button
              onClick={() => setMediaPreview(null)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="mb-6 border-2 border-dashed border-slate-700 hover:border-[#50c878] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group bg-slate-900/30 active:scale-[0.98]"
          >
            <Plus size={32} className="text-slate-500 group-hover:text-[#50c878] mb-2" />
            <p className="text-slate-500 group-hover:text-slate-300 text-sm">Inspirar com imagem</p>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

        <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 mb-8 focus-within:border-[#50c878] transition-colors">
          <Hash size={20} className="text-slate-500" />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags separadas por vírgula"
            className="w-full bg-transparent text-white text-sm focus:outline-none"
          />
        </div>

        <div className="flex justify-end items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 text-slate-500 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content && !mediaPreview)}
            className="bg-[#50c878] hover:bg-[#50c878]/90 disabled:opacity-30 text-[#1e293b] font-bold px-10 py-3 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#50c878]/20"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Publicar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;