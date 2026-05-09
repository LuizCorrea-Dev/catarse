import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Virtuoso } from 'react-virtuoso'; // O motor de virtualização
import PostCard from '../components/PostCard';
import PostSkeleton from '../components/PostSkeleton'; // Teu novo componente
import { postService, Post } from '../backend/PostService';
import { Hash, X, Plus, Loader2 } from 'lucide-react';
import { PullToRefresh } from '../components/PullToRefresh';
import { PostDetailModal } from '../components/PostDetailModal';

const FeedPrincipal: React.FC = () => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const queryClient = useQueryClient();

  // 1. Tags com Cache
  const { data: trendingTags = [] } = useQuery({
    queryKey: ['trendingTags'],
    queryFn: () => postService.getTrendingTags(),
    staleTime: 1000 * 60 * 10,
  });

  // 2. Infinite Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['posts', selectedTag],
    queryFn: ({ pageParam = 0 }) => postService.getPosts(selectedTag || undefined, undefined, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.length === 20 ? allPages.length : undefined,
  });

  const allPosts = data?.pages.flat() || [];

  const handleTagClick = (tag: string) => setSelectedTag(prev => prev === tag ? null : tag);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 500)); 
    await postService.getPosts(selectedTag || undefined, undefined, 0); 
    window.location.reload(); 
  };

  return (
    <div className="w-full max-w-screen-md mx-auto px-1.5 sm:px-4 md:px-3 py-1 md:py-3 min-h-screen pb-24">
      <PullToRefresh onRefresh={async () => {
        await queryClient.invalidateQueries({ queryKey: ['posts'] });
      }}>
      {/* HEADER FIXO */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Feed da Alma</h1>
        <div className="flex gap-2 mt-5 overflow-x-auto pb-2 custom-scrollbar">
          {trendingTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                selectedTag === tag ? 'bg-[#50c878] text-[#1e293b] border-[#50c878]' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Hash size={10} /> {tag}
              {selectedTag === tag && <X size={10} className="ml-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA VIRTUALIZADA */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : (
        <Virtuoso
          useWindowScroll // Usa o scroll do browser em vez de uma div interna
          data={allPosts}
          endReached={() => hasNextPage && fetchNextPage()}
          itemContent={(index, post) => (
            <div className="pb-2"> {/* Espaçamento entre posts */}
              <PostCard 
                key={post.id} 
                {...post} 
                onTagClick={handleTagClick}
                onClick={() => setSelectedPost(post)}
              />
            </div>
          )}
          components={{
            Footer: () => (
              <div className="py-10 flex flex-col items-center justify-center">
                {isFetchingNextPage ? (
                  <PostSkeleton />
                ) : !hasNextPage && allPosts.length > 0 ? (
                  <p className="text-slate-500 text-xs italic">Você chegou ao fim da sua dose de serenidade.</p>
                ) : null}
              </div>
            )
          }}
        />
      )}

      {/* FAB - Botão Flutuante */}
      <Link 
        to="/create"
        className="fixed bottom-24 md:bottom-10 right-6 bg-[#50c878] text-[#1e293b] p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
      >
        <Plus size={28} strokeWidth={3} />
      </Link>

      </PullToRefresh>

      {selectedPost && (
        <PostDetailModal 
            post={selectedPost} 
            onClose={() => setSelectedPost(null)} 
        />
      )}
    </div>
  );
};

export default FeedPrincipal;