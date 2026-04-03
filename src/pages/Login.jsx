import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ socialNumber: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socialNumber: form.socialNumber, password: form.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'Đăng nhập thất bại');
        return;
      }
      const loginData = json.data;
      const profileRes = await fetch(`${API_BASE}/v1/users/profile/${loginData.id}`, {
        headers: { Authorization: `Bearer ${loginData.token}` },
      });
      const profileJson = await profileRes.json();
      const fullUser = profileRes.ok ? { ...loginData, ...profileJson.data } : loginData;
      login(fullUser);
      navigate(fullUser.role === 'BORROWER' ? '/books' : '/dashboard');
    } catch {
      setError('Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="logo">📚</div>
          <h1>Quản lý thư viện</h1>
          <p>Đăng nhập để tiếp tục</p>
        </div>
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Số CCCD <span className="required">*</span>
            </label>
            <input
              className="form-control"
              type="text"
              placeholder="Nhập số CCCD"
              value={form.socialNumber}
              onChange={(e) => setForm({ ...form, socialNumber: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Mật khẩu <span className="required">*</span>
            </label>
            <input
              className="form-control"
              type="password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
