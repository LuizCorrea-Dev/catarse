import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ZapButtonProps {
  count: number;
  active: boolean; // Vem do banco de dados (userHasLiked)
  onClick: () => void;
  isLoading?: boolean;
}

const ZapButton: React.FC<ZapButtonProps> = ({ count, active, onClick, isLoading }) => {
  const [isExploding, setIsExploding] = useState(false);

  const handlePress = () => {
    if (active || isLoading) return;
    setIsExploding(true);
    onClick();
    // Pequeno delay para a animação de explosão terminar
    setTimeout(() => setIsExploding(false), 800);
  };

  return (
    <div className="relative inline-block">
      {/* Partículas da Explosão Atómica */}
      <AnimatePresence>
        {isExploding && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ 
                  x: (Math.random() - 0.5) * 120, 
                  y: (Math.random() - 0.5) * 120, 
                  opacity: 0, 
                  scale: 0 
                }}
                className="absolute inset-0 m-auto w-2 h-2 bg-[#FFC300] rounded-full z-10"
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handlePress}
        disabled={isLoading || active}
        className={`
          relative flex items-center gap-2 px-5 py-2 rounded-full font-bold transition-all duration-500
          ${active 
            ? 'bg-[#FFC300] text-[#1e293b] border-2 border-[#FFC300] shadow-[0_0_20px_rgba(255,195,0,0.4)]' 
            : 'bg-slate-700/30 text-slate-400 border border-slate-600 hover:border-[#FFC300]/50 animate-orvalho'}
          ${isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
        `}
      >
        <motion.div
          animate={active ? { scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <Zap 
            className={`${active ? 'fill-[#1e293b]' : 'text-slate-400'}`} 
            size={18} 
          />
        </motion.div>
        
        <span className={active ? 'text-[#1e293b]' : 'text-slate-200'}>
          {count}
        </span>

        {/* Efeito de Brilho Interno (Overlay) */}
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            className="absolute inset-0 bg-white rounded-full"
          />
        )}
      </motion.button>
    </div>
  );
};

export default ZapButton;