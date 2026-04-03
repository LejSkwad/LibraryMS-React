import { useRef } from 'react';

export function useDebounce(callback, delay = 300) {
  const timeout = useRef(null);

  function trigger(...args) {
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => callback(...args), delay);
  }

  return trigger;
}
