import { useState } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { Trash2, Plus, Pencil } from 'lucide-react';
import { categoryApi } from '../api/gasApi';
import EmojiPickerPopover from '../components/EmojiPickerPopover';

export default function Categories() {
  const [activeTab, setActiveTab] = useState('income');
  const categories = useStore(state => state.categories);
  const addCategory = useStore(state => state.addCategory);
  const updateCategory = useStore(state => state.updateCategory);
  const removeCategory = useStore(state => state.removeCategory);
  const isLoading = useStore(state => state.isLoading);
  
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🌟');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded-xl"></div>
        <div className="h-14 w-full bg-gray-200 rounded-xl"></div>
        <div className="card h-20 bg-gray-200 rounded-3xl"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || isSaving) return;

    setIsSaving(true);
    setError('');
    try {
      if (editingCategory) {
        const updatedCategory = {
          ...editingCategory,
          type: activeTab,
          name,
          emoji: newEmoji
        };
        await categoryApi.updateCategory(updatedCategory);
        updateCategory(updatedCategory);
        setEditingCategory(null);
        setNewName('');
        setShowAdd(false);
        return;
      }

      const newCat = {
        type: activeTab,
        name,
        emoji: newEmoji
      };

      const response = await categoryApi.addCategory(newCat);
      addCategory({ ...newCat, id: String(response.data.id), usage_count: 0 });
      setNewName('');
      setShowAdd(false);
    } catch (err) {
      setError(err.message || 'บันทึกหมวดหมู่ไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setNewName(category.name);
    setNewEmoji(category.emoji);
    setActiveTab(category.type);
    setShowAdd(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?')) {
      setDeletingId(id);
      setError('');
      try {
        await categoryApi.deleteCategory(id);
        removeCategory(id);
      } catch (err) {
        setError(err.message || 'ลบหมวดหมู่ไม่สำเร็จ');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold text-farm-900">จัดการหมวดหมู่</h1>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      
      <div className="flex bg-white rounded-xl p-1 border border-farm-200">
        <button 
          className={cn(
            "flex-1 py-3 text-lg font-bold rounded-lg transition-colors", 
            activeTab === 'income' ? "bg-farm-100 text-farm-700" : "text-gray-500 hover:bg-gray-50"
          )}
          onClick={() => setActiveTab('income')}
        >
          รายรับ
        </button>
        <button 
          className={cn(
            "flex-1 py-3 text-lg font-bold rounded-lg transition-colors", 
            activeTab === 'expense' ? "bg-red-50 text-red-600" : "text-gray-500 hover:bg-gray-50"
          )}
          onClick={() => setActiveTab('expense')}
        >
          รายจ่าย
        </button>
      </div>

      <div className="card space-y-4">
        {showAdd ? (
          <form onSubmit={handleAddCategory} className="bg-gray-50 p-4 rounded-2xl border-2 border-farm-200 mb-6">
            <h3 className="font-bold text-lg mb-4">
              {editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
            </h3>
            <div className="flex gap-4">
              <div className="w-20 relative">
                <label className="label-text text-sm">Emoji</label>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(true)}
                  className="input-field text-center text-2xl p-2 w-full h-[52px] flex items-center justify-center cursor-pointer hover:bg-gray-100"
                >
                  {newEmoji}
                </button>
                {showEmojiPicker && (
                  <EmojiPickerPopover 
                    type={activeTab}
                    selectedEmoji={newEmoji}
                    onSelect={setNewEmoji}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              <div className="flex-1">
                <label className="label-text text-sm">ชื่อหมวดหมู่</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input-field p-2 h-[52px]"
                  placeholder="เช่น มะม่วง, ค่าไฟ"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button 
                type="submit" 
                disabled={isSaving}
                className="btn-primary py-2 flex-1 text-base"
              >
                บันทึก
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setEditingCategory(null);
                  setNewName('');
                  setShowAdd(false);
                }}
                className="btn-outline py-2 flex-1 text-base"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setShowAdd(true)}
            className="w-full py-4 border-2 border-dashed border-farm-300 text-farm-600 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-farm-50 transition-colors"
          >
            <Plus className="w-6 h-6" />
            เพิ่มหมวดหมู่ใหม่
          </button>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="relative group">
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-gray-100 bg-white shadow-sm h-32">
                <span className="text-4xl mb-2">{cat.emoji}</span>
                <span className="text-lg font-medium text-center">{cat.name}</span>
              </div>
              <button 
                onClick={() => handleEdit(cat)}
                className="absolute -top-2 -left-2 bg-farm-600 text-white p-2 rounded-full shadow-md hover:bg-farm-700 transition-colors"
                aria-label={`แก้ไข ${cat.name}`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
