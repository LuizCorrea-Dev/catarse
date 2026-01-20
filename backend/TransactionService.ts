
import { supabase } from './supabase';

export interface TransactionResult {
  success: boolean;
  donorBalance: number;
  authorBalance: number;
  message: string;
}

class TransactionService {
  
  public async processPostCreationVibe(userId: string): Promise<{ newBalance: number }> {
    const { data, error } = await supabase.rpc('mine_vibe');
    if (error) {
        console.error("Erro na mineração:", error);
        return { newBalance: 0 };
    }
    return { newBalance: (data as any).new_balance };
  }

  // ATUALIZADO: Suporta 'type' para diferenciar post_id de comment_id
  public async processLikeTransaction(targetId: string, donorId: string, authorId: string, type: 'post' | 'comment' = 'post'): Promise<TransactionResult> {
    const rpcParams: any = {
        recipient_id: authorId,
        amount: 1
    };

    // Mapeia corretamente para o parâmetro SQL esperado pela função transfer_vibe
    if (type === 'post') {
        rpcParams.post_id = targetId;
    } else {
        rpcParams.comment_id = targetId;
    }

    const { data, error } = await supabase.rpc('transfer_vibe', rpcParams);

    if (error) {
        return { success: false, donorBalance: 0, authorBalance: 0, message: error.message };
    }

    const result = data as any;
    if (!result.success) {
        return { success: false, donorBalance: 0, authorBalance: 0, message: result.message };
    }

    return {
      success: true,
      donorBalance: result.new_balance,
      authorBalance: 0,
      message: 'VIBE enviada com sucesso!'
    };
  }

  public async processFollowTransaction(followerId: string, targetId: string): Promise<TransactionResult> {
      // Nota: followerId é ignorado pois a RPC 'follow_user' usa auth.uid() para segurança.
      // Mantemos o argumento para compatibilidade com interface existente.
      
      const { data, error } = await supabase.rpc('follow_user', { target_id: targetId });

      if (error) {
          console.error("Follow error:", JSON.stringify(error));
          return { success: false, donorBalance: 0, authorBalance: 0, message: error.message };
      }

      const result = data as any;
      if (!result.success) {
          return { success: false, donorBalance: 0, authorBalance: 0, message: result.message };
      }

      return {
          success: true,
          donorBalance: result.new_balance,
          authorBalance: 0,
          message: "Você seguiu os passos! 1 Vibe transferida."
      };
  }

  public async processUnfollowTransaction(followerId: string, targetId: string): Promise<TransactionResult> {
      // Nota: followerId é ignorado pois a RPC 'unfollow_user' usa auth.uid() para segurança.
      
      const { data, error } = await supabase.rpc('unfollow_user', { target_id: targetId });
      
      if (error) {
          console.error("Unfollow error:", JSON.stringify(error));
          return { success: false, donorBalance: 0, authorBalance: 0, message: error.message };
      }

      const result = data as any;
      if (!result.success) {
          return { success: false, donorBalance: 0, authorBalance: 0, message: result.message };
      }
      
      return { 
          success: true, 
          donorBalance: result.new_balance, 
          authorBalance: 0, 
          message: "Vibe restituída." 
      };
  }

  public async processRefund(contentId: string, authorId: string): Promise<number> {
      // Reembolso genérico manual
      const { data: { user } } = await supabase.auth.getUser();
      if(user) return await this.getBalance(user.id);
      return 0;
  }

  public async processCommentTransaction(postId: string, commentatorId: string, authorId: string, text: string): Promise<TransactionResult> {
    if (text.length < 5) return { success: false, donorBalance: 0, authorBalance: 0, message: "Comentário muito curto." };

    // Taxa de comentário (vai para o autor do post), sem criar registro na tabela likes (apenas transferência financeira)
    const { data, error } = await supabase.rpc('transfer_vibe', {
        recipient_id: authorId,
        amount: 1
    });

    if (error || !(data as any).success) {
        return { success: false, donorBalance: 0, authorBalance: 0, message: (data as any)?.message || "Saldo insuficiente." };
    }

    return {
      success: true,
      donorBalance: (data as any).new_balance,
      authorBalance: 0,
      message: 'Comentário publicado! 1 VIBE transferida.'
    };
  }
  
  public async processCommentRefund(commentId: string, commentatorId: string): Promise<number> {
      return this.getBalance('current_user');
  }

  public async getBalance(userId: string): Promise<number> {
    if (userId === 'current_user') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;
        userId = user.id;
    }
    const { data } = await supabase.from('profiles').select('vibes').eq('id', userId).single();
    return data?.vibes || 0;
  }

  public hasLiked(postId: string, userId: string): boolean {
    return false; // Controle de UI deve vir do carregamento do post via PostService
  }
}

export const transactionService = new TransactionService();
