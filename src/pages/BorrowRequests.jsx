import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, PAGE_SIZE, apiFetch, formatDate } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';

const EMPTY_SEARCH = { name: '', memberId: '', requestDateFrom: '', requestDateTo: '' };

const today = new Date().toISOString().split('T')[0];
const defaultDue = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })();

function statusBadge(st) {
  if (st === 'PENDING')  return { cls: 'badge-warning', text: 'Chờ duyệt' };
  if (st === 'APPROVED') return { cls: 'badge-success', text: 'Đã duyệt' };
  if (st === 'TAKEN')    return { cls: 'badge-info',    text: 'Đã nhận sách' };
  if (st === 'REJECTED') return { cls: 'badge-danger',  text: 'Đã từ chối' };
  return { cls: 'badge-secondary', text: st };
}

export default function BorrowRequests() {
  const { user } = useAuth();
  const isBorrower = user?.role === 'BORROWER';

  const { items: requests, page, currentPage, setCurrentPage, setPageResult, tableInfo } = usePagination();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const debouncedLoad = useDebounce((s) => { setCurrentPage(0); loadRequests(0, status, s); });

  const [detailModal, setDetailModal]   = useState(false);
  const [approveModal, setApproveModal] = useState(false);
  const [takeModal, setTakeModal]       = useState(false);
  const [borrowDate, setBorrowDate]     = useState(today);
  const [dueDate, setDueDate]           = useState(defaultDue);
  const [rejectModal, setRejectModal]   = useState(false);
  const [cancelModal, setCancelModal]   = useState(false);

  async function loadRequests(pg = currentPage, st = status, s = search) {
    const params = new URLSearchParams({ page: pg, size: PAGE_SIZE, sort: 'requestDate,asc' });
    if (st)               params.append('status',          st);
    if (s.name)           params.append('name',            s.name);
    if (s.memberId)       params.append('memberId',        s.memberId);
    if (s.requestDateFrom) params.append('requestDateFrom', formatDate(s.requestDateFrom));
    if (s.requestDateTo)   params.append('requestDateTo',   formatDate(s.requestDateTo));
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests?${params}`);
      const json = await res.json();
      setPageResult(json.data);
    } catch {}
  }

  async function loadStats() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests?status=PENDING&page=0&size=1`);
      const json = await res.json();
      setPendingCount(json.data?.totalElements ?? 0);
    } catch {}
  }

  useEffect(() => { loadRequests(0); loadStats(); }, []);

  const loadRef = useRef(null);
  loadRef.current = () => loadRequests(0, status, search);

  useEffect(() => {
    function handler(e) {
      const { type } = e.detail || {};
      const shouldRefresh =
        (!isBorrower && type === 'new_request') ||
        (isBorrower && (type === 'request_approved' || type === 'request_rejected'));
      if (shouldRefresh) loadRef.current();
    }
    window.addEventListener('borrow-request-sse', handler);
    return () => window.removeEventListener('borrow-request-sse', handler);
  }, [isBorrower]);

  function filterStatus(st) {
    setStatus(st);
    setCurrentPage(0);
    loadRequests(0, st, search);
  }

  function handleSearch(field, value) {
    const s = { ...search, [field]: value };
    setSearch(s);
    debouncedLoad(s);
  }

  function handleDateFilter(field, value) {
    const s = { ...search, [field]: value };
    setSearch(s);
    setCurrentPage(0);
    loadRequests(0, status, s);
  }

  function clearSearch() {
    setSearch(EMPTY_SEARCH);
    setCurrentPage(0);
    loadRequests(0, status, EMPTY_SEARCH);
  }

  function goToPage(p) {
    setCurrentPage(p);
    loadRequests(p);
  }

  function openDetail(r) {
    setSelectedRequest(r);
    setDetailModal(true);
  }

  function openApprove(r) {
    setSelectedRequest(r);
    setBorrowDate(today);
    setDueDate(defaultDue);
    setApproveModal(true);
  }

  function openTake(r) {
    setSelectedRequest(r);
    setBorrowDate(today);
    setDueDate(defaultDue);
    setTakeModal(true);
  }

  async function handleApprove() {
    if (!selectedRequest) return;
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests/${selectedRequest.id}/approve`, { method: 'PUT' });
      const json = await res.json();
      alert(json.message);
      if (res.ok) { setApproveModal(false); loadRequests(0, status); loadStats(); }
    } catch { alert('Lỗi kết nối!'); }
  }

  async function handleTake() {
    if (!selectedRequest) return;
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests/${selectedRequest.id}/take`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowDate: formatDate(borrowDate), dueDate: formatDate(dueDate) }),
      });
      const json = await res.json();
      alert(json.message);
      if (res.ok) { setTakeModal(false); loadRequests(0, status); loadStats(); }
    } catch { alert('Lỗi kết nối!'); }
  }

  async function handleReject() {
    if (!selectedRequest) return;
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests/${selectedRequest.id}/reject`, { method: 'PUT' });
      const json = await res.json();
      alert(json.message);
      if (res.ok) { setRejectModal(false); loadRequests(0, status); loadStats(); }
    } catch { alert('Lỗi kết nối!'); }
  }

  async function handleCancel() {
    if (!selectedRequest) return;
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests/${selectedRequest.id}`, { method: 'DELETE' });
      const json = await res.json();
      alert(json.message);
      if (res.ok) { setCancelModal(false); loadRequests(0, status); loadStats(); }
    } catch { alert('Lỗi kết nối!'); }
  }

  return (
    <>
      <div className="tabs">
        {['', 'PENDING', 'APPROVED', 'TAKEN', 'REJECTED'].map((st) => (
          <button
            key={st}
            className={`tab${status === st ? ' active' : ''}`}
            onClick={() => filterStatus(st)}
          >
            {st === ''         ? 'Tất cả'
              : st === 'PENDING'  ? 'Chờ duyệt'
              : st === 'APPROVED' ? 'Đã duyệt'
              : st === 'TAKEN'    ? 'Đã nhận sách'
              : 'Đã từ chối'}
            {st === 'PENDING' && pendingCount > 0 && (
              <span className="tab-count-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="txn-filter">
        <div className="txn-filter-top">
          {!isBorrower && (
            <>
              <input
                className="form-control"
                placeholder="Tìm tên người mượn..."
                value={search.name}
                onChange={(e) => handleSearch('name', e.target.value)}
              />
              <input
                className="form-control"
                placeholder="Mã thẻ (VD: LIB-00003)"
                value={search.memberId}
                onChange={(e) => handleSearch('memberId', e.target.value)}
              />
            </>
          )}
          <button className="btn btn-outline btn-sm" onClick={clearSearch}>Xóa bộ lọc</button>
        </div>
        <div className="txn-filter-dates">
          <div className="txn-filter-group">
            <span className="txn-filter-group-label">Ngày yêu cầu</span>
            <input className="form-control" type="date" value={search.requestDateFrom} onChange={(e) => handleDateFilter('requestDateFrom', e.target.value)} />
            <span className="txn-filter-sep">—</span>
            <input className="form-control" type="date" value={search.requestDateTo} onChange={(e) => handleDateFilter('requestDateTo', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                {!isBorrower && <><th>Người mượn</th><th>Mã thẻ</th></>}
                <th>Thời gian yêu cầu</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isBorrower ? 4 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có dữ liệu
                  </td>
                </tr>
              ) : requests.map((r) => {
                const { cls, text } = statusBadge(r.status);
                return (
                  <tr key={r.id}>
                    <td><strong>#{r.id}</strong></td>
                    {!isBorrower && <><td>{r.fullName || '-'}</td><td>{r.memberId || '-'}</td></>}
                    <td style={{ whiteSpace: 'nowrap' }}>{r.requestDate || '-'}</td>
                    <td><span className={`badge ${cls}`}>{text}</span></td>
                    <td className="actions">
                      <button className="btn btn-sm btn-outline" onClick={() => openDetail(r)}>Chi tiết</button>
                      {r.status === 'PENDING' && (
                        isBorrower ? (
                          <button className="btn btn-sm btn-danger" onClick={() => { setSelectedRequest(r); setCancelModal(true); }}>Hủy</button>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-success" onClick={() => openApprove(r)}>Duyệt</button>
                            <button className="btn btn-sm btn-danger" onClick={() => { setSelectedRequest(r); setRejectModal(true); }}>Từ chối</button>
                          </>
                        )
                      )}
                      {r.status === 'APPROVED' && !isBorrower && (
                        <button className="btn btn-sm btn-primary" onClick={() => openTake(r)}>Nhận sách</button>
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
        title={`Chi tiết yêu cầu #${selectedRequest?.id ?? ''}`}
        footer={
          selectedRequest?.status === 'PENDING' ? (
            isBorrower ? (
              <>
                <button className="btn btn-outline" onClick={() => setDetailModal(false)}>Đóng</button>
                <button className="btn btn-danger" onClick={() => { setDetailModal(false); setCancelModal(true); }}>Hủy yêu cầu</button>
              </>
            ) : (
              <>
                <button className="btn btn-outline" onClick={() => setDetailModal(false)}>Đóng</button>
                <button className="btn btn-danger" onClick={() => { setDetailModal(false); setRejectModal(true); }}>Từ chối</button>
                <button className="btn btn-success" onClick={() => { setDetailModal(false); openApprove(selectedRequest); }}>Duyệt yêu cầu</button>
              </>
            )
          ) : selectedRequest?.status === 'APPROVED' && !isBorrower ? (
            <>
              <button className="btn btn-outline" onClick={() => setDetailModal(false)}>Đóng</button>
              <button className="btn btn-primary" onClick={() => { setDetailModal(false); openTake(selectedRequest); }}>Nhận sách</button>
            </>
          ) : (
            <button className="btn btn-outline" onClick={() => setDetailModal(false)}>Đóng</button>
          )
        }
      >
        {selectedRequest && (
          <div className="br-detail-info-grid">
            {!isBorrower && (
              <>
                <div className="br-detail-field">
                  <span className="br-detail-label">Người mượn</span>
                  <span className="br-detail-value">{selectedRequest.fullName || '-'}</span>
                </div>
                <div className="br-detail-field">
                  <span className="br-detail-label">Mã thẻ thư viện</span>
                  <span className="br-detail-value">{selectedRequest.memberId || '-'}</span>
                </div>
              </>
            )}
            <div className="br-detail-field">
              <span className="br-detail-label">Thời gian yêu cầu</span>
              <span className="br-detail-value">{selectedRequest.requestDate || '-'}</span>
            </div>
            <div className="br-detail-field">
              <span className="br-detail-label">Trạng thái</span>
              <span className={`badge ${statusBadge(selectedRequest.status).cls}`}>
                {statusBadge(selectedRequest.status).text}
              </span>
            </div>
          </div>
        )}
      </Drawer>

      {/* Approve Modal */}
      <Modal
        active={approveModal}
        onClose={() => setApproveModal(false)}
        title="Duyệt yêu cầu mượn"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setApproveModal(false)}>Hủy</button>
            <button className="btn btn-success" onClick={handleApprove}>Xác nhận duyệt</button>
          </>
        }
      >
        {selectedRequest && (
          <div className="request-summary">
            <div className="request-summary-row">
              <span className="request-summary-label">Người mượn</span>
              <span>{selectedRequest.fullName || '-'}{selectedRequest.memberId ? ` (${selectedRequest.memberId})` : ''}</span>
            </div>
          </div>
        )}
        <p style={{ margin: '1rem 0 0' }}>Xác nhận duyệt yêu cầu này và giữ sách cho người mượn?</p>
      </Modal>

      {/* Take Modal */}
      <Modal
        active={takeModal}
        onClose={() => setTakeModal(false)}
        title="Xác nhận nhận sách"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setTakeModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={handleTake}>Xác nhận</button>
          </>
        }
      >
        {selectedRequest && (
          <div className="request-summary" style={{ marginBottom: '1rem' }}>
            <div className="request-summary-row">
              <span className="request-summary-label">Người mượn</span>
              <span>{selectedRequest.fullName || '-'}{selectedRequest.memberId ? ` (${selectedRequest.memberId})` : ''}</span>
            </div>
          </div>
        )}
        <div className="form-stack">
          <div className="form-group">
            <label className="form-label">Ngày mượn <span className="required">*</span></label>
            <input className="form-control" type="date" value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Hạn trả <span className="required">*</span></label>
            <input className="form-control" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <span className="form-text">Mặc định: 14 ngày kể từ ngày mượn</span>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        active={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Từ chối yêu cầu"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setRejectModal(false)}>Hủy</button>
            <button className="btn btn-danger" onClick={handleReject}>Xác nhận từ chối</button>
          </>
        }
      >
        {selectedRequest && (
          <div className="request-summary" style={{ marginBottom: '1rem' }}>
            <div className="request-summary-row">
              <span className="request-summary-label">Người mượn</span>
              <span>{selectedRequest.fullName || '-'}</span>
            </div>
          </div>
        )}
        <p style={{ margin: 0 }}>Bạn có chắc chắn muốn từ chối yêu cầu mượn này không?</p>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        active={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Hủy yêu cầu mượn"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setCancelModal(false)}>Không</button>
            <button className="btn btn-danger" onClick={handleCancel}>Hủy yêu cầu</button>
          </>
        }
      >
        <p style={{ margin: 0 }}>Bạn có chắc chắn muốn hủy yêu cầu mượn này không?</p>
      </Modal>
    </>
  );
}
