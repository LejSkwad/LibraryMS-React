import { useEffect, useState } from 'react';
import { API_BASE, apiFetch } from '../api/api';
import Modal from '../components/Modal';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [addModal, setAddModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingName, setDeletingName] = useState('');
  const [name, setName] = useState('');

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/category`);
      const json = await res.json();
      setCategories(json.data || []);
    } catch {}
  }

  async function saveCategory(e) {
    e.preventDefault();
    try {
      const res = await apiFetch(`${API_BASE}/v1/category?name=${encodeURIComponent(name)}`, { method: 'POST' });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setAddModal(false);
      setName('');
      loadCategories();
    } catch {
      alert('Không thể kết nối đến server!');
    }
  }

  function openDeleteModal(cat) {
    setDeletingId(cat.id);
    setDeletingName(cat.name);
    setDeleteModal(true);
  }

  async function confirmDelete() {
    try {
      const res = await apiFetch(`${API_BASE}/v1/category/${deletingId}`, { method: 'DELETE' });
      const json = await res.json();
      alert(json.message);
      if (!res.ok) return;
      setDeleteModal(false);
      loadCategories();
    } catch {
      alert('Không thể kết nối đến server!');
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setName(''); setAddModal(true); }}>
            + Thêm thể loại
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="cat-empty">
          <div className="cat-empty-icon">🏷️</div>
          <p>Chưa có thể loại nào</p>
        </div>
      ) : (
        <div className="cat-grid">
          {categories.map((cat, i) => (
            <div className="cat-card" key={cat.id}>
              <span className="cat-index">#{String(i + 1).padStart(2, '0')}</span>
              <span className="cat-name">{cat.name}</span>
              <button className="cat-delete" title="Xóa thể loại" onClick={() => openDeleteModal(cat)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <Modal
        active={addModal}
        onClose={() => setAddModal(false)}
        title="Thêm thể loại"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setAddModal(false)}>Hủy</button>
            <button className="btn btn-primary" form="catForm" type="submit">Lưu</button>
          </>
        }
      >
        <form id="catForm" onSubmit={saveCategory}>
          <div className="form-group">
            <label className="form-label">Tên thể loại <span className="required">*</span></label>
            <input
              className="form-control"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Văn học, Khoa học..."
              autoFocus
            />
          </div>
        </form>
      </Modal>

      <Modal
        active={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Xác nhận xóa"
        size="xs"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteModal(false)}>Hủy</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Xóa</button>
          </>
        }
      >
        <p>Bạn có chắc muốn xóa thể loại <strong>{deletingName}</strong>?</p>
        <p className="text-danger" style={{ fontSize: '.875rem' }}>Sách thuộc thể loại này sẽ không còn được phân loại.</p>
      </Modal>
    </>
  );
}
