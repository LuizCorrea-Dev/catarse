import { supabase } from "./supabase";
import { connectionService } from "./ConnectionService";

export type ChannelType = "FEED" | "CHAT" | "VOICE";
export type PrivacyType = "PUBLIC" | "PRIVATE";
export type RoleType =
  | "OWNER"
  | "MODERATOR"
  | "MEMBER"
  | "PENDING"
  | "REJECTED";

export interface Channel {
  id: string;
  communityId: string;
  name: string;
  type: ChannelType;
  isPrivate: boolean;
  hasUnread?: boolean;
}

export interface CommunityMember {
  userId: string;
  name: string;
  avatar: string;
  role: RoleType;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  bannerUrl: string;
  avatarUrl: string;
  privacy: PrivacyType;
  memberCount: number;
  tags: string[];
  isMember?: boolean;
  currentUserRole: RoleType | null;
  isMuted?: boolean;
  isSuspended?: boolean;
  welcomeMessage?: string;
  bannedUsers?: string[];
}

export interface CommunityMessage {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  mediaUrl?: string;
  timestamp: string;
  vibes: number;
  type: "text" | "image";
}

class CommunityService {
  public async getCommunities(query?: string): Promise<Community[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let dbQuery = supabase
      .from("communities")
      .select(`*`)
      .order("created_at", { ascending: false });

    if (query) {
      dbQuery = dbQuery.ilike("name", `%${query}%`);
    }

    const { data: communities, error } = await dbQuery;

    if (error || !communities) {
      console.error("Erro ao buscar comunidades:", error);
      return [];
    }

    const myRoles = new Map<string, RoleType>();

    if (user) {
      const { data: myMemberships } = await supabase
        .from("community_members")
        .select("community_id, role")
        .eq("user_id", user.id);

      myMemberships?.forEach((m: any) => myRoles.set(m.community_id, m.role));
    }

    const result = await Promise.all(
      communities.map(async (row: any) => {
        const userRole = myRoles.get(row.id) || null;

        if (row.is_suspended) {
          if (userRole !== "OWNER" && userRole !== "MODERATOR") {
            return null;
          }
        }

        const isMember =
          userRole === "OWNER" ||
          userRole === "MODERATOR" ||
          userRole === "MEMBER";

        const { count } = await supabase
          .from("community_members")
          .select("*", { count: "exact", head: true })
          .eq("community_id", row.id)
          .neq("role", "PENDING")
          .neq("role", "REJECTED");

        const fallbackSeed = row.id.replace(/-/g, "");

        return {
          id: row.id,
          name: row.name,
          description: row.description,
          bannerUrl:
            row.banner_url ||
            `https://picsum.photos/seed/${fallbackSeed}/800/300`,
          avatarUrl:
            row.avatar_url || `https://picsum.photos/seed/${fallbackSeed}/200`,
          privacy: row.privacy,
          memberCount: count || 0,
          tags: row.tags || [],
          isMember: isMember,
          currentUserRole: userRole,
          isSuspended: row.is_suspended,
        };
      }),
    );

    const filteredResult = result.filter((c): c is Community => c !== null);

    const rolePriority: Record<string, number> = {
      OWNER: 3,
      MODERATOR: 2,
      MEMBER: 1,
    };

    return filteredResult.sort((a, b) => {
      const priorityA = rolePriority[a.currentUserRole as string] || 0;
      const priorityB = rolePriority[b.currentUserRole as string] || 0;
      return priorityB - priorityA;
    });
  }

  public async getUserCommunities(userId: string): Promise<Community[]> {
    if (userId === "current_user") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      userId = user.id;
    }

    const { data, error } = await supabase
      .from("community_members")
      .select("role, communities(*)")
      .eq("user_id", userId)
      .neq("role", "PENDING")
      .neq("role", "REJECTED");

    if (error) return [];

    return data
      .map((row: any) => {
        const comm = row.communities;
        if (!comm) return null;

        if (comm.is_suspended && row.role === "MEMBER") {
          return null;
        }

        const fallbackSeed = comm.id.replace(/-/g, "");

        return {
          id: comm.id,
          name: comm.name,
          description: comm.description,
          bannerUrl:
            comm.banner_url ||
            `https://picsum.photos/seed/${fallbackSeed}/800/300`,
          avatarUrl:
            comm.avatar_url || `https://picsum.photos/seed/${fallbackSeed}/200`,
          privacy: comm.privacy,
          memberCount: 0,
          tags: comm.tags || [],
          isMember: true,
          currentUserRole: row.role,
          isMuted: false,
          isSuspended: comm.is_suspended,
        };
      })
      .filter((c: any) => c !== null) as Community[];
  }

  public async getCommunityById(id: string): Promise<Community | undefined> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return undefined;

    let role: RoleType | null = null;
    let isMember = false;

    if (user) {
      const { data: memberData } = await supabase
        .from("community_members")
        .select("role")
        .eq("community_id", id)
        .eq("user_id", user.id)
        .single();

      if (memberData) {
        role = memberData.role as RoleType;
        isMember =
          role === "OWNER" || role === "MODERATOR" || role === "MEMBER";
      }
    }

    if (data.is_suspended) {
      if (role !== "OWNER" && role !== "MODERATOR") {
        return undefined;
      }
    }

    const { count } = await supabase
      .from("community_members")
      .select("*", { count: "exact", head: true })
      .eq("community_id", id)
      .neq("role", "PENDING")
      .neq("role", "REJECTED");

    const fallbackSeed = data.id.replace(/-/g, "");

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      bannerUrl:
        data.banner_url || `https://picsum.photos/seed/${fallbackSeed}/800/300`,
      avatarUrl:
        data.avatar_url || `https://picsum.photos/seed/${fallbackSeed}/200`,
      privacy: data.privacy,
      memberCount: count || 0,
      tags: data.tags || [],
      isMember,
      currentUserRole: role,
      isSuspended: data.is_suspended,
      welcomeMessage: data.welcome_message,
    };
  }

  public async createCommunity(data: {
    name: string;
    description: string;
    privacy: PrivacyType;
    tags: string[];
  }): Promise<Community> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User required");

    const seedBanner = Math.floor(Math.random() * 10000000).toString();
    const seedAvatar = Math.floor(Math.random() * 10000000).toString();

    const { data: comm, error } = await supabase
      .from("communities")
      .insert({
        name: data.name,
        description: data.description,
        privacy: data.privacy,
        tags: data.tags,
        owner_id: user.id,
        banner_url: `https://picsum.photos/seed/${seedBanner}/800/300`,
        avatar_url: `https://picsum.photos/seed/${seedAvatar}/200`,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("community_members").insert({
      community_id: comm.id,
      user_id: user.id,
      role: "OWNER",
    });

    await supabase.from("channels").insert([
      { community_id: comm.id, name: "Mural de Avisos", type: "FEED" },
      { community_id: comm.id, name: "Geral", type: "CHAT" },
      { community_id: comm.id, name: "Voz", type: "VOICE" },
    ]);

    return {
      id: comm.id,
      name: comm.name,
      description: comm.description,
      bannerUrl: comm.banner_url,
      avatarUrl: comm.avatar_url,
      privacy: comm.privacy,
      memberCount: 1,
      tags: comm.tags,
      isMember: true,
      currentUserRole: "OWNER",
    };
  }

  private async sendWelcomeMessage(communityId: string, userId: string) {
    const { data: comm } = await supabase
      .from("communities")
      .select("owner_id, name, welcome_message")
      .eq("id", communityId)
      .single();

    if (comm && comm.welcome_message && comm.owner_id) {
      if (comm.owner_id !== userId) {
        await supabase.from("private_messages").insert({
          sender_id: comm.owner_id,
          receiver_id: userId,
          content: `[${comm.name}] ${comm.welcome_message}`,
          type: "text",
          is_read: false,
        });
      }
    }
  }

  private async notifyStaffOnJoin(communityId: string, newMemberId: string) {
    const { data: comm } = await supabase
      .from("communities")
      .select("name, owner_id")
      .eq("id", communityId)
      .single();
    if (!comm) return;

    const { data: mods } = await supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", communityId)
      .eq("role", "MODERATOR");

    const staffIds = new Set<string>();
    if (comm.owner_id) staffIds.add(comm.owner_id);
    mods?.forEach((m: any) => staffIds.add(m.user_id));
    staffIds.delete(newMemberId);

    if (staffIds.size === 0) return;

    const notifications = Array.from(staffIds).map((staffId) => ({
      sender_id: newMemberId,
      receiver_id: staffId,
      content: `Ingressou no grupo ${comm.name}.`,
      type: "text",
      is_read: false,
    }));

    if (notifications.length > 0) {
      await supabase.from("private_messages").insert(notifications);
    }
  }

  public async joinCommunity(
    communityId: string,
  ): Promise<{ success: boolean; role: RoleType }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, role: "MEMBER" };

    const { data: comm } = await supabase
      .from("communities")
      .select("privacy")
      .eq("id", communityId)
      .single();
    if (!comm) return { success: false, role: "MEMBER" };

    const initialRole: RoleType =
      comm.privacy === "PRIVATE" ? "PENDING" : "MEMBER";

    const { data: existing } = await supabase
      .from("community_members")
      .select("role")
      .match({ community_id: communityId, user_id: user.id })
      .single();

    if (existing) {
      const { error } = await supabase
        .from("community_members")
        .update({ role: initialRole })
        .match({ community_id: communityId, user_id: user.id });
      if (!error && initialRole === "MEMBER") {
        await this.sendWelcomeMessage(communityId, user.id);
        await this.notifyStaffOnJoin(communityId, user.id);
      }
      return { success: !error, role: initialRole };
    } else {
      const { error } = await supabase
        .from("community_members")
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: initialRole,
        });
      if (!error && initialRole === "MEMBER") {
        await this.sendWelcomeMessage(communityId, user.id);
        await this.notifyStaffOnJoin(communityId, user.id);
      }
      return { success: !error, role: initialRole };
    }
  }

  public async leaveCommunity(communityId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: member } = await supabase
      .from("community_members")
      .select("role")
      .match({ community_id: communityId, user_id: user.id })
      .single();
    if (member?.role === "OWNER") return false;
    const { error } = await supabase
      .from("community_members")
      .delete()
      .match({ community_id: communityId, user_id: user.id });
    return !error;
  }

  public async deleteCommunity(communityId: string): Promise<boolean> {
    const { error } = await supabase
      .from("communities")
      .delete()
      .eq("id", communityId);
    return !error;
  }

  public async getChannels(communityId: string): Promise<Channel[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("channels")
      .select("*")
      .eq("community_id", communityId)
      .order("created_at", { ascending: true });
    let userReads: any[] = [];
    if (user) {
      const { data: reads } = await supabase
        .from("user_channel_reads")
        .select("channel_id, last_read_at")
        .eq("user_id", user.id);
      userReads = reads || [];
    }
    const readMap = new Map();
    userReads.forEach((r: any) =>
      readMap.set(r.channel_id, new Date(r.last_read_at).getTime()),
    );
    return (data || []).map((c: any) => {
      const lastActivity = c.last_activity_at
        ? new Date(c.last_activity_at).getTime()
        : 0;
      const lastRead = readMap.get(c.id) || 0;
      return {
        id: c.id,
        communityId: c.community_id,
        name: c.name,
        type: c.type,
        isPrivate: c.is_private,
        hasUnread: lastActivity > lastRead,
      };
    });
  }

  public async markChannelAsRead(channelId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("user_channel_reads")
      .upsert({
        user_id: user.id,
        channel_id: channelId,
        last_read_at: new Date().toISOString(),
      });
  }

  public async getMessages(channelId: string): Promise<CommunityMessage[]> {
    const { data } = await supabase
      .from("channel_messages")
      .select("*, profiles(username, avatar_url)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });
    return (data || []).map((m: any) => ({
      id: m.id,
      channelId: m.channel_id,
      userId: m.user_id,
      userName: m.profiles?.username || "Usuário",
      userAvatar: m.profiles?.avatar_url || "",
      content: m.content,
      mediaUrl: m.media_url,
      timestamp: new Date(m.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      vibes: m.vibes_count,
      type: m.type,
    }));
  }

  public async sendMessage(
    channelId: string,
    content: string,
    mediaUrl?: string,
  ): Promise<CommunityMessage> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");
    const { data, error } = await supabase
      .from("channel_messages")
      .insert({
        channel_id: channelId,
        user_id: user.id,
        content,
        media_url: mediaUrl,
        type: mediaUrl ? "image" : "text",
      })
      .select("*, profiles(username, avatar_url)")
      .single();
    if (error) throw error;
    await this.markChannelAsRead(channelId);
    return {
      id: data.id,
      channelId: data.channel_id,
      userId: data.user_id,
      userName: data.profiles?.username,
      userAvatar: data.profiles?.avatar_url,
      content: data.content,
      mediaUrl: data.media_url,
      timestamp: new Date(data.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      vibes: 0,
      type: data.type,
    };
  }

  public async deleteMessage(
    channelId: string,
    messageId: string,
  ): Promise<boolean> {
    const { error } = await supabase
      .from("channel_messages")
      .delete()
      .eq("id", messageId);
    return !error;
  }

  public async getMembers(id: string) {
    const { data } = await supabase
      .from("community_members")
      .select("*, profiles(username, avatar_url)")
      .eq("community_id", id);
    return (data || []).map((m: any) => ({
      userId: m.user_id,
      name: m.profiles?.username,
      avatar: m.profiles?.avatar_url,
      role: m.role,
    }));
  }

  public async approveAccess(
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    const { error } = await supabase
      .from("community_members")
      .update({ role: "MEMBER" })
      .match({ community_id: communityId, user_id: userId });
    if (!error) {
      await this.sendWelcomeMessage(communityId, userId);
      await this.notifyStaffOnJoin(communityId, userId);
    }
    return !error;
  }

  public async rejectAccess(
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    const { error } = await supabase
      .from("community_members")
      .update({ role: "REJECTED" })
      .match({ community_id: communityId, user_id: userId });
    return !error;
  }

  public async undoRejectAccess(
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    const { error } = await supabase
      .from("community_members")
      .update({ role: "PENDING" })
      .match({ community_id: communityId, user_id: userId });
    return !error;
  }

  public async updateMemberRole(
    communityId: string,
    userId: string,
    newRole: RoleType,
  ): Promise<{ success: boolean; message: string }> {
    if (newRole === "MODERATOR") {
      const { data: comm } = await supabase
        .from("communities")
        .select("name")
        .eq("id", communityId)
        .single();
      const communityName = comm?.name || "Grupo";
      const promotionPayload = JSON.stringify({
        text: `Você aceita ser moderador do grupo ${communityName}?`,
        communityId: communityId,
        communityName: communityName,
        action: "promote_mod",
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await connectionService.sendMessage(
        userId,
        promotionPayload,
        "promotion_request",
      );
      if (user) {
        const { data: recipient } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .single();
        const recipientName = recipient?.username || "o usuário";
        await supabase
          .from("private_messages")
          .insert({
            sender_id: user.id,
            receiver_id: userId,
            content: `Convite de moderação enviado para ${recipientName}. Aguardando aprovação...`,
            type: "promotion_request",
            is_read: true,
          });
      }
      return { success: true, message: "invitation_sent" };
    }
    const { error } = await supabase
      .from("community_members")
      .update({ role: newRole })
      .match({ community_id: communityId, user_id: userId });
    return { success: !error, message: !error ? "updated" : "error" };
  }

  public async acceptModeration(
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    let uid = userId;
    if (userId === "current_user") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      uid = user.id;
    }
    const { error } = await supabase
      .from("community_members")
      .update({ role: "MODERATOR" })
      .match({ community_id: communityId, user_id: uid });
    if (error) return false;
    const { data: comm } = await supabase
      .from("communities")
      .select("owner_id, name")
      .eq("id", communityId)
      .single();
    if (comm && comm.owner_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", uid)
        .single();
      const userName = profile?.username || "Um usuário";
      await connectionService.sendMessage(
        comm.owner_id,
        `${userName} aceitou seu convite para ser moderador da comunidade ${comm.name}.`,
        "text",
      );
    }
    return true;
  }

  public async kickMember(
    communityId: string,
    userId: string,
  ): Promise<boolean> {
    const { error } = await supabase
      .from("community_members")
      .delete()
      .match({ community_id: communityId, user_id: userId });
    return !error;
  }

  public async updateCommunity(id: string, updates: any) {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.bannerUrl !== undefined)
      updateData.banner_url = updates.bannerUrl;
    if (updates.avatarUrl !== undefined)
      updateData.avatar_url = updates.avatarUrl;
    if (updates.welcomeMessage !== undefined)
      updateData.welcome_message = updates.welcomeMessage;
    if (updates.isSuspended !== undefined)
      updateData.is_suspended = updates.isSuspended;

    await supabase.from("communities").update(updateData).eq("id", id);
  }
}

export const communityService = new CommunityService();
