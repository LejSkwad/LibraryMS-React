import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  const pageTitle = PAGE_TITLES[location.pathname] || '';

  const isAdmin = user?.role === 'ADMIN';
  const isBorrower = user?.role === 'BORROWER';
  const avatarLetter = (user?.firstName || 'U')[0].toUpperCase();
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';

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

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div className="header-right">
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
