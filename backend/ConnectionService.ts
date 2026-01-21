import { supabase } from "./supabase";

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "offline" | "busy";
  friendshipStatus?: "none" | "pending_sent" | "pending_received" | "accepted";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isCloseFriend?: boolean;
  isFollowing?: boolean;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "video" | "audio" | "promotion_request";
  mediaUrl?: string;
  timestamp: string;
  isRead: boolean;
}

class ConnectionService {
  // =================================================================
  // SEGUIDORES (Followers - Unidirecional)
  // =================================================================

  public async getFollowState(targetId: string): Promise<boolean> {
    if (targetId === "current_user") return false;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("followers")
      .select("*")
      .eq("follower_id", user.id)
      .eq("followed_id", targetId)
      .single();
    return !!data;
  }

  public async getFollowers(targetUserId?: string): Promise<Friend[]> {
    let userId = targetUserId;
    let currentUserId = "";

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) currentUserId = user.id;

    if (!userId || userId === "current_user") {
      if (!user) return [];
      userId = user.id;
    }

    const { data, error } = await supabase
      .from("followers")
      .select("follower_id, profiles!follower_id(id, username, avatar_url)")
      .eq("followed_id", userId);

    if (error || !data) return [];

    let myFollowingIds = new Set<string>();
    if (currentUserId) {
      const { data: myFollowing } = await supabase
        .from("followers")
        .select("followed_id")
        .eq("follower_id", currentUserId);
      myFollowing?.forEach((f: any) => myFollowingIds.add(f.followed_id));
    }

    return data.map((row: any) => ({
      id: row.profiles.id,
      name: row.profiles.username || "Usuário",
      avatar: row.profiles.avatar_url || "",
      status: "offline",
      unreadCount: 0,
      isFollowing: myFollowingIds.has(row.profiles.id),
    }));
  }

  public async getFollowing(targetUserId?: string): Promise<Friend[]> {
    let userId = targetUserId;
    let currentUserId = "";

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) currentUserId = user.id;

    if (!userId || userId === "current_user") {
      if (!user) return [];
      userId = user.id;
    }

    const { data, error } = await supabase
      .from("followers")
      .select("followed_id, profiles!followed_id(id, username, avatar_url)")
      .eq("follower_id", userId);

    if (error || !data) return [];

    const enrichedList = await Promise.all(
      data.map(async (row: any) => {
        let fStatus: "none" | "pending_sent" | "pending_received" | "accepted" =
          "none";

        if (currentUserId) {
          fStatus = await this.getFriendshipStatusWithUser(
            currentUserId,
            row.profiles.id,
          );
        }

        return {
          id: row.profiles.id,
          name: row.profiles.username || "Usuário",
          avatar: row.profiles.avatar_url || "",
          status: "offline" as "offline",
          unreadCount: 0,
          isFollowing: true,
          friendshipStatus: fStatus,
        };
      }),
    );

    return enrichedList;
  }

  private async getFriendshipStatusWithUser(
    myId: string,
    targetId: string,
  ): Promise<"none" | "pending_sent" | "pending_received" | "accepted"> {
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(
        `and(requester_id.eq.${myId},receiver_id.eq.${targetId}),and(requester_id.eq.${targetId},receiver_id.eq.${myId})`,
      )
      .single();

    if (!data) return "none";
    if (data.status === "accepted") return "accepted";
    if (data.requester_id === myId) return "pending_sent";
    return "pending_received";
  }

  // =================================================================
  // AMIZADES (Friendships - Bidirecional)
  // =================================================================

  public async getFriendshipStatus(
    targetId: string,
  ): Promise<"none" | "pending_sent" | "pending_received" | "accepted"> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || targetId === "current_user") return "none";
    return this.getFriendshipStatusWithUser(user.id, targetId);
  }

  public async getFriends(targetUserId?: string): Promise<Friend[]> {
    let userId = targetUserId;
    if (!userId || userId === "current_user") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      userId = user.id;
    }

    const { data, error } = await supabase
      .from("friendships")
      .select(
        `
            requester_id, receiver_id, 
            is_close_friend_requester, is_close_friend_receiver,
            requester:profiles!requester_id(id, username, avatar_url),
            receiver:profiles!receiver_id(id, username, avatar_url)
        `,
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error || !data) return [];

    return data.map((row: any) => {
      const isRequester = row.requester_id === userId;
      const friendProfile = isRequester ? row.receiver : row.requester;
      const isClose = isRequester
        ? row.is_close_friend_requester
        : row.is_close_friend_receiver;

      return {
        id: friendProfile.id,
        name: friendProfile.username || "Usuário",
        avatar: friendProfile.avatar_url || "",
        status: "online", // Mocked status
        friendshipStatus: "accepted",
        lastMessage: "",
        unreadCount: 0,
        isCloseFriend: isClose,
      };
    });
  }

  public async getPendingRequests(targetUserId?: string): Promise<Friend[]> {
    let userId = targetUserId;
    if (!userId || userId === "current_user") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      userId = user.id;
    }

    const { data, error } = await supabase
      .from("friendships")
      .select(
        `
              requester_id, 
              requester:profiles!requester_id(id, username, avatar_url)
          `,
      )
      .eq("receiver_id", userId)
      .eq("status", "pending");

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.requester.id,
      name: row.requester.username || "Usuário",
      avatar: row.requester.avatar_url || "",
      status: "online",
      friendshipStatus: "pending_received",
      unreadCount: 0,
    }));
  }

  public async requestFriendship(
    targetId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.rpc("request_friendship", {
      target_id: targetId,
    });
    if (error) return { success: false, message: error.message };
    return { success: (data as any).success, message: (data as any).message };
  }

  public async acceptFriendship(requesterId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("requester_id", requesterId)
      .eq("receiver_id", user.id);

    return !error;
  }

  // =================================================================
  // CHAT / MENSAGENS
  // =================================================================

  public async getConversations(): Promise<Friend[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("private_messages")
      .select("sender_id, receiver_id, content, created_at, is_read")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!data) return [];

    const conversationMap = new Map<string, Friend>();

    for (const msg of data) {
      const otherId =
        msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

      if (!conversationMap.has(otherId)) {
        // Fetch profile details (inefficient inside loop, but MVP OK)
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", otherId)
          .single();

        conversationMap.set(otherId, {
          id: otherId,
          name: profile?.username || "Usuário",
          avatar: profile?.avatar_url || "",
          status: "offline",
          lastMessage: msg.content,
          lastMessageTime: new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          unreadCount: msg.receiver_id === user.id && !msg.is_read ? 1 : 0,
        });
      } else {
        const existing = conversationMap.get(otherId)!;
        if (msg.receiver_id === user.id && !msg.is_read) {
          existing.unreadCount += 1;
        }
      }
    }

    return Array.from(conversationMap.values());
  }

  public async getMessages(friendId: string): Promise<PrivateMessage[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("private_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`,
      )
      .order("created_at", { ascending: true });

    if (!data) return [];

    return data.map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      content: m.content,
      type: m.type,
      mediaUrl: m.media_url,
      timestamp: new Date(m.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isRead: m.is_read,
    }));
  }

  public async sendMessage(
    friendId: string,
    content: string,
    type: "text" | "image" | "video" | "audio" | "promotion_request" = "text",
    mediaUrl?: string,
  ): Promise<PrivateMessage> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    const { data, error } = await supabase
      .from("private_messages")
      .insert({
        sender_id: user.id,
        receiver_id: friendId,
        content,
        type,
        media_url: mediaUrl,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      senderId: data.sender_id,
      content: data.content,
      type: data.type,
      mediaUrl: data.media_url,
      timestamp: new Date(data.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isRead: data.is_read,
    };
  }

  public async markMessagesAsRead(friendId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("private_messages")
      .update({ is_read: true })
      .eq("sender_id", friendId)
      .eq("receiver_id", user.id);
  }

  public async getGlobalNotificationCount(): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count } = await supabase
      .from("private_messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    return count || 0;
  }

  public async toggleCloseFriend(friendId: string): Promise<boolean> {
    return true;
  }
}

export const connectionService = new ConnectionService();
