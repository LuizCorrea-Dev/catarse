import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

// Partículas de Vibe reusáveis
const VibeParticles = () => (
  <div className="pointer-events-none fixed inset-0 z-[1000] flex items-center justify-center">
    {[...Array(15)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
        animate={{
          scale: [0, 1.8, 0.6, 0],
          x: (Math.random() - 0.5) * 800,
          y: (Math.random() - 0.5) * 800,
          rotate: Math.random() * 360,
          opacity: [0, 1, 1, 0],
        }}
        transition={{ duration: 2.5, ease: "easeOut" }}
        className="absolute h-4 w-4 rounded-full bg-yellow-400 shadow-[0_0_20px_#facc15]"
      />
    ))}
  </div>
);

interface VibeCelebrationProps {
  show: boolean;
  message: string;
  isDew?: boolean;
  onComplete?: () => void;
}

const VibeCelebration: React.FC<VibeCelebrationProps> = ({ show, message, isDew, onComplete }) => {
  React.useEffect(() => {
     if (show && onComplete) {
       const timer = setTimeout(onComplete, 3500);
       return () => clearTimeout(timer);
     }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <>
          <VibeParticles />
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[1001] flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xl pointer-events-none"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-gradient-to-br from-yellow-300 to-yellow-500 p-6 rounded-full mb-6 shadow-[0_0_40px_rgba(250,204,21,0.5)] border-4 border-white/20"
            >
              <Sparkles size={60} className="text-slate-950" />
            </motion.div>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center px-8"
            >
              <h2 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                {message}
              </h2>
              {isDew && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[#50c878] text-xl font-bold tracking-[0.2em] uppercase">Orvalho Coletado</span>
                  <div className="h-1 w-32 bg-[#50c878] rounded-full shadow-[0_0_10px_#50c878]"></div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VibeCelebration;
