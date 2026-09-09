import React, { useEffect } from 'react';
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
import Library from './pages/Library';
import EditBook from './pages/EditBook';
import BookDetails from './pages/BookDetails';
import Shelves from './pages/Shelves';
import ShelfDetails from './pages/ShelfDetails';
import Lending from './pages/Lending';

import api, { setAccessToken } from './services/api';
import {
  connectSocket,
  disconnectSocket,
} from './services/socket';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem(
    'booknest_access_token'
  );

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
      // Even if the server request fails,
      // clear the local session.
    } finally {
      disconnectSocket();
      setAccessToken(null);

      navigate('/login', {
        replace: true,
      });
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
            <Link to="/">
              Dashboard
            </Link>

            <Link to="/books">
              My Library
            </Link>

            <Link to="/shelves">
              Shelves
            </Link>

            <Link to="/lending">
              Lending
            </Link>

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
            <Link to="/login">
              Login
            </Link>

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
  useEffect(() => {
    const token = localStorage.getItem(
      'booknest_access_token'
    );

    if (token) {
      connectSocket();
    }

    return () => {
      // Do not disconnect here.
      // React StrictMode can mount/unmount effects during
      // development, and Socket.io handles reconnection itself.
    };
  }, []);

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

          {/* Library */}
          <Route
            path="/books"
            element={
              <ProtectedRoute>
                <Library />
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

          {/* Read-only Book Details */}
          <Route
            path="/books/:id"
            element={
              <ProtectedRoute>
                <BookDetails />
              </ProtectedRoute>
            }
          />

          {/* Edit Own Book */}
          <Route
            path="/books/:id/edit"
            element={
              <ProtectedRoute>
                <EditBook />
              </ProtectedRoute>
            }
          />

          {/* Shelves */}
          <Route
            path="/shelves"
            element={
              <ProtectedRoute>
                <Shelves />
              </ProtectedRoute>
            }
          />

          {/* Shelf Details */}
          <Route
            path="/shelves/:id"
            element={
              <ProtectedRoute>
                <ShelfDetails />
              </ProtectedRoute>
            }
          />

          {/* Lending */}
          <Route
            path="/lending"
            element={
              <ProtectedRoute>
                <Lending />
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