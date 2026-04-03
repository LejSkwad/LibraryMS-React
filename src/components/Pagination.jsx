export default function Pagination({ page, currentPage, onPageChange }) {
  if (!page || page.totalPages <= 1) return null;
  const { totalPages } = page;
  const pages = [];

  for (let i = 0; i < totalPages; i++) {
    if (totalPages > 7 && i > 1 && i < totalPages - 2 && Math.abs(i - currentPage) > 1) {
      if (i === 2 || i === totalPages - 3) pages.push('...' + i);
      continue;
    }
    pages.push(i);
  }

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ◀
      </button>
      {pages.map((p) =>
        typeof p === 'string' ? (
          <button key={p} className="pagination-btn" disabled>
            ...
          </button>
        ) : (
          <button
            key={p}
            className={`pagination-btn${p === currentPage ? ' active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p + 1}
          </button>
        )
      )}
      <button
        className="pagination-btn"
        disabled={currentPage === totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        ▶
      </button>
    </div>
  );
}
