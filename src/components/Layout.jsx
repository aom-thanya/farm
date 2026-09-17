import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, List, Settings, LogOut, ChevronLeft, ChevronRight, Plus, Menu } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import AddTransactionModal from './AddTransactionModal';
import { transactionApi, categoryApi, authApi } from '../api/gasApi';

export default function Layout() {
  const user = useStore(state => state.user);
  const logout = useStore(state => state.logout);
  const dateFilter = useStore(state => state.dateFilter);
  const setDateFilter = useStore(state => state.setDateFilter);
  const setTransactions = useStore(state => state.setTransactions);
  const setCategories = useStore(state => state.setCategories);
  const setLoading = useStore(state => state.setLoading);
  
  const navigate = useNavigate();
  const location = useLocation();

  const [modalType, setModalType] = useState(null); // 'income' | 'expense' | null
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const loadData = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setLoadError('');
      try {
        const [txRes, catRes] = await Promise.all([
          transactionApi.getTransactions(),
          categoryApi.getCategories()
        ]);
        if (txRes.success) {
          setTransactions(txRes.data);
        }
        if (catRes.success) {
          setCategories(catRes.data);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoadError('โหลดข้อมูลไม่สำเร็จ โปรดลองเปิดหน้านี้อีกครั้ง');
      } finally {
        if (showLoading) setLoading(false);
      }
    };
    
    loadData();

    // Auto-refresh when user switches back to this tab (e.g., after editing in Google Sheets)
    const handleFocus = () => loadData(false); // false = no skeleton loading flash
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadData(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, setCategories, setLoading, setTransactions]);

  // Close mobile menu when route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    authApi.logout(user.id).catch(error => console.error('Failed to record logout:', error));
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'รายการทั้งหมด', path: '/transactions', icon: List },
    { name: 'จัดการประเภท', path: '/categories', icon: Settings },
  ];

  if (!user) return <Outlet />;

  // Show the header controls on Dashboard and Transactions page
  const showHeader = location.pathname === '/' || location.pathname === '/transactions';
  
  const showSidebarText = isSidebarOpen || isMobileMenuOpen;

  return (
    <div className={cn(
      "min-h-screen bg-gray-50 pb-24 md:pb-0 transition-all duration-300",
      isSidebarOpen ? "md:pl-72" : "md:pl-24"
    )}>
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-farm-700 rounded-full flex items-center justify-center text-xl shadow-inner">🌾</div>
          <h1 className="font-heading font-bold text-xl text-farm-900">บัญชีฟาร์ม</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-7 h-7 text-gray-700" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside 
        className={cn(
          "flex flex-col h-screen fixed left-0 top-0 bg-farm-800 text-white shadow-xl transition-all duration-300 z-50",
          // Desktop behavior
          "md:translate-x-0",
          isSidebarOpen ? "md:w-72" : "md:w-24",
          // Mobile behavior
          isMobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"
        )}
      >
        <div className={cn(
          "p-6 flex items-center border-b border-farm-700/50 h-[104px]",
          showSidebarText ? "justify-between" : "justify-center"
        )}>
          {showSidebarText && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-farm-700 rounded-full flex items-center justify-center text-2xl shadow-inner">🌾</div>
              <div>
                <h1 className="text-xl font-heading font-bold leading-tight">บัญชีฟาร์ม</h1>
                <p className="text-xs text-farm-300 mt-0.5">Farm Money Tracker</p>
              </div>
            </div>
          )}
          <button 
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileMenuOpen(false);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
            className="p-3 hover:bg-farm-700 rounded-xl transition-colors hidden md:block"
            title={isSidebarOpen ? "หุบเมนู" : "ขยายเมนู"}
          >
            {isSidebarOpen ? <ChevronLeft className="w-6 h-6 text-farm-200" /> : <Menu className="w-8 h-8 text-farm-200" />}
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.name}
              className={({ isActive }) => cn(
                "flex items-center gap-4 py-4 rounded-2xl text-lg font-bold transition-all whitespace-nowrap",
                showSidebarText ? "px-6" : "px-0 justify-center",
                isActive 
                  ? "bg-farm-600 text-white shadow-md" 
                  : "text-farm-200 hover:bg-farm-700/50 hover:text-white"
              )}
            >
              <item.icon className="w-7 h-7 flex-shrink-0" />
              {showSidebarText && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>
        
        <div className={cn("p-4 border-t border-farm-700/50", !showSidebarText && "flex flex-col items-center")}>
          {showSidebarText && <p className="text-sm text-farm-300 mb-4 px-2 truncate">ผู้ใช้: {user.username}</p>}
          <button 
            onClick={handleLogout}
            title="ออกจากระบบ"
            className={cn(
              "flex items-center gap-3 py-4 rounded-2xl text-lg font-bold text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors whitespace-nowrap",
              showSidebarText ? "px-6 w-full" : "px-0 justify-center w-14"
            )}
          >
            <LogOut className="w-7 h-7 flex-shrink-0" />
            {showSidebarText && <span>ออกจากระบบ</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col min-h-screen">
        {loadError && <p role="alert" className="mb-4 text-red-600">{loadError}</p>}
        
        {/* Top Header (Month Selector & Add Buttons) */}
        {showHeader && (
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            {/* Month Selector & View Toggle */}
            <div className="flex flex-col items-center gap-4 w-full md:w-auto">
              {/* Toggle Switch */}
              <div className="flex bg-gray-200/80 p-1.5 rounded-2xl w-full md:w-[320px]">
                <button 
                  onClick={() => setDateFilter({ type: 'month', date: new Date() })}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all", 
                    dateFilter.type === 'month' ? "bg-white text-farm-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  รายเดือน
                </button>
                <button 
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setDateFilter({ type: 'range', start: today, end: today });
                  }}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all", 
                    dateFilter.type === 'range' ? "bg-white text-farm-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  ช่วงวันที่
                </button>
                <button 
                  onClick={() => setDateFilter({ type: 'all' })}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all", 
                    dateFilter.type === 'all' ? "bg-white text-farm-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  ทั้งหมด
                </button>
              </div>

              {/* Month Selector */}
              {dateFilter.type === 'month' && (
                <div className="flex items-center justify-between w-full md:w-auto md:gap-4 bg-white md:bg-transparent rounded-2xl p-2 md:p-0 shadow-sm md:shadow-none animate-in fade-in slide-in-from-top-2 duration-300">
                  <button 
                    onClick={() => setDateFilter({ type: 'month', date: subMonths(dateFilter.date, 1) })}
                    className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors shadow-sm md:shadow-none"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <h2 className="text-xl md:text-2xl font-heading font-bold px-4 text-center text-gray-800 flex-1 min-w-[160px]">
                    {format(dateFilter.date, 'MMMM yyyy', { locale: th })}
                  </h2>
                  
                  <button 
                    onClick={() => setDateFilter({ type: 'month', date: addMonths(dateFilter.date, 1) })}
                    className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors shadow-sm md:shadow-none"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}

              {/* Date Range Selector */}
              {dateFilter.type === 'range' && (
                <div className="flex items-center gap-2 w-full md:w-auto animate-in fade-in slide-in-from-top-2 duration-300 bg-white p-2 rounded-2xl shadow-sm md:shadow-none md:bg-transparent md:p-0">
                  <input 
                    type="date"
                    value={dateFilter.start}
                    onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm font-bold text-gray-700 outline-none focus:border-farm-500 w-full"
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input 
                    type="date"
                    value={dateFilter.end}
                    onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm font-bold text-gray-700 outline-none focus:border-farm-500 w-full"
                  />
                </div>
              )}
            </div>

            {/* Add Buttons */}
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={() => setModalType('income')}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#55a653] hover:bg-farm-600 active:bg-farm-700 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-sm transition-colors"
              >
                <Plus className="w-5 h-5" />
                รายรับ
              </button>
              <button 
                onClick={() => setModalType('expense')}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#e84b4b] hover:bg-red-600 active:bg-red-700 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-sm transition-colors"
              >
                <MinusCircleIcon className="w-5 h-5" />
                รายจ่าย
              </button>
            </div>
          </div>
        )}

        <div className="flex-1">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)] z-40">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center p-3 rounded-xl min-w-[70px] transition-colors",
                isActive ? "text-farm-700 font-bold bg-farm-50" : "text-gray-400 font-medium"
              )}
            >
              <item.icon className="w-7 h-7 mb-1" />
              <span className="text-[12px] whitespace-nowrap">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Modals */}
      <AddTransactionModal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)} 
        type={modalType} 
      />
    </div>
  );
}

// Temporary icon since MinusCircle is not imported at top for brevity, let's just use it here or add to imports
function MinusCircleIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
    </svg>
  );
}
