import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, PAGE_SIZE, apiFetch, formatDate } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { usePagination } from '../hooks/usePagination';

const today = new Date().toISOString().split('T')[0];
const defaultDue = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })();

export default function BorrowRequests() {
  const { user } = useAuth();
  const isBorrower = user?.role === 'BORROWER';

  const { items: requests, page, currentPage, setCurrentPage, setPageResult, tableInfo } = usePagination();
  const [status, setStatus] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [approveModal, setApproveModal] = useState(false);
  const [borrowDate, setBorrowDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [rejectModal, setRejectModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);

  async function loadRequests(pg = currentPage, st = status) {
    const params = new URLSearchParams({ page: pg, size: PAGE_SIZE });
    if (st) params.append('status', st);
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests?${params}`);
      const json = await res.json();
      setPageResult(json.data);
    } catch {}
  }

  useEffect(() => { loadRequests(0); }, []);

  // Ref so SSE handler always calls latest loadRequests
  const loadRef = useRef(null);
  loadRef.current = () => loadRequests(0, status);

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
    loadRequests(0, st);
  }

  function goToPage(p) {
    setCurrentPage(p);
    loadRequests(p);
  }

  function openApprove(r) {
    setSelectedRequest(r);
    setBorrowDate(today);
    setDueDate(defaultDue);
    setApproveModal(true);
  }

  async function handleApprove() {
    if (!selectedRequest) return;
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests/${selectedRequest.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowDate: formatDate(borrowDate), dueDate: formatDate(dueDate) }),
      });
      const json = await res.json();
      alert(json.message);
      if (res.ok) { setApproveModal(false); loadRequests(0, status); }
    } catch { alert('Lỗi kết nối!'); }
  }

  async function handleReject() {
    if (!selectedRequest) return;
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests/${selectedRequest.id}/reject`, { method: 'PUT' });
      const json = await res.json();
      alert(json.message);
      if (res.ok) { setRejectModal(false); loadRequests(0, status); }
    } catch { alert('Lỗi kết nối!'); }
  }

  async function handleCancel() {
    if (!selectedRequest) return;
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests/${selectedRequest.id}`, { method: 'DELETE' });
      const json = await res.json();
      alert(json.message);
      if (res.ok) { setCancelModal(false); loadRequests(0, status); }
    } catch { alert('Lỗi kết nối!'); }
  }

  function statusBadge(st) {
    if (st === 'PENDING') return { cls: 'badge-warning', text: 'Chờ duyệt' };
    if (st === 'APPROVED') return { cls: 'badge-success', text: 'Đã duyệt' };
    if (st === 'REJECTED') return { cls: 'badge-danger', text: 'Đã từ chối' };
    return { cls: 'badge-secondary', text: st };
  }

  return (
    <>
      <div className="tabs">
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
          <button
            key={st}
            className={`tab${status === st ? ' active' : ''}`}
            onClick={() => filterStatus(st)}
          >
            {st === '' ? 'Tất cả' : st === 'PENDING' ? 'Chờ duyệt' : st === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
          </button>
        ))}
      </div>

      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                {!isBorrower && <><th>Người mượn</th><th>CCCD</th></>}
                <th>Ngày yêu cầu</th><th>Sách</th><th>Trạng thái</th><th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={isBorrower ? 5 : 7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
              ) : requests.map((r) => {
                const { cls, text } = statusBadge(r.status);
                const bookTitles = (r.books || []).map((b) => b.title || b.bookTitle || '').filter(Boolean).join(', ') || '-';
                return (
                  <tr key={r.id}>
                    <td><strong>#{r.id}</strong></td>
                    {!isBorrower && <><td>{r.userName || r.userFullName || '-'}</td><td>{r.socialNumber || '-'}</td></>}
                    <td>{r.requestDate || r.createdAt || '-'}</td>
                    <td style={{ maxWidth: 280 }}>{bookTitles}</td>
                    <td><span className={`badge ${cls}`}>{text}</span></td>
                    <td className="actions">
                      {r.status === 'PENDING' ? (
                        isBorrower ? (
                          <button className="btn btn-sm btn-danger" onClick={() => { setSelectedRequest(r); setCancelModal(true); }}>🗑️ Hủy</button>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-success" onClick={() => openApprove(r)}>✅ Duyệt</button>
                            <button className="btn btn-sm btn-danger" onClick={() => { setSelectedRequest(r); setRejectModal(true); }}>❌ Từ chối</button>
                          </>
                        )
                      ) : '-'}
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

      {/* Approve Modal */}
      <Modal
        active={approveModal}
        onClose={() => setApproveModal(false)}
        title="✅ Duyệt yêu cầu mượn"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setApproveModal(false)}>Hủy</button>
            <button className="btn btn-success" onClick={handleApprove}>✅ Xác nhận duyệt</button>
          </>
        }
      >
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
        title="❌ Từ chối yêu cầu"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setRejectModal(false)}>Hủy</button>
            <button className="btn btn-danger" onClick={handleReject}>❌ Xác nhận từ chối</button>
          </>
        }
      >
        <p>Bạn có chắc chắn muốn từ chối yêu cầu mượn này không?</p>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        active={cancelModal}
        onClose={() => setCancelModal(false)}
        title="🗑️ Hủy yêu cầu mượn"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setCancelModal(false)}>Không</button>
            <button className="btn btn-danger" onClick={handleCancel}>🗑️ Hủy yêu cầu</button>
          </>
        }
      >
        <p>Bạn có chắc chắn muốn hủy yêu cầu mượn này không?</p>
      </Modal>
    </>
  );
}
