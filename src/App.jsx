import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ClaimAccount from './pages/ClaimAccount';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Borrowers from './pages/Borrowers';
import BorrowRequests from './pages/BorrowRequests';
import Transactions from './pages/Transactions';
import Profile from './pages/Profile';

function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/claim" element={<ClaimAccount />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/books" element={<Books />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/users" element={<Users />} />
            <Route path="/borrowers" element={<Borrowers />} />
            <Route path="/borrow-requests" element={<BorrowRequests />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
