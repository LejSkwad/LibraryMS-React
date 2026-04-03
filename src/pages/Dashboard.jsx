import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, apiFetch, getStatusBadge } from '../api/api';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBooks: '...', availableBooks: '...',
    borrowedBooks: '...', overdueBooks: '...',
    totalBorrowers: '...', totalTransactions: '...',
  });
  const [recentTxns, setRecentTxns] = useState([]);
  const [overdueTxns, setOverdueTxns] = useState([]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([
      loadBookStats(),
      loadCount('BORROWED', 'borrowedBooks'),
      loadCount('OVERDUE', 'overdueBooks'),
      loadBorrowersCount(),
      loadTxnCount(),
      loadRecentTxns(),
      loadOverdueTxns(),
    ]);
  }

  async function loadBookStats() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/books?page=0&size=1000`);
      const json = await res.json();
      const books = json.data?.content || [];
      setStats((s) => ({
        ...s,
        totalBooks: books.reduce((a, b) => a + (b.quantity || 0), 0).toLocaleString(),
        availableBooks: books.reduce((a, b) => a + (b.availableQuantity || 0), 0).toLocaleString(),
      }));
    } catch {
      setStats((s) => ({ ...s, totalBooks: '-', availableBooks: '-' }));
    }
  }

  async function loadCount(status, key) {
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions?status=${status}&page=0&size=1`);
      const json = await res.json();
      setStats((s) => ({ ...s, [key]: (json.data?.totalElements ?? '-').toLocaleString() }));
    } catch {
      setStats((s) => ({ ...s, [key]: '-' }));
    }
  }

  async function loadBorrowersCount() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/users?role=BORROWER&page=0&size=1`);
      const json = await res.json();
      setStats((s) => ({ ...s, totalBorrowers: (json.data?.totalElements ?? '-').toLocaleString() }));
    } catch {
      setStats((s) => ({ ...s, totalBorrowers: '-' }));
    }
  }

  async function loadTxnCount() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions?page=0&size=1`);
      const json = await res.json();
      setStats((s) => ({ ...s, totalTransactions: (json.data?.totalElements ?? '-').toLocaleString() }));
    } catch {
      setStats((s) => ({ ...s, totalTransactions: '-' }));
    }
  }

  async function loadRecentTxns() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions?page=0&size=5&sort=id,desc`);
      const json = await res.json();
      setRecentTxns(json.data?.content || []);
    } catch {
      setRecentTxns([]);
    }
  }

  async function loadOverdueTxns() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/transactions?status=OVERDUE&page=0&size=5`);
      const json = await res.json();
      setOverdueTxns(json.data?.content || []);
    } catch {
      setOverdueTxns([]);
    }
  }

  return (
    <>
      {/* Row 1: 4 stat cards */}
      <div className="stat-cards">
        <StatCard icon="📚" color="primary" value={stats.totalBooks} label="Tổng số sách" />
        <StatCard icon="✅" color="success" value={stats.availableBooks} label="Sách có sẵn" />
        <StatCard icon="📤" color="warning" value={stats.borrowedBooks} label="Đang cho mượn" />
        <StatCard icon="⚠️" color="danger" value={stats.overdueBooks} label="Quá hạn" />
      </div>

      {/* Row 2: 2 stat cards */}
      <div className="stat-cards">
        <StatCard icon="👥" color="primary" value={stats.totalBorrowers} label="Người mượn" />
        <StatCard icon="📋" color="success" value={stats.totalTransactions} label="Tổng giao dịch" />
      </div>

      {/* Recent Transactions */}
      <div className="card mt-3">
        <div className="card-header">
          <h3 className="card-title">Giao dịch gần đây</h3>
          <Link to="/transactions" className="btn btn-outline btn-sm">Xem tất cả</Link>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Mã GD</th><th>Người mượn</th><th>CCCD</th>
                <th>Ngày mượn</th><th>Hạn trả</th><th>Ngày trả</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentTxns.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
              ) : recentTxns.map((t) => {
                const { cls, text } = getStatusBadge(t);
                return (
                  <tr key={t.id}>
                    <td><strong>#{t.id}</strong></td>
                    <td>{t.userName}</td>
                    <td>{t.socialNumber}</td>
                    <td>{t.borrowDate}</td>
                    <td>{t.dueDate}</td>
                    <td>{t.returnDate || '-'}</td>
                    <td><span className={`badge ${cls}`}>{text}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overdue Table */}
      <div className="card mt-3">
        <div className="card-header">
          <h3 className="card-title">⚠️ Sách quá hạn cần xử lý</h3>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Mã GD</th><th>Người mượn</th><th>CCCD</th><th>Hạn trả</th><th>Quá hạn</th>
              </tr>
            </thead>
            <tbody>
              {overdueTxns.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có giao dịch quá hạn</td></tr>
              ) : overdueTxns.map((t) => {
                const days = Math.ceil(
                  (new Date(new Date().toDateString()) - new Date(t.dueDate)) / (1000 * 60 * 60 * 24)
                );
                return (
                  <tr key={t.id}>
                    <td><strong>#{t.id}</strong></td>
                    <td>{t.userName}</td>
                    <td>{t.socialNumber}</td>
                    <td>{t.dueDate}</td>
                    <td><span className="text-danger">{days} ngày</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
