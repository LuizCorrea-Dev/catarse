import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VibeButtonProps {
  count: number;
  active: boolean; // Retornado pelo backend (se o usuário já deu Vibe)
  onClick: () => void;
  isLoading?: boolean;
}

const VibeButton: React.FC<VibeButtonProps> = ({ count, active, onClick, isLoading }) => {
  const [isExploding, setIsExploding] = useState(false);

  const handlePress = () => {
    if (active || isLoading) return;
    setIsExploding(true);
    onClick();
    // A explosão dura cerca de 1s
    setTimeout(() => setIsExploding(false), 1000);
  };

  return (
    <div className="relative inline-block">
      {/* Explosão de Partículas Premium */}
      <AnimatePresence>
        {isExploding && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1.5, 0.8, 0],
                  x: (Math.random() - 0.5) * 150,
                  y: (Math.random() - 0.5) * 150,
                  rotate: Math.random() * 360,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_10px_#facc15]"
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={handlePress}
        disabled={isLoading || active}
        className={`
          relative flex items-center gap-2 px-4 py-1.5 rounded-full font-bold transition-all duration-500 border
          ${active 
            ? 'bg-[#FFC300]/20 text-[#FFC300] border-[#FFC300]/50 shadow-[0_0_15px_rgba(255,195,0,0.2)]' 
            : 'bg-slate-800/40 text-slate-400 border-slate-700 hover:border-slate-500'}
          ${isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
        `}
      >
        <motion.div
          animate={active ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          <Zap 
            className={`${active ? 'fill-[#FFC300] text-[#FFC300]' : 'text-slate-500'}`} 
            size={18} 
          />
        </motion.div>
        
        <span className={`relative z-10 text-sm ${active ? 'text-[#FFC300]' : 'text-slate-400'}`}>
          {count}
        </span>

        {/* Efeito Glow Interno Otimista */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-[#FFC300]/5 rounded-full blur-[2px]"
            />
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default VibeButton;
