import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Users,
  Lock,
  Hash,
  Loader2,
  X,
  Plus,
  Clock,
  Shield,
  Check,
  ArrowRight,
  AlertOctagon,
  Filter,
  Crown,
  User,
} from "lucide-react";
import {
  communityService,
  Community,
  PrivacyType,
  RoleType,
} from "../backend/CommunityService";

const CommunityCatalog: React.FC = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | RoleType | "SUSPENDED">(
    "ALL",
  );
  const [selectedPrivateCommunity, setSelectedPrivateCommunity] =
    useState<Community | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      const data = await communityService.getCommunities(searchTerm);
      setCommunities(data);
      setIsLoading(false);
    };
    const timeoutId = setTimeout(fetch, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleOpenPrivateModal = (community: Community) => {
    setSelectedPrivateCommunity(community);
  };

  const handleCloseModal = () => {
    setSelectedPrivateCommunity(null);
  };

  const handleConfirmRequest = async (communityId: string) => {
    const result = await communityService.joinCommunity(communityId);
    if (result.success) {
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === communityId ? { ...c, currentUserRole: "PENDING" } : c,
        ),
      );
    }
  };

  const handleCommunityCreated = (newCommunity: Community) => {
    setCommunities((prev) => {
      if (prev.some((c) => c.id === newCommunity.id)) return prev;
      return [newCommunity, ...prev];
    });
    if (searchTerm !== "") setSearchTerm("");
    setIsCreateModalOpen(false);
  };

  const filteredCommunities = communities.filter((c) => {
    if (filterType === "SUSPENDED") {
      return c.isSuspended;
    }
    if (filterType === "ALL") return true;
    return c.currentUserRole === filterType;
  });

  return (
    <div className="w-full max-w-[95%] mx-auto px-2 py-6 md:py-10">
      <div className="flex flex-col items-center mb-12 relative">
        <div className="text-center w-full max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Descubra sua Tribo
          </h1>
          <p className="text-slate-400 mb-8">
            Conecte-se com pessoas que compartilham da mesma vibração. Encontre
            comunidades que nutrem sua leveza.
          </p>

          <div className="relative max-w-md mx-auto flex gap-2 w-full">
            <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center px-3 py-2 transition-colors focus-within:border-[#50c878] shadow-lg backdrop-blur-sm">
              <Search className="text-slate-500 mr-2" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-sm text-white w-full focus:outline-none placeholder-slate-500"
              />
            </div>

            <div className="relative group shrink-0">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="appearance-none bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#50c878] shadow-lg backdrop-blur-sm h-full"
              >
                <option value="ALL">Todos</option>
                <option value="OWNER">Meus Grupos (Dono)</option>
                <option value="MODERATOR">Moderação</option>
                <option value="MEMBER">Sou Membro</option>
                <option value="SUSPENDED">Suspensos</option>
              </select>
              <Filter
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="mt-6 md:mt-0 md:absolute md:right-0 md:top-0 bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(80,200,120,0.3)]"
        >
          <Plus size={20} />
          <span className="hidden md:inline">Criar Tribo</span>
          <span className="md:hidden">Criar</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#50c878]" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommunities.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              onPrivateClick={() => handleOpenPrivateModal(community)}
            />
          ))}
        </div>
      )}

      {!isLoading && filteredCommunities.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          Nenhuma comunidade encontrada com estes filtros.
        </div>
      )}

      {selectedPrivateCommunity && (
        <PrivateAccessModal
          community={selectedPrivateCommunity}
          isAlreadyPending={
            selectedPrivateCommunity.currentUserRole === "PENDING"
          }
          onConfirmRequest={() =>
            handleConfirmRequest(selectedPrivateCommunity.id)
          }
          onClose={handleCloseModal}
        />
      )}

      {isCreateModalOpen && (
        <CreateCommunityModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleCommunityCreated}
        />
      )}
    </div>
  );
};

interface CommunityCardProps {
  community: Community;
  onPrivateClick: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({
  community,
  onPrivateClick,
}) => {
  const isPending = community.currentUserRole === "PENDING";
  const isMember = community.isMember;
  const isPrivateAndNotMember =
    community.privacy === "PRIVATE" && !isMember && !isPending;
  const isSuspended = community.isSuspended;

  const getRoleBadge = () => {
    switch (community.currentUserRole) {
      case "OWNER":
        return (
          <div className="bg-[#FFC300]/20 text-[#FFC300] px-2 py-1 rounded-md border border-[#FFC300]/30 flex items-center gap-1 shadow-lg backdrop-blur-sm">
            <Crown size={12} fill="currentColor" />
            <span className="text-[10px] font-bold uppercase tracking-wide">
              Dono
            </span>
          </div>
        );
      case "MODERATOR":
        return (
          <div className="bg-[#50c878]/20 text-[#50c878] px-2 py-1 rounded-md border border-[#50c878]/30 flex items-center gap-1 shadow-lg backdrop-blur-sm">
            <Shield size={12} fill="currentColor" />
            <span className="text-[10px] font-bold uppercase tracking-wide">
              Moderador
            </span>
          </div>
        );
      case "MEMBER":
        return (
          <div className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded-md border border-slate-600 flex items-center gap-1 shadow-lg backdrop-blur-sm">
            <User size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wide">
              Membro
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const renderButton = () => {
    if (isMember) {
      return (
        <Link
          to={`/communities/${community.id}`}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 bg-slate-700 text-white hover:bg-slate-600 ${isSuspended ? "border border-red-500/50 hover:bg-red-900/20" : ""}`}
        >
          {isSuspended ? "Gerenciar Suspensão" : "Acessar"}
        </Link>
      );
    }

    if (isPending) {
      return (
        <button
          disabled
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-default bg-orange-500/10 text-orange-500 border border-orange-500/50"
        >
          <Clock size={14} />
          Aguardando aprovação
        </button>
      );
    }

    if (isPrivateAndNotMember) {
      return (
        <button
          onClick={onPrivateClick}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600 border-dashed"
        >
          <Lock size={14} />
          Solicitar Acesso
        </button>
      );
    }

    return (
      <Link
        to={`/communities/${community.id}`}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 bg-[#50c878] text-[#1e293b] hover:bg-[#50c878]/90 shadow-[0_0_15px_rgba(80,200,120,0.2)]"
      >
        Participar da Comunidade
      </Link>
    );
  };

  return (
    <div
      className={`bg-[#1e293b] rounded-3xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-[#50c878]/10 hover:border-[#50c878]/50 transition-all duration-300 group flex flex-col h-full ${isSuspended ? "opacity-60 grayscale-[0.8] hover:opacity-100 hover:grayscale-0" : ""}`}
    >
      <div className="h-32 bg-slate-800 relative overflow-hidden">
        <img
          src={community.bannerUrl}
          alt="Banner"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] to-transparent"></div>
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {community.privacy === "PRIVATE" && (
            <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1 border border-white/10">
              <Lock size={12} /> Privada
            </div>
          )}
          {isSuspended && (
            <div className="bg-red-600/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1 border border-red-400 shadow-lg animate-pulse">
              <AlertOctagon size={14} /> SUSPENSO
            </div>
          )}
        </div>

        {community.currentUserRole && (
          <div className="absolute top-3 left-3">{getRoleBadge()}</div>
        )}

        {isSuspended && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <span className="text-red-500/40 text-4xl font-black uppercase tracking-widest rotate-[-15deg] border-4 border-red-500/40 px-4 py-1 rounded-xl">
              SUSPENSO
            </span>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex-1 flex flex-col -mt-10 relative">
        <img
          src={community.avatarUrl}
          alt="Avatar"
          className={`w-20 h-20 rounded-2xl border-4 border-[#1e293b] bg-slate-800 object-cover shadow-lg mb-4 ${isSuspended ? "grayscale" : ""}`}
        />

        <div className="flex-1 mb-6">
          <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-[#50c878] transition-colors flex items-center gap-2">
            {community.name}
            {isSuspended && (
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">
                Oculto
              </span>
            )}
          </h3>
          <p className="text-slate-400 text-sm line-clamp-2 mb-4">
            {community.description}
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-800/50 px-2 py-1 rounded-md">
              <Users size={12} /> {community.memberCount}
            </span>
            {community.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#50c878] bg-[#50c878]/10 px-2 py-1 rounded-md"
              >
                <Hash size={10} /> {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto">{renderButton()}</div>
      </div>
    </div>
  );
};

const PrivateAccessModal: React.FC<any> = ({
  community,
  isAlreadyPending,
  onConfirmRequest,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-[#1e293b] w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl p-6 relative animate-fade-in-up">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-500 hover:text-white"
      >
        <X size={24} />
      </button>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
          <Lock size={32} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Comunidade Privada
        </h2>
        <p className="text-slate-400 text-sm">
          "{community.name}" requer aprovação para entrar.
        </p>
      </div>
      <button
        onClick={() => {
          onConfirmRequest();
          onClose();
        }}
        disabled={isAlreadyPending}
        className="w-full bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(80,200,120,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isAlreadyPending ? (
          <>
            <Clock size={18} /> Aguardando
          </>
        ) : (
          <>
            <ArrowRight size={18} /> Solicitar Participação
          </>
        )}
      </button>
    </div>
  </div>
);

const CreateCommunityModal: React.FC<any> = ({ onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyType>("PUBLIC");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);
    try {
      const newCommunity = await communityService.createCommunity({
        name,
        description,
        privacy,
        tags: tagsArray,
      });
      onCreated(newCommunity);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e293b] w-full max-w-lg rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
          <h2 className="text-lg font-bold text-white">Criar Nova Tribo</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form
            id="create-community-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Nome da Comunidade
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-[#50c878] focus:outline-none transition-colors"
                placeholder="Ex: Clube do Livro Zen"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Descrição
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-[#50c878] focus:outline-none transition-colors resize-none h-24"
                placeholder="Qual é o propósito deste espaço?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Privacidade
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPrivacy("PUBLIC")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${privacy === "PUBLIC" ? "bg-[#50c878]/10 border-[#50c878] text-[#50c878]" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"}`}
                >
                  <Users size={24} />
                  <span className="text-sm font-bold">Pública</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacy("PRIVATE")}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${privacy === "PRIVATE" ? "bg-[#50c878]/10 border-[#50c878] text-[#50c878]" : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"}`}
                >
                  <Lock size={24} />
                  <span className="text-sm font-bold">Privada</span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Tags (Opcional)
              </label>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-3 focus-within:border-[#50c878] transition-colors">
                <Hash size={16} className="text-slate-500" />
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-transparent text-white focus:outline-none text-sm"
                  placeholder="meditação, leitura, yoga..."
                />
              </div>
            </div>
          </form>
        </div>
        <div className="p-6 border-t border-slate-700 bg-slate-800/30">
          <button
            type="submit"
            form="create-community-form"
            disabled={isSubmitting}
            className="w-full bg-[#50c878] hover:bg-[#50c878]/90 text-[#1e293b] font-bold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(80,200,120,0.3)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Criar Comunidade"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityCatalog;
