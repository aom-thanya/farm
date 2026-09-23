import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { authApi } from '../api/gasApi';

// Mock zustand store
vi.mock('../store/useStore', () => ({
  useStore: vi.fn(),
}));
vi.mock('../api/gasApi', () => ({
  authApi: { login: vi.fn() }
}));

const mockSetUser = vi.fn();

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.mockImplementation(selector => selector({ setUser: mockSetUser, user: null }));
  });

  it('redirects an already signed-in user to the home page', () => {
    useStore.mockImplementation(selector => selector({ setUser: mockSetUser, user: { token: 'saved-token' } }));
    render(<MemoryRouter initialEntries={['/login']}><Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<div>Home page</div>} />
    </Routes></MemoryRouter>);
    expect(screen.getByText('Home page')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Farm Money')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('กรอกชื่อผู้ใช้...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('กรอกรหัสผ่าน...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /เข้าสู่ระบบ/i })).toBeInTheDocument();
  });

  it('shows error when submitting empty form', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    fireEvent.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/i }));
    
    expect(screen.getByText('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน')).toBeInTheDocument();
  });

  it('handles mock login correctly', async () => {
    authApi.login.mockResolvedValue({ success: true, data: { id: 'u1', username: 'admin', token: 'test-token' } });
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    fireEvent.change(screen.getByPlaceholderText('กรอกชื่อผู้ใช้...'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่าน...'), { target: { value: '1234' } });
    
    fireEvent.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/i }));
    
    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith({ id: 'u1', username: 'admin', token: 'test-token' });
    }, { timeout: 1500 }); // Mock login has a 1000ms delay
  });

  it('shows error on invalid credentials', async () => {
    authApi.login.mockRejectedValue(new Error('Username หรือ Password ไม่ถูกต้อง'));
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    fireEvent.change(screen.getByPlaceholderText('กรอกชื่อผู้ใช้...'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByPlaceholderText('กรอกรหัสผ่าน...'), { target: { value: 'pass' } });
    
    fireEvent.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/i }));
    
    await waitFor(() => {
      expect(screen.getByText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')).toBeInTheDocument();
    }, { timeout: 1500 });
  });
});
