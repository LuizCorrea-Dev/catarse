import React, { useState } from 'react';
import { Smile, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

const COMMON_EMOJIS = [
  '😀', '😂', '😍', '🥳', '😎', '🤔', '🙄', '👍',
  '🙌', '🔥', '✨', '❤️', '💯', '🙏', '👀', '💡',
  '🚀', '🎨', '🎮', '🍕', '🎉', '🌟', '💎', '🌈'
];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 hover:text-[#50c878] transition-colors"
        title="Inserir emoji"
      >
        <Smile size={18} />
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
              className="absolute bottom-full left-1/2 mb-2 z-50 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl p-4 w-64 md:w-72 max-w-[85vw]"
            >
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Emojis Populares</span>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-xl hover:bg-slate-800 p-1.5 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmojiPicker;
