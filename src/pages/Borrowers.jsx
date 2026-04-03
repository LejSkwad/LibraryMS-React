import { useEffect, useState } from 'react';
import { API_BASE, PAGE_SIZE, apiFetch, formatDate } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';

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
  const [form, setForm] = useState({ socialNumber: '', firstName: '', lastName: '', phone: '', address: '', password: '' });
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

  function handleSearch(v) {
    setSearch(v);
    debouncedLoad(v);
  }

  function clearSearch() {
    setSearch(''); setDateFrom(''); setDateTo(''); setCurrentPage(0);
    load(0, '', '', '');
  }

  function goToPage(p) { setCurrentPage(p); load(p); }

  function openAddModal() {
    setIsEdit(false); setEditingId(null);
    setForm({ socialNumber: '', firstName: '', lastName: '', phone: '', address: '', password: '' });
    setModal(true);
  }

  function openEditModal(b) {
    setIsEdit(true); setEditingId(b.id);
    const spaceIdx = (b.fullName || '').lastIndexOf(' ');
    setForm({
      socialNumber: b.socialNumber || '',
      firstName: spaceIdx > -1 ? (b.fullName || '').substring(0, spaceIdx) : (b.fullName || ''),
      lastName: spaceIdx > -1 ? (b.fullName || '').substring(spaceIdx + 1) : '',
      phone: b.phone || '',
      address: b.address || '',
      password: '',
    });
    setModal(true);
  }

  async function saveBorrower(e) {
    e.preventDefault();
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
        const data = { ...form, role: 'BORROWER' };
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
      load();
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
      load();
    } catch {
      alert('Không thể kết nối đến server!');
    }
  }


  return (
    <>
      <div className="page-header">
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openAddModal}>➕ Thêm người mượn</button>
        </div>
      </div>

      <div className="search-panel">
        <div className="search-panel-header">
          <span>🔍 Tìm kiếm</span>
          <button className="btn btn-sm btn-outline" onClick={clearSearch}>Xóa bộ lọc</button>
        </div>
        <div className="search-panel-body">
          <div className="search-field" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Tên / SĐT / Mã người mượn</label>
            <input className="form-control" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Nhập từ khóa tìm kiếm..." />
          </div>
          <div className="search-field" style={{ gridColumn: 'span 1' }} />
          <div className="search-field">
            <label className="form-label">Ngày đăng ký từ</label>
            <input className="form-control" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(0); load(0, search, e.target.value, dateTo); }} />
          </div>
          <div className="search-field">
            <label className="form-label">Đến ngày</label>
            <input className="form-control" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(0); load(0, search, dateFrom, e.target.value); }} />
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Mã CCCD</th><th>Họ tên</th><th>Số điện thoại</th>
                <th>Địa chỉ</th><th>Ngày đăng ký</th><th>Đang mượn</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {borrowers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
              ) : borrowers.map((b) => {
                const qty = b.borrowingCount || 0;
                return (
                  <tr key={b.id}>
                    <td><strong>{b.id}</strong></td>
                    <td>{b.socialNumber}</td>
                    <td>{b.fullName}</td>
                    <td>{b.phone}</td>
                    <td>{b.address}</td>
                    <td>{b.registrationDate}</td>
                    <td><span className={`badge ${qty > 0 ? 'badge-warning' : 'badge-success'}`}>{qty} cuốn</span></td>
                    <td className="actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openEditModal(b)}>✏️</button>
                      <button className="btn btn-sm btn-outline" onClick={() => { setDeletingId(b.id); setDeleteModal(true); }}>🗑️</button>
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

      {/* Add/Edit Modal */}
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
          {!isEdit && (
            <div className="form-group">
              <label className="form-label">Mật khẩu <span className="required">*</span></label>
              <input className="form-control" type="password" required placeholder="Nhập mật khẩu" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <span className="form-text">Tối thiểu 6 ký tự</span>
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Số CCCD <span className="required">*</span></label>
              <input className="form-control" required placeholder="VD: 001234567890" value={form.socialNumber} disabled={isEdit} onChange={(e) => setForm({ ...form, socialNumber: e.target.value })} />
              <span className="form-text">Số căn cước công dân của người mượn</span>
            </div>
            <div className="form-group">
              <label className="form-label">Họ <span className="required">*</span></label>
              <input className="form-control" required placeholder="Nhập họ" value={form.firstName} disabled={isEdit} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
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
            <label className="form-label">Địa chỉ <span className="required">*</span></label>
            <textarea className="form-control" required rows={2} placeholder="Nhập địa chỉ đầy đủ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
        <p>Bạn có chắc chắn muốn xóa người mượn này không?</p>
        <p className="text-danger" style={{ fontSize: '.875rem' }}>Lưu ý: Không thể xóa người mượn đang có sách chưa trả.</p>
      </Modal>
    </>
  );
}
