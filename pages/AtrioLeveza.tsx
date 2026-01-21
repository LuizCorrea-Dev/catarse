import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  X,
  Zap,
  Bookmark,
  Send,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Image as ImageIcon,
  Upload,
  Loader2,
  Hash,
  Check,
  UserPlus,
  UserCheck,
  List,
  Camera,
  MessageCircle,
  Clock,
  CheckCircle,
  Footprints,
  User,
} from "lucide-react";
import { atrioService, AtrioItem, AtrioList } from "../backend/AtrioService";
import { transactionService } from "../backend/TransactionService";
import { connectionService } from "../backend/ConnectionService";
import { supabase } from "../backend/supabase";
import { CreateListModal } from "./UserProfile"; // Import from UserProfile

export interface AtrioModalProps {
  item: AtrioItem;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

const Toast: React.FC<{ message: string; onClose: () => void }> = ({
  message,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] animate-fade-in-down">
      <div className="bg-[#1e293b]/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border border-[#FFC300]/30 flex items-center gap-3">
        <div className="bg-[#FFC300] rounded-full p-1 text-[#1e293b]">
          <Check size={14} strokeWidth={3} />
        </div>
        <span className="font-bold text-sm tracking-wide">{message}</span>
      </div>
    </div>
  );
};

const ZoomViewer: React.FC<{ imageUrl: string; onClose: () => void }> = ({
  imageUrl,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY * 0.001;
    setScale((s) => Math.min(Math.max(0.5, s + delta), 5));
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastPosition.current = { ...position };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: lastPosition.current.x + (e.clientX - dragStart.current.x),
      y: lastPosition.current.y + (e.clientY - dragStart.current.y),
    });
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPosition.current = { ...position };
    } else if (e.touches.length === 2) {
      lastTouchDistance.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x:
          lastPosition.current.x + (e.touches[0].clientX - dragStart.current.x),
        y:
          lastPosition.current.y + (e.touches[0].clientY - dragStart.current.y),
      });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const delta = dist - lastTouchDistance.current;
      setScale((s) => Math.min(Math.max(0.5, s + delta * 0.005), 5));
      lastTouchDistance.current = dist;
    }
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 animate-fade-in overflow-hidden cursor-move"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out will-change-transform"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
      >
        <img
          src={imageUrl}
          className="max-w-none md:max-w-full md:max-h-full object-contain select-none pointer-events-none shadow-2xl"
          alt="Zoom View"
        />
      </div>
      <div className="fixed top-6 right-6 z-[210] flex flex-col gap-3">
        <button
          onClick={onClose}
          className="p-3 bg-white/10 text-white rounded-full hover:bg-red-500/80 backdrop-blur-md transition-all"
        >
          <X size={24} />
        </button>
        <div className="h-px bg-white/20 my-1"></div>
        <button
          onClick={() => setScale((s) => Math.min(s + 0.5, 5))}
          className="p-3 bg-white/10 text-white rounded-full hover:bg-white/30 backdrop-blur-md transition-all"
        >
          <ZoomIn size={24} />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.5))}
          className="p-3 bg-white/10 text-white rounded-full hover:bg-white/30 backdrop-blur-md transition-all"
        >
          <ZoomOut size={24} />
        </button>
        <button
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          }}
          className="p-3 bg-white/10 text-white rounded-full hover:bg-white/30 backdrop-blur-md transition-all"
          title="Resetar"
        >
          <RotateCcw size={20} />
        </button>
      </div>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-xs font-mono backdrop-blur-md pointer-events-none">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};

export const AtrioModal: React.FC<AtrioModalProps> = ({
  item,
  onClose,
  onShowToast,
}) => {
  const navigate = useNavigate();
  const [isZoomed, setIsZoomed] = useState(false);
  const [animateVibe, setAnimateVibe] = useState(false);
  const [hasVibed, setHasVibed] = useState(false);

  // Estados para Salvar/Santuário
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [availableLists, setAvailableLists] = useState<AtrioList[]>([]);
  const [listsContainingItem, setListsContainingItem] = useState<string[]>([]);
  const [animateSave, setAnimateSave] = useState(false);

  // New List State
  const [showCreateListModal, setShowCreateListModal] = useState(false);

  // Estados de Conexão (Separados)
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const [friendshipStatus, setFriendshipStatus] = useState<
    "none" | "pending_sent" | "pending_received" | "accepted"
  >("none");
  const [isFriendLoading, setIsFriendLoading] = useState(false);

  const isAuthor = item.authorId === "current_user";

  useEffect(() => {
    // Carregar status de Seguidor e Amigo
    if (!isAuthor) {
      const loadStatus = async () => {
        const following = await connectionService.getFollowState(item.authorId);
        const friendStatus = await connectionService.getFriendshipStatus(
          item.authorId,
        );
        setIsFollowing(following);
        setFriendshipStatus(friendStatus);
      };
      loadStatus();
    }
  }, [item.authorId, isAuthor]);

  // Carrega listas disponíveis quando abre opções de salvar
  useEffect(() => {
    if (showSaveOptions) {
      const loadLists = async () => {
        const lists = await atrioService.getLists();
        setAvailableLists(lists);

        // Determine if saved in any list by checking fetched lists data
        const containing = lists
          .filter((l) => l.itemIds.includes(item.id))
          .map((l) => l.id);
        setListsContainingItem(containing);
      };
      loadLists();
    }
  }, [showSaveOptions, item.id]);

  useEffect(() => {
    setIsSaved(listsContainingItem.length > 0);
  }, [listsContainingItem]);

  const handleVibeClick = async () => {
    setAnimateVibe(true);
    setTimeout(() => setAnimateVibe(false), 700);

    const res = await transactionService.processDirectDonation(item.authorId);

    if (res.success) {
      setHasVibed(true);
      onShowToast("✨ Vibe enviada com sucesso!");
    } else {
      onShowToast(res.message);
    }
  };

  const handleShareClick = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.description,
          url,
        });
      } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url);
      onShowToast("Link copiado para a área de transferência!");
    }
  };

  const handleSaveMainClick = () => {
    // Always toggle options to allow managing lists.
    if (isSaved && !showSaveOptions) {
      const savedLists = availableLists.filter((l) =>
        listsContainingItem.includes(l.id),
      );
      const listNames = savedLists.map((l) => l.name).join(", ");
      if (listNames) onShowToast(`Salvo em: ${String(listNames)}`);
    }

    setShowSaveOptions(!showSaveOptions);
    setAnimateSave(true);
    setTimeout(() => setAnimateSave(false), 700);
  };

  const toggleList = async (listId: string) => {
    if (listsContainingItem.includes(listId)) {
      // Remove
      await atrioService.removeItemFromList(listId, item.id);
      setListsContainingItem((prev) => prev.filter((id) => id !== listId));
      // Don't close if removing, user might want to select another
    } else {
      // Add
      await atrioService.addItemToList(listId, item.id);
      setListsContainingItem((prev) => [...prev, listId]);
      onShowToast("Salvo!");
      setIsSaved(true); // Ensure icon updates immediately
      setTimeout(() => setShowSaveOptions(false), 500); // Close after adding
    }
  };

  const handleListCreated = async (
    name: string,
    description: string,
    tags: string[],
  ) => {
    // 1. Create List in Supabase
    const newList = await atrioService.createList(name, description, tags);

    // 2. Update Local State
    setAvailableLists((prev) => [...prev, newList]);

    // 3. Add Item to the new list automatically
    await atrioService.addItemToList(newList.id, item.id);
    setListsContainingItem((prev) => [...prev, newList.id]);

    setIsSaved(true);
    onShowToast(`Salvo em: ${String(name)}`);

    setShowCreateListModal(false);
    setShowSaveOptions(false);
  };

  // ... (Follow and Chat handlers remain same) ...
  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowLoading(true);
    if (isFollowing) {
      await transactionService.processUnfollowTransaction(
        "current_user",
        item.authorId,
      );
      setIsFollowing(false);
      onShowToast("Vibe Restituída");
    } else {
      const result = await transactionService.processFollowTransaction(
        "current_user",
        item.authorId,
      );
      if (result.success) {
        setIsFollowing(true);
        onShowToast("Passos Seguidos!");
      } else {
        alert(result.message);
      }
    }
    setIsFollowLoading(false);
  };

  const handleChatOrAddClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (friendshipStatus === "accepted") {
      navigate("/connections");
      return;
    }
    if (friendshipStatus === "none") {
      setIsFriendLoading(true);
      const result = await connectionService.requestFriendship(item.authorId);
      if (result.success) {
        setFriendshipStatus("pending_sent");
        onShowToast("Solicitação de Amizade Enviada!");
      } else {
        alert(result.message);
      }
      setIsFriendLoading(false);
    }
  };

  const goToProfile = () => {
    navigate(`/u/${item.authorId}`);
  };

  if (isZoomed) {
    return (
      <ZoomViewer imageUrl={item.url} onClose={() => setIsZoomed(false)} />
    );
  }

  const actionButtons = (
    <>
      <button
        onClick={handleFollowClick}
        disabled={isFollowLoading}
        className={`px-4 md:px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 flex-1 md:flex-none ${
          isFollowing
            ? "bg-transparent border border-[#50c878] text-[#50c878] hover:bg-[#50c878]/10"
            : "bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b]"
        }`}
      >
        {isFollowLoading ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <>
            <Footprints
              size={18}
              fill={isFollowing ? "currentColor" : "none"}
            />
            {isFollowing ? "Seguindo" : "Seguir Caminho"}
            {!isFollowing && (
              <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px] flex items-center ml-1">
                -1 <Zap size={8} fill="currentColor" />
              </span>
            )}
          </>
        )}
      </button>

      <button
        onClick={handleChatOrAddClick}
        disabled={
          isFriendLoading ||
          friendshipStatus === "pending_sent" ||
          friendshipStatus === "pending_received"
        }
        className={`px-4 md:px-6 py-2.5 rounded-full font-bold text-sm transition-all border flex items-center justify-center gap-2 flex-1 md:flex-none ${
          friendshipStatus === "accepted"
            ? "border-slate-600 text-white hover:bg-slate-800"
            : friendshipStatus === "pending_sent" ||
                friendshipStatus === "pending_received"
              ? "bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6] cursor-default"
              : "border-slate-500 text-slate-300 hover:text-white hover:border-white"
        }`}
      >
        {isFriendLoading ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <>
            {friendshipStatus === "accepted" && <MessageCircle size={18} />}
            {(friendshipStatus === "pending_sent" ||
              friendshipStatus === "pending_received") && (
              <CheckCircle size={18} />
            )}
            {friendshipStatus === "none" && <UserPlus size={18} />}

            {friendshipStatus === "accepted" && "Conversar"}
            {(friendshipStatus === "pending_sent" ||
              friendshipStatus === "pending_received") &&
              "Conectado"}
            {friendshipStatus === "none" && "Conectar"}
          </>
        )}
      </button>
    </>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f172a] animate-fade-in">
      <div className="w-full h-full overflow-y-auto overflow-x-hidden relative scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <button
          onClick={onClose}
          className="fixed top-4 right-4 md:top-8 md:right-8 z-50 p-3 rounded-full bg-black/20 hover:bg-black/50 text-white/80 hover:text-white backdrop-blur-md border border-white/5 transition-all cursor-pointer hover:rotate-90 duration-300"
        >
          <X size={24} />
        </button>

        <div className="sticky top-0 left-0 w-full h-[75vh] z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f172a]/10 to-[#0f172a] z-10 pointer-events-none"></div>
          <img
            src={item.url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-[2s]"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(true);
            }}
            className="absolute bottom-32 right-6 z-50 bg-black/30 hover:bg-[#50c878] text-white p-4 rounded-full backdrop-blur-md border border-white/20 transition-all cursor-pointer hover:scale-110 shadow-xl group"
            title="Zoom Livre"
          >
            <ZoomIn
              size={24}
              className="group-hover:rotate-12 transition-transform"
            />
          </button>
        </div>

        <div className="relative z-10 -mt-24 px-0 pb-32">
          <div className="w-full min-h-[50vh] bg-slate-900/70 backdrop-blur-[40px] border-t border-white/10 rounded-t-[3rem] px-6 py-10 md:p-12 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] transition-all">
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col items-center text-center mb-10">
                <div
                  className={`h-1.5 w-24 rounded-full mb-8 ${item.color} shadow-[0_0_15px_currentColor]`}
                ></div>
                <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight drop-shadow-lg mb-4">
                  {item.title}
                </h2>
                <div className="flex items-center gap-2 text-[#50c878] bg-[#50c878]/10 px-4 py-1.5 rounded-full border border-[#50c878]/20">
                  <Maximize2 size={12} />
                  <span className="uppercase tracking-widest text-[10px] font-bold">
                    Leitura Imersiva
                  </span>
                </div>
              </div>

              <div className="prose prose-invert prose-lg max-w-none text-slate-200 font-light mb-16">
                {item.description.split("\n").map((paragraph, index) => (
                  <p
                    key={index}
                    className="leading-loose text-lg md:text-xl text-justify md:text-left mb-4 last:mb-0 opacity-90 hover:opacity-100 transition-opacity min-h-[1.5rem]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="border-t border-slate-700/50 pt-10 mt-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* CLICKABLE AUTHOR AREA */}
                  <div
                    className="flex items-start gap-4 cursor-pointer group w-full md:w-auto"
                    onClick={goToProfile}
                  >
                    <img
                      src={item.authorAvatar || "https://picsum.photos/100/100"}
                      className="w-16 h-16 rounded-full border-2 border-[#50c878]/30 p-1 group-hover:border-[#50c878] transition-colors shrink-0 object-cover"
                      alt={item.authorName}
                    />
                    <div className="text-left w-full">
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">
                        Criado por
                      </p>
                      <h3 className="text-xl font-bold text-white group-hover:text-[#50c878] transition-colors">
                        {item.authorName || "Artista Anônimo"}
                      </h3>

                      {/* MOBILE BUTTONS - BELOW NAME */}
                      {!isAuthor && (
                        <div className="flex md:hidden items-center gap-3 mt-3 w-full">
                          {actionButtons}
                        </div>
                      )}
                    </div>
                  </div>

                  {isAuthor ? (
                    <div className="flex items-center gap-2 bg-[#FFC300]/20 text-[#FFC300] px-4 py-2 rounded-full border border-[#FFC300]/50 shadow-lg mt-4 md:mt-0 w-fit">
                      <User size={18} fill="currentColor" />
                      <span className="font-bold text-sm tracking-wide">
                        Você é o Criador
                      </span>
                    </div>
                  ) : (
                    /* DESKTOP BUTTONS - RIGHT SIDE */
                    <div className="hidden md:flex items-center gap-3">
                      {actionButtons}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center mt-16 opacity-20">
                <Zap size={32} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-auto animate-fade-in-up">
        <div className="flex items-center gap-1 p-2 bg-[#0f172a]/60 backdrop-blur-xl rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/5 relative">
          <button
            onClick={handleVibeClick}
            disabled={hasVibed}
            className={`bubbly-button group relative flex items-center gap-3 px-8 py-4 rounded-full transition-all active:scale-95 cursor-pointer border 
                ${
                  hasVibed
                    ? "bg-[#FFC300]/20 text-[#FFC300] border-[#FFC300]/40 cursor-default"
                    : "bg-[#FFC300]/10 text-slate-300 hover:text-[#FFC300] border-[#FFC300]/20 hover:border-[#FFC300]/40"
                } 
                ${animateVibe ? "animate" : ""}
             `}
          >
            <Zap
              size={24}
              className={`transition-all ${animateVibe ? "scale-125" : ""}`}
              fill={hasVibed ? "currentColor" : "none"}
            />
            <span
              className={`font-bold text-base tracking-wide hidden md:inline ${hasVibed ? "text-[#FFC300]" : ""}`}
            >
              {hasVibed ? "Vibe Enviada!" : "Vibe"}
            </span>
            {!hasVibed && (
              <span className="bg-[#1e293b] text-[#FFC300] px-1.5 py-0.5 rounded text-[10px] flex items-center font-mono absolute -top-2 -right-2 border border-[#FFC300]/30 shadow-lg">
                -1
              </span>
            )}
          </button>

          <div className="w-px h-8 bg-white/10 mx-2"></div>

          <div className="relative">
            {showSaveOptions && (
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-[#1e293b] rounded-2xl border border-[#FFC300]/30 shadow-2xl p-2 animate-scale-up">
                <div className="text-center pb-2 border-b border-white/5 mb-2">
                  <span className="text-[10px] uppercase font-bold text-[#FFC300] tracking-widest">
                    {isSaved ? "Salvo no Santuário" : "Salvar no Santuário"}
                  </span>
                </div>

                {/* CREATE NEW LIST BUTTON (Opens Modal) */}
                <div className="mb-2 px-1">
                  <button
                    onClick={() => setShowCreateListModal(true)}
                    className="w-full bg-[#FFC300]/10 hover:bg-[#FFC300]/20 text-[#FFC300] border border-[#FFC300]/20 border-dashed rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-xs font-bold transition-all"
                  >
                    <Plus size={14} /> Criar nova lista
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                  {availableLists.map((list) => {
                    const isListed = listsContainingItem.includes(list.id);
                    return (
                      <button
                        key={list.id}
                        onClick={() => toggleList(list.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${isListed ? "bg-[#FFC300]/20 text-[#FFC300]" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                      >
                        {list.name}
                        {isListed && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleSaveMainClick}
              className={`bubbly-button p-4 rounded-full transition-all active:scale-95 cursor-pointer 
                    ${
                      isSaved
                        ? "text-[#1e293b] bg-[#FFC300] hover:bg-[#FFC300]/90 shadow-[0_0_15px_#FFC300]"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }
                    ${animateSave ? "animate" : ""}
                `}
              title={isSaved ? "Salvo (Gerenciar)" : "Salvar no Santuário"}
            >
              <Bookmark size={24} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>

          <button
            onClick={handleShareClick}
            className="p-4 rounded-full text-slate-300 hover:text-[#50c878] hover:bg-[#50c878]/10 transition-all active:scale-95 cursor-pointer"
            title="Compartilhar"
          >
            <Send size={24} />
          </button>
        </div>
      </div>

      {showCreateListModal && (
        <CreateListModal
          onClose={() => setShowCreateListModal(false)}
          onSave={handleListCreated}
        />
      )}
    </div>
  );
};

// ... (CreateAtrioModal and AtrioLeveza components remain unchanged)
export interface CreateAtrioModalProps {
  onClose: () => void;
  onCreate: (
    item: Omit<AtrioItem, "id" | "vibes" | "authorId">,
  ) => Promise<void>;
}

export const CreateAtrioModal: React.FC<CreateAtrioModalProps> = ({
  onClose,
  onCreate,
}) => {
  // ... (same implementation as before)
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `atrio/${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error } = await supabase.storage
      .from("media")
      .upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("media").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!mediaFile && !mediaPreview) return;
    setIsSubmitting(true);
    try {
      let finalUrl = mediaPreview || "";
      if (mediaFile) {
        finalUrl = await uploadImage(mediaFile);
      }

      const finalDesc = tag
        ? `Essência: #${tag}\n\n${description}`
        : description;

      await onCreate({
        title,
        description: finalDesc,
        url: finalUrl,
        color: "bg-emerald-500",
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao criar contemplação");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1001] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#1e293b] w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col md:flex-row overflow-hidden animate-scale-up relative">
        {/* Left Side - Image Upload */}
        <div className="w-full md:w-1/2 bg-[#0f172a] relative flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 h-56 md:h-auto shrink-0 group">
          {mediaPreview ? (
            <>
              <img
                src={mediaPreview}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500"
                alt="Preview"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 transition-transform hover:scale-110"
                >
                  <Camera size={24} />
                </button>
              </div>
            </>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center cursor-pointer p-8 w-full h-full hover:bg-white/5 transition-colors"
            >
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center mb-4 group-hover:border-[#50c878] group-hover:text-[#50c878] transition-colors text-slate-500">
                <Upload size={32} />
              </div>
              <h3 className="text-white font-bold mb-1">Carregar Arte</h3>
              <p className="text-slate-500 text-xs">
                Alta resolução recomendada
              </p>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 flex flex-col bg-[#1e293b] flex-1 min-h-0">
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50 shrink-0">
            <h2 className="text-xl font-bold text-white">Nova Contemplação</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 block">
                Título da Obra
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Serenidade Matinal"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#50c878] transition-colors font-medium placeholder-slate-600"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 block">
                Tag / Essência
              </label>
              <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-700 rounded-xl p-3 focus-within:border-[#50c878] transition-colors">
                <Hash size={16} className="text-slate-500" />
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Ex: Paz"
                  className="w-full bg-transparent text-white focus:outline-none font-medium placeholder-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1 block">
                Reflexão Profunda
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escreva algo que toque a alma..."
                className="w-full h-32 bg-[#0f172a] border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-[#50c878] transition-colors resize-none placeholder-slate-600 leading-relaxed"
              />
            </div>
          </div>

          <div className="p-6 border-t border-slate-700/50 bg-[#1e293b]">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !title || (!mediaFile && !mediaPreview)}
              className="w-full bg-[#358a5b] hover:bg-[#50c878] text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Publicar no Átrio
                  <Zap
                    size={20}
                    className="text-[#FFC300] fill-[#FFC300] group-hover:scale-110 transition-transform"
                  />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AtrioLeveza: React.FC = () => {
  const [items, setItems] = useState<AtrioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<AtrioItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Restore state

  // Check for query param openId
  const location = useLocation();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await atrioService.getItems();
      setItems(data);
      setIsLoading(false);

      // Handle URL query param for opening specific item
      const params = new URLSearchParams(location.search);
      const openId = params.get("openId");
      if (openId) {
        const item = data.find((i) => i.id === openId);
        if (item) setSelectedItem(item);
      }
    };
    load();
  }, [location.search]);

  const handleCreateItem = async (
    newItemData: Omit<AtrioItem, "id" | "vibes" | "authorId">,
  ) => {
    const savedItem = await atrioService.addItem(newItemData);
    setItems((prev) => [savedItem, ...prev]);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="min-h-screen pb-24 px-4 py-6 md:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Átrio da Leveza</h1>
        <p className="text-slate-400">Contemple a arte e eleve sua vibração.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#50c878]" size={40} />
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="relative group rounded-xl overflow-hidden cursor-pointer break-inside-avoid"
            >
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <h3 className="text-white font-bold text-sm truncate">
                  {item.title}
                </h3>
                <p className="text-slate-300 text-xs truncate">
                  by {item.authorName}
                </p>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-10">
              O Átrio está vazio no momento.
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <AtrioModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onShowToast={(msg) => setToastMessage(msg)}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {isCreateModalOpen && (
        <CreateAtrioModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateItem}
        />
      )}

      {!selectedItem && (
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="fixed bottom-28 md:bottom-32 xl:bottom-10 right-6 md:right-10 bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] p-4 rounded-full shadow-[0_0_20px_rgba(80,200,120,0.4)] transition-all hover:scale-110 active:scale-95 z-[1000] flex items-center justify-center cursor-pointer"
          aria-label="Adicionar ao Átrio"
          title="Nova Contemplação"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      )}
    </div>
  );
};

export default AtrioLeveza;
