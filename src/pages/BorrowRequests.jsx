import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';

const today = new Date().toISOString().split('T')[0];
const defaultDue = (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0]; })();

export default function BorrowRequests() {
  const { user } = useAuth();
  const isBorrower = user?.role === 'BORROWER';

  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [status, setStatus] = useState('');

  const [approveModal, setApproveModal] = useState(false);
  const [borrowDate, setBorrowDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);

  const [rejectModal, setRejectModal] = useState(false);

  const [cancelModal, setCancelModal] = useState(false);

  function filterStatus(st) {
    setStatus(st); setCurrentPage(0);
  }

  function goToPage(p) { setCurrentPage(p); }

  function openApprove() {
    setBorrowDate(today); setDueDate(defaultDue); setApproveModal(true);
  }

  function statusBadge(st) {
    if (st === 'PENDING') return { cls: 'badge-warning', text: 'Chờ duyệt' };
    if (st === 'APPROVED') return { cls: 'badge-success', text: 'Đã duyệt' };
    if (st === 'REJECTED') return { cls: 'badge-danger', text: 'Đã từ chối' };
    return { cls: 'badge-secondary', text: st };
  }

  const tableInfo = page
    ? `Hiển thị ${page.totalElements === 0 ? 0 : page.number * page.size + 1}-${Math.min(page.number * page.size + page.size, page.totalElements)} của ${page.totalElements} kết quả`
    : '';

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
                          <button className="btn btn-sm btn-danger" onClick={() => setCancelModal(true)}>🗑️ Hủy</button>
                        ) : (
                          <>
                            <button className="btn btn-sm btn-success" onClick={() => openApprove()}>✅ Duyệt</button>
                            <button className="btn btn-sm btn-danger" onClick={() => setRejectModal(true)}>❌ Từ chối</button>
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
            <button className="btn btn-success" onClick={() => setApproveModal(false)}>✅ Xác nhận duyệt</button>
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
            <button className="btn btn-danger" onClick={() => setRejectModal(false)}>❌ Xác nhận từ chối</button>
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
            <button className="btn btn-danger" onClick={() => setCancelModal(false)}>🗑️ Hủy yêu cầu</button>
          </>
        }
      >
        <p>Bạn có chắc chắn muốn hủy yêu cầu mượn này không?</p>
      </Modal>
    </>
  );
}
