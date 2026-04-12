import { useEffect, useState } from 'react';
import { API_BASE, PAGE_SIZE, apiFetch } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';

const EMPTY_FORM = { email: '', firstName: '', lastName: '', role: '', password: '', phone: '', address: '' };

export default function Users() {
  const { items: users, page, currentPage, setCurrentPage, setPageResult, tableInfo } = usePagination();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ADMIN');
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
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

  function handleSearch(v) { setSearch(v); debouncedLoad(v); }
  function handleFilter(v) { setRoleFilter(v); setCurrentPage(0); loadUsers(0, search, v); }
  function clearSearch() { setSearch(''); setRoleFilter('ADMIN'); setCurrentPage(0); loadUsers(0, '', 'ADMIN'); }
  function goToPage(p) { setCurrentPage(p); loadUsers(p); }

  function openAddModal() {
    setIsEdit(false); setEditingId(null);
    setForm(EMPTY_FORM);
    setModal(true);
  }

  function openEditModal(u) {
    setIsEdit(true); setEditingId(u.id);
    setForm({
      email: u.email || '',
      firstName: u.fullName ? u.fullName.split(' ').slice(0, -1).join(' ') : '',
      lastName: u.fullName ? u.fullName.split(' ').slice(-1)[0] : '',
      role: u.role || '',
      password: '',
      phone: u.phone || '',
      address: u.address || '',
    });
    setModal(true);
  }

  async function saveUser(e) {
    e.preventDefault();
    try {
      if (isEdit) {
        const res = await apiFetch(`${API_BASE}/v1/users/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: form.phone, address: form.address }),
        });
        const json = await res.json();
        alert(json.message);
        if (!res.ok) return;
      } else {
        const res = await apiFetch(`${API_BASE}/v1/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
            role: form.role,
          }),
        });
        const json = await res.json();
        alert(json.message);
        if (!res.ok) return;
      }
      setModal(false);
      loadUsers();
    } catch { alert('Không thể kết nối đến server!'); }
  }

  async function confirmDelete() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/users/${deletingId}`, { method: 'DELETE' });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setDeleteModal(false);
      loadUsers();
    } catch { alert('Không thể kết nối đến server!'); }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAddModal}>+ Thêm User mới</button>
        </div>
      </div>
      
      <div className="txn-filter">
        <div className="txn-filter-top">
          <input className="form-control" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Tìm theo tên, SĐT, mã thẻ, email..." />
          <select className="form-control" style={{ maxWidth: 180 }} value={roleFilter} onChange={(e) => handleFilter(e.target.value)}>
            <option value="ADMIN">Admin</option>
            <option value="LIBRARIAN">Librarian</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={clearSearch}>Xóa bộ lọc</button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Mã thẻ</th><th>Email</th><th>Họ tên</th>
                <th>Vai trò</th><th>Số điện thoại</th><th>Ngày đăng ký</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.id}</strong></td>
                  <td><code style={{ fontSize: '.8125rem' }}>{u.memberId}</code></td>
                  <td>{u.email || '—'}</td>
                  <td>{u.fullName}</td>
                  <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : 'badge-primary'}`}>{u.role}</span></td>
                  <td>{u.phone}</td>
                  <td>{u.registrationDate}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-outline" onClick={() => openEditModal(u)}>Sửa</button>
                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => { setDeletingId(u.id); setDeleteModal(true); }} disabled={u.id === 1}>Xóa</button>
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
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vai trò <span className="required">*</span></label>
              <select className="form-control" required value={form.role} disabled={isEdit} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="">-- Chọn vai trò --</option>
                <option value="LIBRARIAN">Librarian (Thủ thư)</option>
                <option value="ADMIN">Admin (Quản trị viên)</option>
              </select>
            </div>
          </div>
          {!isEdit && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input className="form-control" type="email" required placeholder="Nhập email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu <span className="required">*</span></label>
                <input className="form-control" type="password" required placeholder="Tối thiểu 6 ký tự" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
          )}
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
          {isEdit && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input className="form-control" placeholder="Nhập số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Địa chỉ</label>
                  <input className="form-control" placeholder="Nhập địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
            </>
          )}
        </form>
      </Modal>

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
