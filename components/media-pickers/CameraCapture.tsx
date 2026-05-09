import React, { useRef } from 'react';
import { Camera } from 'lucide-react';

interface CameraCaptureProps {
  onMediaSelect: (file: File) => void;
  disabled?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onMediaSelect, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onMediaSelect(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className="p-2 hover:text-[#50c878] transition-colors tooltip"
        title="Capturar foto ou vídeo"
      >
        <Camera size={18} />
      </button>
    </div>
  );
};

export default CameraCapture;
