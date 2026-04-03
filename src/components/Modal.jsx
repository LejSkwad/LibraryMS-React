export default function Modal({ active, onClose, title, children, footer, size }) {
  return (
    <div
      className={`modal-overlay${active ? ' active' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal${size ? ' modal-' + size : ''}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
