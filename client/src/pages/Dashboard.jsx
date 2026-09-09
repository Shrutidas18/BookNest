
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import "../styles/Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data } = await api.get('/dashboard');

        console.log('DASHBOARD DATA:', data);

        setDashboard(data);
      } catch (err) {
        console.error('DASHBOARD ERROR:', err);

        setError(
          err.response?.data?.message ||
            'Could not load your dashboard.'
        );
      }
    }

    loadDashboard();
  }, []);

  /*
   * Listen for new activity events in realtime.
   *
   * The backend emits:
   * activity:created
   *
   * whenever a new ActivityLog is created for
   * the current user.
   */
  useEffect(() => {
    const socket = connectSocket();

    if (!socket) {
      return undefined;
    }

    function handleActivityCreated(activity) {
      console.log(
        'Realtime activity received:',
        activity
      );

      setDashboard((currentDashboard) => {
        if (!currentDashboard) {
          return currentDashboard;
        }

        const existingActivities =
          currentDashboard.recentActivity || [];

        /*
         * Prevent duplicates in case the same event
         * is received more than once.
         */
        const alreadyExists =
          existingActivities.some(
            (item) => item.id === activity.id
          );

        if (alreadyExists) {
          return currentDashboard;
        }

        return {
          ...currentDashboard,

          recentActivity: [
            activity,
            ...existingActivities
          ].slice(0, 20)
        };
      });
    }

    socket.on(
      'activity:created',
      handleActivityCreated
    );

    return () => {
      socket.off(
        'activity:created',
        handleActivityCreated
      );
    };
  }, []);

  if (error) {
    return (
      <section className="card">
        <p className="error">{error}</p>
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section className="card">
        <p>Loading dashboard…</p>
      </section>
    );
  }

  const {
    totalBooks,
    readingBooks,
    finishedBooks,
    wantToReadBooks,
  } = dashboard.stats;

  function goToAddBook() {
    navigate('/books/add');
  }

  function goToLibrary() {
    navigate('/books');
  }

  return (
    <>
      {/* Hero */}
      <section className="hero dashboard-hero">
        <div>
          <p className="eyebrow">YOUR READING SPACE</p>

          <h1>Welcome back, Alice 👋</h1>

          <p>
            Keep track of your books, reading progress,
            shelves, and lending activity.
          </p>
        </div>

        <button
          type="button"
          onClick={goToAddBook}
        >
          + Add Book
        </button>
      </section>

      {/* Statistics */}
      <section className="stats-grid">
        <div className="card stat-card">
          <span className="muted">Total Books</span>
          <strong>{totalBooks}</strong>
          <small>In your library</small>
        </div>

        <div className="card stat-card">
          <span className="muted">Currently Reading</span>
          <strong>{readingBooks}</strong>
          <small>Books in progress</small>
        </div>

        <div className="card stat-card">
          <span className="muted">Finished</span>
          <strong>{finishedBooks}</strong>
          <small>Books completed</small>
        </div>

        <div className="card stat-card">
          <span className="muted">Want to Read</span>
          <strong>{wantToReadBooks}</strong>
          <small>On your reading list</small>
        </div>
      </section>

      {/* Main dashboard grid */}
      <section className="dashboard-grid">
        {/* Recent books */}
        <div className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LIBRARY</p>
              <h2>Recent Books</h2>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={goToLibrary}
            >
              View all
            </button>
          </div>

          {dashboard.recentBooks.length === 0 ? (
            <p className="muted">
              Your library is empty.
            </p>
          ) : (
            <div className="book-list">
              {dashboard.recentBooks.map((book) => {
                const progress =
                  book.totalPages > 0
                    ? Math.round(
                        (book.currentPage /
                          book.totalPages) *
                          100
                      )
                    : 0;

                return (
                  <div
                    className="book-item"
                    key={book.id}
                  >
                    <div className="book-info">
                      <div>
                        <h3>{book.title}</h3>
                        <p>{book.author}</p>
                      </div>

                      <span className="pill">
                        {String(book.status)
                          .replaceAll('_', ' ')}
                      </span>
                    </div>

                    {book.status === 'READING' && (
                      <div className="progress-area">
                        <div className="progress-header">
                          <span>
                            Reading progress
                          </span>

                          <span>
                            {book.currentPage} /{' '}
                            {book.totalPages} pages
                          </span>
                        </div>

                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(
                                progress,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SHORTCUTS</p>
              <h2>Quick Actions</h2>
            </div>
          </div>

          <div className="quick-actions">
            <button
              type="button"
              className="action-button"
              onClick={goToAddBook}
            >
              <strong>+ Add a book</strong>
              <span>
                Add a new book to your library
              </span>
            </button>

            <button
              type="button"
              className="action-button"
              onClick={() => {
                alert(
                  'Shelf creation is coming next.'
                );
              }}
            >
              <strong>+ Create a shelf</strong>
              <span>
                Organize books into a collection
              </span>
            </button>

            <button
              type="button"
              className="action-button"
              onClick={goToLibrary}
            >
              <strong>View my library</strong>
              <span>
                Browse and manage all your books
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Activity */}
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              WHAT'S HAPPENING
            </p>
            <h2>Recent Activity</h2>
          </div>
        </div>

        {dashboard.recentActivity.length === 0 ? (
          <p className="muted">
            No activity yet.
          </p>
        ) : (
          <div className="activity-list">
            {dashboard.recentActivity.map((item) => (
              <div
                className="activity-item"
                key={item.id}
              >
                <div className="activity-dot" />

                <div>
                  <strong>{item.message}</strong>

                  <small>
                    {new Date(
                      item.createdAt
                    ).toLocaleString()}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

