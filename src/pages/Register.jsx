import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../api/api';

const EMPTY_FORM = { email: '', password: '', firstName: '', lastName: '' };

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || 'Đăng ký thất bại'); return; }
      navigate('/', { state: { registered: true } });
    } catch {
      setError('Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-box" style={{ maxWidth: 480 }}>
        <div className="login-header">
          <div className="logo">📚</div>
          <h1>Đăng ký tài khoản</h1>
          <p>Tạo tài khoản thư viện của bạn</p>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Họ <span className="required">*</span></label>
              <input className="form-control" placeholder="Nhập họ" required value={form.firstName} onChange={set('firstName')} />
            </div>
            <div className="form-group">
              <label className="form-label">Tên <span className="required">*</span></label>
              <input className="form-control" placeholder="Nhập tên" required value={form.lastName} onChange={set('lastName')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input className="form-control" type="email" placeholder="Nhập email" required value={form.email} onChange={set('email')} />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu <span className="required">*</span></label>
            <input className="form-control" type="password" placeholder="Tối thiểu 6 ký tự" required minLength={6} value={form.password} onChange={set('password')} />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.875rem', color: 'var(--text-muted)' }}>
          Đã có thẻ thư viện? <Link to="/claim">Liên kết tài khoản</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '.875rem', color: 'var(--text-muted)' }}>
          Đã có tài khoản? <Link to="/">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
