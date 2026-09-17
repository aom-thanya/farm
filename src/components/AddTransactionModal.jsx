import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { CheckCircle2, ArrowLeft, Save, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { transactionApi } from '../api/gasApi';

export default function AddTransactionModal({ isOpen, onClose, type }) {
  if (!isOpen || !type) return null;
  
  const isIncome = type === 'income';
  
  const [step, setStep] = useState(1); // 1 = Select Category, 2 = Fill Form
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [person, setPerson] = useState('');
  const [note, setNote] = useState('');
  
  const categories = useStore(state => state.categories);
  const addTransaction = useStore(state => state.addTransaction);
  
  const amount = useMemo(() => {
    const p = parseFloat(price) || 0;
    const q = parseFloat(quantity) || 0;
    return p * q;
  }, [price, quantity]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setDate(new Date().toISOString().split('T')[0]);
      setPrice('');
      setQuantity('1');
      setPerson('');
      setNote('');
    }
  }, [isOpen]);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCategory || amount <= 0) {
      alert('กรุณาเลือกประเภทและใส่ราคาให้ถูกต้อง');
      return;
    }

    const newTx = {
      id: Date.now().toString(),
      type: type,
      category: selectedCategory.id,
      cat_name: selectedCategory.name,
      cat_emoji: selectedCategory.emoji,
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
        // อัปเดตหน้าจอทันที (Optimistic update)
        addTransaction(newTx);
        
        // ส่งข้อมูลไปหลังบ้าน
        await transactionApi.addTransaction(newTx);
        onClose();
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
              // Usually would navigate to categories page, or show inline form
              onClose();
              window.location.hash = '#/categories'; 
              // Note: our app uses BrowserRouter, so navigate needs to be used if we want to change route.
              // We can just close and user can go there manually.
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
  );
}
