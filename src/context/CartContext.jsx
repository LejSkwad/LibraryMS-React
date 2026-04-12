import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    setSelectedBooks([]);
    setCartOpen(false);
  }, [user?.id]);

  function toggleCart(book) {
    setSelectedBooks((prev) =>
      prev.find((b) => b.id === book.id) ? prev.filter((b) => b.id !== book.id) : [...prev, book]
    );
  }

  function clearCart() {
    setSelectedBooks([]);
  }

  return (
    <CartContext.Provider value={{ selectedBooks, toggleCart, clearCart, cartOpen, setCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
