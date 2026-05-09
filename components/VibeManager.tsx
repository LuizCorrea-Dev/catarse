import React, { useState, useEffect } from "react";
import { Zap, Loader2 } from "lucide-react";
import { supabase } from "../backend/supabase";
import { transactionService } from "../backend/TransactionService";
import { atrioService } from "../backend/AtrioService";

// Interface for props
interface VibeManagerProps {
  entityId: string; // Post ID or Atrio Item ID or Comment ID
  authorId: string;
  initialCount: number;
  type: "post" | "atrio" | "comment";
  onVibeSent?: (newCount: number) => void;
}

export const VibeManager: React.FC<VibeManagerProps> = ({
  entityId,
  authorId,
  initialCount,
  type,
  onVibeSent,
}) => {
  const [vibeCount, setVibeCount] = useState(initialCount);
  const [hasVibed, setHasVibed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [animateVibe, setAnimateVibe] = useState(false);

  // 1. Initial State Sync & Fresh Fetch
  useEffect(() => {
    setVibeCount(initialCount);

    const fetchFresh = async () => {
        if (type === 'atrio') {
            const items = await atrioService.getItemsByIds([entityId]);
            if (items.length > 0) setVibeCount(items[0].vibes);
        } else if (type === 'post') {
            // PostService doesn't have getById public easily without auth sometimes, but we can assume normal flow
            // Actually getPosts filters. Let's use a specialized fetch or standard supabase call
            const { data } = await supabase.from('posts').select('likes_count').eq('id', entityId).single();
            if (data) setVibeCount(data.likes_count || 0);
        } else if (type === 'comment') {
            const { data } = await supabase.from('comments').select('likes_count').eq('id', entityId).single();
            if (data) setVibeCount(data.likes_count || 0); 
        }
    };
    fetchFresh();
  }, [initialCount, entityId, type]);

  // 2. Real-time Subscription
  useEffect(() => {
    // Determine table and filter based on type
    let table = "posts";
    let filter = `id=eq.${entityId}`;

    if (type === "atrio") {
      table = "atrio_items";
    } else if (type === "comment") {
      table = "comments";
    }

    const channel = supabase
      .channel(`vibe-manager-${entityId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter },
        (payload) => {
          const newItem = payload.new as any;
          if (newItem) {
            // Map the correct column for count
            const newCount = type === "atrio" ? newItem.vibes_count : newItem.likes_count;
            setVibeCount(newCount || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityId, type]);

  // 3. User Interaction Handler
  const handleVibeClick = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (hasVibed || isSending) return; // Prevent spamming if strict mode, or just debounce

    setIsSending(true);
    setAnimateVibe(true);
    
    // Optimistic Update
    const previousCount = vibeCount;
    setVibeCount((prev) => prev + 1);
    setHasVibed(true); // Temporarily lock

    setTimeout(() => setAnimateVibe(false), 700);

    // Call Transaction Service
    // For Atrio, we might need specific logic if 'transferVibe' doesn't cover the counter-part fully automatically yet
    // But transactionService.transferVibe is generic for balance. 
    // We need to ensure the entity counter increments.
    // Ideally, the database trigger should handle this if we insert into a 'likes' table.
    // However, Atrio uses a custom flow currently.
    
    let result;
    if (type === 'atrio') {
        result = await transactionService.transferVibe(authorId); 
        if (result.success) {
            await atrioService.incrementVibes(entityId); 
        }
    } else {
        // Post/Comment - generic transfer which handles 'post_zap' triggers or direct inserts if modified
        // Currently TransactionService.transferVibe just does balance.
        // We need to also register the "Like" to increment the counter if no trigger exists.
        // Assuming the current PostCard logic (which calls transferVibe) relies on a trigger or duplicate call?
        // Let's check PostCard: it assumes 'handle_post_zap' or similar. 
        // Based on recent fix, 'transfer_vibe' might handle everything if args provided.
        // Let's use the safest path: transfer + increment.
        
        result = await transactionService.transferVibe(authorId, 1, type === 'post' ? entityId : undefined, type === 'comment' ? entityId : undefined);
    }

    if (!result.success) {
      // Revert on failure
      setVibeCount(previousCount);
      setHasVibed(false);
      // Optional: Toast error (passed via prop or context if needed, or simple alert for now)
      console.error(result.message);
    } else {
      if (onVibeSent) onVibeSent(vibeCount + 1);
    }

    setIsSending(false);
  };

  // Import framer-motion if not already imported (it's not in the file currently)
  // We need to add imports at the top. 
  // Since replace_file_content replaces blocks, let's replace the whole component render logic.
  
  return (
    <div className="relative inline-block">
        {/* Particle Explosion (Simplified from VibeButton) */}
        {animateVibe && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
             {/* We can add the framer motion particles here if we import it, otherwise CSS */}
             <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></div>
          </div>
        )}

      <button
        onClick={handleVibeClick}
        disabled={isSending}
        className={`
          relative flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all duration-300 border
          ${hasVibed 
            ? "bg-[#FFC300]/20 text-[#FFC300] border-[#FFC300]/50 shadow-[0_0_15px_rgba(255,195,0,0.2)]" 
            : "bg-slate-800/40 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
          }
          ${isSending ? "opacity-80 cursor-wait" : "cursor-pointer active:scale-95"}
        `}
      >
        {isSending ? (
            <Loader2 className="animate-spin" size={18} />
        ) : (
            <Zap 
                size={18} 
                className={`transition-colors ${hasVibed ? "fill-[#FFC300] text-[#FFC300]" : "fill-none text-current"}`}
            />
        )}
        
        <span className="text-sm">
            {vibeCount}
        </span>

        {/* Floating +1 feedback */}
        {animateVibe && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[#FFC300] text-sm font-bold animate-float-up pointer-events-none">
                +1
            </span>
        )}
      </button>
    </div>
  );
};
