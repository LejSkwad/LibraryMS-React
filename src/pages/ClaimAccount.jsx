import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../api/api';

const EMPTY_FORM = { memberId: '', email: '', password: '', firstName: '', lastName: '' };

export default function ClaimAccount() {
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
      const res = await fetch(`${API_BASE}/v1/auth/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || 'Liên kết thất bại'); return; }
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
          <h1>Liên kết tài khoản</h1>
          <p>Bạn đã có thẻ thư viện? Tạo đăng nhập online tại đây</p>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Mã thẻ thư viện <span className="required">*</span></label>
            <input className="form-control" placeholder="VD: LIB-000001" required value={form.memberId} onChange={set('memberId')} />
            <span className="form-text">Mã in trên thẻ thư viện của bạn</span>
          </div>

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
          <span className="form-text" style={{ display: 'block', marginTop: '-0.5rem', marginBottom: '1rem' }}>
            Họ tên phải khớp với thông tin đã đăng ký tại thư viện
          </span>

          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input className="form-control" type="email" placeholder="Nhập email" required value={form.email} onChange={set('email')} />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu <span className="required">*</span></label>
            <input className="form-control" type="password" placeholder="Tối thiểu 6 ký tự" required minLength={6} value={form.password} onChange={set('password')} />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Đang xử lý...' : 'Liên kết tài khoản'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.875rem', color: 'var(--text-muted)' }}>
          Chưa có thẻ? <Link to="/register">Tạo tài khoản mới</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '.875rem', color: 'var(--text-muted)' }}>
          Đã có tài khoản? <Link to="/">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
