export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const PAGE_SIZE = 5;

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
  const isOverdue =
    t.status === 'BORROWED' &&
    new Date(t.dueDate) < new Date(new Date().toDateString());
  if (t.status === 'RETURNED') return { cls: 'badge-success', text: 'Đã trả' };
  if (isOverdue) {
    const days = Math.ceil(
      (new Date(new Date().toDateString()) - new Date(t.dueDate)) /
        (1000 * 60 * 60 * 24)
    );
    return { cls: 'badge-danger', text: `Quá hạn (${days} ngày)` };
  }
  return { cls: 'badge-warning', text: 'Đang mượn' };
}
