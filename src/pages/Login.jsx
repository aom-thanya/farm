import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { authApi } from '../api/gasApi';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useStore(state => state.setUser);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await authApi.login(username, password);
      if (res.success) {
        setUser(res.data);
        navigate('/');
      } else {
        setError(res.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
      setLoading(false);
      
    } catch (err) {
      setError(err.message === 'Username หรือ Password ไม่ถูกต้อง'
        ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
        : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-farm-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-farm-600 p-8 text-center text-white">
          <h1 className="text-4xl font-heading font-bold mb-2">Farm Money</h1>
          <p className="text-lg text-farm-100">ระบบบันทึกรายรับ-รายจ่ายสวน</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium">
              {error}
            </div>
          )}
          
          <div>
            <label className="label-text">ชื่อผู้ใช้ (Username)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="กรอกชื่อผู้ใช้..."
            />
          </div>
          
          <div>
            <label className="label-text">รหัสผ่าน (Password)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="กรอกรหัสผ่าน..."
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary mt-8"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : null}
            เข้าสู่ระบบ
          </button>
          

        </form>
      </div>
    </div>
  );
}
