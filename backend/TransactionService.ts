import { supabase } from "./supabase";

export interface TransactionResult {
  success: boolean;
  newBalance: number;
  message: string;
  dewCollected?: boolean;
}

class TransactionService {
  // --- CONSULTAS ---
  
  public async getBalance(userId: string): Promise<number> {
    const targetId = userId === "current_user" 
      ? (await supabase.auth.getUser()).data.user?.id 
      : userId;

    if (!targetId) return 0;

    const { data } = await supabase
      .from("profiles")
      .select("vibes")
      .eq("id", targetId)
      .single();

    return data?.vibes || 0;
  }

  // --- RECOMPENSAS (REGRAS ATUALIZADAS) ---
  // Processa +1 por postar e tenta +6 de Orvalho Diário.
  /**
   * Processa a recompensa por criar conteúdo (Post, Atrio, Aviso).
   * Inclui a recompensa base (+1) e a tentativa de Orvalho Diário (+6).
   */
  public async processReward(type: 'post' | 'atrio' | 'notice'): Promise<TransactionResult> {
    try {
      let dewCollected = false;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, newBalance: 0, message: "Usuário não autenticado." };

      // 1. Crédito fixo por criação (+1)
      const { error: rewardError } = await supabase.rpc('increment_vibe', { 
        amount_to_add: 1,
        reward_type: `${type}_reward` 
      });

      if (rewardError) console.warn(`Falha ao incrementar vibe de ${type}:`, rewardError.message);

      // 2. Tentativa de Orvalho Diário (+6)
      const { data: dewData, error: dewError } = await supabase.rpc('claim_daily_dew', {
        dew_amount: 6
      });

      if (!dewError && dewData?.success) {
        dewCollected = true;
      }

      const finalBalance = await this.getBalance(user.id);

      return {
        success: true,
        newBalance: finalBalance,
        dewCollected: dewCollected,
        message: dewCollected 
          ? "Sinergia completa! +7 Vibes (Criação + Orvalho)." 
          : "+1 Vibe! A tua voz foi registada."
      };
    } catch (error: any) {
      console.error("Erro no processamento de Vibes:", error);
      return { success: false, newBalance: 0, message: "Erro ao processar recompensas." };
    }
  }

  // Métodos antigos mantidos para compatibilidade ou mapeados para o novo processReward
  public async processPostCreationVibe(userId: string): Promise<TransactionResult> {
    return this.processReward('post');
  }

  public async processAtrioPublicationVibe(): Promise<TransactionResult> {
    return this.processReward('atrio');
  }

  public async processCommunityNoticeVibe(): Promise<TransactionResult> {
    return this.processReward('notice');
  }

  /**
   * Processa o custo de um comentário (Transferência de 1 Vibe do leitor para o autor)
   */
  public async processCommentTransaction(postId: string, donorId: string, authorId: string, content: string): Promise<{ success: boolean; donorBalance: number; message: string }> {
    // Se o autor for o mesmo que o comentador, não há transferência, apenas o post
    if (donorId === authorId) return { success: true, donorBalance: await this.getBalance("current_user"), message: "Comentado!" };
    
    // Transferência de 1 Vibe (Taxa zero de sistema, mas 1 Vibe sai do comentador para o autor)
    const result = await this.transferVibe(authorId, 1);
    
    return {
      success: result.success,
      donorBalance: result.newBalance,
      message: result.success ? "Contribuição enviada (+1 Vibe para o autor)!" : result.message
    };
  }

  /**
   * Reembolso simbólico (não implementado totalmente pois o custo de comentário é taxa zero, 
   * mas o sistema pode querer estornar os zaps recebidos no comentário se ele sumir)
   */
  public async processCommentRefund(commentId: string, commentatorId: string): Promise<number> {
    // No modelo atual, o custo do comentário não é reembolsado (como diz o modal)
    return await this.getBalance("current_user");
  }

  public hasLiked(id: string, userId: string): boolean {
    // Mock local ou consulta rápida - idealmente viria do estado local de 'likes' do post/comentário
    return false;
  }

  // --- TRANSFERÊNCIAS (TAXA ZERO) ---

  // --- TRANSFERÊNCIAS (TAXA ZERO) ---

  public async transferVibe(recipientId: string, amount: number = 1, postId?: string, commentId?: string): Promise<TransactionResult> {
    const { data, error } = await supabase.rpc("transfer_vibe", {
      recipient_id: recipientId,
      amount: amount,
      post_id: postId,
      comment_id: commentId
    });

    if (error) return { success: false, newBalance: 0, message: error.message };

    return {
      success: data.success,
      newBalance: data.new_balance,
      message: data.success ? "Vibe enviada!" : data.message,
    };
  }

  async processLikeTransaction(postId: string, donorId: string, authorId: string) {
    // Uses the standard transfer flow which handles duplicates via SQL logic
    const result = await this.transferVibe(authorId, 1, postId);
    
    return {
        success: result.success,
        donorBalance: result.newBalance,
        message: result.message
    };
  }

  // --- MÉTODOS SOCIAIS ---

  public async processFollow(targetId: string): Promise<TransactionResult> {
    const { data, error } = await supabase.rpc("follow_user", { target_id: targetId });
    if (error) return { success: false, newBalance: 0, message: error.message };
    return { success: true, newBalance: data.new_balance, message: "Seguindo!" };
  }

  public async processUnfollow(targetId: string): Promise<TransactionResult> {
    const { data, error } = await supabase.rpc("unfollow_user", { target_id: targetId });
    if (error) return { success: false, newBalance: 0, message: error.message };
    return { success: true, newBalance: data.new_balance, message: "Vibe restituída." };
  }
}

export const transactionService = new TransactionService();