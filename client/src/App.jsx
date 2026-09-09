import React, { useEffect, useState } from 'react';
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAuthenticated = Boolean(
    localStorage.getItem('booknest_access_token')
  );

  /*
   * Close the mobile menu when the user scrolls.
   */
  useEffect(() => {
    function handleScroll() {
      setIsMenuOpen(false);
    }

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function handleNavigation() {
    closeMenu();
  }

  async function handleLogout() {
    closeMenu();

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
      <Link
  to="/"
  className="brand"
  onClick={handleNavigation}
>
  <img
    src="/logo.jpg"
    alt="BookNest"
    className="navbar-logo"
  />
  <span>BookNest</span>
</Link>

      {/* Hamburger button */}
      <button
        type="button"
        className="nav-menu-button"
        onClick={() =>
          setIsMenuOpen((current) => !current)
        }
        aria-label={
          isMenuOpen
            ? 'Close navigation menu'
            : 'Open navigation menu'
        }
        aria-expanded={isMenuOpen}
        aria-controls="navigation-menu"
      >
        <span />
        <span />
        <span />
      </button>

      <div
        id="navigation-menu"
        className={`nav-links ${
          isMenuOpen ? 'nav-links-open' : ''
        }`}
      >
        {isAuthenticated ? (
          <>
            <Link
              to="/"
              onClick={handleNavigation}
            >
              Dashboard
            </Link>

            <Link
              to="/books"
              onClick={handleNavigation}
            >
              My Library
            </Link>

            <Link
              to="/shelves"
              onClick={handleNavigation}
            >
              Shelves
            </Link>

            <Link
              to="/lending"
              onClick={handleNavigation}
            >
              Lending
            </Link>

            <Link
              to="/books/add"
              onClick={handleNavigation}
            >
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
            <Link
              to="/login"
              onClick={handleNavigation}
            >
              Login
            </Link>

            <Link
              to="/signup"
              onClick={handleNavigation}
            >
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