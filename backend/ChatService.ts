import { supabase } from "./supabase";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  createdAt: string;
  type: "text" | "image" | "audio";
  mediaUrl?: string;
  channelId?: string; // For community channels
  receiverId?: string; // For DMs
}

class ChatService {
  /**
   * Subscribe to messages in a specific community channel
   */
  public subscribeToChannel(
    channelId: string,
    callback: (message: Message) => void
  ) {
    const channel = supabase
      .channel(`channel-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Fetch sender details (Realtime payload doesn't include joins)
          const { data: sender } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", newMessage.user_id)
            .single();

          const formattedMessage: Message = {
            id: newMessage.id,
            senderId: newMessage.user_id,
            senderName: sender?.username || "Unknown",
            senderAvatar: sender?.avatar_url || "",
            content: newMessage.content,
            createdAt: newMessage.created_at,
            type: newMessage.type,
            mediaUrl: newMessage.media_url,
            channelId: newMessage.channel_id,
          };

          callback(formattedMessage);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(channel),
    };
  }

  /**
   * Subscribe to Private Messages (DMs) for the current user
   */
  public subscribeToDMs(
    currentUserId: string,
    callback: (message: Message) => void
  ) {
    const channel = supabase
      .channel(`dms-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `receiver_id=eq.${currentUserId}`, // Listen for incoming messages
        },
        async (payload) => {
          const newMessage = payload.new as any;

          const { data: sender } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", newMessage.sender_id)
            .single();

          const formattedMessage: Message = {
            id: newMessage.id,
            senderId: newMessage.sender_id,
            senderName: sender?.username || "Unknown",
            senderAvatar: sender?.avatar_url || "",
            content: newMessage.content,
            createdAt: newMessage.created_at,
            type: newMessage.type,
            mediaUrl: newMessage.media_url,
            receiverId: newMessage.receiver_id,
          };

          callback(formattedMessage);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(channel),
    };
  }
  
  public async sendMessage(channelId: string, content: string, type: 'text'|'image' = 'text', mediaUrl?: string) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      return await supabase.from('channel_messages').insert({
          channel_id: channelId,
          user_id: user.id,
          content,
          type,
          media_url: mediaUrl
      });
  }
}

export const chatService = new ChatService();
