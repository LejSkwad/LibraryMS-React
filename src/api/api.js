export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const PAGE_SIZE = 5;

// Parse "dd/MM/yyyy" (format returned by BE) to Date object
export function parseDMY(str) {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  return new Date(+y, +m - 1, +d);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function apiFetch(url, options = {}) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.token && url.startsWith(API_BASE)) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${user.token}`,
    };
  }
  return fetch(url, options).then((res) => {
    if (res.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return res;
  });
}

export function getStatusBadge(t) {
  const dueDate = parseDMY(t.dueDate);
  const today = new Date(new Date().toDateString());
  const isOverdue = t.status === 'BORROWED' && dueDate < today;
  if (t.status === 'RETURNED') return { cls: 'badge-success', text: 'Đã trả' };
  if (isOverdue) {
    const days = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
    return { cls: 'badge-danger', text: `Quá hạn (${days} ngày)` };
  }
  return { cls: 'badge-warning', text: 'Đang mượn' };
}
