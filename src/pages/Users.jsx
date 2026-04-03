import { useEffect, useState } from 'react';
import { API_BASE, PAGE_SIZE, apiFetch } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';

export default function Users() {
  const { items: users, page, currentPage, setCurrentPage, setPageResult, tableInfo } = usePagination();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ADMIN');
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ socialNumber: '', firstName: '', lastName: '', phone: '', role: '', address: '', password: '' });
  const debouncedLoad = useDebounce((v) => { setCurrentPage(0); loadUsers(0, v, roleFilter); });

  useEffect(() => { loadUsers(0, '', 'ADMIN'); }, []);

  async function loadUsers(pg = currentPage, kw = search, role = roleFilter) {
    const params = new URLSearchParams({ page: pg, size: PAGE_SIZE, role });
    if (kw) params.append('keyword', kw);
    try {
      const res = await apiFetch(`${API_BASE}/v1/users?${params}`);
      const json = await res.json();
      setPageResult(json.data);
    } catch {}
  }

  function handleSearch(v) {
    setSearch(v);
    debouncedLoad(v);
  }

  function handleFilter(v) {
    setRoleFilter(v);
    setCurrentPage(0);
    loadUsers(0, search, v);
  }

  function clearSearch() {
    setSearch(''); setRoleFilter('ADMIN'); setCurrentPage(0);
    loadUsers(0, '', 'ADMIN');
  }

  function goToPage(p) { setCurrentPage(p); loadUsers(p); }

  function openAddModal() {
    setIsEdit(false); setEditingId(null);
    setForm({ socialNumber: '', firstName: '', lastName: '', phone: '', role: '', address: '', password: '' });
    setModal(true);
  }

  function openEditModal(u) {
    setIsEdit(true); setEditingId(u.id);
    const spaceIdx = (u.fullName || '').lastIndexOf(' ');
    setForm({
      socialNumber: u.socialNumber || '',
      firstName: spaceIdx > -1 ? (u.fullName || '').substring(0, spaceIdx) : (u.fullName || ''),
      lastName: spaceIdx > -1 ? (u.fullName || '').substring(spaceIdx + 1) : '',
      phone: u.phone || '',
      role: u.role || '',
      address: u.address || '',
      password: '',
    });
    setModal(true);
  }

  async function saveUser(e) {
    e.preventDefault();
    if (!isEdit && !form.password) { alert('Vui lòng nhập mật khẩu'); return; }
    try {
      if (editingId) {
        const res = await apiFetch(`${API_BASE}/v1/users/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: form.phone, address: form.address }),
        });
        const json = await res.json();
        alert(json.message);
        if (!res.ok) return;
      } else {
        const data = { firstName: form.firstName, lastName: form.lastName, socialNumber: form.socialNumber, phone: form.phone, role: form.role, address: form.address, password: form.password };
        const res = await apiFetch(`${API_BASE}/v1/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        alert(json.message);
        if (!res.ok) return;
      }
      setModal(false);
      loadUsers();
    } catch {
      alert('Không thể kết nối đến server!');
    }
  }

  async function confirmDelete() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/users/${deletingId}`, { method: 'DELETE' });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setDeleteModal(false);
      loadUsers();
    } catch {
      alert('Không thể kết nối đến server!');
    }
  }


  return (
    <>
      <div className="page-header">
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAddModal}>➕ Thêm User mới</button>
        </div>
      </div>

      <div className="search-panel">
        <div className="search-panel-header">
          <span>🔍 Tìm kiếm</span>
          <button className="btn btn-sm btn-outline" onClick={clearSearch}>Xóa bộ lọc</button>
        </div>
        <div className="search-panel-body" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="search-field">
            <label className="form-label">Tên / SĐT / Mã CCCD</label>
            <input className="form-control" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Nhập từ khóa tìm kiếm..." />
          </div>
          <div className="search-field">
            <label className="form-label">Vai trò</label>
            <select className="form-control" value={roleFilter} onChange={(e) => handleFilter(e.target.value)}>
              <option value="ADMIN">Admin</option>
              <option value="LIBRARIAN">Librarian</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Mã CCCD</th><th>Họ tên</th><th>Vai trò</th>
                <th>Số điện thoại</th><th>Địa chỉ</th><th>Ngày đăng ký</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.id}</strong></td>
                  <td>{u.socialNumber}</td>
                  <td>{u.fullName}</td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : 'badge-primary'}`}>{u.role}</span></td>
                  <td>{u.phone}</td>
                  <td>{u.address}</td>
                  <td>{u.registrationDate}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-outline" onClick={() => openEditModal(u)}>✏️</button>
                    <button className="btn btn-sm btn-outline" onClick={() => { setDeletingId(u.id); setDeleteModal(true); }} disabled={u.id === 1}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span className="table-info">{tableInfo}</span>
          <Pagination page={page} currentPage={currentPage} onPageChange={goToPage} />
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        active={modal}
        onClose={() => setModal(false)}
        title={isEdit ? 'Chỉnh sửa User' : 'Thêm User mới'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(false)}>Hủy</button>
            <button className="btn btn-primary" form="userForm" type="submit">Lưu</button>
          </>
        }
      >
        <form id="userForm" onSubmit={saveUser}>
          {!isEdit && (
            <div className="form-group">
              <label className="form-label">Mật khẩu <span className="required">*</span></label>
              <input className="form-control" type="password" placeholder="Nhập mật khẩu" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <span className="form-text">Tối thiểu 6 ký tự</span>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Số CCCD <span className="required">*</span></label>
              <input className="form-control" required placeholder="VD: 001234567890" value={form.socialNumber} disabled={isEdit} onChange={(e) => setForm({ ...form, socialNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Vai trò <span className="required">*</span></label>
              <select className="form-control" required value={form.role} disabled={isEdit} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="">-- Chọn vai trò --</option>
                <option value="LIBRARIAN">Librarian (Thủ thư)</option>
                <option value="ADMIN">Admin (Quản trị viên)</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Họ <span className="required">*</span></label>
              <input className="form-control" required placeholder="Nhập họ" value={form.firstName} disabled={isEdit} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tên <span className="required">*</span></label>
              <input className="form-control" required placeholder="Nhập tên" value={form.lastName} disabled={isEdit} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Số điện thoại <span className="required">*</span></label>
              <input className="form-control" type="tel" required placeholder="VD: 0901234567" pattern="[0-9]{10,11}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Địa chỉ</label>
            <textarea className="form-control" rows={2} placeholder="Nhập địa chỉ đầy đủ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        active={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Xác nhận xóa"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteModal(false)}>Hủy</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Xóa</button>
          </>
        }
      >
        <p>Bạn có chắc chắn muốn xóa user này không?</p>
        <p className="text-danger" style={{ fontSize: '.875rem' }}>Hành động này không thể hoàn tác.</p>
      </Modal>
    </>
  );
}
