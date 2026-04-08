import { useEffect, useState } from 'react';
import { API_BASE, PAGE_SIZE, apiFetch, formatDate } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';

const EMPTY_FORM = { firstName: '', lastName: '', phone: '', address: '', email: '', password: '' };

export default function Borrowers() {
  const { items: borrowers, page, currentPage, setCurrentPage, setPageResult, tableInfo } = usePagination();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modal, setModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const debouncedLoad = useDebounce((v) => { setCurrentPage(0); load(0, v, dateFrom, dateTo); });

  useEffect(() => { load(0, '', '', ''); }, []);

  async function load(pg = currentPage, kw = search, df = dateFrom, dt = dateTo) {
    const params = new URLSearchParams({ page: pg, size: PAGE_SIZE, role: 'BORROWER' });
    if (kw) params.append('keyword', kw);
    if (df) params.append('createDateFrom', formatDate(df));
    if (dt) params.append('createDateTo', formatDate(dt));
    try {
      const res = await apiFetch(`${API_BASE}/v1/users?${params}`);
      const json = await res.json();
      setPageResult(json.data);
    } catch {}
  }

  function handleSearch(v) { setSearch(v); debouncedLoad(v); }
  function clearSearch() { setSearch(''); setDateFrom(''); setDateTo(''); setCurrentPage(0); load(0, '', '', ''); }
  function goToPage(p) { setCurrentPage(p); load(p); }

  function openAddModal() {
    setIsEdit(false); setEditingId(null);
    setForm(EMPTY_FORM);
    setModal(true);
  }

  function openEditModal(b) {
    setIsEdit(true); setEditingId(b.id);
    setForm({
      firstName: b.fullName ? b.fullName.split(' ').slice(0, -1).join(' ') : '',
      lastName: b.fullName ? b.fullName.split(' ').slice(-1)[0] : '',
      phone: b.phone || '',
      address: b.address || '',
    });
    setModal(true);
  }

  async function saveBorrower(e) {
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
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone || null,
            address: form.address || null,
            email: form.email || null,
            password: form.password || null,
            role: 'BORROWER',
          }),
        });
        const json = await res.json();
        alert(json.message);
        if (!res.ok) return;
      }
      setModal(false);
      load();
    } catch { alert('Không thể kết nối đến server!'); }
  }

  async function confirmDelete() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/users/${deletingId}`, { method: 'DELETE' });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setDeleteModal(false);
      load();
    } catch { alert('Không thể kết nối đến server!'); }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAddModal}>+ Thêm người mượn</button>
        </div>
      </div>

      <div className="txn-filter">
        <div className="txn-filter-top">
          <input className="form-control" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Tìm theo tên, SĐT, mã thẻ, email..." />
          <button className="btn btn-outline btn-sm" onClick={clearSearch}>Xóa bộ lọc</button>
        </div>
        <div className="txn-filter-dates">
          <div className="txn-filter-group">
            <span className="txn-filter-group-label">Ngày đăng ký</span>
            <input className="form-control" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(0); load(0, search, e.target.value, dateTo); }} />
            <span className="txn-filter-sep">—</span>
            <input className="form-control" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(0); load(0, search, dateFrom, e.target.value); }} />
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Mã thẻ</th><th>Email</th><th>Họ tên</th>
                <th>Số điện thoại</th><th>Địa chỉ</th><th>Ngày đăng ký</th><th>Đang mượn</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {borrowers.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
              ) : borrowers.map((b) => {
                const qty = b.borrowingCount || 0;
                return (
                  <tr key={b.id}>
                    <td><strong>{b.id}</strong></td>
                    <td><code style={{ fontSize: '.8125rem' }}>{b.memberId}</code></td>
                    <td>{b.email || '—'}</td>
                    <td>{b.fullName}</td>
                    <td>{b.phone}</td>
                    <td>{b.address}</td>
                    <td>{b.registrationDate}</td>
                    <td><span className={`badge ${qty > 0 ? 'badge-warning' : 'badge-success'}`}>{qty} cuốn</span></td>
                    <td className="actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openEditModal(b)}>Sửa</button>
                      <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => { setDeletingId(b.id); setDeleteModal(true); }}>Xóa</button>
                    </td>
                  </tr>
                );
              })}
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
        title={isEdit ? 'Chỉnh sửa người mượn' : 'Thêm người mượn mới'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(false)}>Hủy</button>
            <button className="btn btn-primary" form="borrowerForm" type="submit">Lưu</button>
          </>
        }
      >
        <form id="borrowerForm" onSubmit={saveBorrower}>
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
              <label className="form-label">Số điện thoại</label>
              <input className="form-control" type="tel" placeholder="VD: 0901234567" pattern="[0-9]{10,11}" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Địa chỉ</label>
              <input className="form-control" placeholder="Nhập địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          {!isEdit && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" placeholder="Nhập email (nếu có)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <input className="form-control" type="password" placeholder="Bắt buộc nếu có email" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
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
        <p>Bạn có chắc chắn muốn xóa người mượn này không?</p>
        <p className="text-danger" style={{ fontSize: '.875rem' }}>Không thể xóa người mượn đang có sách chưa trả.</p>
      </Modal>
    </>
  );
}
