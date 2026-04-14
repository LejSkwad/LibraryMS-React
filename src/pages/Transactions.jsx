import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, PAGE_SIZE, apiFetch, formatDate, getStatusBadge } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';

export default function Transactions() {
  const { user } = useAuth();
  const isBorrower = user?.role === 'BORROWER';
  const isAdmin = user?.role === 'ADMIN';

  const { items: txns, page, currentPage, setCurrentPage, setPageResult, tableInfo } = usePagination();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState({ keyword: '', memberId: '', borrowDateFrom: '', borrowDateTo: '', dueDateFrom: '', dueDateTo: '', returnDateFrom: '', returnDateTo: '' });
  const debouncedLoad = useDebounce((newS) => { setCurrentPage(0); load(0, statusFilter, newS); });

  const [detailModal, setDetailModal] = useState(false);
  const [detailTxn, setDetailTxn] = useState(null);
  const [detailBooks, setDetailBooks] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Checkin = lend books to borrower (create transaction)
  const [checkinModal, setCheckinModal] = useState(false);
  const [checkinBorrower, setCheckinBorrower] = useState(null);
  const [checkinBooks, setCheckinBooks] = useState([]);
  const [borrowerQuery, setBorrowerQuery] = useState('');
  const [borrowerResults, setBorrowerResults] = useState([]);
  const [borrowerDropOpen, setBorrowerDropOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [bookDropOpen, setBookDropOpen] = useState(false);
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

  // Checkout = borrower returns books
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [checkoutTxn, setCheckoutTxn] = useState(null);

  const [editModal, setEditModal] = useState(false);
  const [editTxnId, setEditTxnId] = useState(null);
  const [editForm, setEditForm] = useState({ borrowDate: '', dueDate: '', returnDate: '' });

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTxnId, setDeleteTxnId] = useState(null);

  useEffect(() => { load(0, '', search); }, []);

  async function load(pg = currentPage, st = statusFilter, s = search) {
    const params = new URLSearchParams({ page: pg, size: PAGE_SIZE });
    if (st) params.append('status', st);
    if (isBorrower) {
      params.append('userId', user.id);
    } else {
      if (s.keyword) params.append('keyword', s.keyword);
      if (s.memberId) params.append('memberId', s.memberId);
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
    const empty = { keyword: '', memberId: '', borrowDateFrom: '', borrowDateTo: '', dueDateFrom: '', dueDateTo: '', returnDateFrom: '', returnDateTo: '' };
    setSearch(empty); setCurrentPage(0); load(0, statusFilter, empty);
  }

  function filterStatus(st) { setStatusFilter(st); setCurrentPage(0); load(0, st, search); }
  function goToPage(p) { setCurrentPage(p); load(p); }

  async function openDetail(t) {
    setDetailTxn(t); setDetailBooks([]); setDetailLoading(true); setDetailModal(true);
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions/${t.id}`);
      const json = await res.json();
      setDetailBooks(json.data || []);
    } catch {}
    setDetailLoading(false);
  }

  function openCheckin() {
    setCheckinBorrower(null); setCheckinBooks([]);
    setBorrowerQuery(''); setBorrowerResults([]); setBorrowerDropOpen(false);
    setBookQuery(''); setBookResults([]); setBookDropOpen(false);
    const d = new Date(); d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().split('T')[0]);
    setCheckinModal(true);
  }

  function onBorrowerSearch(v) { setBorrowerQuery(v); debouncedBorrowerSearch(v); }
  function onBookSearch(v) { setBookQuery(v); debouncedBookSearch(v); }
  function selectBorrower(u) { setCheckinBorrower(u); setBorrowerQuery(''); setBorrowerDropOpen(false); }
  function addCheckinBook(b) {
    if (!checkinBooks.some((x) => x.id === b.id)) setCheckinBooks((prev) => [...prev, b]);
    setBookQuery(''); setBookDropOpen(false);
  }
  function removeCheckinBook(id) { setCheckinBooks((prev) => prev.filter((b) => b.id !== id)); }

  async function processCheckin() {
    if (!checkinBorrower) { alert('Vui lòng chọn người mượn!'); return; }
    if (checkinBooks.length === 0) { alert('Vui lòng thêm ít nhất 1 cuốn sách!'); return; }
    if (!dueDate) { alert('Vui lòng nhập hạn trả!'); return; }
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: checkinBorrower.id, bookIds: checkinBooks.map((b) => b.id), dueDate: formatDate(dueDate) }),
      });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setCheckinModal(false);
      load();
    } catch { alert('Không thể kết nối đến server!'); }
  }

  async function confirmCheckout() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions/return-books/${checkoutTxn.id}`, { method: 'PUT' });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setCheckoutModal(false);
      load();
    } catch { alert('Không thể kết nối đến server!'); }
  }

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
  const checkoutDiff = checkoutTxn
    ? Math.ceil((today - new Date(checkoutTxn.dueDate)) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      <div className="page-header">
        {!isBorrower && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={openCheckin}>+ Cho mượn sách</button>
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
        <div className="txn-filter">
          <div className="txn-filter-top">
            <input
              className="form-control"
              value={search.keyword}
              onChange={(e) => handleSearch('keyword', e.target.value)}
              placeholder="Tìm theo tên người mượn..."
            />
            <input
              className="form-control"
              value={search.memberId}
              onChange={(e) => handleSearch('memberId', e.target.value)}
              placeholder="Mã thẻ (VD: LIB-00003)"
            />
            <button className="btn btn-outline btn-sm" onClick={clearSearch}>Xóa bộ lọc</button>
          </div>
          <div className="txn-filter-dates">
            <div className="txn-filter-group">
              <span className="txn-filter-group-label">Ngày mượn</span>
              <input className="form-control" type="date" value={search.borrowDateFrom} onChange={(e) => handleSearch('borrowDateFrom', e.target.value)} />
              <span className="txn-filter-sep">—</span>
              <input className="form-control" type="date" value={search.borrowDateTo} onChange={(e) => handleSearch('borrowDateTo', e.target.value)} />
            </div>
            <div className="txn-filter-group">
              <span className="txn-filter-group-label">Hạn trả</span>
              <input className="form-control" type="date" value={search.dueDateFrom} onChange={(e) => handleSearch('dueDateFrom', e.target.value)} />
              <span className="txn-filter-sep">—</span>
              <input className="form-control" type="date" value={search.dueDateTo} onChange={(e) => handleSearch('dueDateTo', e.target.value)} />
            </div>
            <div className="txn-filter-group">
              <span className="txn-filter-group-label">Ngày trả</span>
              <input className="form-control" type="date" value={search.returnDateFrom} onChange={(e) => handleSearch('returnDateFrom', e.target.value)} />
              <span className="txn-filter-sep">—</span>
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
                {!isBorrower && <><th>Người mượn</th><th>Mã thẻ</th></>}
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
                    {!isBorrower && <><td>{t.fullName}</td><td><code style={{ fontSize: '.8125rem' }}>{t.memberId}</code></td></>}
                    <td>{t.borrowDate}</td>
                    <td>{t.dueDate}</td>
                    <td>{t.returnDate || '—'}</td>
                    <td><span className={`badge ${cls}`}>{text}</span></td>
                    <td className="actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openDetail(t)}>Xem</button>
                      {!isBorrower && (
                        <button className="btn btn-sm btn-outline" onClick={() => openEditModal(t)}>Sửa</button>
                      )}
                      {isAdmin && (
                        <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => { setDeleteTxnId(t.id); setDeleteModal(true); }}>Xóa</button>
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

      {/* Detail Drawer */}
      <Drawer
        active={detailModal}
        onClose={() => setDetailModal(false)}
        title={`Chi tiết giao dịch #${detailTxn?.id ?? ''}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDetailModal(false)}>Đóng</button>
            {detailTxn?.status !== 'RETURNED' && !isBorrower && (
              <button className="btn btn-success" onClick={() => { setDetailModal(false); setCheckoutTxn(detailTxn); setCheckoutModal(true); }}>
                Trả sách
              </button>
            )}
          </>
        }
      >
        {detailTxn && (
          <>
            <div className="br-detail-info-grid">
              {!isBorrower && (
                <>
                  <div className="br-detail-field">
                    <span className="br-detail-label">Người mượn</span>
                    <span className="br-detail-value">{detailTxn.fullName || '-'}</span>
                  </div>
                  <div className="br-detail-field">
                    <span className="br-detail-label">Mã thẻ thư viện</span>
                    <span className="br-detail-value">{detailTxn.memberId || '-'}</span>
                  </div>
                </>
              )}
              <div className="br-detail-field">
                <span className="br-detail-label">Ngày mượn</span>
                <span className="br-detail-value">{detailTxn.borrowDate || '-'}</span>
              </div>
              <div className="br-detail-field">
                <span className="br-detail-label">Hạn trả</span>
                <span className="br-detail-value">{detailTxn.dueDate || '-'}</span>
              </div>
              <div className="br-detail-field">
                <span className="br-detail-label">Ngày trả</span>
                <span className="br-detail-value">{detailTxn.returnDate || '—'}</span>
              </div>
              <div className="br-detail-field">
                <span className="br-detail-label">Trạng thái</span>
                <span className={`badge ${getStatusBadge(detailTxn).cls}`}>{getStatusBadge(detailTxn).text}</span>
              </div>
            </div>
            <h4 className="detail-books-title">Sách trong giao dịch</h4>
            {detailLoading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</p>
            ) : detailBooks.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có sách</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {detailBooks.map((b, i) => (
                  <div key={i} className="br-book-card">
                    <div className="br-book-cover">
                      {b.coverImage
                        ? <img className="br-book-cover-img" src={b.coverImage} alt={b.bookTitle} />
                        : <div className="br-book-cover-fallback">{(b.bookTitle || '?')[0]}</div>
                      }
                    </div>
                    <div className="br-book-info">
                      <div className="br-book-title">{b.bookTitle}</div>
                      <div className="br-book-meta">
                        <span className="br-book-meta-item"><span className="br-book-meta-label">Tác giả:</span> {b.author || '—'}</span>
                        <span className="br-book-meta-sep">·</span>
                        <span className="br-book-meta-item"><span className="br-book-meta-label">NXB:</span> {b.publisher || '—'}</span>
                        <span className="br-book-meta-sep">·</span>
                        <span className="br-book-meta-item"><span className="br-book-meta-label">Năm:</span> {b.publishedYear || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* Checkin Modal — lend books to borrower */}
      <Modal
        active={checkinModal}
        onClose={() => setCheckinModal(false)}
        title="Cho mượn sách"
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setCheckinModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={processCheckin}>Xác nhận cho mượn</button>
          </>
        }
      >
        <div className="checkout-modal-body">
          <div className="checkout-section">
            <div className="checkout-section-title">1. Người mượn</div>
            <div className="picker-search-wrap">
              <input
                className="form-control"
                placeholder="Tìm theo tên hoặc mã thẻ..."
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
                      <div className="picker-option-sub">Mã thẻ: {u.memberId} · SĐT: {u.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {checkinBorrower && (
              <div className="selected-item">
                <div>
                  <div className="selected-item-name">{checkinBorrower.fullName}</div>
                  <div className="selected-item-sub">Mã thẻ: {checkinBorrower.memberId}</div>
                </div>
                <button className="selected-item-clear" onClick={() => setCheckinBorrower(null)}>×</button>
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
                    const added = checkinBooks.some((x) => x.id === b.id);
                    return (
                      <div
                        key={b.id}
                        className={`picker-option${unavail || added ? ' disabled' : ''}`}
                        onClick={() => !unavail && !added && addCheckinBook(b)}
                      >
                        <div>{b.title}</div>
                        <div className="picker-option-sub">{b.author} · {unavail ? 'Hết sách' : added ? 'Đã thêm' : `Còn: ${b.availableQuantity}`}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {checkinBooks.length > 0 && (
              <div>
                <table className="table">
                  <thead><tr><th>Tên sách</th><th>Tác giả</th><th>Còn lại</th><th></th></tr></thead>
                  <tbody>
                    {checkinBooks.map((b) => (
                      <tr key={b.id}>
                        <td>{b.title}</td><td>{b.author}</td><td>{b.availableQuantity}</td>
                        <td><button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)' }} onClick={() => removeCheckinBook(b.id)}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="checkout-section">
            <div className="checkout-section-title">3. Thời gian</div>
            <div className="form-group">
              <label className="form-label">Hạn trả <span className="required">*</span></label>
              <input className="form-control" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <span className="form-text">Ngày mượn sẽ được tự động ghi nhận là hôm nay</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Checkout Modal — borrower returns books */}
      {checkoutTxn && (
        <Modal
          active={checkoutModal}
          onClose={() => setCheckoutModal(false)}
          title="Xác nhận trả sách"
          size="sm"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setCheckoutModal(false)}>Hủy</button>
              <button className="btn btn-success" onClick={confirmCheckout}>Xác nhận trả sách</button>
            </>
          }
        >
          <div className="checkin-info">
            <div className="detail-row"><span className="text-muted">Mã giao dịch:</span><strong>#{checkoutTxn.id}</strong></div>
            <div className="detail-row"><span className="text-muted">Người mượn:</span><strong>{checkoutTxn.fullName}</strong></div>
            <div className="detail-row"><span className="text-muted">Ngày mượn:</span><span>{checkoutTxn.borrowDate}</span></div>
            <div className="detail-row"><span className="text-muted">Hạn trả:</span><span>{checkoutTxn.dueDate}</span></div>
            <hr className="modal-divider" />
            <div className="detail-row"><span className="text-muted">Ngày trả:</span><strong className="text-success">{new Date().toLocaleDateString('vi-VN')}</strong></div>
            {checkoutDiff > 0 && (
              <div className="detail-row">
                <span className="text-muted">Quá hạn:</span>
                <strong className="text-danger">{checkoutDiff} ngày</strong>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      <Modal
        active={editModal}
        onClose={() => setEditModal(false)}
        title="Cập nhật giao dịch"
        size="sm"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEditModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={saveTransaction}>Lưu</button>
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

      {/* Delete Modal */}
      <Modal
        active={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Xác nhận xóa giao dịch"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteModal(false)}>Hủy</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Xóa</button>
          </>
        }
      >
        <p>Bạn có chắc chắn muốn xóa giao dịch này không? Hành động này không thể hoàn tác.</p>
      </Modal>
    </>
  );
}
