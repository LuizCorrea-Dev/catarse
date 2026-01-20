
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PostCard from '../components/PostCard';
import { postService, Post } from '../backend/PostService';
import { Loader2, Hash, X, Plus } from 'lucide-react';

interface FeedPrincipalProps {
  onVibeUpdate?: (newBalance: number) => void;
}

const FeedPrincipal: React.FC<FeedPrincipalProps> = ({ onVibeUpdate }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);

  const fetchPosts = async (tag?: string) => {
    setIsLoading(true);
    try {
      const data = await postService.getPosts(tag);
      setPosts(data);
    } catch (error) {
      console.error("Falha ao carregar posts", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
      const tags = await postService.getTrendingTags();
      setTrendingTags(tags);
  }

  useEffect(() => {
    fetchPosts(selectedTag || undefined);
    fetchTags();
  }, [selectedTag]);

  const handleTagClick = (tag: string) => {
      if (selectedTag === tag) {
          setSelectedTag(null);
      } else {
          setSelectedTag(tag);
      }
  };

  return (
    <div className="w-full  max-w-screen-md mx-auto px-3 sm:px-4 md:px-6 py-1 md:py-3 relative min-h-screen pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Feed da Alma</h1>
        <p className="text-slate-400 text-sm">Conteúdo curado para sua evolução pessoal.</p>
        
        <div className="flex gap-2 mt-5 overflow-x-auto pb-2 custom-scrollbar mask-gradient">
            {trendingTags.map(tag => (
                <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                        selectedTag === tag 
                        ? 'bg-[#50c878] text-[#1e293b] border-[#50c878]' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-[#50c878] hover:text-[#50c878]'
                    }`}
                >
                    <Hash size={10} />
                    {tag}
                    {selectedTag === tag && <X size={10} className="ml-1" />}
                </button>
            ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 size={40} className="animate-spin mb-4 text-[#50c878]" />
            <p>Sintonizando frequências...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.length > 0 ? (
             posts.map(post => (
                <PostCard 
                  key={post.id} 
                  {...post}
                  userHasLiked={post.userHasLiked} 
                  onVibeTransfer={onVibeUpdate}
                  onTagClick={handleTagClick}
                />
              ))
          ) : (
              <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700/50 border-dashed">
                  <p className="text-slate-400">Nenhuma vibe encontrada com esta tag.</p>
                  <button 
                    onClick={() => setSelectedTag(null)}
                    className="text-[#50c878] text-sm mt-2 hover:underline"
                  >
                      Limpar filtros
                  </button>
              </div>
          )}
        </div>
      )}
      
      {!isLoading && posts.length > 0 && (
        <div className="py-12 text-center text-slate-500 text-xs italic">
            Você chegou ao fim da sua dose diária de serenidade.
        </div>
      )}

      <Link 
        to="/create"
        className="fixed bottom-24 md:bottom-32 xl:bottom-10 right-6 md:right-10 bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] p-4 rounded-full shadow-[0_0_20px_rgba(80,200,120,0.4)] transition-all hover:scale-110 active:scale-95 z-50 flex items-center justify-center"
        aria-label="Criar nova vibe"
      >
        <Plus size={28} strokeWidth={3} />
      </Link>
    </div>
  );
};

export default FeedPrincipal;
