import { useEffect, useRef, useState } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onChange, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);

  useEffect(() => {
    // Detect dark theme
    const isDark = document.documentElement.classList.contains('dark-theme');
    setTheme(isDark ? Theme.DARK : Theme.LIGHT);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onChange(emojiData.emoji);
    onClose();
  };

  return (
    <div className="emoji-picker-wrapper" ref={pickerRef}>
      <EmojiPickerReact
        onEmojiClick={handleEmojiClick}
        theme={theme}
      />
    </div>
  );
}
