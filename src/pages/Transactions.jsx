import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, PAGE_SIZE, apiFetch, formatDate, getStatusBadge } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';

export default function Transactions() {
  const { user } = useAuth();
  const isBorrower = user?.role === 'BORROWER';
  const isAdmin = user?.role === 'ADMIN';

  const { items: txns, page, currentPage, setCurrentPage, setPageResult, tableInfo } = usePagination();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState({ keyword: '', socialNumber: '', borrowDateFrom: '', borrowDateTo: '', dueDateFrom: '', dueDateTo: '', returnDateFrom: '', returnDateTo: '' });
  const debouncedLoad = useDebounce((newS) => { setCurrentPage(0); load(0, statusFilter, newS); });

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [detailTxn, setDetailTxn] = useState(null);
  const [detailBooks, setDetailBooks] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Checkout modal
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [checkoutBorrower, setCheckoutBorrower] = useState(null);
  const [checkoutBooks, setCheckoutBooks] = useState([]);
  const [borrowerQuery, setBorrowerQuery] = useState('');
  const [borrowerResults, setBorrowerResults] = useState([]);
  const [borrowerDropOpen, setBorrowerDropOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [bookDropOpen, setBookDropOpen] = useState(false);
  const [checkoutDate, setCheckoutDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const debouncedBorrowerSearch = useDebounce(async (v) => {
    if (!v) { setBorrowerDropOpen(false); return; }
    setBorrowerDropOpen(true);
    try {
      const res = await apiFetch(`${API_BASE}/v1/users?role=BORROWER&keyword=${encodeURIComponent(v)}&page=0&size=8`);
      const json = await res.json();
      setBorrowerResults(json.data?.content || []);
    } catch {}
  });
  const debouncedBookSearch = useDebounce(async (v) => {
    if (!v) { setBookDropOpen(false); return; }
    setBookDropOpen(true);
    try {
      const res = await apiFetch(`${API_BASE}/v1/books?keyword=${encodeURIComponent(v)}&page=0&size=8`);
      const json = await res.json();
      setBookResults(json.data?.content || []);
    } catch {}
  });

  // Checkin modal
  const [checkinModal, setCheckinModal] = useState(false);
  const [checkinTxn, setCheckinTxn] = useState(null);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editTxnId, setEditTxnId] = useState(null);
  const [editForm, setEditForm] = useState({ borrowDate: '', dueDate: '', returnDate: '' });

  // Delete modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTxnId, setDeleteTxnId] = useState(null);

  useEffect(() => { load(0, '', search); }, []);

  async function load(pg = currentPage, st = statusFilter, s = search) {
    const params = new URLSearchParams({ page: pg, size: PAGE_SIZE });
    if (st) params.append('status', st);
    if (isBorrower) { params.append('socialNumber', user.socialNumber || ''); }
    else {
      if (s.keyword) params.append('keyword', s.keyword);
      if (s.socialNumber) params.append('socialNumber', s.socialNumber);
    }
    if (s.borrowDateFrom) params.append('borrowDateFrom', formatDate(s.borrowDateFrom));
    if (s.borrowDateTo) params.append('borrowDateTo', formatDate(s.borrowDateTo));
    if (s.dueDateFrom) params.append('dueDateFrom', formatDate(s.dueDateFrom));
    if (s.dueDateTo) params.append('dueDateTo', formatDate(s.dueDateTo));
    if (s.returnDateFrom) params.append('returnDateFrom', formatDate(s.returnDateFrom));
    if (s.returnDateTo) params.append('returnDateTo', formatDate(s.returnDateTo));
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions?${params}`);
      const json = await res.json();
      setPageResult(json.data);
    } catch {}
  }

  function handleSearch(field, value) {
    const newS = { ...search, [field]: value };
    setSearch(newS);
    debouncedLoad(newS);
  }

  function clearSearch() {
    const empty = { keyword: '', socialNumber: '', borrowDateFrom: '', borrowDateTo: '', dueDateFrom: '', dueDateTo: '', returnDateFrom: '', returnDateTo: '' };
    setSearch(empty); setCurrentPage(0); load(0, statusFilter, empty);
  }

  function filterStatus(st) { setStatusFilter(st); setCurrentPage(0); load(0, st, search); }
  function goToPage(p) { setCurrentPage(p); load(p); }

  // Detail
  async function openDetail(t) {
    setDetailTxn(t); setDetailBooks([]); setDetailLoading(true); setDetailModal(true);
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions/${t.id}`);
      const json = await res.json();
      setDetailBooks(json.data || []);
    } catch {}
    setDetailLoading(false);
  }

  // Checkout
  function openCheckout() {
    setCheckoutBorrower(null); setCheckoutBooks([]);
    setBorrowerQuery(''); setBorrowerResults([]); setBorrowerDropOpen(false);
    setBookQuery(''); setBookResults([]); setBookDropOpen(false);
    const t = new Date(); const d = new Date(); d.setDate(t.getDate() + 14);
    setCheckoutDate(t.toISOString().split('T')[0]);
    setDueDate(d.toISOString().split('T')[0]);
    setCheckoutModal(true);
  }

  function onBorrowerSearch(v) {
    setBorrowerQuery(v);
    debouncedBorrowerSearch(v);
  }

  function onBookSearch(v) {
    setBookQuery(v);
    debouncedBookSearch(v);
  }

  function selectBorrower(u) {
    setCheckoutBorrower(u); setBorrowerQuery(''); setBorrowerDropOpen(false);
  }

  function addCheckoutBook(b) {
    if (!checkoutBooks.some((x) => x.id === b.id)) setCheckoutBooks((prev) => [...prev, b]);
    setBookQuery(''); setBookDropOpen(false);
  }

  function removeCheckoutBook(id) { setCheckoutBooks((prev) => prev.filter((b) => b.id !== id)); }

  async function processCheckout() {
    if (!checkoutBorrower) { alert('Vui lòng chọn người mượn!'); return; }
    if (checkoutBooks.length === 0) { alert('Vui lòng thêm ít nhất 1 cuốn sách!'); return; }
    if (!checkoutDate || !dueDate) { alert('Vui lòng nhập ngày mượn và hạn trả!'); return; }
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: checkoutBorrower.id, bookIds: checkoutBooks.map((b) => b.id), borrowDate: formatDate(checkoutDate), dueDate: formatDate(dueDate) }),
      });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setCheckoutModal(false);
      load();
    } catch { alert('Không thể kết nối đến server!'); }
  }

  // Checkin
  async function confirmCheckin() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions/return-books/${checkinTxn.id}`, { method: 'PUT' });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setCheckinModal(false);
      load();
    } catch { alert('Không thể kết nối đến server!'); }
  }

  // Edit
  function openEditModal(t) {
    setEditTxnId(t.id);
    setEditForm({ borrowDate: t.borrowDate || '', dueDate: t.dueDate || '', returnDate: t.returnDate || '' });
    setEditModal(true);
  }

  async function saveTransaction() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions/${editTxnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowDate: editForm.borrowDate || null, dueDate: editForm.dueDate || null, returnDate: editForm.returnDate || null }),
      });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setEditModal(false);
      load();
    } catch { alert('Không thể kết nối đến server!'); }
  }

  // Delete
  async function confirmDelete() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions/${deleteTxnId}`, { method: 'DELETE' });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setDeleteModal(false);
      load();
    } catch { alert('Không thể kết nối đến server!'); }
  }



  const today = new Date();
  const checkinDiff = checkinTxn
    ? Math.ceil((today - new Date(checkinTxn.dueDate)) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      <div className="page-header">
        {!isBorrower && (
          <div className="page-actions">
            <button className="btn btn-success" onClick={openCheckout}>📤 Cho mượn sách</button>
          </div>
        )}
      </div>

      <div className="tabs">
        {['', 'BORROWED', 'RETURNED', 'OVERDUE'].map((st) => (
          <button key={st} className={`tab${statusFilter === st ? ' active' : ''}`} onClick={() => filterStatus(st)}>
            {st === '' ? 'Tất cả' : st === 'BORROWED' ? 'Đang mượn' : st === 'RETURNED' ? 'Đã trả' : 'Quá hạn'}
          </button>
        ))}
      </div>

      {!isBorrower && (
        <div className="search-panel">
          <div className="search-panel-header">
            <span>🔍 Tìm kiếm</span>
            <button className="btn btn-sm btn-outline" onClick={clearSearch}>Xóa bộ lọc</button>
          </div>
          <div className="search-panel-body">
            <div className="search-field">
              <label className="form-label">Tên người mượn</label>
              <input className="form-control" value={search.keyword} onChange={(e) => handleSearch('keyword', e.target.value)} placeholder="Nhập tên người mượn..." />
            </div>
            <div className="search-field">
              <label className="form-label">Mã CCCD</label>
              <input className="form-control" value={search.socialNumber} onChange={(e) => handleSearch('socialNumber', e.target.value)} placeholder="Nhập mã CCCD..." />
            </div>
            <div className="search-field" />
            <div className="search-field">
              <label className="form-label">Ngày mượn từ</label>
              <input className="form-control" type="date" value={search.borrowDateFrom} onChange={(e) => handleSearch('borrowDateFrom', e.target.value)} />
            </div>
            <div className="search-field">
              <label className="form-label">Ngày mượn đến</label>
              <input className="form-control" type="date" value={search.borrowDateTo} onChange={(e) => handleSearch('borrowDateTo', e.target.value)} />
            </div>
            <div className="search-field" />
            <div className="search-field">
              <label className="form-label">Hạn trả từ</label>
              <input className="form-control" type="date" value={search.dueDateFrom} onChange={(e) => handleSearch('dueDateFrom', e.target.value)} />
            </div>
            <div className="search-field">
              <label className="form-label">Hạn trả đến</label>
              <input className="form-control" type="date" value={search.dueDateTo} onChange={(e) => handleSearch('dueDateTo', e.target.value)} />
            </div>
            <div className="search-field" />
            <div className="search-field">
              <label className="form-label">Ngày trả từ</label>
              <input className="form-control" type="date" value={search.returnDateFrom} onChange={(e) => handleSearch('returnDateFrom', e.target.value)} />
            </div>
            <div className="search-field">
              <label className="form-label">Ngày trả đến</label>
              <input className="form-control" type="date" value={search.returnDateTo} onChange={(e) => handleSearch('returnDateTo', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Mã GD</th>
                {!isBorrower && <><th>Người mượn</th><th>Mã CCCD</th></>}
                <th>Ngày mượn</th><th>Hạn trả</th><th>Ngày trả</th><th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0 ? (
                <tr><td colSpan={isBorrower ? 6 : 8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
              ) : txns.map((t) => {
                const { cls, text } = getStatusBadge(t);
                return (
                  <tr key={t.id}>
                    <td><strong>#{t.id}</strong></td>
                    {!isBorrower && <><td>{t.userName}</td><td>{t.socialNumber}</td></>}
                    <td>{t.borrowDate}</td>
                    <td>{t.dueDate}</td>
                    <td>{t.returnDate || '-'}</td>
                    <td><span className={`badge ${cls}`}>{text}</span></td>
                    <td className="actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openDetail(t)}>🔍 Xem</button>
                      {!isBorrower && (
                        <button className="btn btn-sm btn-outline" onClick={() => openEditModal(t)}>✏️</button>
                      )}
                      {isAdmin && (
                        <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => { setDeleteTxnId(t.id); setDeleteModal(true); }}>🗑️</button>
                      )}
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

      {/* Detail Modal */}
      {detailTxn && (
        <Modal
          active={detailModal}
          onClose={() => setDetailModal(false)}
          title="🔍 Chi tiết giao dịch"
          size="lg"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setDetailModal(false)}>Đóng</button>
              {detailTxn.status !== 'RETURNED' && !isBorrower && (
                <button className="btn btn-success" onClick={() => { setDetailModal(false); setCheckinTxn(detailTxn); setCheckinModal(true); }}>
                  📥 Trả sách
                </button>
              )}
            </>
          }
        >
          <div className="detail-info">
            <div className="detail-row"><span className="text-muted">Mã giao dịch:</span><strong>#{detailTxn.id}</strong></div>
            {!isBorrower && (
              <>
                <div className="detail-row"><span className="text-muted">Người mượn:</span><strong>{detailTxn.userName}</strong></div>
                <div className="detail-row"><span className="text-muted">Mã CCCD:</span><span>{detailTxn.socialNumber}</span></div>
              </>
            )}
            <div className="detail-row"><span className="text-muted">Ngày mượn:</span><span>{detailTxn.borrowDate}</span></div>
            <div className="detail-row"><span className="text-muted">Hạn trả:</span><span>{detailTxn.dueDate}</span></div>
            <div className="detail-row"><span className="text-muted">Ngày trả:</span><span>{detailTxn.returnDate || '-'}</span></div>
            <div className="detail-row">
              <span className="text-muted">Trạng thái:</span>
              <span className={`badge ${getStatusBadge(detailTxn).cls}`}>{getStatusBadge(detailTxn).text}</span>
            </div>
          </div>
          <h4 className="detail-books-title">Danh sách sách</h4>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Tên sách</th><th>Tác giả</th><th>NXB</th><th>Năm XB</th></tr></thead>
              <tbody>
                {detailLoading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center' }}>Đang tải...</td></tr>
                ) : detailBooks.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có sách</td></tr>
                ) : detailBooks.map((b, i) => (
                  <tr key={i}><td>{b.bookTitle}</td><td>{b.author}</td><td>{b.publisher}</td><td>{b.publishedYear}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* Checkout Modal */}
      <Modal
        active={checkoutModal}
        onClose={() => setCheckoutModal(false)}
        title="📤 Cho mượn sách"
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setCheckoutModal(false)}>Hủy</button>
            <button className="btn btn-success" onClick={processCheckout}>📤 Xác nhận cho mượn</button>
          </>
        }
      >
        <div className="checkout-modal-body">
          <div className="checkout-section">
            <div className="checkout-section-title">1. Người mượn</div>
            <div className="picker-search-wrap">
              <input
                className="form-control"
                placeholder="Tìm theo tên hoặc số CCCD..."
                value={borrowerQuery}
                onChange={(e) => onBorrowerSearch(e.target.value)}
                onFocus={() => borrowerQuery && setBorrowerDropOpen(true)}
              />
              {borrowerDropOpen && (
                <div className="picker-dropdown open">
                  {borrowerResults.length === 0 ? (
                    <div className="picker-option" style={{ color: 'var(--text-muted)' }}>Không tìm thấy</div>
                  ) : borrowerResults.map((u) => (
                    <div key={u.id} className="picker-option" onClick={() => selectBorrower(u)}>
                      <div>{u.fullName}</div>
                      <div className="picker-option-sub">CCCD: {u.socialNumber} · SĐT: {u.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {checkoutBorrower && (
              <div className="selected-item">
                <div>
                  <div className="selected-item-name">{checkoutBorrower.fullName}</div>
                  <div className="selected-item-sub">CCCD: {checkoutBorrower.socialNumber}</div>
                </div>
                <button className="selected-item-clear" onClick={() => setCheckoutBorrower(null)}>×</button>
              </div>
            )}
          </div>

          <div className="checkout-section">
            <div className="checkout-section-title">2. Sách mượn</div>
            <div className="picker-search-wrap">
              <input
                className="form-control"
                placeholder="Tìm theo tên sách, tác giả..."
                value={bookQuery}
                onChange={(e) => onBookSearch(e.target.value)}
                onFocus={() => bookQuery && setBookDropOpen(true)}
              />
              {bookDropOpen && (
                <div className="picker-dropdown open">
                  {bookResults.length === 0 ? (
                    <div className="picker-option" style={{ color: 'var(--text-muted)' }}>Không tìm thấy</div>
                  ) : bookResults.map((b) => {
                    const unavail = b.availableQuantity <= 0;
                    const added = checkoutBooks.some((x) => x.id === b.id);
                    return (
                      <div
                        key={b.id}
                        className={`picker-option${unavail || added ? ' disabled' : ''}`}
                        onClick={() => !unavail && !added && addCheckoutBook(b)}
                      >
                        <div>{b.title}</div>
                        <div className="picker-option-sub">{b.author} · {unavail ? 'Hết sách' : added ? 'Đã thêm' : `Còn: ${b.availableQuantity}`}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {checkoutBooks.length > 0 && (
              <div className="selected-books-list">
                <table className="table selected-books-table">
                  <thead><tr><th>Tên sách</th><th>Tác giả</th><th>Còn lại</th><th></th></tr></thead>
                  <tbody>
                    {checkoutBooks.map((b) => (
                      <tr key={b.id}>
                        <td>{b.title}</td><td>{b.author}</td><td>{b.availableQuantity}</td>
                        <td><button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => removeCheckoutBook(b.id)}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="checkout-section">
            <div className="checkout-section-title">3. Thời gian</div>
            <div className="form-row form-group-no-mb">
              <div className="form-group form-group-no-mb">
                <label className="form-label">Ngày mượn <span className="required">*</span></label>
                <input className="form-control" type="date" value={checkoutDate} onChange={(e) => setCheckoutDate(e.target.value)} />
              </div>
              <div className="form-group form-group-no-mb">
                <label className="form-label">Hạn trả <span className="required">*</span></label>
                <input className="form-control" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                <span className="form-text">Mặc định: 14 ngày</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Checkin Modal */}
      {checkinTxn && (
        <Modal
          active={checkinModal}
          onClose={() => setCheckinModal(false)}
          title="📥 Xác nhận trả sách"
          size="sm"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setCheckinModal(false)}>Hủy</button>
              <button className="btn btn-success" onClick={confirmCheckin}>✅ Xác nhận trả sách</button>
            </>
          }
        >
          <div className="card card-flat">
            <div className="checkin-info">
              <div className="detail-row"><span className="text-muted">Mã giao dịch:</span><strong>#{checkinTxn.id}</strong></div>
              <div className="detail-row"><span className="text-muted">Người mượn:</span><strong>{checkinTxn.userName}</strong></div>
              <div className="detail-row"><span className="text-muted">Ngày mượn:</span><span>{checkinTxn.borrowDate}</span></div>
              <div className="detail-row"><span className="text-muted">Hạn trả:</span><span>{checkinTxn.dueDate}</span></div>
              <hr className="modal-divider" />
              <div className="detail-row"><span className="text-muted">Ngày trả:</span><strong className="text-success">{new Date().toLocaleDateString('vi-VN')}</strong></div>
              {checkinDiff > 0 && (
                <div className="detail-row">
                  <span className="text-muted">Quá hạn:</span>
                  <strong className="text-danger">{checkinDiff} ngày</strong>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Transaction Modal */}
      <Modal
        active={editModal}
        onClose={() => setEditModal(false)}
        title="✏️ Cập nhật giao dịch"
        size="sm"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEditModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={saveTransaction}>💾 Lưu</button>
          </>
        }
      >
        <div className="form-stack">
          <div className="form-group">
            <label className="form-label">Ngày mượn</label>
            <input className="form-control" type="date" value={editForm.borrowDate} onChange={(e) => setEditForm({ ...editForm, borrowDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Hạn trả</label>
            <input className="form-control" type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Ngày trả thực tế</label>
            <input className="form-control" type="date" value={editForm.returnDate} onChange={(e) => setEditForm({ ...editForm, returnDate: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Delete Transaction Modal */}
      <Modal
        active={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="🗑️ Xác nhận xóa giao dịch"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteModal(false)}>Hủy</button>
            <button className="btn btn-danger" onClick={confirmDelete}>🗑️ Xóa</button>
          </>
        }
      >
        <p>Bạn có chắc chắn muốn xóa giao dịch này không? Hành động này không thể hoàn tác.</p>
      </Modal>
    </>
  );
}
