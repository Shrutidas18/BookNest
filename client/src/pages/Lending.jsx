import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { connectSocket } from '../services/socket';

function formatDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function Lending() {
  const navigate = useNavigate();

  const [myBooks, setMyBooks] = useState([]);
  const [lentBooks, setLentBooks] = useState([]);
  const [borrowedBooks, setBorrowedBooks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedBookId, setSelectedBookId] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');

  const [lending, setLending] = useState(false);
  const [returningId, setReturningId] = useState(null);

  async function loadLendingData(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setError('');

    try {
      const [
        booksResponse,
        lentResponse,
        borrowedResponse,
      ] = await Promise.all([
        api.get('/books', {
          params: {
            limit: 100,
          },
        }),
        api.get('/lending/lent'),
        api.get('/lending/borrowed'),
      ]);

      const booksData = booksResponse.data;

      const books = Array.isArray(booksData)
        ? booksData
        : Array.isArray(booksData.items)
          ? booksData.items
          : [];

      setMyBooks(books);

      setLentBooks(
        Array.isArray(lentResponse.data)
          ? lentResponse.data
          : []
      );

      setBorrowedBooks(
        Array.isArray(borrowedResponse.data)
          ? borrowedResponse.data
          : []
      );
    } catch (err) {
      console.error(
        'LENDING LOAD ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not load lending information.'
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadLendingData();
  }, []);

  /*
   * Realtime lending updates.
   *
   * The socket event tells us that something changed.
   * We then fetch the latest lending state from the API
   * instead of trusting the socket payload as our source
   * of truth.
   */
  useEffect(() => {
    const socket = connectSocket();

    if (!socket) {
      return undefined;
    }

    function handleLendingCreated() {
      console.log(
        'Realtime lending created — refreshing lending data.'
      );

      loadLendingData(false);
    }

    function handleLendingReturned() {
      console.log(
        'Realtime lending returned — refreshing lending data.'
      );

      loadLendingData(false);
    }

    socket.on(
      'lending:created',
      handleLendingCreated
    );

    socket.on(
      'lending:returned',
      handleLendingReturned
    );

    return () => {
      socket.off(
        'lending:created',
        handleLendingCreated
      );

      socket.off(
        'lending:returned',
        handleLendingReturned
      );
    };
  }, []);

  const lentBookIds = new Set(
    lentBooks.map((record) => record.bookId)
  );

  const lendableBooks = myBooks.filter(
    (book) => !lentBookIds.has(book.id)
  );

  async function handleLendBook(e) {
    e.preventDefault();

    if (
      !selectedBookId ||
      !borrowerEmail.trim()
    ) {
      setError(
        'Select a book and enter the borrower email.'
      );
      return;
    }

    setLending(true);
    setError('');

    try {
      await api.post(
        `/lending/books/${selectedBookId}`,
        {
          email: borrowerEmail
            .trim()
            .toLowerCase(),
        }
      );

      setSelectedBookId('');
      setBorrowerEmail('');

      await loadLendingData(false);
    } catch (err) {
      console.error(
        'LEND BOOK ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not lend this book.'
      );
    } finally {
      setLending(false);
    }
  }

  async function handleReturnBook(
    lendingRecord
  ) {
    const title =
      lendingRecord.book?.title ||
      'this book';

    const confirmed = window.confirm(
      `Mark "${title}" as returned?`
    );

    if (!confirmed) {
      return;
    }

    setReturningId(lendingRecord.id);
    setError('');

    try {
      await api.post(
        `/lending/${lendingRecord.id}/return`
      );

      await loadLendingData(false);
    } catch (err) {
      console.error(
        'RETURN BOOK ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not mark this book as returned.'
      );
    } finally {
      setReturningId(null);
    }
  }

  if (loading) {
    return (
      <div className="lending-page">
        <section className="card lending-state">
          <p className="muted">
            Loading lending information…
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="lending-page">

      {/* HEADER */}
      <section className="lending-header">
        <div>
          <p className="eyebrow">
            BOOK LENDING
          </p>

          <h1>
            Lending
          </h1>

          <p className="muted">
            Keep track of books you've lent and
            books you're currently borrowing.
          </p>
        </div>

        <div className="lending-header-icon">
          🤝
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <section className="card shelf-error">
          <p className="error">
            {error}
          </p>
        </section>
      )}

      {/* LEND A BOOK */}
      <section className="card lend-book-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              LEND A BOOK
            </p>

            <h2>
              Share a book with someone
            </h2>

            <p className="muted">
              The borrower must already have a
              BookNest account.
            </p>
          </div>
        </div>

        <form
          className="lend-book-form"
          onSubmit={handleLendBook}
        >
          <div className="form-group">
            <label htmlFor="lending-book">
              Book
            </label>

            <select
              id="lending-book"
              value={selectedBookId}
              onChange={(e) => {
                setSelectedBookId(
                  e.target.value
                );
                setError('');
              }}
            >
              <option value="">
                Choose a book…
              </option>

              {lendableBooks.map((book) => (
                <option
                  key={book.id}
                  value={book.id}
                >
                  {book.title}
                  {book.author
                    ? ` — ${book.author}`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="borrower-email">
              Borrower email
            </label>

            <input
              id="borrower-email"
              type="email"
              placeholder="bob@booknest.test"
              value={borrowerEmail}
              onChange={(e) => {
                setBorrowerEmail(
                  e.target.value
                );
                setError('');
              }}
            />
          </div>

          <button
            type="submit"
            disabled={
              lending ||
              !selectedBookId ||
              !borrowerEmail.trim()
            }
          >
            {lending
              ? 'Lending…'
              : 'Lend Book'}
          </button>
        </form>
      </section>

      {/* BOOKS I'VE LENT */}
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              MY LENDING
            </p>

            <h2>
              Books I've Lent
            </h2>
          </div>
        </div>

        {lentBooks.length === 0 ? (
          <section className="card lending-state">
            <div className="empty-icon">
              📚
            </div>

            <h2>
              No active lending
            </h2>

            <p className="muted">
              Books you lend to other BookNest
              users will appear here.
            </p>
          </section>
        ) : (
          <div className="lending-list">
            {lentBooks.map(
              (lendingRecord) => (
                <article
                  className="card lending-item"
                  key={lendingRecord.id}
                >
                  <div className="lending-book-icon">
                    📖
                  </div>

                  <div className="lending-book-info">
                    <h3>
                      {lendingRecord.book
                        ?.title ||
                        'Untitled book'}
                    </h3>

                    <p className="muted">
                      {lendingRecord.book
                        ?.author ||
                        'Unknown author'}
                    </p>

                    <small className="muted">
                      Lent to{' '}
                      {lendingRecord.borrower
                        ?.name ||
                        'Unknown user'}
                      {' · '}
                      {lendingRecord.borrower
                        ?.email ||
                        ''}
                      {' · '}
                      {formatDate(
                        lendingRecord.lentAt
                      )}
                    </small>
                  </div>

                  <div className="lending-actions">
                    <span className="status-badge lending-status">
                      Lent out
                    </span>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        handleReturnBook(
                          lendingRecord
                        )
                      }
                      disabled={
                        returningId ===
                        lendingRecord.id
                      }
                    >
                      {returningId ===
                      lendingRecord.id
                        ? 'Returning…'
                        : 'Mark Returned'}
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      {/* BOOKS I'VE BORROWED */}
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              BORROWED BOOKS
            </p>

            <h2>
              Books I've Borrowed
            </h2>
          </div>
        </div>

        {borrowedBooks.length === 0 ? (
          <section className="card lending-state">
            <div className="empty-icon">
              🤝
            </div>

            <h2>
              Nothing borrowed
            </h2>

            <p className="muted">
              Books other users lend to you will
              appear here.
            </p>
          </section>
        ) : (
          <div className="lending-list">
            {borrowedBooks.map(
              (lendingRecord) => (
                <article
                  className="card lending-item"
                  key={lendingRecord.id}
                >
                  <div className="lending-book-icon">
                    📖
                  </div>

                  <div className="lending-book-info">
                    <h3>
                      {lendingRecord.book
                        ?.title ||
                        'Untitled book'}
                    </h3>

                    <p className="muted">
                      {lendingRecord.book
                        ?.author ||
                        'Unknown author'}
                    </p>

                    <small className="muted">
                      Lent by{' '}
                      {lendingRecord.owner
                        ?.name ||
                        'Unknown user'}
                      {' · '}
                      {lendingRecord.owner
                        ?.email ||
                        ''}
                      {' · '}
                      {formatDate(
                        lendingRecord.lentAt
                      )}
                    </small>
                  </div>

                  <span className="status-badge borrowed-status">
                    Borrowed
                  </span>
                </article>
              )
            )}
          </div>
        )}
      </section>

      {/* BACK TO LIBRARY */}
      <button
        type="button"
        className="secondary-button lending-back-button"
        onClick={() =>
          navigate('/books')
        }
      >
        ← Back to Library
      </button>
    </div>
  );
}