import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Shelves() {
  const navigate = useNavigate();

  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [shelfName, setShelfName] = useState('');
  const [creating, setCreating] = useState(false);

  const [deletingShelf, setDeletingShelf] = useState(null);

  // =========================================================
  // LOAD SHELVES
  // =========================================================

  async function loadShelves() {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/shelves/mine');

      setShelves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('SHELVES ERROR:', err);

      setError(
        err.response?.data?.message ||
          'Could not load your shelves.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShelves();
  }, []);

  // =========================================================
  // CREATE SHELF
  // =========================================================

  async function handleCreateShelf(e) {
    e.preventDefault();

    const trimmedName = shelfName.trim();

    if (!trimmedName) {
      setError('Shelf name is required.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const { data } = await api.post('/shelves', {
        name: trimmedName,
      });

      setShelves((previousShelves) => [
        data,
        ...previousShelves,
      ]);

      setShelfName('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('CREATE SHELF ERROR:', err);

      setError(
        err.response?.data?.message ||
          'Could not create the shelf.'
      );
    } finally {
      setCreating(false);
    }
  }

  // =========================================================
  // DELETE SHELF
  // =========================================================

  async function handleDeleteShelf(shelf) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${shelf.name}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingShelf(shelf.id);
    setError('');

    try {
      await api.delete(`/shelves/${shelf.id}`);

      setShelves((previousShelves) =>
        previousShelves.filter(
          (item) => item.id !== shelf.id
        )
      );
    } catch (err) {
      console.error('DELETE SHELF ERROR:', err);

      setError(
        err.response?.data?.message ||
          'Could not delete the shelf.'
      );
    } finally {
      setDeletingShelf(null);
    }
  }

  // =========================================================
  // HELPERS
  // =========================================================

  function getBookCount(shelf) {
    return Array.isArray(shelf.books)
      ? shelf.books.length
      : 0;
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="shelves-page">

      {/* Header */}
      <section className="shelves-header">
        <div>
          <p className="eyebrow">
            ORGANIZE YOUR READING
          </p>

          <h1>
            My Shelves
          </h1>

          <p className="muted">
            Create collections and organize your
            books however you like.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowCreateForm((previous) => !previous)
          }
        >
          {showCreateForm
            ? 'Cancel'
            : '+ Create Shelf'}
        </button>
      </section>

      {/* Error */}
      {error && (
        <section className="card shelf-error">
          <p className="error">
            {error}
          </p>
        </section>
      )}

      {/* Create Shelf */}
      {showCreateForm && (
        <section className="card create-shelf-card">

          <div className="section-heading">
            <div>
              <p className="eyebrow">
                NEW COLLECTION
              </p>

              <h2>
                Create a shelf
              </h2>
            </div>
          </div>

          <form
            className="create-shelf-form"
            onSubmit={handleCreateShelf}
          >
            <div className="form-group">
              <label htmlFor="shelf-name">
                Shelf name
              </label>

              <input
                id="shelf-name"
                type="text"
                placeholder="e.g. Tech & Self Improvement"
                value={shelfName}
                onChange={(e) => {
                  setShelfName(e.target.value);
                  setError('');
                }}
                maxLength={100}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={
                creating ||
                !shelfName.trim()
              }
            >
              {creating
                ? 'Creating…'
                : 'Create Shelf'}
            </button>
          </form>

        </section>
      )}

      {/* Loading */}
      {loading ? (
        <section className="card shelf-state">
          <p className="muted">
            Loading your shelves…
          </p>
        </section>
      ) : shelves.length === 0 ? (

        /* Empty State */
        <section className="card shelf-state">

          <div className="empty-icon">
            🗂️
          </div>

          <h2>
            No shelves yet
          </h2>

          <p className="muted">
            Create your first shelf to start
            organizing your books.
          </p>

          <button
            type="button"
            onClick={() =>
              setShowCreateForm(true)
            }
          >
            + Create your first shelf
          </button>

        </section>

      ) : (

        /* Shelf Grid */
        <section className="shelves-grid">

          {shelves.map((shelf) => (
            <article
              className="card shelf-card"
              key={shelf.id}
            >

              {/* Shelf Header */}
              <div className="shelf-card-header">

                <div className="shelf-icon">
                  🗂️
                </div>

                <div className="shelf-card-menu">
                  <button
                    type="button"
                    className="icon-button danger-icon-button"
                    onClick={() =>
                      handleDeleteShelf(shelf)
                    }
                    disabled={
                      deletingShelf === shelf.id
                    }
                    aria-label={`Delete ${shelf.name}`}
                    title="Delete shelf"
                  >
                    {deletingShelf === shelf.id
                      ? '…'
                      : '🗑️'}
                  </button>
                </div>

              </div>

              {/* Shelf Content */}
              <div className="shelf-card-content">

                <h2>
                  {shelf.name}
                </h2>

                <p className="muted">
                  {getBookCount(shelf)}{' '}
                  {getBookCount(shelf) === 1
                    ? 'book'
                    : 'books'}
                </p>

                {/* Book Preview */}
                {getBookCount(shelf) > 0 ? (
                  <div className="shelf-book-preview">

                    {shelf.books
                      .slice(0, 3)
                      .map((shelfBook) => (
                        <div
                          className="shelf-book-item"
                          key={shelfBook.id}
                        >
                          <span>
                            📖
                          </span>

                          <div>
                            <strong>
                              {shelfBook.book?.title ||
                                'Untitled book'}
                            </strong>

                            <small className="muted">
                              {shelfBook.book?.author ||
                                'Unknown author'}
                            </small>
                          </div>
                        </div>
                      ))}

                    {getBookCount(shelf) > 3 && (
                      <small className="muted">
                        +{' '}
                        {getBookCount(shelf) - 3}{' '}
                        more
                      </small>
                    )}

                  </div>
                ) : (
                  <div className="empty-shelf-preview">
                    <span>
                      This shelf is empty.
                    </span>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="shelf-card-footer">

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/shelves/${shelf.id}`
                    )
                  }
                >
                  Open Shelf →
                </button>

              </div>

            </article>
          ))}

        </section>
      )}

    </div>
  );
}