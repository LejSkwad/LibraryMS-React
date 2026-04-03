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

      <div className="table-container">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>ID</th><th>Tên thể loại</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
              ) : categories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.id}</td>
                  <td>{cat.name}</td>
                  <td className="actions">
                    <button className="btn btn-sm btn-danger" onClick={() => openDeleteModal(cat)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal
        active={addModal}
        onClose={() => setAddModal(false)}
        title="Thêm thể loại"
        size="xs"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAddModal(false)}>Hủy</button>
            <button className="btn btn-primary" form="catForm" type="submit">Lưu</button>
          </>
        }
      >
        <form id="catForm" onSubmit={saveCategory}>
          <div className="form-group">
            <label className="form-label">Tên thể loại <span className="required">*</span></label>
            <input className="form-control" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên thể loại" />
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        active={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Xác nhận xóa"
        size="xs"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteModal(false)}>Hủy</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Xóa</button>
          </>
        }
      >
        <p>Bạn có chắc muốn xóa thể loại <strong>{deletingName}</strong>?</p>
      </Modal>
    </>
  );
}
