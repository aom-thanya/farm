import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { X, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';

const incomeEmojis = [
  { group: 'เงินและรายได้', emojis: ['💰', '💵', '🪙', '🧾', '📈', '🤝'] },
  { group: 'ผลไม้', emojis: ['🍌', '🥭', '🍊', '🍋', '🍉', '🍈', '🍍', '🥥', '🍎', '🍇'] },
  { group: 'พืชและผัก', emojis: ['🌱', '🌿', '🪴', '🌾', '🥬', '🥦', '🌽', '🥕', '🍅', '🫘'] },
  { group: 'สัตว์และผลผลิต', emojis: ['🐟', '🐠', '🦐', '🦀', '🐔', '🥚', '🐄', '🥛', '🐖'] },
  { group: 'สินค้าแปรรูป', emojis: ['🧺', '📦', '🫙', '🍯', '🥫', '🧃'] },
  { group: 'บริการอื่น ๆ', emojis: ['🚜', '🏪', '🚚', '👨‍🌾', '⭐', '🎁'] },
];

const expenseEmojis = [
  { group: 'แรงงาน', emojis: ['👷', '👨‍🌾', '👩‍🌾', '🧑‍🔧', '💼'] },
  { group: 'ปุ๋ยและบำรุงดิน', emojis: ['💩', '🌱', '🌿', '🪴', '🧪', '🪨'] },
  { group: 'เมล็ดและพันธุ์พืช', emojis: ['🌰', '🫘', '🌱', '🌾', '🌳'] },
  { group: 'อาหารสัตว์', emojis: ['🌾', '🥣', '🐟', '🦐', '🐔', '🐄'] },
  { group: 'เครื่องมือและอุปกรณ์', emojis: ['🔧', '🛠️', '⚒️', '🪚', '🪓', '🧰'] },
  { group: 'เครื่องจักรและยานพาหนะ', emojis: ['🚜', '🚚', '🛻', '⚙️'] },
  { group: 'น้ำมันและพลังงาน', emojis: ['⛽', '🛢️', '🔋', '⚡'] },
  { group: 'น้ำและสาธารณูปโภค', emojis: ['💧', '🚰', '💡', '📱'] },
  { group: 'ยาและสารเคมี', emojis: ['🧪', '🧴', '💊', '🦠', '🐛'] },
  { group: 'ขนส่งและบรรจุภัณฑ์', emojis: ['🚚', '📦', '🧺', '🛍️'] },
  { group: 'ซ่อมแซม', emojis: ['🔨', '🔩', '🪛', '🧑‍🔧'] },
  { group: 'ค่าเช่าและค่าบริการ', emojis: ['🏡', '📄', '🧾', '💳'] },
  { group: 'รายจ่ายอื่น ๆ', emojis: ['💸', '🛒', '📌', '⭐'] },
];

export default function EmojiPickerPopover({ type, selectedEmoji, onSelect, onClose }) {
  const [showFullPicker, setShowFullPicker] = useState(false);
  const popoverRef = useRef(null);

  const emojiList = type === 'income' ? incomeEmojis : expenseEmojis;
  const themeColor = type === 'income' ? 'farm' : 'red';

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleSelect = (emoji) => {
    onSelect(emoji);
    onClose();
  };

  const onFullPickerSelect = (emojiData) => {
    onSelect(emojiData.emoji);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div 
        ref={popoverRef}
        className="bg-white rounded-3xl shadow-xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        <div className={`p-4 border-b flex justify-between items-center ${type === 'income' ? 'bg-farm-50' : 'bg-red-50'}`}>
          <h3 className="font-bold text-lg text-gray-800">
            เลือก Emoji {type === 'income' ? 'รายรับ' : 'รายจ่าย'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {!showFullPicker ? (
            <div className="space-y-6 pb-6">
              {emojiList.map((group, i) => (
                <div key={i}>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">{group.group}</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {group.emojis.map((emoji, j) => {
                      const isSelected = selectedEmoji === emoji;
                      return (
                        <button
                          key={j}
                          onClick={() => handleSelect(emoji)}
                          className={cn(
                            "text-2xl aspect-square flex items-center justify-center rounded-xl transition-all",
                            isSelected 
                              ? type === 'income' 
                                ? "bg-farm-100 border-2 border-farm-500 shadow-sm scale-110" 
                                : "bg-red-100 border-2 border-red-500 shadow-sm scale-110"
                              : "bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:scale-105 active:scale-95"
                          )}
                        >
                          {emoji}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              
              <div className="pt-4 mt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowFullPicker(true)}
                  className="w-full py-4 bg-gray-50 text-gray-700 font-bold rounded-2xl border-2 border-gray-200 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  <LayoutGrid className="w-5 h-5" />
                  ดู Emoji ทั้งหมด (อื่น ๆ)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center -mx-4 pb-4">
              <EmojiPicker 
                onEmojiClick={onFullPickerSelect}
                searchPlaceholder="ค้นหา Emoji..."
                width="100%"
                height={400}
                lazyLoadEmojis={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
