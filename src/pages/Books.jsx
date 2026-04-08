import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, PAGE_SIZE, apiFetch } from '../api/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { usePagination } from '../hooks/usePagination';
import { useDebounce } from '../hooks/useDebounce';

const EMPTY_FORM = {
  title: '', author: '', publisher: '', publishedYear: '',
  categoryId: '', quantity: '', isbn: '', description: '', coverImage: '', pageCount: '',
};

function ThumbPlaceholder({ title }) {
  const words = (title || '').split(' ').filter(Boolean);
  const initials = words.length >= 2
    ? words[0][0] + words[1][0]
    : (title || '?').slice(0, 2);
  return <div className="bl-thumb-placeholder">{initials.toUpperCase()}</div>;
}

function BookCover({ src, alt, fallback }) {
  const [error, setError] = useState(false);
  if (!src || error) return fallback ?? <ThumbPlaceholder title={alt} />;
  return <img src={src} alt={alt} onError={() => setError(true)} />;
}


export default function Books() {
  const { user } = useAuth();
  const isBorrower = user?.role === 'BORROWER';

  const [selectedBooks, setSelectedBooks] = useState([]);
  const [cartModal, setCartModal]   = useState(false);
  const [detailBook, setDetailBook] = useState(null);

  const { items: books, page, currentPage, setCurrentPage, setPageResult, tableInfo } = usePagination();
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState({ isbn: '', title: '', author: '', publisher: '', publishedYear: '', categoryId: '' });
  const [bookModal, setBookModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const debouncedLoad = useDebounce((s) => { setCurrentPage(0); loadBooks(0, s); });

  useEffect(() => { loadCategories(); loadBooks(0); }, []);

  async function loadCategories() {
    try {
      const res  = await apiFetch(`${API_BASE}/v1/category`);
      const json = await res.json();
      setCategories(json.data || []);
    } catch {}
  }

  async function loadBooks(pg = currentPage, s = search) {
    const params = new URLSearchParams();
    params.append('page', pg);
    params.append('size', PAGE_SIZE);
    if (s.isbn)          params.append('isbn',          s.isbn);
    if (s.title)         params.append('title',        s.title);
    if (s.author)        params.append('author',       s.author);
    if (s.publisher)     params.append('publisher',    s.publisher);
    if (s.publishedYear) params.append('publishedYear', s.publishedYear);
    if (s.categoryId)    params.append('categoryId',   s.categoryId);
    try {
      const res  = await apiFetch(`${API_BASE}/v1/books?${params}`);
      const json = await res.json();
      setPageResult(json.data);
    } catch {}
  }

  function handleSearch(field, value) {
    const s = { ...search, [field]: value };
    setSearch(s);
    debouncedLoad(s);
  }

  function handleFilter(field, value) {
    const s = { ...search, [field]: value };
    setSearch(s);
    setCurrentPage(0);
    loadBooks(0, s);
  }

  function clearSearch() {
    const empty = { isbn: '', title: '', author: '', publisher: '', publishedYear: '', categoryId: '' };
    setSearch(empty);
    setCurrentPage(0);
    loadBooks(0, empty);
  }

  function goToPage(p) { setCurrentPage(p); loadBooks(p); }

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBookModal(true);
  }

  function openEditModal(book) {
    setEditingId(book.id);
    setForm({
      title:       book.title        || '',
      author:      book.author       || '',
      publisher:   book.publisher    || '',
      publishedYear: book.publishedYear || '',
      categoryId:  book.categoryId   || '',
      quantity:    book.quantity     || '',
      isbn:        book.isbn         || '',
      description: book.description  || '',
      coverImage:  book.coverImage   || '',
      pageCount:   book.pageCount    || '',
    });
    setBookModal(true);
  }

  async function saveBook(e) {
    e.preventDefault();
    const data = {
      title:        form.title,
      author:       form.author,
      publisher:    form.publisher,
      publishedYear: parseInt(form.publishedYear),
      categoryId:   parseInt(form.categoryId),
      quantity:     parseInt(form.quantity),
      isbn:         form.isbn        || null,
      description:  form.description || null,
      coverImage:   form.coverImage  || null,
      pageCount:    form.pageCount   ? parseInt(form.pageCount) : null,
    };
    try {
      const url    = editingId ? `${API_BASE}/v1/books/${editingId}` : `${API_BASE}/v1/books`;
      const method = editingId ? 'PUT' : 'POST';
      const res    = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json   = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setBookModal(false);
      loadBooks();
    } catch { alert('Không thể kết nối đến server!'); }
  }

  function toggleCart(book) {
    setSelectedBooks((prev) =>
      prev.find((b) => b.id === book.id) ? prev.filter((b) => b.id !== book.id) : [...prev, book]
    );
  }

  async function submitBorrowRequest() {
    if (!selectedBooks.length) return;
    try {
      const res  = await apiFetch(`${API_BASE}/v1/borrow-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, bookIds: selectedBooks.map((b) => b.id) }),
      });
      const json = await res.json();
      alert(json.message);
      if (res.ok) { setSelectedBooks([]); setCartModal(false); }
    } catch { alert('Lỗi kết nối!'); }
  }

  return (
    <>
      {/* ── Page header ──────────────────────────────────── */}
      <div className="page-header">
        {isBorrower && selectedBooks.length > 0 && (
          <div className="cart-bar">
            <div>
              <div className="cart-bar-info">{selectedBooks.length} sách đã chọn</div>
              <div className="cart-bar-books">{selectedBooks.map((b) => b.title).join(' · ')}</div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', marginLeft: 'auto' }}>
              <button className="btn btn-sm btn-outline" style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff' }} onClick={() => setSelectedBooks([])}>
                Xóa tất cả
              </button>
              <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--primary)', fontWeight: 600 }} onClick={() => setCartModal(true)}>
                Gửi yêu cầu mượn →
              </button>
            </div>
          </div>
        )}
        {!isBorrower && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={openAddModal}>+ Thêm sách</button>
          </div>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="txn-filter">
        <div className="txn-filter-top">
          <input
            className="form-control"
            placeholder="ISBN..."
            style={{ maxWidth: 160 }}
            value={search.isbn}
            onChange={(e) => handleSearch('isbn', e.target.value)}
          />
          <input
            className="form-control"
            placeholder="Tìm tên sách..."
            value={search.title}
            onChange={(e) => handleSearch('title', e.target.value)}
          />
          <input
            className="form-control"
            placeholder="Tìm tác giả..."
            value={search.author}
            onChange={(e) => handleSearch('author', e.target.value)}
          />
          <input
            className="form-control"
            placeholder="Tìm NXB..."
            value={search.publisher}
            onChange={(e) => handleSearch('publisher', e.target.value)}
          />
          <input
            className="form-control"
            type="number"
            placeholder="Năm xuất bản"
            style={{ maxWidth: 140 }}
            value={search.publishedYear}
            onChange={(e) => handleSearch('publishedYear', e.target.value)}
          />
          <select
            className="form-control"
            style={{ maxWidth: 180 }}
            value={search.categoryId}
            onChange={(e) => handleFilter('categoryId', e.target.value)}
          >
            <option value="">Tất cả thể loại</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn btn-outline btn-sm" onClick={clearSearch}>Xóa bộ lọc</button>
        </div>
      </div>

      {/* ── Book list ─────────────────────────────────────── */}
      <div className="bl-container">
        <div className="bl-header">
          {tableInfo || 'Sách'}
        </div>

        {books.length === 0 ? (
          <div className="bl-empty">
            <div className="bl-empty-icon">📚</div>
            <div className="bl-empty-text">Không tìm thấy sách nào</div>
          </div>
        ) : books.map((book) => {
          const inCart    = !!selectedBooks.find((b) => b.id === book.id);
          const available = book.availableQuantity > 0;
          return (
            <div key={book.id} className="bl-row" onClick={() => setDetailBook(book)}>

              {/* Thumbnail */}
              <div className="bl-thumb">
                <BookCover src={book.coverImage} alt={book.title} />
              </div>

              {/* Body */}
              <div className="bl-body">
                <div className="bl-title">{book.title}</div>
                <div className="bl-author">{book.author}</div>
                <div className="bl-meta">
                  {book.categoryName && <span className="bl-cat">{book.categoryName}</span>}
                  {book.isbn && <span className="bl-isbn">ISBN {book.isbn}</span>}
                </div>
                {book.description && (
                  <div className="bl-desc">{book.description}</div>
                )}
              </div>

              {/* Stock */}
              <div className="bl-stock">
                <div className={`bl-stock-fraction${!available ? ' out' : ''}`}>
                  {book.availableQuantity}
                  <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>/{book.quantity}</span>
                </div>
                <div className="bl-stock-label">còn lại</div>
              </div>

              {/* Action */}
              <div className="bl-action" onClick={(e) => e.stopPropagation()}>
                {isBorrower ? (
                  <button
                    className={`btn btn-sm ${inCart ? 'btn-danger' : available ? 'btn-primary' : 'btn-outline'}`}
                    disabled={!available && !inCart}
                    onClick={() => toggleCart(book)}
                    style={{ minWidth: 88 }}
                  >
                    {inCart ? '✕ Bỏ chọn' : '+ Chọn'}
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => openEditModal(book)}
                    style={{ minWidth: 80 }}
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ────────────────────────────────────── */}
      <div className="bl-footer">
        <span className="table-info">{tableInfo}</span>
        <Pagination page={page} currentPage={currentPage} onPageChange={goToPage} />
      </div>

      {/* ── Detail modal ─────────────────────────────────── */}
      <Modal
        active={!!detailBook}
        onClose={() => setDetailBook(null)}
        title="Chi tiết sách"
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: '.75rem', width: '100%' }}>
            {detailBook && !isBorrower && (
              <button className="btn btn-outline" onClick={() => { openEditModal(detailBook); setDetailBook(null); }}>
                Chỉnh sửa
              </button>
            )}
            {detailBook && isBorrower && (() => {
              const inCart = !!selectedBooks.find((b) => b.id === detailBook.id);
              const avail  = detailBook.availableQuantity > 0;
              return (
                <button
                  className={`btn ${inCart ? 'btn-danger' : 'btn-primary'}`}
                  disabled={!avail && !inCart}
                  onClick={() => toggleCart(detailBook)}
                >
                  {inCart ? '✕ Bỏ chọn' : '+ Thêm vào giỏ'}
                </button>
              );
            })()}
            <button className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={() => setDetailBook(null)}>
              Đóng
            </button>
          </div>
        }
      >
        {detailBook && (
          <div className="bd-layout">
            {/* Cover */}
            <div className="bd-cover">
              <BookCover src={detailBook.coverImage} alt={detailBook.title} fallback={<div className="bd-cover-placeholder">📖</div>} />
              <div className={`bd-avail-pill ${detailBook.availableQuantity > 0 ? 'good' : 'none'}`}>
                {detailBook.availableQuantity > 0
                  ? `✓ Còn ${detailBook.availableQuantity} cuốn`
                  : '✗ Hết sách'
                }
              </div>
            </div>

            {/* Info */}
            <div className="bd-info">
              {detailBook.categoryName && (
                <div className="bd-category">{detailBook.categoryName}</div>
              )}
              <h2 className="bd-title">{detailBook.title}</h2>
              <p className="bd-author">bởi {detailBook.author}</p>

              {detailBook.description && (
                <p className="bd-desc">{detailBook.description}</p>
              )}

              <div className="bd-specs">
                {detailBook.isbn && (
                  <div className="bd-spec">
                    <span className="bd-spec-key">ISBN</span>
                    <span className="bd-spec-val">{detailBook.isbn}</span>
                  </div>
                )}
                {detailBook.publisher && (
                  <div className="bd-spec">
                    <span className="bd-spec-key">Nhà xuất bản</span>
                    <span className="bd-spec-val">{detailBook.publisher}</span>
                  </div>
                )}
                {detailBook.publishedYear && (
                  <div className="bd-spec">
                    <span className="bd-spec-key">Năm xuất bản</span>
                    <span className="bd-spec-val">{detailBook.publishedYear}</span>
                  </div>
                )}
                {detailBook.pageCount && (
                  <div className="bd-spec">
                    <span className="bd-spec-key">Số trang</span>
                    <span className="bd-spec-val">{detailBook.pageCount} trang</span>
                  </div>
                )}
                <div className="bd-spec">
                  <span className="bd-spec-key">Kho sách</span>
                  <span className="bd-spec-val">
                    {detailBook.availableQuantity} / {detailBook.quantity} cuốn có sẵn
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cart confirm modal ────────────────────────────── */}
      <Modal
        active={cartModal}
        onClose={() => setCartModal(false)}
        title="Xác nhận yêu cầu mượn"
        size="sm"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setCartModal(false)}>Hủy</button>
            <button className="btn btn-primary" onClick={submitBorrowRequest}>Gửi yêu cầu</button>
          </>
        }
      >
        <p style={{ marginBottom: '.75rem' }}>
          Bạn muốn mượn <strong>{selectedBooks.length}</strong> sách sau:
        </p>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.9 }}>
          {selectedBooks.map((b) => (
            <li key={b.id}>
              <span style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic' }}>{b.title}</span>
              {' '}<span style={{ color: 'var(--text-muted)', fontSize: '.8125rem' }}>— {b.author}</span>
            </li>
          ))}
        </ul>
      </Modal>

      {/* ── Add / Edit modal ──────────────────────────────── */}
      <Modal
        active={bookModal}
        onClose={() => setBookModal(false)}
        title={editingId ? 'Chỉnh sửa sách' : 'Thêm sách mới'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setBookModal(false)}>Hủy</button>
            <button className="btn btn-primary" form="bookForm" type="submit">Lưu sách</button>
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
              <input className="form-control" type="number" required placeholder="Nhập số lượng" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ISBN</label>
              <input className="form-control" placeholder="VD: 978-3-16-148410-0" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Số trang</label>
              <input className="form-control" type="number" placeholder="VD: 320" min="1" value={form.pageCount} onChange={(e) => setForm({ ...form, pageCount: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ảnh bìa (URL)</label>
            <input className="form-control" placeholder="https://..." value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <textarea className="form-control" placeholder="Nhập mô tả sách..." rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </form>
      </Modal>
    </>
  );
}
