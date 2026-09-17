import { useStore } from '../store/useStore';
import { formatMoney, cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

export default function Dashboard() {
  const transactions = useStore(state => state.transactions);
  const dateFilter = useStore(state => state.dateFilter);
  const isLoading = useStore(state => state.isLoading);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-3 gap-2 sm:gap-6">
          <div className="card h-[132px] sm:h-[188px] bg-gray-200 rounded-3xl"></div>
          <div className="card h-[132px] sm:h-[188px] bg-gray-200 rounded-3xl"></div>
          <div className="card h-[132px] sm:h-[188px] bg-gray-200 rounded-3xl"></div>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <div className="card h-48 bg-gray-200 rounded-3xl"></div>
          <div className="card h-48 bg-gray-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  // Filter transactions based on dateFilter
  const filteredTx = transactions.filter(tx => {
    if (dateFilter.type === 'all') return true;
    
    const txDate = new Date(tx.date);
    
    if (dateFilter.type === 'month') {
      return txDate.getMonth() === dateFilter.date.getMonth() && txDate.getFullYear() === dateFilter.date.getFullYear();
    }
    
    if (dateFilter.type === 'range') {
      if (!dateFilter.start || !dateFilter.end) return true;
      const start = new Date(dateFilter.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFilter.end);
      end.setHours(23, 59, 59, 999);
      return txDate >= start && txDate <= end;
    }
    
    return true;
  });

  const incomeTxs = filteredTx.filter(t => t.type === 'income');
  const expenseTxs = filteredTx.filter(t => t.type === 'expense');
  
  const totalIncome = incomeTxs.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenseTxs.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  // Group and calculate percentage for progress bars
  const groupByCategory = (txs, total) => {
    const grouped = txs.reduce((acc, tx) => {
      if (!acc[tx.category]) {
        acc[tx.category] = { ...tx, totalAmount: 0 };
      }
      acc[tx.category].totalAmount += tx.amount;
      return acc;
    }, {});
    
    return Object.values(grouped)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map(item => ({
        ...item,
        percentage: total > 0 ? ((item.totalAmount / total) * 100).toFixed(1) : 0
      }));
  };

  const incomeSummary = groupByCategory(incomeTxs, totalIncome);
  const expenseSummary = groupByCategory(expenseTxs, totalExpense);

  // Chart data for 'all' mode
  let chartData = [];
  if (dateFilter.type === 'all') {
    const monthlyData = transactions.reduce((acc, tx) => {
      const date = new Date(tx.date);
      const monthYear = `${date.toLocaleString('th-TH', { month: 'short' })} ${date.getFullYear()}`;
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[sortKey]) {
        acc[sortKey] = { sortKey, name: monthYear, income: 0, expense: 0 };
      }
      
      if (tx.type === 'income') {
        acc[sortKey].income += tx.amount;
      } else {
        acc[sortKey].expense += tx.amount;
      }
      return acc;
    }, {});
    
    chartData = Object.values(monthlyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }

  const profitPercentage = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;
  const isProfit = balance >= 0;

  const formatCompactNumber = (number) => {
    if (!number) return '';
    if (number >= 1000000) return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (number >= 1000) return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return number.toString();
  };

  return (
    <div className="space-y-6">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6">
        <div className="card text-center flex flex-col items-center justify-center p-3 sm:p-8 hover:shadow-md transition-shadow">
          <div className="text-2xl sm:text-4xl mb-1 sm:mb-3">💰</div>
          <h3 className="text-sm sm:text-xl font-bold text-gray-500 mb-1 sm:mb-2">รายรับ</h3>
          <p className="text-lg sm:text-4xl font-black text-farm-600 leading-tight">{formatMoney(totalIncome).replace('฿', '')}</p>
        </div>
        
        <div className="card text-center flex flex-col items-center justify-center p-3 sm:p-8 hover:shadow-md transition-shadow">
          <div className="text-2xl sm:text-4xl mb-1 sm:mb-3">🧾</div>
          <h3 className="text-sm sm:text-xl font-bold text-gray-500 mb-1 sm:mb-2">รายจ่าย</h3>
          <p className="text-lg sm:text-4xl font-black text-red-500 leading-tight">{formatMoney(totalExpense).replace('฿', '')}</p>
        </div>

        <div className="card text-center flex flex-col items-center justify-center p-3 sm:p-8 hover:shadow-md transition-shadow">
          <div className="text-2xl sm:text-4xl mb-1 sm:mb-3">🌱</div>
          <h3 className="text-sm sm:text-xl font-bold text-gray-500 mb-1 sm:mb-2">คงเหลือ</h3>
          <p className={cn(
            "text-lg sm:text-4xl font-black leading-tight",
            balance >= 0 ? "text-farm-600" : "text-red-500"
          )}>
            {balance > 0 ? '+' : ''}{formatMoney(balance).replace('฿', '')}
          </p>
        </div>
      </div>

      {/* Breakdowns or Chart */}
      {dateFilter.type === 'all' ? (
        <div className="card p-4 sm:p-8">
          <h2 className="text-lg sm:text-xl font-heading font-bold mb-6 text-center text-gray-800">
            📊 เปรียบเทียบรายรับ - รายจ่าย รายเดือน
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
                barSize={40}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 14}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 14}} tickFormatter={(value) => formatCompactNumber(value)} />
                <Tooltip 
                  formatter={(value) => formatMoney(value)}
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="income" name="รายรับ" fill="#22c55e" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="income" position="top" formatter={formatCompactNumber} fill="#166534" fontSize={12} fontWeight="bold" />
                </Bar>
                <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="expense" position="top" formatter={formatCompactNumber} fill="#991b1b" fontSize={12} fontWeight="bold" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
        {/* Income Breakdown */}
        <div className="card p-4 sm:p-8">
          <h2 className="text-lg sm:text-xl font-heading font-bold flex items-center gap-2 mb-4 border-b border-gray-100 pb-4">
            <span>💰</span> รายรับจากไหน
          </h2>
          <div className="space-y-4">
            {incomeSummary.length > 0 ? incomeSummary.map((item) => (
              <div key={item.category} className="flex items-center gap-2 sm:gap-4">
                <span className="text-xl sm:text-2xl w-6 sm:w-8 text-center">{item.cat_emoji}</span>
                <span className="font-bold text-gray-700 w-16 sm:w-24 text-sm sm:text-base line-clamp-1">{item.cat_name}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-farm-500 rounded-full transition-all duration-1000"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                <div className="text-right min-w-[90px] sm:min-w-[120px]">
                  <span className="font-bold text-farm-600 text-sm sm:text-base">{formatMoney(item.totalAmount).replace('฿', '')}</span>
                  <span className="text-xs sm:text-sm text-farm-700/60 ml-1">({item.percentage}%)</span>
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-400 py-4">ยังไม่มีรายรับ{dateFilter.type === 'all' ? '' : 'ในช่วงเวลานี้'}</p>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="card p-4 sm:p-8">
          <h2 className="text-lg sm:text-xl font-heading font-bold flex items-center gap-2 mb-4 border-b border-gray-100 pb-4">
            <span>🧾</span> รายจ่ายไปไหน
          </h2>
          <div className="space-y-4">
            {expenseSummary.length > 0 ? expenseSummary.map((item) => (
              <div key={item.category} className="flex items-center gap-2 sm:gap-4">
                <span className="text-xl sm:text-2xl w-6 sm:w-8 text-center">{item.cat_emoji}</span>
                <span className="font-bold text-gray-700 w-16 sm:w-24 text-sm sm:text-base line-clamp-1">{item.cat_name}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all duration-1000"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                <div className="text-right min-w-[90px] sm:min-w-[120px]">
                  <span className="font-bold text-red-500 text-sm sm:text-base">{formatMoney(item.totalAmount).replace('฿', '')}</span>
                  <span className="text-xs sm:text-sm text-red-500/60 ml-1">({item.percentage}%)</span>
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-400 py-4">ยังไม่มีรายจ่าย{dateFilter.type === 'all' ? '' : 'ในช่วงเวลานี้'}</p>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Insights */}
      <div className="card p-8 bg-white text-center shadow-lg border-2 border-farm-100">
        <p className="text-xl font-bold text-gray-500 mb-4">สถานะ{dateFilter.type === 'all' ? 'รวมทั้งหมด' : dateFilter.type === 'month' ? 'เดือนนี้' : 'ตามช่วงวันที่เลือก'}</p>
        
        {totalIncome > 0 || totalExpense > 0 ? (
          <>
            <h2 className={cn(
              "text-3xl font-black mb-8",
              isProfit ? "text-farm-600" : "text-red-500"
            )}>
              {isProfit ? '✅ ได้กำไร' : '❌ ขาดทุน'} {formatMoney(Math.abs(balance))} ({profitPercentage}%)
            </h2>
            
            <ul className="text-left max-w-xl mx-auto space-y-3 text-lg text-gray-700">
              {incomeSummary[0] && (
                <li className="flex gap-3">
                  <span>🔹</span>
                  <span>รายรับหลักมาจาก <strong>"{incomeSummary[0].cat_name}"</strong> ({formatMoney(incomeSummary[0].totalAmount)}, {incomeSummary[0].percentage}%)</span>
                </li>
              )}
              {expenseSummary[0] && (
                <li className="flex gap-3">
                  <span>🔸</span>
                  <span>รายจ่ายหลักไปกับ <strong>"{expenseSummary[0].cat_name}"</strong> ({formatMoney(expenseSummary[0].totalAmount)}, {expenseSummary[0].percentage}%)</span>
                </li>
              )}
              {incomeSummary[0] && parseFloat(incomeSummary[0].percentage) > 60 && (
                <li className="flex gap-3 text-yellow-600">
                  <span>⚠️</span>
                  <span>รายรับพึ่งพา <strong>"{incomeSummary[0].cat_name}"</strong> ถึง {incomeSummary[0].percentage}% (มีความเสี่ยงสูง)</span>
                </li>
              )}
            </ul>
          </>
        ) : (
           <p className="text-2xl font-bold text-gray-400 my-8">ยังไม่มีข้อมูล{dateFilter.type === 'all' ? '' : 'ในช่วงเวลานี้'}</p>
        )}
      </div>

    </div>
  );
}
