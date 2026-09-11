import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { connectSocket } from '../services/socket';

const TOTAL_COVER_IMAGES = 10;

function getBookCoverImage(book) {
  const id = String(book?.id ?? '');

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }

  const coverNumber = (hash % TOTAL_COVER_IMAGES) + 1;

  return `/cover${coverNumber}.jpg`;
}

function getShelfCoverImages(shelf) {
  if (!Array.isArray(shelf.books)) {
    return [];
  }

  return shelf.books
    .map((shelfBook) => shelfBook.book)
    .filter(Boolean)
    .map((book) => getBookCoverImage(book))
    .slice(0, 4); // cap the collage at 4 images
}

export default function Shelves() {
  const navigate = useNavigate();

  const [shelves, setShelves] = useState([]);
  const [sharedShelves, setSharedShelves] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateForm, setShowCreateForm] =
    useState(false);
  const [shelfName, setShelfName] = useState('');
  const [creating, setCreating] = useState(false);

  const [deletingShelf, setDeletingShelf] =
    useState(null);

  const [shelfToDelete, setShelfToDelete] =
    useState(null);

  async function loadShelves(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setError('');

    try {
      const [
        myShelvesResponse,
        sharedShelvesResponse,
      ] = await Promise.all([
        api.get('/shelves/mine'),
        api.get('/shelves/shared-with-me'),
      ]);

      setShelves(
        Array.isArray(myShelvesResponse.data)
          ? myShelvesResponse.data
          : []
      );

      setSharedShelves(
        Array.isArray(sharedShelvesResponse.data)
          ? sharedShelvesResponse.data
          : []
      );
    } catch (err) {
      console.error('SHELVES ERROR:', err);

      setError(
        err.response?.data?.message ||
          'Could not load your shelves.'
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadShelves();
  }, []);

  /*
   * REALTIME SHELF UPDATES
   *
   * Listen for shelf sharing and collaboration changes.
   * This allows the Shared With Me list to update without
   * requiring the user to manually refresh the page.
   */
  useEffect(() => {
    const socket = connectSocket();

    if (!socket) {
      return undefined;
    }

    function handleConnect() {
      console.log(
        'Shelves realtime connected.'
      );
    }

    function handleShelfShared(payload) {
      console.log(
        'Realtime shelf shared — refreshing shelves.',
        payload
      );

      loadShelves(false);
    }

    function handleRoleChanged(payload) {
      console.log(
        'Realtime shelf role changed — refreshing shelves.',
        payload
      );

      loadShelves(false);
    }

    function handleCollaboratorRemoved(payload) {
      console.log(
        'Realtime collaborator removed — refreshing shelves.',
        payload
      );

      loadShelves(false);
    }

    function handleShelfDeleted(payload) {
      console.log(
        'Realtime shelf deleted — refreshing shelves.',
        payload
      );

      loadShelves(false);
    }

    socket.on(
      'connect',
      handleConnect
    );

    socket.on(
      'shelf:shared',
      handleShelfShared
    );

    socket.on(
      'shelf:role-changed',
      handleRoleChanged
    );

    socket.on(
      'shelf:collaborator-removed',
      handleCollaboratorRemoved
    );

    socket.on(
      'shelf:deleted',
      handleShelfDeleted
    );

    return () => {
      socket.off(
        'connect',
        handleConnect
      );

      socket.off(
        'shelf:shared',
        handleShelfShared
      );

      socket.off(
        'shelf:role-changed',
        handleRoleChanged
      );

      socket.off(
        'shelf:collaborator-removed',
        handleCollaboratorRemoved
      );

      socket.off(
        'shelf:deleted',
        handleShelfDeleted
      );
    };
  }, []);

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

  function requestDeleteShelf(shelf) {
    setShelfToDelete(shelf);
  }

  function closeDeleteShelfModal() {
    setShelfToDelete(null);
  }

  async function handleDeleteShelf() {
    if (!shelfToDelete) {
      return;
    }

    const shelf = shelfToDelete;

    setDeletingShelf(shelf.id);
    setError('');
    setShelfToDelete(null);

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

  function getBookCount(shelf) {
    return Array.isArray(shelf.books)
      ? shelf.books.length
      : 0;
  }

  function getSharedRole(shelf) {
    return (
      shelf.role ||
      shelf.share?.role ||
      shelf.shelfShare?.role ||
      shelf.permission ||
      'VIEWER'
    );
  }

  function getOwnerName(shelf) {
    return (
      shelf.owner?.name ||
      shelf.user?.name ||
      shelf.ownerName ||
      'Another BookNest user'
    );
  }

  function renderShelfCard(shelf, shared = false) {
    const bookCount = getBookCount(shelf);
    const role = getSharedRole(shelf);
    const coverImages = getShelfCoverImages(shelf);

    return (
      <article
        className="card shelf-card"
        key={shelf.id}
      >
        {/* Cover Collage */}
        {coverImages.length > 0 ? (
          <div
            className={`shelf-cover-collage shelf-cover-collage-${coverImages.length}`}
          >
            {coverImages.map((src, index) => (
              <div
                key={index}
                className="shelf-cover-collage-tile"
                aria-hidden="true"
                style={{
                  backgroundImage: `url(${src})`,
                }}
              />
            ))}

            {!shared && (
              <button
                type="button"
                className="shelf-delete-button"
                onClick={() =>
                  requestDeleteShelf(shelf)
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
            )}
          </div>
        ) : (
          !shared && (
            <button
              type="button"
              className="shelf-delete-button shelf-delete-button-standalone"
              onClick={() =>
                requestDeleteShelf(shelf)
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
          )
        )}

        {/* Shelf Content */}
        <div className="shelf-card-content">
          <div className="shelf-title-row">
            <h2>
              {shelf.name}
            </h2>

            {shared && (
              <span className="status-badge shelf-role-badge">
                {role === 'EDITOR'
                  ? 'Editor'
                  : 'Viewer'}
              </span>
            )}
          </div>

          <p className="muted">
            {bookCount}{' '}
            {bookCount === 1
              ? 'book'
              : 'books'}
          </p>

          {shared && (
            <p className="muted shelf-owner">
              Shared by {getOwnerName(shelf)}
            </p>
          )}

          {/* Book Preview */}
          {bookCount > 0 ? (
            <div className="shelf-book-preview">
              {shelf.books
                .slice(0, 3)
                .map((shelfBook) => (
                  <div
                    className="shelf-book-item"
                    key={shelfBook.id}
                  >
                    <span>
                      {(shelfBook.book?.title || 'U')
                        .charAt(0)
                        .toUpperCase()}
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

              {bookCount > 3 && (
                <small className="muted">
                  + {bookCount - 3} more
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
              navigate(`/shelves/${shelf.id}`)
            }
          >
            Open Shelf →
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="shelves-page">
      <section className="shelves-header">
        <div>
          <Link to="/dashboard" className="back-link">
            ← Back to Dashboard
          </Link>

          <p className="eyebrow">
            ORGANIZE YOUR READING
          </p>

          <h1>
            My Shelves
          </h1>

          <p className="muted">
            Create collections, organize your
            books, and collaborate with others.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowCreateForm(
              (previous) => !previous
            )
          }
        >
          {showCreateForm
            ? 'Cancel'
            : '+ Create Shelf'}
        </button>
      </section>

      {error && (
        <section className="card shelf-error">
          <p className="error">
            {error}
          </p>
        </section>
      )}

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

      {loading ? (
        <section className="card shelf-state">
          <p className="muted">
            Loading your shelves…
          </p>
        </section>
      ) : (
        <>
          <section>
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  YOUR COLLECTIONS
                </p>

                <h2>
                  My Shelves
                </h2>
              </div>
            </div>

            {shelves.length === 0 ? (
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
              <div className="shelves-grid">
                {shelves.map((shelf) =>
                  renderShelfCard(shelf)
                )}
              </div>
            )}
          </section>

          <section>
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  COLLABORATION
                </p>

                <h2>
                  Shared With Me
                </h2>

                <p className="muted">
                  Shelves other BookNest users have
                  shared with you.
                </p>
              </div>
            </div>

            {sharedShelves.length === 0 ? (
              <section className="card shelf-state">
                <div className="empty-icon">
                  🤝
                </div>

                <h2>
                  No shared shelves
                </h2>

                <p className="muted">
                  When someone shares a shelf with
                  you, it will appear here.
                </p>
              </section>
            ) : (
              <div className="shelves-grid">
                {sharedShelves.map((shelf) =>
                  renderShelfCard(
                    shelf,
                    true
                  )
                )}
              </div>
            )}
          </section>
        </>
      )}

      {shelfToDelete && (
        <div className="delete-modal-overlay">
          <div className="card delete-modal">
            <h2>
              Delete shelf
            </h2>

            <p>
              Are you sure you want to delete
              "{shelfToDelete.name}"? This action
              cannot be undone.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeDeleteShelfModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteShelf}
                disabled={
                  deletingShelf ===
                  shelfToDelete.id
                }
              >
                {deletingShelf ===
                shelfToDelete.id
                  ? 'Deleting…'
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}