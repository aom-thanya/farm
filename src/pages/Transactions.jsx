import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatMoney, formatDate, parseCalendarDate, transactionDateKey, cn } from '../lib/utils';
import { Loader2, Trash2 } from 'lucide-react';
import { transactionApi } from '../api/gasApi';

export default function Transactions() {
  const [filterType, setFilterType] = useState('all'); // all, income, expense
  const dateFilter = useStore(state => state.dateFilter);
  const transactions = useStore(state => state.transactions);
  const removeTransaction = useStore(state => state.removeTransaction);
  const isLoading = useStore(state => state.isLoading);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (transaction) => {
    const confirmed = window.confirm(
      `คุณแน่ใจหรือไม่ว่าต้องการลบรายการ${transaction.cat_name ? ` "${transaction.cat_name}"` : ''}? การลบนี้ไม่สามารถย้อนกลับได้`
    );
    if (!confirmed) return;

    setDeletingId(transaction.id);
    try {
      const response = await transactionApi.deleteTransaction(transaction.id);
      if (!response.success) throw new Error(response.error || 'Delete failed');
      removeTransaction(transaction.id);
    } catch (error) {
      console.error(error);
      alert('ลบรายการไม่สำเร็จ โปรดลองใหม่อีกครั้ง');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-gray-200 rounded-xl"></div>
          <div className="h-12 w-64 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="space-y-4">
          <div className="card h-32 bg-gray-200 rounded-3xl"></div>
          <div className="card h-48 bg-gray-200 rounded-3xl"></div>
          <div className="card h-32 bg-gray-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  // Filter by date first
  const currentMonthTx = transactions.filter(tx => {
    if (dateFilter.type === 'all') return true;
    
    const txDate = parseCalendarDate(transactionDateKey(tx.date));
    
    if (dateFilter.type === 'month') {
      return txDate.getMonth() === dateFilter.date.getMonth() && txDate.getFullYear() === dateFilter.date.getFullYear();
    }
    
    if (dateFilter.type === 'range') {
      if (!dateFilter.start || !dateFilter.end) return true;
      const start = parseCalendarDate(dateFilter.start);
      start.setHours(0, 0, 0, 0);
      const end = parseCalendarDate(dateFilter.end);
      end.setHours(23, 59, 59, 999);
      return txDate >= start && txDate <= end;
    }
    
    return true;
  });

  // Sort by date desc
  const sortedTx = [...currentMonthTx].sort((a, b) =>
    transactionDateKey(b.date).localeCompare(transactionDateKey(a.date))
  );
  
  const filteredTx = sortedTx.filter(tx => {
    if (filterType === 'all') return true;
    return tx.type === filterType;
  });

  // Group by date
  const groupedTx = filteredTx.reduce((acc, tx) => {
    const d = transactionDateKey(tx.date);
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold text-farm-900">ประวัติรายการ</h1>
        <div className="flex gap-2 bg-white rounded-xl p-1 border border-farm-200">
          <button 
            className={cn("px-4 py-2 rounded-lg font-medium", filterType === 'all' ? "bg-farm-100 text-farm-700" : "text-gray-500")}
            onClick={() => setFilterType('all')}
          >
            ทั้งหมด
          </button>
          <button 
            className={cn("px-4 py-2 rounded-lg font-medium", filterType === 'income' ? "bg-farm-100 text-farm-700" : "text-gray-500")}
            onClick={() => setFilterType('income')}
          >
            รายรับ
          </button>
          <button 
            className={cn("px-4 py-2 rounded-lg font-medium", filterType === 'expense' ? "bg-red-50 text-red-600" : "text-gray-500")}
            onClick={() => setFilterType('expense')}
          >
            รายจ่าย
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedTx).length === 0 ? (
          <div className="text-center p-12 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-300">
            ไม่มีรายการ
          </div>
        ) : (
          Object.keys(groupedTx).map(date => {
            const dayTxs = groupedTx[date];
            const dayTotal = dayTxs.reduce((acc, curr) => {
              return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
            }, 0);
            
            return (
              <div key={date} className="card p-0 overflow-hidden">
                <div className="bg-farm-50 p-4 border-b border-farm-100 flex justify-between items-center">
                  <h3 className="font-semibold text-lg text-farm-800">{formatDate(date)}</h3>
                  <span className={cn(
                    "font-bold",
                    dayTotal >= 0 ? "text-farm-600" : "text-red-500"
                  )}>
                    {dayTotal >= 0 ? '+' : ''}{formatMoney(dayTotal)}
                  </span>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {dayTxs.map(tx => (
                    <div key={tx.id} className="p-4 flex justify-between items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{tx.cat_emoji}</div>
                        <div>
                          <p className="font-semibold text-lg text-gray-800">{tx.cat_name}</p>
                          {(tx.buyer_seller || tx.note) && (
                            <p className="text-sm text-gray-500">
                              {tx.buyer_seller} {tx.buyer_seller && tx.note ? '·' : ''} {tx.note}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {tx.quantity} x {tx.unit_price} บ.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={cn(
                          "font-bold text-xl",
                          tx.type === 'income' ? "text-farm-600" : "text-red-500"
                        )}>
                          {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(tx)}
                          disabled={deletingId === tx.id}
                          aria-label={`ลบรายการ${tx.cat_name ? ` ${tx.cat_name}` : ''}`}
                          title="ลบรายการ"
                          className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === tx.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
