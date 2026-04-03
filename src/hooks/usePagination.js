import { useState } from 'react';

export function usePagination() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);

  function setPageResult(pageData) {
    setPage(pageData);
    setItems(pageData?.content || []);
  }

  const tableInfo = page
    ? `Hiển thị ${page.totalElements === 0 ? 0 : page.number * page.size + 1}-${Math.min(page.number * page.size + page.size, page.totalElements)} của ${page.totalElements} kết quả`
    : '';

  return { items, page, currentPage, setCurrentPage, setPageResult, tableInfo };
}
