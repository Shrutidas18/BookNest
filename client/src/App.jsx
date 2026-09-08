
import React from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AddBook from './pages/AddBook';

import api, { setAccessToken } from './services/api';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('booknest_access_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function Navigation() {
  const navigate = useNavigate();

  const isAuthenticated = Boolean(
    localStorage.getItem('booknest_access_token')
  );

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the server request fails, clear the local session.
    } finally {
      setAccessToken(null);
      navigate('/login', { replace: true });
    }
  }

  return (
    <nav className="nav">
      <Link to="/" className="brand">
        BookNest
      </Link>

      <div className="nav-links">
        {isAuthenticated ? (
          <>
            <Link to="/">Dashboard</Link>

            <Link to="/books/add">
              Add Book
            </Link>

            <button
              type="button"
              className="nav-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>

            <Link to="/signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="app">
      <Navigation />

      <main className="container">
        <Routes>
          {/* Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Add Book */}
          <Route
            path="/books/add"
            element={
              <ProtectedRoute>
                <AddBook />
              </ProtectedRoute>
            }
          />

          {/* Authentication */}
          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/signup"
            element={<Signup />}
          />

          {/* Unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

