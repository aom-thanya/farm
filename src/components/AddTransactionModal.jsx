import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { cn, todayDateInput, transactionFilterRange } from '../lib/utils';
import { Save, Loader2 } from 'lucide-react';
import Modal from './Modal';
import EmojiPickerPopover from './EmojiPickerPopover';
import { transactionApi, categoryApi } from '../api/gasApi';

export default function AddTransactionModal({ isOpen, onClose, type }) {
  const isIncome = type === 'income';
  
  const [step, setStep] = useState(1); // 1 = Select Category, 2 = Fill Form
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('🌟');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [toast, setToast] = useState('');
  
  // Form State
  const [date, setDate] = useState(todayDateInput);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [person, setPerson] = useState('');
  const [note, setNote] = useState('');
  
  const categories = useStore(state => state.categories);
  const user = useStore(state => state.user);
  const addTransaction = useStore(state => state.addTransaction);
  const addCategory = useStore(state => state.addCategory);
  const setTransactions = useStore(state => state.setTransactions);
  const setCategories = useStore(state => state.setCategories);
  const dateFilter = useStore(state => state.dateFilter);
  
  const amount = useMemo(() => {
    const p = parseFloat(price) || 0;
    const q = parseFloat(quantity) || 0;
    return p * q;
  }, [price, quantity]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1);
      setSelectedCategory(null);
      setDate(todayDateInput());
      setPrice('');
      setQuantity('1');
      setPerson('');
      setNote('');
      setIsAddingCategory(false);
      setCategoryName('');
      setCategoryEmoji('🌟');
      setCategoryError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredCategories = categories.filter(c => c.type === type);

  if (!isOpen || !type) return null;

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name || isSavingCategory) return;

    setIsSavingCategory(true);
    setCategoryError('');
    try {
      const category = { type, name, emoji: categoryEmoji };
      const response = await categoryApi.addCategory(category);
      if (!response.data?.id) throw new Error('API did not return a category ID');
      const savedCategory = { ...category, id: String(response.data.id), usage_count: 0 };
      addCategory(savedCategory);
      setSelectedCategory(savedCategory);
      setStep(2);
      setIsAddingCategory(false);
      setToast('เพิ่มหมวดหมู่สำเร็จ');
    } catch (error) {
      setCategoryError(error.message || 'บันทึกหมวดหมู่ไม่สำเร็จ');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCategory || amount <= 0) {
      alert('กรุณาเลือกประเภทและใส่ราคาให้ถูกต้อง');
      return;
    }

    const newTx = {
      user_id: user?.id || '',
      type: type,
      category: selectedCategory.id,
      cat_name: selectedCategory.name,
      cat_emoji: selectedCategory.emoji,
      cat_type: selectedCategory.type || type,
      amount: amount,
      date: date,
      unit_price: parseFloat(price) || 0,
      quantity: parseFloat(quantity) || 1,
      buyer_seller: person,
      note: note
    };

    const submitData = async () => {
      setIsSubmitting(true);
      try {
        const result = await transactionApi.addTransaction(newTx);
        const range = transactionFilterRange(dateFilter);
        if (range && newTx.date >= range.startDate && newTx.date <= range.endDate) {
          addTransaction({ ...newTx, id: String(result.data.id) });
        }
        onClose();
        try {
          const [transactions, categoriesResult] = await Promise.all([
            range ? transactionApi.getTransactions(range) : Promise.resolve(null),
            categoryApi.getCategories()
          ]);
          if (transactions) setTransactions(transactions.data);
          setCategories(categoriesResult.data);
        } catch (refreshError) {
          console.error('Failed to refresh after saving:', refreshError);
        }
      } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล โปรดลองใหม่อีกครั้ง');
      } finally {
        setIsSubmitting(false);
      }
    };
    
    submitData();
  };

  const title = (
    <div className="flex flex-col items-center">
      <span className="text-3xl mb-1">💰</span>
      <span className={cn(
        "text-2xl font-bold",
        isIncome ? "text-farm-600" : "text-red-600"
      )}>
        เพิ่ม{isIncome ? 'รายรับ' : 'รายจ่าย'}
      </span>
    </div>
  );

  return (
    <>
    {isAddingCategory ? (
      <Modal isOpen={isOpen} onClose={() => setIsAddingCategory(false)} title="เพิ่มหมวดหมู่ใหม่" className="max-w-lg">
        <form onSubmit={handleCreateCategory} className="space-y-5">
          {categoryError && <p role="alert" className="text-red-600">{categoryError}</p>}
          <div>
            <label className="label-text" htmlFor="new-category-emoji">Emoji</label>
            <button
              id="new-category-emoji"
              type="button"
              onClick={() => setShowEmojiPicker(true)}
              className="input-field w-20 h-16 text-3xl flex items-center justify-center"
              aria-label="เลือก Emoji"
            >
              {categoryEmoji}
            </button>
            {showEmojiPicker && (
              <EmojiPickerPopover
                type={type}
                selectedEmoji={categoryEmoji}
                onSelect={setCategoryEmoji}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
          <div>
            <label className="label-text" htmlFor="new-category-name">ชื่อหมวดหมู่</label>
            <input
              id="new-category-name"
              type="text"
              required
              value={categoryName}
              onChange={event => setCategoryName(event.target.value)}
              className="input-field"
              placeholder="เช่น มะม่วง, ค่าไฟ"
            />
          </div>
          <button type="submit" disabled={isSavingCategory} className="btn-primary w-full flex items-center justify-center gap-2">
            {isSavingCategory && <Loader2 className="w-5 h-5 animate-spin" />}
            บันทึก
          </button>
        </form>
      </Modal>
    ) : (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {step === 1 ? (
        <div className="space-y-6">
          <p className="text-center text-gray-500 text-lg">เลือกประเภท หรือสร้างใหม่</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setStep(2);
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all hover:-translate-y-1 hover:shadow-lg",
                  "border-gray-100 bg-white hover:border-farm-200"
                )}
              >
                <span className="text-5xl mb-4">{cat.emoji}</span>
                <span className="text-xl font-bold text-gray-800 text-center leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setCategoryName('');
              setCategoryEmoji('🌟');
              setCategoryError('');
              setIsAddingCategory(true);
            }}
            className={cn(
              "w-full py-4 rounded-2xl border-2 border-dashed font-bold text-xl flex items-center justify-center gap-2 transition-colors",
              isIncome ? "border-farm-300 text-farm-600 hover:bg-farm-50" : "border-red-300 text-red-500 hover:bg-red-50"
            )}
          >
            + กรอกประเภท{isIncome ? 'รายรับ' : 'รายจ่าย'}ใหม่
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border-2 border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{selectedCategory.emoji}</span>
              <div>
                <p className="text-sm text-gray-500">ประเภท</p>
                <p className="text-xl font-bold text-gray-800">{selectedCategory.name}</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setStep(1)}
              className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm"
            >
              เปลี่ยน
            </button>
          </div>

          <div>
            <label className="label-text text-gray-600">📅 วันที่</label>
            <input 
              type="date" 
              className="input-field text-xl py-4"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text text-gray-600">ราคา/หน่วย</label>
              <input 
                type="number" 
                className="input-field text-xl py-4"
                placeholder="0"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text text-gray-600">จำนวน</label>
              <input 
                type="number" 
                className="input-field text-xl py-4"
                placeholder="1"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div>
             <label className="label-text text-gray-600">รวมทั้งสิ้น</label>
             <div className={cn(
              "w-full rounded-2xl border-2 p-6 flex items-center text-4xl font-black",
              isIncome ? "border-farm-300 text-farm-700 bg-white" : "border-red-300 text-red-600 bg-white"
             )}>
                {amount.toLocaleString('th-TH')}
             </div>
          </div>

          <div>
            <label className="label-text text-gray-600">ผู้{isIncome ? 'ซื้อ' : 'ขาย'}</label>
            <input 
              type="text" 
              className="input-field text-xl py-4"
              placeholder="..."
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            />
          </div>

          <div>
            <label className="label-text text-gray-600">หมายเหตุ</label>
            <input 
              type="text" 
              className="input-field text-xl py-4"
              placeholder="(ไม่จำเป็น)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={cn(
              "w-full py-5 text-2xl font-bold rounded-2xl shadow-xl flex items-center justify-center gap-3 text-white transition-all",
              isIncome ? "bg-farm-600 hover:bg-farm-700" : "bg-red-500 hover:bg-red-600",
              isSubmitting && "opacity-70 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Save className="w-8 h-8" />
            )}
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      )}
    </Modal>
    )}
    {toast && <div role="status" className="fixed bottom-6 right-6 z-[200] rounded-2xl bg-farm-700 px-5 py-3 font-bold text-white shadow-xl">{toast}</div>}
    </>
  );
}
