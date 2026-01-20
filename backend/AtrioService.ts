
import { supabase } from './supabase';

export interface AtrioItem {
  id: any; 
  dbId?: string; 
  authorId: string;
  authorName?: string; 
  authorAvatar?: string; 
  title: string;
  url: string;
  color: string;
  description: string;
  vibes: number;
}

export interface AtrioList {
    id: string;
    name: string;
    description?: string;
    tags?: string[]; // UI expects string array
    itemIds: any[];
    coverUrl?: string; 
    createdAt: string;
}

class AtrioService {
  
  public async getItems(): Promise<AtrioItem[]> {
    const { data, error } = await supabase
        .from('atrio_items')
        .select('*, profiles(username, avatar_url)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar Atrio:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.id,
        dbId: item.id,
        authorId: item.user_id,
        authorName: item.profiles?.username || 'Artista',
        authorAvatar: item.profiles?.avatar_url || '',
        title: item.title,
        url: item.url,
        color: item.color || 'bg-emerald-500',
        description: item.description,
        vibes: item.vibes_count || 0
    }));
  }

  public async getItemsByIds(ids: string[]): Promise<AtrioItem[]> {
      if (!ids || ids.length === 0) return [];

      const { data, error } = await supabase
        .from('atrio_items')
        .select('*, profiles(username, avatar_url)')
        .in('id', ids);
      
      if (error) return [];

      return data.map((item: any) => ({
        id: item.id,
        dbId: item.id,
        authorId: item.user_id,
        authorName: item.profiles?.username,
        authorAvatar: item.profiles?.avatar_url,
        title: item.title,
        url: item.url,
        color: item.color,
        description: item.description,
        vibes: item.vibes_count
      }));
  }

  public async getUserItems(userId: string): Promise<AtrioItem[]> {
    if (userId === 'current_user') {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return [];
        userId = user.id;
    }

    const { data, error } = await supabase
        .from('atrio_items')
        .select('*, profiles(username, avatar_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
    if (error) return [];

    return data.map((item: any) => ({
        id: item.id,
        dbId: item.id,
        authorId: item.user_id,
        authorName: item.profiles?.username,
        authorAvatar: item.profiles?.avatar_url,
        title: item.title,
        url: item.url,
        color: item.color,
        description: item.description,
        vibes: item.vibes_count
    }));
  }

  public async addItem(item: Omit<AtrioItem, 'id' | 'vibes' | 'authorId'>): Promise<AtrioItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não logado");

    const { data, error } = await supabase
        .from('atrio_items')
        .insert({
            user_id: user.id,
            title: item.title,
            description: item.description,
            url: item.url,
            color: item.color
        })
        .select('*, profiles(username, avatar_url)')
        .single();

    if (error) throw error;

    return {
        id: data.id,
        dbId: data.id,
        authorId: data.user_id,
        authorName: data.profiles?.username,
        authorAvatar: data.profiles?.avatar_url,
        title: data.title,
        url: data.url,
        color: data.color,
        description: data.description,
        vibes: 0
    };
  }

  public async updateItem(id: any, updates: Partial<AtrioItem>): Promise<AtrioItem | null> {
      const { data, error } = await supabase
        .from('atrio_items')
        .update({
            title: updates.title,
            description: updates.description,
            url: updates.url
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error || !data) return null;
      return data;
  }

  public async deleteItem(id: any): Promise<boolean> {
      const { error } = await supabase.from('atrio_items').delete().eq('id', id);
      return !error;
  }

  public async getLists(): Promise<AtrioList[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('atrio_lists')
        .select(`
            *,
            atrio_list_items (
                item_id,
                atrio_items ( url ) 
            )
        `)
        .eq('user_id', user.id);
    
    if (error) return [];

    return data.map((l: any) => {
        const items = l.atrio_list_items || [];
        const itemIds = items.map((i: any) => i.item_id);
        
        const lastItem = items.length > 0 ? items[items.length - 1] : null;
        const coverUrl = lastItem?.atrio_items?.url;

        // Parse tags specifically to handle text column
        let safeTags: string[] = [];
        if (l.tags) {
            if (Array.isArray(l.tags)) {
                // If by any chance it comes as array (Postgres array type)
                safeTags = l.tags.map(String);
            } else if (typeof l.tags === 'string') {
                // Handle text column
                let raw = l.tags;
                
                // If it was saved as JSON string representation of array (e.g. '["vai"]')
                if (raw.trim().startsWith('[') && raw.trim().endsWith(']')) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) {
                            safeTags = parsed.map(String);
                        }
                    } catch (e) {
                        // Fallback simple clean
                        safeTags = raw.replace(/[\[\]"]/g, '').split(',').map(t => t.trim()).filter(t => t.length > 0);
                    }
                } else {
                    // Standard comma separated string (e.g. "tag1, tag2")
                    safeTags = raw.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
                }
            }
        }

        return {
            id: l.id,
            name: l.name,
            description: l.description,
            tags: safeTags,
            itemIds: itemIds,
            coverUrl: coverUrl,
            createdAt: l.created_at
        };
    });
  }

  public async createList(name: string, description?: string, tags?: string[]): Promise<AtrioList> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");

      // Convert array to simple comma separated string for TEXT column
      // This ensures '["tag"]' issue is resolved by sending "tag"
      const tagsString = tags && tags.length > 0 ? tags.join(', ') : null;

      const { data, error } = await supabase.from('atrio_lists').insert({
          user_id: user.id,
          name,
          description,
          tags: tagsString // Sending string, not array
      }).select().single();

      if (error) throw error;

      return {
          id: data.id,
          name: data.name,
          description: data.description,
          tags: tags || [], // Return original array for immediate UI update
          itemIds: [],
          createdAt: data.created_at
      };
  }

  public async updateList(id: string, updates: { name?: string, description?: string, tags?: string[] }): Promise<void> {
      const payload: any = { ...updates };
      
      // Convert tags array to string if present
      if (updates.tags) {
          payload.tags = updates.tags.join(', ');
      }

      await supabase.from('atrio_lists').update(payload).eq('id', id);
  }

  public async deleteList(id: string): Promise<void> {
      await supabase.from('atrio_lists').delete().eq('id', id);
  }

  public async addItemToList(listId: string, itemId: any): Promise<void> {
      await supabase.from('atrio_list_items').insert({
          list_id: listId,
          item_id: itemId
      });
  }

  public async removeItemFromList(listId: string, itemId: any): Promise<void> {
      await supabase.from('atrio_list_items').delete().match({
          list_id: listId,
          item_id: itemId
      });
  }

  public isSavedAnywhere(itemId: any): boolean {
      return false; 
  }
  
  public getListsContainingItem(itemId: any): string[] {
      return [];
  }
}

export const atrioService = new AtrioService();
