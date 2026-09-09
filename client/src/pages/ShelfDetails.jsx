import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import api from '../services/api';
import { connectSocket, joinShelf } from '../services/socket';

function getCurrentUserId() {
  try {
    const token = localStorage.getItem(
      'booknest_access_token'
    );

    if (!token) {
      return null;
    }

    const payload = JSON.parse(
      atob(token.split('.')[1])
    );

    return (
      payload.sub ||
      payload.userId ||
      payload.id ||
      null
    );
  } catch {
    return null;
  }
}

export default function ShelfDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const currentUserId = getCurrentUserId();

  const [shelf, setShelf] = useState(null);
  const [books, setBooks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [error, setError] = useState('');

  const [selectedBookId, setSelectedBookId] =
    useState('');
  const [addingBook, setAddingBook] =
    useState(false);
  const [removingBookId, setRemovingBookId] =
    useState(null);

  const [availableBooks, setAvailableBooks] =
    useState([]);

  const [collaboratorEmail, setCollaboratorEmail] =
    useState('');

  const [collaboratorRole, setCollaboratorRole] =
    useState('VIEWER');

  const [sharing, setSharing] =
    useState(false);

  const [
    removingCollaboratorId,
    setRemovingCollaboratorId,
  ] = useState(null);


  async function loadShelf(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setError('');

    try {
      const { data } = await api.get(
        `/shelves/${id}`
      );

      setShelf(data);

      const shelfBooks = Array.isArray(data.books)
        ? data.books
        : [];

      setBooks(shelfBooks);
    } catch (err) {
      console.error(
        'SHELF DETAILS ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not load this shelf.'
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function loadMyBooks() {
    setLoadingBooks(true);

    try {
      const { data } = await api.get('/books', {
        params: {
          limit: 100,
        },
      });

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
          ? data.items
          : [];

      setAvailableBooks(items);
    } catch (err) {
      console.error(
        'BOOKS ERROR:',
        err
      );
    } finally {
      setLoadingBooks(false);
    }
  }


  useEffect(() => {
    loadShelf();
    loadMyBooks();
  }, [id]);

  useEffect(() => {
    const socket = connectSocket();

    if (!socket) {
      return undefined;
    }

    // Explicitly join this shelf's realtime room.
    joinShelf(id);

    function handleBookAdded(payload) {
      if (payload?.shelfId !== id) {
        return;
      }

      console.log(
        'Realtime shelf book added — refreshing shelf.'
      );

      loadShelf(false);
    }

    function handleBookRemoved(payload) {
      if (payload?.shelfId !== id) {
        return;
      }

      console.log(
        'Realtime shelf book removed — refreshing shelf.'
      );

      loadShelf(false);
    }

    function handleShelfShared(payload) {
      if (payload?.shelfId !== id) {
        return;
      }

      console.log(
        'Realtime shelf sharing update — refreshing shelf.'
      );

      loadShelf(false);
    }

    function handleRoleChanged(payload) {
      if (payload?.shelfId !== id) {
        return;
      }

      console.log(
        'Realtime collaborator role change — refreshing shelf.'
      );

      loadShelf(false);
    }

    function handleCollaboratorRemoved(payload) {
      if (payload?.shelfId !== id) {
        return;
      }

      console.log(
        'Realtime collaborator removal — refreshing shelf.'
      );

      // If the current user was removed, the REST
      // request will return 403 and the page will
      // show the appropriate error state.
      if (
        payload?.collaboratorId ===
        currentUserId
      ) {
        loadShelf(false);
        return;
      }

      loadShelf(false);
    }

    function handleShelfDeleted(payload) {
      if (payload?.shelfId !== id) {
        return;
      }

      console.log(
        'Realtime shelf deleted — leaving shelf.'
      );

      navigate('/shelves', {
        replace: true,
      });
    }

    socket.on(
      'shelf:book-added',
      handleBookAdded
    );

    socket.on(
      'shelf:book-removed',
      handleBookRemoved
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
        'shelf:book-added',
        handleBookAdded
      );

      socket.off(
        'shelf:book-removed',
        handleBookRemoved
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
  }, [id, currentUserId, navigate]);

  const booksAlreadyOnShelf = useMemo(() => {
    return new Set(
      books.map(
        (shelfBook) => shelfBook.bookId
      )
    );
  }, [books]);

  const booksAvailableToAdd =
    availableBooks.filter(
      (book) =>
        !booksAlreadyOnShelf.has(book.id)
    );

  const collaborators = Array.isArray(
    shelf?.collaborators
  )
    ? shelf.collaborators
    : [];

  const isOwner =
    Boolean(currentUserId) &&
    shelf?.ownerId === currentUserId;

  const currentCollaborator =
    collaborators.find(
      (collaborator) =>
        collaborator.userId === currentUserId
    );

  const isEditor =
    isOwner ||
    currentCollaborator?.role === 'EDITOR';

  const canManageBooks = isEditor;

  async function handleAddBook(e) {
    e.preventDefault();

    if (!selectedBookId || !canManageBooks) {
      return;
    }

    setAddingBook(true);
    setError('');

    try {
      const { data } = await api.post(
        `/shelves/${id}/books`,
        {
          bookId: selectedBookId,
        }
      );

      const addedBook = availableBooks.find(
        (book) => book.id === selectedBookId
      );

      setBooks((previousBooks) => [
        ...previousBooks,
        {
          ...data,
          book: addedBook,
        },
      ]);

      setSelectedBookId('');
    } catch (err) {
      console.error(
        'ADD BOOK TO SHELF ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not add the book to this shelf.'
      );
    } finally {
      setAddingBook(false);
    }
  }

  async function handleRemoveBook(shelfBook) {
    if (!canManageBooks) {
      return;
    }

    const bookTitle =
      shelfBook.book?.title ||
      'this book';

    const confirmed = window.confirm(
      `Remove "${bookTitle}" from this shelf?`
    );

    if (!confirmed) {
      return;
    }

    setRemovingBookId(
      shelfBook.bookId
    );

    setError('');

    try {
      await api.delete(
        `/shelves/${id}/books/${shelfBook.bookId}`
      );

      setBooks((previousBooks) =>
        previousBooks.filter(
          (item) =>
            item.bookId !==
            shelfBook.bookId
        )
      );
    } catch (err) {
      console.error(
        'REMOVE BOOK FROM SHELF ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not remove the book from this shelf.'
      );
    } finally {
      setRemovingBookId(null);
    }
  }

  async function handleShareShelf(e) {
    e.preventDefault();

    const email =
      collaboratorEmail
        .trim()
        .toLowerCase();

    if (!email) {
      setError(
        'Enter the collaborator email address.'
      );

      return;
    }

    setSharing(true);
    setError('');

    try {
      const { data } = await api.post(
        `/shelves/${id}/share`,
        {
          email,
          role: collaboratorRole,
        }
      );

      const existingCollaborator =
        collaborators.find(
          (collaborator) =>
            collaborator.userId ===
            data.userId
        );

      if (existingCollaborator) {
        setShelf(
          (previousShelf) => ({
            ...previousShelf,
            collaborators:
              previousShelf.collaborators.map(
                (collaborator) =>
                  collaborator.userId ===
                  data.userId
                    ? {
                        ...collaborator,
                        role: data.role,
                      }
                    : collaborator
              ),
          })
        );
      } else {
        const userFromResponse =
          data.user || {
            id: data.userId,
            name:
              email.split('@')[0],
            email,
          };

        setShelf(
          (previousShelf) => ({
            ...previousShelf,
            collaborators: [
              ...(previousShelf.collaborators ||
                []),
              {
                ...data,
                user: userFromResponse,
              },
            ],
          })
        );
      }

      setCollaboratorEmail('');
      setCollaboratorRole('VIEWER');
    } catch (err) {
      console.error(
        'SHARE SHELF ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not share this shelf.'
      );
    } finally {
      setSharing(false);
    }
  }

  async function handleRemoveCollaborator(
    collaborator
  ) {
    const collaboratorName =
      collaborator.user?.name ||
      collaborator.user?.email ||
      'this collaborator';

    const confirmed = window.confirm(
      `Remove ${collaboratorName} from this shelf?`
    );

    if (!confirmed) {
      return;
    }

    setRemovingCollaboratorId(
      collaborator.id
    );

    setError('');

    try {
      await api.delete(
        `/shelves/${id}/collaborators/${collaborator.id}`
      );

      setShelf(
        (previousShelf) => ({
          ...previousShelf,
          collaborators:
            previousShelf.collaborators.filter(
              (item) =>
                item.id !==
                collaborator.id
            ),
        })
      );
    } catch (err) {
      console.error(
        'REMOVE COLLABORATOR ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not remove the collaborator.'
      );
    } finally {
      setRemovingCollaboratorId(null);
    }
  }

  if (loading) {
    return (
      <div className="shelf-details-page">
        <section className="card shelf-state">
          <p className="muted">
            Loading shelf…
          </p>
        </section>
      </div>
    );
  }

  if (!shelf) {
    return (
      <div className="shelf-details-page">
        <section className="card shelf-state">
          <h2>
            Shelf not found
          </h2>

          <p className="muted">
            {error ||
              'This shelf could not be loaded.'}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/shelves')
            }
          >
            Back to Shelves
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="shelf-details-page">


      <section className="shelf-details-header">
        <div>
          <Link
            to="/shelves"
            className="back-link"
          >
            ← Back to Shelves
          </Link>

          <p className="eyebrow">
            READING COLLECTION
          </p>

          <h1>
            {shelf.name}
          </h1>

          <p className="muted">
            {books.length}{' '}
            {books.length === 1
              ? 'book'
              : 'books'}

            {shelf.owner?.name
              ? ` · Owned by ${shelf.owner.name}`
              : ''}
          </p>
        </div>

        <div className="shelf-details-icon">
          🗂️
        </div>
      </section>

      {error && (
        <section className="card shelf-error">
          <p className="error">
            {error}
          </p>
        </section>
      )}

      {canManageBooks && (
        <section className="card add-book-shelf-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                ADD A BOOK
              </p>

              <h2>
                Add from your library
              </h2>
            </div>
          </div>

          {loadingBooks ? (
            <p className="muted">
              Loading your books…
            </p>
          ) : booksAvailableToAdd.length === 0 ? (
            <div className="empty-shelf-preview">
              <span>
                All of your books are already on
                this shelf.
              </span>
            </div>
          ) : (
            <form
              className="add-book-shelf-form"
              onSubmit={handleAddBook}
            >
              <div className="form-group">
                <label htmlFor="shelf-book">
                  Select a book
                </label>

                <select
                  id="shelf-book"
                  value={selectedBookId}
                  onChange={(e) =>
                    setSelectedBookId(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Choose a book…
                  </option>

                  {booksAvailableToAdd.map(
                    (book) => (
                      <option
                        key={book.id}
                        value={book.id}
                      >
                        {book.title}
                        {book.author
                          ? ` — ${book.author}`
                          : ''}
                      </option>
                    )
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={
                  addingBook ||
                  !selectedBookId
                }
              >
                {addingBook
                  ? 'Adding…'
                  : 'Add to Shelf'}
              </button>
            </form>
          )}
        </section>
      )}

      <section>
        <div className="section-heading shelf-books-heading">
          <div>
            <p className="eyebrow">
              BOOKS
            </p>

            <h2>
              Books on this shelf
            </h2>
          </div>
        </div>

        {books.length === 0 ? (
          <section className="card shelf-state">
            <div className="empty-icon">
              📚
            </div>

            <h2>
              This shelf is empty
            </h2>

            <p className="muted">
              {canManageBooks
                ? 'Add books from your library to build this collection.'
                : 'There are currently no books on this shelf.'}
            </p>
          </section>
        ) : (
          <div className="shelf-details-books">
            {books.map((shelfBook) => (
              <article
                className="card shelf-detail-book"
                key={shelfBook.id}
              >
                <div className="book-cover-placeholder">
                  📖
                </div>

                <div className="shelf-detail-book-info">
                  <h3>
                    {shelfBook.book?.title ||
                      'Untitled book'}
                  </h3>

                  <p className="muted">
                    {shelfBook.book?.author ||
                      'Unknown author'}
                  </p>

                  {shelfBook.book
                    ?.totalPages ? (
                    <small className="muted">
                      {
                        shelfBook.book
                          .totalPages
                      }{' '}
                      pages
                    </small>
                  ) : null}
                </div>

                {/* READ-ONLY BOOK DETAILS */}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    navigate(
                      `/books/${shelfBook.bookId}`
                    )
                  }
                >
                  View Book
                </button>

                {/* ONLY OWNER / EDITOR CAN REMOVE */}

                {canManageBooks && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      handleRemoveBook(
                        shelfBook
                      )
                    }
                    disabled={
                      removingBookId ===
                      shelfBook.bookId
                    }
                  >
                    {removingBookId ===
                    shelfBook.bookId
                      ? 'Removing…'
                      : 'Remove'}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card collaborators-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              COLLABORATION
            </p>

            <h2>
              Collaborators
            </h2>

            <p className="muted">
              Share this shelf with other
              BookNest users.
            </p>
          </div>
        </div>

        {isOwner ? (
          <>
            <form
              className="share-shelf-form"
              onSubmit={handleShareShelf}
            >
              <div className="form-group">
                <label htmlFor="collaborator-email">
                  Email address
                </label>

                <input
                  id="collaborator-email"
                  type="email"
                  placeholder="bob@booknest.test"
                  value={collaboratorEmail}
                  onChange={(e) => {
                    setCollaboratorEmail(
                      e.target.value
                    );
                    setError('');
                  }}
                />
              </div>

              <div className="form-group role-field">
                <label htmlFor="collaborator-role">
                  Permission
                </label>

                <select
                  id="collaborator-role"
                  value={collaboratorRole}
                  onChange={(e) =>
                    setCollaboratorRole(
                      e.target.value
                    )
                  }
                >
                  <option value="VIEWER">
                    Viewer — can view
                  </option>

                  <option value="EDITOR">
                    Editor — can manage books
                  </option>
                </select>
              </div>

              <button
                type="submit"
                disabled={
                  sharing ||
                  !collaboratorEmail.trim()
                }
              >
                {sharing
                  ? 'Sharing…'
                  : 'Share Shelf'}
              </button>
            </form>

            <div className="collaborator-list">
              <div className="collaborator-list-heading">
                <h3>
                  People with access
                </h3>

                <span className="muted">
                  {collaborators.length}
                </span>
              </div>

              {collaborators.length === 0 ? (
                <div className="empty-collaborators">
                  <span className="empty-icon">
                    👥
                  </span>

                  <p>
                    No collaborators yet.
                  </p>

                  <small className="muted">
                    Share this shelf with someone
                    using their BookNest email.
                  </small>
                </div>
              ) : (
                <div className="collaborator-items">
                  {collaborators.map(
                    (collaborator) => (
                      <div
                        className="collaborator-item"
                        key={collaborator.id}
                      >
                        <div className="collaborator-avatar">
                          {(collaborator.user?.name ||
                            collaborator.user?.email ||
                            '?')
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="collaborator-info">
                          <strong>
                            {collaborator.user?.name ||
                              'BookNest user'}
                          </strong>

                          <small className="muted">
                            {collaborator.user?.email ||
                              ''}
                          </small>
                        </div>

                        <span
                          className={`role-badge ${
                            collaborator.role ===
                            'EDITOR'
                              ? 'editor-role'
                              : 'viewer-role'
                          }`}
                        >
                          {collaborator.role ===
                          'EDITOR'
                            ? 'Editor'
                            : 'Viewer'}
                        </span>

                        <button
                          type="button"
                          className="remove-collaborator-button"
                          onClick={() =>
                            handleRemoveCollaborator(
                              collaborator
                            )
                          }
                          disabled={
                            removingCollaboratorId ===
                            collaborator.id
                          }
                        >
                          {removingCollaboratorId ===
                          collaborator.id
                            ? '…'
                            : 'Remove'}
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="shared-shelf-notice">
            <div className="shared-shelf-icon">
              👥
            </div>

            <div>
              <strong>
                Shared shelf
              </strong>

              <p className="muted">
                This shelf has been shared with
                you. You can access the books
                according to your assigned
                permission.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}