import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
  disabled?: boolean;
}

import GiftPicker from 'gif-picker-react';

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
  disabled?: boolean;
}

const GifPicker: React.FC<GifPickerProps> = ({ onGifSelect, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleGifClick = (gif: any) => {
    onGifSelect(gif.url);
    setIsOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 text-[9px] font-black border-2 border-current px-1 rounded leading-none hover:text-[#50c878] transition-colors"
        title="Inserir GIF"
      >
        GIF
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
              animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
              className="absolute bottom-full left-1/2 mb-2 z-[100] bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-w-[95vw] w-[350px]"
            >
              <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-[#1e293b]">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Buscar GIFs (Tenor)</span>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              
              <div className="gif-picker-container">
                <GiftPicker 
                  tenorApiKey="SUA_CHAVE_API_TENOR" 
                  onGifClick={handleGifClick}
                  width="100%"
                />
              </div>
              
              <style>{`
                .gif-picker-container .gpr-container {
                  background: transparent !important;
                  border: none !important;
                }
                .gif-picker-container .gpr-search-container input {
                  background: #0f172a !important;
                  border: 1px solid #334155 !important;
                  color: white !important;
                }
              `}</style>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};



export default GifPicker;
