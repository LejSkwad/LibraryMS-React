import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const justRegistered = location.state?.registered;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || 'Đăng nhập thất bại'); return; }
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
        {justRegistered && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>Đăng ký thành công! Hãy đăng nhập.</div>}
        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input
              className="form-control"
              type="email"
              placeholder="Nhập email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu <span className="required">*</span></label>
            <input
              className="form-control"
              type="password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.875rem', color: 'var(--text-muted)' }}>
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
