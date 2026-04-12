import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { API_BASE, apiFetch } from '../api/api';
import Modal from './Modal';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/books': 'Quản lý sách',
  '/categories': 'Thể loại sách',
  '/users': 'Quản lý Librarian & Admin',
  '/borrowers': 'Quản lý người mượn',
  '/borrow-requests': 'Yêu cầu mượn sách',
  '/transactions': 'Quản lý giao dịch',
  '/profile': 'Hồ sơ cá nhân',
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  const isBorrower = user?.role === 'BORROWER';
  const pageTitle = (isBorrower && location.pathname === '/books')
    ? 'Thư viện sách'
    : PAGE_TITLES[location.pathname] || '';
  const avatarLetter = (user?.firstName || 'U')[0].toUpperCase();
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';

  const { selectedBooks, toggleCart, clearCart, cartOpen, setCartOpen } = useCart();
  const [pendingCount, setPendingCount] = useState(0);

  async function submitBorrowRequest() {
    if (!selectedBooks.length) return;
    try {
      const res = await apiFetch(`${API_BASE}/v1/borrow-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, bookIds: selectedBooks.map((b) => b.id) }),
      });
      const json = await res.json();
      alert(json.message);
      if (res.ok) { clearCart(); setCartOpen(false); }
    } catch { alert('Lỗi kết nối!'); }
  }

  // Connect SSE once on mount
  useEffect(() => {
    if (!user?.token) return;
    const es = new EventSource(`${API_BASE}/events?token=${encodeURIComponent(user.token)}`);

    es.addEventListener('new_request', (e) => {
      if (!isBorrower) setPendingCount((c) => c + 1);
      try {
        window.dispatchEvent(new CustomEvent('borrow-request-sse', { detail: { type: 'new_request', data: JSON.parse(e.data) } }));
      } catch {}
    });

    es.addEventListener('request_approved', (e) => {
      try {
        window.dispatchEvent(new CustomEvent('borrow-request-sse', { detail: { type: 'request_approved', data: JSON.parse(e.data) } }));
      } catch {}
    });

    es.addEventListener('request_rejected', (e) => {
      try {
        window.dispatchEvent(new CustomEvent('borrow-request-sse', { detail: { type: 'request_rejected', data: JSON.parse(e.data) } }));
      } catch {}
    });

    return () => es.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset badge when user navigates to borrow-requests page
  useEffect(() => {
    if (location.pathname === '/borrow-requests') setPendingCount(0);
  }, [location.pathname]);

  function navCls({ isActive }) {
    return 'nav-item' + (isActive ? ' active' : '');
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">📚</span>
          <h2>Library MS</h2>
        </div>

        <nav className="sidebar-nav">
          {/* Dashboard */}
          {!isBorrower && (
            <div className="nav-section">
              <NavLink to="/dashboard" className={navCls}>
                <span className="icon">📊</span>
                <span>Dashboard</span>
              </NavLink>
            </div>
          )}

          {/* Sách */}
          <div className="nav-section">
            <div className="nav-section-title">Sách</div>
            <NavLink to="/books" className={navCls}>
              <span className="icon">📖</span>
              <span>Quản lý sách</span>
            </NavLink>
            {!isBorrower && (
              <NavLink to="/categories" className={navCls}>
                <span className="icon">🏷️</span>
                <span>Thể loại</span>
              </NavLink>
            )}
          </div>

          {/* Giao dịch */}
          <div className="nav-section">
            <div className="nav-section-title">Giao dịch</div>
            <NavLink to="/transactions" className={navCls}>
              <span className="icon">🔄</span>
              <span>Giao dịch</span>
            </NavLink>
            <NavLink to="/borrow-requests" className={navCls}>
              <span className="icon">📋</span>
              <span>Yêu cầu mượn</span>
              {!isBorrower && pendingCount > 0 && (
                <span className="nav-badge">{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </NavLink>
          </div>

          {/* Người dùng */}
          {!isBorrower && (
            <div className="nav-section">
              <div className="nav-section-title">Người dùng</div>
              <NavLink to="/borrowers" className={navCls}>
                <span className="icon">👥</span>
                <span>Người mượn</span>
              </NavLink>
              {isAdmin && (
                <NavLink to="/users" className={navCls}>
                  <span className="icon">⚙️</span>
                  <span>Librarian &amp; Admin</span>
                </NavLink>
              )}
            </div>
          )}
        </nav>
      </aside>

      <Modal
        active={cartOpen}
        onClose={() => setCartOpen(false)}
        title={`Giỏ sách (${selectedBooks.length})`}
        size="sm"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setCartOpen(false)}>Đóng</button>
            <button className="btn btn-primary" disabled={selectedBooks.length === 0} onClick={submitBorrowRequest}>
              Gửi yêu cầu mượn
            </button>
          </>
        }
      >
        {selectedBooks.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🛒</div>
            <div>Chưa có sách nào trong giỏ</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {selectedBooks.map((b) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.625rem .75rem', background: 'var(--background)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 48, flexShrink: 0, borderRadius: 4, overflow: 'hidden', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {b.coverImage
                    ? <img src={b.coverImage} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (b.title || '?').slice(0, 2).toUpperCase()
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{b.author}</div>
                </div>
                <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', flexShrink: 0 }} onClick={() => toggleCart(b)}>
                  Xóa
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div className="header-right">
            {isBorrower && (
              <button className="cart-header-btn" onClick={() => setCartOpen(true)}>
                🛒
                {selectedBooks.length > 0 && (
                  <span className="cart-header-count">{selectedBooks.length}</span>
                )}
              </button>
            )}
            <NavLink to="/profile" className="user-info">
              <div className="user-avatar">{avatarLetter}</div>
              <div className="user-details">
                <div className="user-name">{fullName}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            </NavLink>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
