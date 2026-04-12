import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE, apiFetch } from '../api/api';
import Modal from '../components/Modal';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [infoModal, setInfoModal] = useState(false);
  const [infoForm, setInfoForm] = useState({ phone: '', address: '' });
  const [infoMsg, setInfoMsg] = useState({ text: '', type: '' });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', newPasswordConfirmation: '' });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/users/profile/${user.id}`);
      const json = await res.json();
      if (res.ok) setProfile(json.data);
    } catch {}
  }

  function handleLogout() { logout(); navigate('/'); }

  function openInfoModal() {
    setInfoForm({ phone: profile?.phone || '', address: profile?.address || '' });
    setInfoMsg({ text: '', type: '' });
    setInfoModal(true);
  }

  async function updateInfo(e) {
    e.preventDefault();
    setInfoMsg({ text: '', type: '' });
    try {
      const res = await apiFetch(`${API_BASE}/v1/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: infoForm.phone || null, address: infoForm.address || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfoModal(false);
        loadProfile();
      } else {
        setInfoMsg({ text: data.message || 'Cập nhật thất bại.', type: 'error' });
      }
    } catch {
      setInfoMsg({ text: 'Lỗi kết nối máy chủ.', type: 'error' });
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    const errs = {};
    if (!pwForm.oldPassword) errs.oldPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    if (!pwForm.newPassword) errs.newPassword = 'Vui lòng nhập mật khẩu mới.';
    if (!pwForm.newPasswordConfirmation) errs.newPasswordConfirmation = 'Vui lòng xác nhận mật khẩu mới.';
    if (pwForm.newPassword && pwForm.newPasswordConfirmation && pwForm.newPassword !== pwForm.newPasswordConfirmation) {
      errs.newPasswordConfirmation = 'Mật khẩu xác nhận không khớp.';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setMsg({ text: '', type: '' });
    try {
      const res = await apiFetch(`${API_BASE}/v1/users/profile/change-password/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pwForm),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (res.ok) {
        setMsg({ text: 'Đổi mật khẩu thành công!', type: 'success' });
        setPwForm({ oldPassword: '', newPassword: '', newPasswordConfirmation: '' });
      } else {
        const serverMsg = data.message || '';
        if (serverMsg.toLowerCase().includes('wrong password') || serverMsg.toLowerCase().includes('sai mật khẩu')) {
          setErrors({ oldPassword: 'Mật khẩu hiện tại không đúng.' });
        } else if (serverMsg.toLowerCase().includes('do not match') || serverMsg.toLowerCase().includes('không khớp')) {
          setErrors({ newPasswordConfirmation: 'Mật khẩu xác nhận không khớp.' });
        } else {
          setMsg({ text: serverMsg || 'Đổi mật khẩu thất bại.', type: 'error' });
        }
      }
    } catch {
      setMsg({ text: 'Lỗi kết nối máy chủ.', type: 'error' });
    }
  }

  const p = profile;
  const avatarLetter = (p?.firstName || 'U')[0].toUpperCase();
  const fullName = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '';
  const roleBadge = p?.role === 'ADMIN' ? 'badge-danger' : 'badge-primary';

  return (
    <>
      <div className="profile-layout">
        <div className="card profile-card">
          <div className="card-header">
            <h3 className="card-title">Thông tin tài khoản</h3>
          </div>
          <div className="card-body profile-card-body">
            <div className="profile-avatar-section">
              <div className="user-avatar profile-avatar-lg">{avatarLetter}</div>
              <div>
                <div className="profile-name-heading">{fullName || ''}</div>
                {p && <span className={`badge ${roleBadge}`}>{p.role}</span>}
              </div>
            </div>
            <div className="profile-info-list">
              <div className="profile-info-row">
                <span className="profile-label">Mã thẻ thư viện</span>
                <span>{p?.memberId || ''}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-label">Email</span>
                <span>{p?.email || ''}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-label">Họ</span>
                <span>{p?.firstName || ''}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-label">Tên</span>
                <span>{p?.lastName || ''}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-label">Số điện thoại</span>
                <span>{p?.phone || ''}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-label">Địa chỉ</span>
                <span>{p?.address || ''}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-label">Vai trò</span>
                <span>{p?.role || ''}</span>
              </div>
            </div>
            <div className="profile-logout" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-primary" onClick={openInfoModal}>Cập nhật thông tin</button>
              <button className="btn btn-outline btn-danger-outline" onClick={handleLogout}>Đăng xuất</button>
            </div>
          </div>
        </div>

        <div className="card profile-card">
          <div className="card-header">
            <h3 className="card-title">Đổi mật khẩu</h3>
          </div>
          <div className="card-body profile-card-body">
            <form onSubmit={changePassword} className="form-stack">
              <div className="form-group">
                <label className="form-label">Mật khẩu hiện tại <span className="required">*</span></label>
                <input className="form-control" type="password" value={pwForm.oldPassword} onChange={(e) => setPwForm({ ...pwForm, oldPassword: e.target.value })} />
                {errors.oldPassword && <span className="field-error">{errors.oldPassword}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới <span className="required">*</span></label>
                <input className="form-control" type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
                {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu mới <span className="required">*</span></label>
                <input className="form-control" type="password" value={pwForm.newPasswordConfirmation} onChange={(e) => setPwForm({ ...pwForm, newPasswordConfirmation: e.target.value })} />
                {errors.newPasswordConfirmation && <span className="field-error">{errors.newPasswordConfirmation}</span>}
              </div>
              {msg.text && (
                <div className={`change-pw-msg ${msg.type === 'success' ? 'text-success' : 'text-danger'}`}>{msg.text}</div>
              )}
              <button type="submit" className="btn btn-primary">Đổi mật khẩu</button>
            </form>
          </div>
        </div>
      </div>

      <Modal
        active={infoModal}
        onClose={() => setInfoModal(false)}
        title="Cập nhật thông tin"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setInfoModal(false)}>Hủy</button>
            <button className="btn btn-primary" form="infoForm" type="submit">Lưu</button>
          </>
        }
      >
        <form id="infoForm" onSubmit={updateInfo}>
          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input
              className="form-control"
              type="tel"
              placeholder="VD: 0901234567"
              pattern="[0-9]{10,11}"
              value={infoForm.phone}
              onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Địa chỉ</label>
            <input
              className="form-control"
              placeholder="Nhập địa chỉ"
              value={infoForm.address}
              onChange={(e) => setInfoForm({ ...infoForm, address: e.target.value })}
            />
          </div>
          {infoMsg.text && (
            <div className={`change-pw-msg ${infoMsg.type === 'success' ? 'text-success' : 'text-danger'}`}>{infoMsg.text}</div>
          )}
        </form>
      </Modal>
    </>
  );
}
