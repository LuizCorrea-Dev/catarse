import { supabase } from "./supabase";
import { transactionService } from "./TransactionService";

// --- INTERFACES ---

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mediaUrl?: string;
  tags: string[];
  initialVibes: number;
  totalVibesReceived: number;
  totalComments: number;
  type: "post" | "diary";
  communityId?: string;
  createdAt: string;
  userHasLiked?: boolean;
  isPinned?: boolean;
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
  parentId?: string | null;
}

export interface CreatePostData {
  userId: string;
  content: string;
  mediaUrl?: string;
  tags: string[];
  communityId?: string;
}

// --- SERVICE ---

class PostService {
 public async getPosts(
  filterTag?: string, 
  communityId?: string, 
  page: number = 0
): Promise<Post[]> {
  const pageSize = 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  // BUSCAR USUÁRIO PRIMEIRO para resolver o erro 'Cannot find name user'
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("posts")
    .select(`
      *,
      profiles (username, avatar_url),
      post_likes (user_id),
      likes_count,
      comments_count
    `);

  // Filtros
  if (communityId) {
    query = query.eq("community_id", communityId);
  } else {
    query = query.is("community_id", null);
  }

  if (filterTag) {
    query = query.contains("tags", [filterTag]);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching posts:", error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    authorId: row.user_id,
    authorName: row.profiles?.username || "Desconhecido",
    authorAvatar: row.profiles?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    content: row.content,
    mediaUrl: row.media_url,
    tags: row.tags || [],
    initialVibes: 0,
    totalVibesReceived: row.likes_count || 0,
    totalComments: row.comments_count || 0,
    type: row.type,
    communityId: row.community_id,
    createdAt: row.created_at,
    userHasLiked: user ? row.post_likes?.some((l: any) => l.user_id === user.id) : false,
    isPinned: row.is_pinned || false,
  }));
}

  /**
   * Upload de arquivo real para o Bucket 'media' do Supabase
   */
  public async uploadMedia(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('media') 
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Erro no upload:', err);
      return null;
    }
  }

  /**
   * Cria o registro do post no banco
   */
  public async createPost(data: CreatePostData): Promise<{ success: boolean; message: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Usuário não autenticado." };

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: data.content,
      media_url: data.mediaUrl,
      tags: data.tags,
      community_id: data.communityId,
      type: "post",
    });

    if (error) return { success: false, message: error.message };
    return { success: true, message: "Post publicado!" };
  }

  /**
   * Apaga o post (sem necessidade de estorno no modelo de taxa zero)
   */
  public async deletePost(postId: string): Promise<{ success: boolean; newBalance: number }> {
    const { data: post } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (post) {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (!error) {
        const bal = await transactionService.getBalance("current_user");
        return { success: true, newBalance: bal };
      }
    }
    return { success: false, newBalance: 0 };
  }

  /**
   * Busca comentários de um post específico
   */
  public async getPostComments(postId: string): Promise<Comment[]> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        parent_id,
        profiles (username, avatar_url),
        likes (user_id),
        likes_count: likes(count)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true }); // Important for thread order

    if (error) return [];

    return data.map((row: any) => ({
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      parentId: row.parent_id,
      authorName: row.profiles?.username || "Anônimo",
      authorAvatar: row.profiles?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + (row.profiles?.username || "user"),
      content: row.content,
      vibes: row.likes_count?.[0]?.count || 0,
      createdAt: row.created_at,
      userHasLiked: user ? row.likes.some((l: any) => l.user_id === user.id) : false,
    }));
  }

  public async addComment(comment: Comment): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("comments").insert({
      post_id: comment.postId,
      user_id: user.id,
      parent_id: comment.parentId || null,
      content: comment.content,
    });
  }

  public async deleteComment(commentId: string): Promise<boolean> {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    return !error;
  }

  public async togglePin(postId: string, isPinned: boolean): Promise<boolean> {
    const { error } = await supabase
      .from("posts")
      .update({ is_pinned: isPinned })
      .eq("id", postId);
    return !error;
  }

  public async getUserPosts(userId: string, type: "post" | "diary" = "post"): Promise<Post[]> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const targetUserId = userId === 'current_user' ? currentUser?.id : userId;
    if (!targetUserId) return [];

    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (username, avatar_url),
        post_likes (user_id),
        likes_count: post_likes(count),
        comments_count: comments(count)
      `)
      .eq("user_id", targetUserId)
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (error) return [];

    return data.map((row: any) => ({
      id: row.id,
      authorId: row.user_id,
      authorName: row.profiles?.username || "Desconhecido",
      authorAvatar: row.profiles?.avatar_url || "",
      content: row.content,
      mediaUrl: row.media_url,
      tags: row.tags || [],
      initialVibes: 0,
      totalVibesReceived: row.likes_count?.[0]?.count || 0,
      totalComments: row.comments_count?.[0]?.count || 0,
      type: row.type,
      communityId: row.community_id,
      createdAt: row.created_at,
      userHasLiked: currentUser ? row.post_likes?.some((l: any) => l.user_id === currentUser.id) : false,
      isPinned: row.is_pinned || false,
    }));
  }

  public async updatePost(postId: string, content: string, tags: string[], mediaUrl?: string): Promise<boolean> {
    const { error } = await supabase
      .from("posts")
      .update({
        content,
        tags,
        media_url: mediaUrl
      })
      .eq("id", postId);
    return !error;
  }

  public async getTrendingTags(): Promise<string[]> {
    const { data } = await supabase.from("posts").select("tags").limit(20);
    if (!data) return [];
    const allTags = data.flatMap((p: any) => p.tags || []);
    return Array.from(new Set(allTags));
  }

  public subscribeToFeedUpdates(
    callback: (payload: any) => void
  ): { unsubscribe: () => void } {
    const channel = supabase
      .channel("feed-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        (payload) => callback(payload)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "likes" }, // Listen for likes too
        (payload) => callback(payload)
      )
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(channel),
    };
  }
}

export const postService = new PostService();