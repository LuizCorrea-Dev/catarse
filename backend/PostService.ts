
import { supabase } from './supabase';
import { transactionService } from './TransactionService';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mediaUrl?: string;
  tags: string[];
  initialVibes: number;
  totalVibesReceived: number; // Count from likes table
  totalComments: number;      
  type: 'post' | 'diary';     
  communityId?: string;
  createdAt: string;
  userHasLiked?: boolean; // Novo campo para UI
  isPinned?: boolean; // Novo campo para posts fixados
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  vibes: number; 
  createdAt: string;
  userHasLiked?: boolean;
}

export interface CreatePostData {
  userId: string;
  content: string;
  mediaUrl?: string;
  tags: string[];
  communityId?: string; 
}

class PostService {

  public async getPosts(filterTag?: string, communityId?: string): Promise<Post[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
        .from('posts')
        .select(`
            *,
            profiles (username, avatar_url),
            likes (user_id),
            likes_count: likes(count),
            comments_count: comments(count)
        `)
        .eq('type', 'post');

    // Ordenação: Por data de criação no DB. 'is_pinned' será tratado no cliente para evitar erros se a coluna faltar.
    if (communityId) {
        query = query.eq('community_id', communityId).order('created_at', { ascending: false });
    } else {
        query = query.is('community_id', null).order('created_at', { ascending: false });
    }

    if (filterTag) {
        query = query.contains('tags', [filterTag]);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching posts:", error);
        return [];
    }

    // Mapear dados do Supabase para interface Post
    const posts = data.map((row: any) => ({
        id: row.id,
        authorId: row.user_id,
        authorName: row.profiles?.username || 'Desconhecido',
        authorAvatar: row.profiles?.avatar_url || 'https://picsum.photos/50',
        content: row.content,
        mediaUrl: row.media_url,
        tags: row.tags || [],
        initialVibes: 0,
        totalVibesReceived: row.likes_count?.[0]?.count || 0,
        totalComments: row.comments_count?.[0]?.count || 0,
        type: row.type,
        communityId: row.community_id,
        createdAt: row.created_at,
        userHasLiked: user ? row.likes.some((l: any) => l.user_id === user.id) : false,
        isPinned: row.is_pinned || false
    }));

    // Client-side sort for pinned posts if in a community
    if (communityId) {
        return posts.sort((a: Post, b: Post) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0; // Maintain created_at order
        });
    }

    return posts;
  }

  public async getUserPosts(userId: string, type: 'post' | 'diary'): Promise<Post[]> {
    if (userId === 'current_user') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
    }

    const { data, error } = await supabase
        .from('posts')
        .select(`*, profiles(username, avatar_url), likes(count), comments(count)`)
        .eq('user_id', userId)
        .eq('type', type)
        .is('community_id', null) // Filter only main feed posts
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((row: any) => ({
        id: row.id,
        authorId: row.user_id,
        authorName: row.profiles?.username || 'Você',
        authorAvatar: row.profiles?.avatar_url || '',
        content: row.content,
        mediaUrl: row.media_url,
        tags: row.tags || [],
        initialVibes: 0,
        totalVibesReceived: row.likes?.[0]?.count || 0,
        totalComments: row.comments?.[0]?.count || 0,
        type: row.type,
        createdAt: row.created_at,
        isPinned: row.is_pinned || false
    }));
  }

  public async getPostComments(postId: string): Promise<Comment[]> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('comments')
        .select(`
            *,
            profiles (username, avatar_url),
            likes (user_id),
            likes_count: likes(count)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((row: any) => ({
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        authorName: row.profiles?.username || 'Anônimo',
        authorAvatar: row.profiles?.avatar_url || '',
        content: row.content,
        vibes: row.likes_count?.[0]?.count || 0,
        createdAt: row.created_at,
        userHasLiked: user ? row.likes.some((l: any) => l.user_id === user.id) : false
    }));
  }

  public async addComment(comment: Comment): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('comments').insert({
        post_id: comment.postId,
        user_id: user.id,
        content: comment.content
    });
  }

  public async deleteComment(commentId: string): Promise<void> {
      await supabase.from('comments').delete().eq('id', commentId);
  }

  public async createPost(data: CreatePostData): Promise<{ success: boolean; message: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Usuário não autenticado.' };

    const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: data.content,
        media_url: data.mediaUrl,
        tags: data.tags,
        community_id: data.communityId,
        type: 'post'
    });

    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Post publicado!' };
  }
  
  public async deletePost(postId: string): Promise<{ success: boolean; newBalance: number }> {
    // A deleção dispara triggers no DB (se configurados) ou apenas remove.
    // O reembolso financeiro deve ser chamado antes ou via trigger.
    // Aqui chamamos o transactionService para o estorno manual antes de deletar
    
    // Obter authorId
    const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
    if (post) {
        await transactionService.processRefund(postId, post.user_id);
        
        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (!error) {
            const bal = await transactionService.getBalance('current_user');
            return { success: true, newBalance: bal };
        }
    }
    
    return { success: false, newBalance: 0 };
  }

  public async updatePost(postId: string, content: string, tags: string[], mediaUrl?: string): Promise<boolean> {
    const { error } = await supabase.from('posts').update({
        content, tags, media_url: mediaUrl
    }).eq('id', postId);
    return !error;
  }

  public async togglePin(postId: string, isPinned: boolean): Promise<boolean> {
      // Atualiza o DB se a coluna existir. Se não existir, erro é ignorado no catch do chamador ou logado.
      const { error } = await supabase.from('posts').update({
          is_pinned: isPinned
      }).eq('id', postId);
      
      if (error) console.error("Erro ao fixar post (verifique se coluna is_pinned existe):", error);
      return !error;
  }

  public async getTrendingTags(): Promise<string[]> {
      // Query simplificada. Em produção usaria uma RPC para agrupar tags.
      const { data } = await supabase.from('posts').select('tags').limit(50);
      if(!data) return [];
      
      const allTags = data.flatMap((p:any) => p.tags || []);
      return Array.from(new Set(allTags));
  }
}

export const postService = new PostService();
