import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '5rem', fontWeight: 700, color: 'var(--border)' }}>404</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Trang không tồn tại</div>
      <div style={{ color: 'var(--text-muted)' }}>Địa chỉ bạn truy cập không tồn tại hoặc đã bị xóa.</div>
      <button className="btn btn-primary" onClick={() => navigate(-1)}>Quay lại</button>
    </div>
  );
}
