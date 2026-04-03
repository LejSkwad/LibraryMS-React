import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, PAGE_SIZE, apiFetch } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';

const EMPTY_FORM = { title: '', author: '', publisher: '', publishedYear: '', categoryId: '', quantity: '' };

export default function Books() {
  const { user } = useAuth();
  const isBorrower = user?.role === 'BORROWER';

  const { items: books, page, currentPage, setCurrentPage, setPageResult, tableInfo } = usePagination();
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState({ id: '', title: '', author: '', publisher: '', publishedYear: '', categoryId: '' });
  const [bookModal, setBookModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const debouncedLoad = useDebounce((newSearch) => { setCurrentPage(0); loadBooks(0, newSearch); });

  useEffect(() => {
    loadCategories();
    loadBooks(0);
  }, []);

  async function loadCategories() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/category`);
      const json = await res.json();
      setCategories(json.data || []);
    } catch {}
  }

  async function loadBooks(pg = currentPage, s = search) {
    const params = new URLSearchParams();
    params.append('page', pg);
    params.append('size', PAGE_SIZE);
    if (s.id) params.append('id', s.id);
    if (s.title) params.append('title', s.title);
    if (s.author) params.append('author', s.author);
    if (s.publisher) params.append('publisher', s.publisher);
    if (s.publishedYear) params.append('publishedYear', s.publishedYear);
    if (s.categoryId) params.append('categoryId', s.categoryId);
    try {
      const res = await apiFetch(`${API_BASE}/v1/books?${params}`);
      const json = await res.json();
      setPageResult(json.data);
    } catch {}
  }

  function handleSearch(field, value) {
    const newSearch = { ...search, [field]: value };
    setSearch(newSearch);
    debouncedLoad(newSearch);
  }

  function handleFilter(field, value) {
    const newSearch = { ...search, [field]: value };
    setSearch(newSearch);
    setCurrentPage(0);
    loadBooks(0, newSearch);
  }

  function clearSearch() {
    const empty = { id: '', title: '', author: '', publisher: '', publishedYear: '', categoryId: '' };
    setSearch(empty);
    setCurrentPage(0);
    loadBooks(0, empty);
  }

  function goToPage(p) {
    setCurrentPage(p);
    loadBooks(p);
  }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBookModal(true);
  }

  function openEditModal(book) {
    setEditingId(book.id);
    setForm({
      title: book.title || '',
      author: book.author || '',
      publisher: book.publisher || '',
      publishedYear: book.publishedYear || '',
      categoryId: book.categoryId || '',
      quantity: book.quantity || '',
    });
    setBookModal(true);
  }

  async function saveBook(e) {
    e.preventDefault();
    const data = {
      title: form.title,
      author: form.author,
      publisher: form.publisher,
      publishedYear: parseInt(form.publishedYear),
      categoryId: parseInt(form.categoryId),
      quantity: parseInt(form.quantity),
    };
    try {
      const url = editingId ? `${API_BASE}/v1/books/${editingId}` : `${API_BASE}/v1/books`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setBookModal(false);
      loadBooks();
    } catch {
      alert('Không thể kết nối đến server!');
    }
  }


  return (
    <>
      {!isBorrower && (
        <div className="page-header">
          <div className="page-actions">
            <button className="btn btn-primary" onClick={openAddModal}>
              ➕ Thêm sách mới
            </button>
          </div>
        </div>
      )}

      {/* Search Panel */}
      <div className="search-panel">
        <div className="search-panel-header">
          <span>🔍 Tìm kiếm</span>
          <button className="btn btn-sm btn-outline" onClick={clearSearch}>Xóa bộ lọc</button>
        </div>
        <div className="search-panel-body">
          <div className="search-field">
            <label className="form-label">ID</label>
            <input className="form-control" type="number" value={search.id} onChange={(e) => handleSearch('id', e.target.value)} placeholder="Nhập ID..." />
          </div>
          <div className="search-field">
            <label className="form-label">Tên sách</label>
            <input className="form-control" value={search.title} onChange={(e) => handleSearch('title', e.target.value)} placeholder="Nhập tên sách..." />
          </div>
          <div className="search-field">
            <label className="form-label">Tác giả</label>
            <input className="form-control" value={search.author} onChange={(e) => handleSearch('author', e.target.value)} placeholder="Nhập tên tác giả..." />
          </div>
          <div className="search-field">
            <label className="form-label">Nhà xuất bản</label>
            <input className="form-control" value={search.publisher} onChange={(e) => handleSearch('publisher', e.target.value)} placeholder="Nhập tên NXB..." />
          </div>
          <div className="search-field">
            <label className="form-label">Năm xuất bản</label>
            <input className="form-control" type="number" value={search.publishedYear} onChange={(e) => handleSearch('publishedYear', e.target.value)} placeholder="VD: 2024" />
          </div>
          <div className="search-field">
            <label className="form-label">Thể loại</label>
            <select className="form-control" value={search.categoryId} onChange={(e) => handleFilter('categoryId', e.target.value)}>
              <option value="">Tất cả</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th><th>Tên sách</th><th>Tác giả</th>
                {!isBorrower && <><th>NXB</th><th>Năm XB</th></>}
                <th>Thể loại</th><th>Số lượng</th><th>Còn lại</th>
                {!isBorrower && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr><td colSpan={isBorrower ? 6 : 9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
              ) : books.map((book) => {
                const availBadge = book.availableQuantity > 0 ? 'badge-success' : 'badge-warning';
                return (
                  <tr key={book.id}>
                    <td>{book.id}</td>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    {!isBorrower && <><td>{book.publisher}</td><td>{book.publishedYear}</td></>}
                    <td><span className="badge badge-primary">{book.categoryName}</span></td>
                    <td>{book.quantity}</td>
                    <td><span className={`badge ${availBadge}`}>{book.availableQuantity}</span></td>
                    {!isBorrower && (
                      <td className="actions">
                        <button className="btn btn-sm btn-outline" onClick={() => openEditModal(book)}>✏️</button>
                      </td>
                    )}
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

      {/* Add/Edit Book Modal */}
      <Modal
        active={bookModal}
        onClose={() => setBookModal(false)}
        title={editingId ? 'Chỉnh sửa sách' : 'Thêm sách mới'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setBookModal(false)}>Hủy</button>
            <button className="btn btn-primary" form="bookForm" type="submit">Lưu</button>
          </>
        }
      >
        <form id="bookForm" onSubmit={saveBook}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tên sách <span className="required">*</span></label>
              <input className="form-control" required placeholder="Nhập tên sách" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tác giả <span className="required">*</span></label>
              <input className="form-control" required placeholder="Nhập tên tác giả" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nhà xuất bản <span className="required">*</span></label>
              <input className="form-control" required placeholder="Nhập tên NXB" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Năm xuất bản <span className="required">*</span></label>
              <input className="form-control" type="number" required placeholder="VD: 2024" min="1900" max="2100" value={form.publishedYear} onChange={(e) => setForm({ ...form, publishedYear: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Thể loại <span className="required">*</span></label>
              <select className="form-control" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">-- Chọn thể loại --</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Số lượng <span className="required">*</span></label>
              <input className="form-control" type="number" required placeholder="Nhập số lượng" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
