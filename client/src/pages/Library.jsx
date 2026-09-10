
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_LABELS = {
  WANT_TO_READ: 'Want to Read',
  READING: 'Reading',
  FINISHED: 'Finished',
};

const BOOKS_PER_PAGE = 6;

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

export default function Library() {
  const navigate = useNavigate();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: BOOKS_PER_PAGE,
    totalPages: 1,
    totalItems: 0,
  });

  const [updatingProgress, setUpdatingProgress] =
    useState({});

  async function loadBooks(customParams = {}) {
    setLoading(true);
    setError('');

    const params = {
      page: customParams.page ?? page,
      pageSize:
        customParams.pageSize ??
        BOOKS_PER_PAGE,
      search:
        customParams.search !== undefined
          ? customParams.search
          : search.trim(),
      status:
        customParams.status !== undefined
          ? customParams.status
          : status,
      sort:
        customParams.sort !== undefined
          ? customParams.sort
          : sortBy,
      order:
        customParams.order !== undefined
          ? customParams.order
          : sortOrder,
    };

    Object.keys(params).forEach((key) => {
      if (params[key] === '') {
        delete params[key];
      }
    });

    console.log(
      'LOADING BOOKS WITH PARAMS:',
      params
    );

    try {
      const { data } = await api.get('/books', {
        params,
      });

      console.log(
        'LIBRARY API RESPONSE:',
        data
      );

      setBooks(data.items || []);

      setPagination({
        page: Number(data.page) || 1,
        pageSize:
          Number(data.pageSize) ||
          BOOKS_PER_PAGE,
        totalPages:
          Number(data.totalPages) || 1,
        totalItems:
          Number(data.total) || 0,
      });
    } catch (err) {
      console.error(
        'LIBRARY ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not load your library.'
      );

      setBooks([]);

      setPagination({
        page: 1,
        pageSize: BOOKS_PER_PAGE,
        totalPages: 1,
        totalItems: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks({
      page: 1,
    });
  }, []);

  function handleSearchSubmit(e) {
    e.preventDefault();

    setPage(1);

    loadBooks({
      page: 1,
      search: search.trim(),
      status,
      sort: sortBy,
      order: sortOrder,
    });
  }

  function handleStatusChange(e) {
    const newStatus = e.target.value;

    setStatus(newStatus);
    setPage(1);

    loadBooks({
      page: 1,
      search: search.trim(),
      status: newStatus,
      sort: sortBy,
      order: sortOrder,
    });
  }

  function handleSortByChange(e) {
    const newSortBy = e.target.value;

    setSortBy(newSortBy);
    setPage(1);

    loadBooks({
      page: 1,
      search: search.trim(),
      status,
      sort: newSortBy,
      order: sortOrder,
    });
  }

  function handleSortOrderChange(e) {
    const newSortOrder = e.target.value;

    setSortOrder(newSortOrder);
    setPage(1);

    loadBooks({
      page: 1,
      search: search.trim(),
      status,
      sort: sortBy,
      order: newSortOrder,
    });
  }

  function clearFilters() {
    setSearch('');
    setStatus('');
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);

    loadBooks({
      page: 1,
      search: '',
      status: '',
      sort: 'date',
      order: 'desc',
    });
  }

  function goToPage(newPage) {
    if (
      newPage < 1 ||
      newPage > pagination.totalPages
    ) {
      return;
    }

    setPage(newPage);

    loadBooks({
      page: newPage,
      search: search.trim(),
      status,
      sort: sortBy,
      order: sortOrder,
    });
  }

  function getProgress(book) {
    if (
      !book.totalPages ||
      book.totalPages <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (book.currentPage / book.totalPages) * 100
      )
    );
  }

  async function updateBookProgress(
    book,
    newPage
  ) {
    if (
      !book.totalPages ||
      book.totalPages <= 0
    ) {
      return;
    }

    const safePage = Math.max(
      0,
      Math.min(newPage, book.totalPages)
    );

    setUpdatingProgress((previous) => ({
      ...previous,
      [book.id]: true,
    }));

    setError('');

    try {
      const { data } = await api.post(
        `/books/${book.id}/progress`,
        {
          currentPage: safePage,
        }
      );

      setBooks((previousBooks) =>
        previousBooks.map((currentBook) =>
          currentBook.id === book.id
            ? {
                ...currentBook,
                ...data,
              }
            : currentBook
        )
      );
    } catch (err) {
      console.error(
        'PROGRESS UPDATE ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not update reading progress.'
      );
    } finally {
      setUpdatingProgress((previous) => ({
        ...previous,
        [book.id]: false,
      }));
    }
  }

  function increaseProgress(book) {
    updateBookProgress(
      book,
      Number(book.currentPage || 0) + 10
    );
  }

  function decreaseProgress(book) {
    updateBookProgress(
      book,
      Number(book.currentPage || 0) - 10
    );
  }

  function handleProgressInput(book, value) {
    const newPage = Number(value);

    if (!Number.isInteger(newPage)) {
      return;
    }

    updateBookProgress(book, newPage);
  }

  function formatStatus(bookStatus) {
    return (
      STATUS_LABELS[bookStatus] ||
      String(bookStatus || '').replaceAll(
        '_',
        ' '
      )
    );
  }

  return (
    <div className="library-page">

      {/* Header */}
      <section className="library-header">
        <div>
          <p className="eyebrow">
            YOUR COLLECTION
          </p>

          <h1>
            My Library
          </h1>

          <p className="muted">
            Browse, search, sort, and manage
            everything in your BookNest collection.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate('/books/add')
          }
        >
          + Add Book
        </button>
      </section>

      {/* Search & Filters */}
      <section className="card library-toolbar">

        {/* Search */}
        <form
          className="library-search"
          onSubmit={handleSearchSubmit}
        >
          <input
            type="search"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <button
            type="submit"
            disabled={loading}
          >
            Search
          </button>
        </form>

        {/* Status */}
        <div className="library-filters">

          <select
            value={status}
            onChange={handleStatusChange}
            aria-label="Filter by status"
            disabled={loading}
          >
            <option value="">
              All statuses
            </option>

            <option value="WANT_TO_READ">
              Want to Read
            </option>

            <option value="READING">
              Reading
            </option>

            <option value="FINISHED">
              Finished
            </option>
          </select>

          {/* Sort field */}
          <select
            value={sortBy}
            onChange={handleSortByChange}
            aria-label="Sort books by"
            disabled={loading}
          >
            <option value="date">
              Recently Added
            </option>

            <option value="title">
              Title
            </option>

            <option value="author">
              Author
            </option>

            <option value="totalPages">
              Page Count
            </option>

            <option value="rating">
              Rating
            </option>
          </select>

          {/* Sort direction */}
          <select
            value={sortOrder}
            onChange={handleSortOrderChange}
            aria-label="Sort direction"
            disabled={loading}
          >
            <option value="desc">
              Descending
            </option>

            <option value="asc">
              Ascending
            </option>
          </select>

          {/* Clear */}
          <button
            type="button"
            className="secondary-button"
            onClick={clearFilters}
            disabled={loading}
          >
            Clear
          </button>

        </div>
      </section>

      {/* Result count */}
      {!loading && !error && (
        <div className="library-result-count">
          <span className="muted">
            {pagination.totalItems}{' '}
            {pagination.totalItems === 1
              ? 'book'
              : 'books'}{' '}
            in your library
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <section className="card">
          <p className="error">
            {error}
          </p>
        </section>
      )}

      {/* Loading */}
      {loading ? (
        <section className="card library-state">
          <p className="muted">
            Loading your library…
          </p>
        </section>
      ) : books.length === 0 ? (

        /* Empty State */
        <section className="card library-state">

          <div className="empty-icon">
            📚
          </div>

          <h2>
            No books found
          </h2>

          <p className="muted">
            Try changing your search or filters,
            or add your first book.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate('/books/add')
            }
          >
            + Add your first book
          </button>

        </section>

      ) : (

        <>
          {/* Book Grid */}
          <section className="library-grid">

            {books.map((book) => {
              const progress =
                getProgress(book);

              const isUpdating =
                Boolean(
                  updatingProgress[book.id]
                );

              const hasPages =
                Number(book.totalPages) > 0;

              const currentPage =
                Number(
                  book.currentPage || 0
                );

              return (
                <article
                  className="card book-card"
                  key={book.id}
                >

                  {/* Book Card Header */}
                  <div className="book-card-top">

                    <img
                      src={getBookCoverImage(book)}
                      alt={`Cover of ${book.title}`}
                      className="book-cover-image"
                    />

                    <span className="pill">
                      {formatStatus(
                        book.status
                      )}
                    </span>

                  </div>

                  {/* Book Information */}
                  <div className="book-card-content">

                    <h2>
                      {book.title}
                    </h2>

                    <p className="book-author">
                      {book.author}
                    </p>

                    {/* Reading Progress */}
                    {hasPages && (
                      <div className="book-progress">

                        <div className="progress-header">
                          <span>
                            Reading Progress
                          </span>

                          <span>
                            {progress}%
                          </span>
                        </div>

                        <div className="progress-bar">

                          <div
                            className="progress-fill"
                            style={{
                              width: `${progress}%`,
                            }}
                          />

                        </div>

                        <div className="progress-details">
                          <span className="muted">
                            {currentPage} of{' '}
                            {book.totalPages} pages
                          </span>

                          {book.status !==
                            'FINISHED' && (
                            <span className="muted">
                              {book.status ===
                              'READING'
                                ? 'Currently reading'
                                : 'Ready to start'}
                            </span>
                          )}
                        </div>

                        {book.status !==
                          'FINISHED' && (
                          <div className="progress-controls">

                            <button
                              type="button"
                              className="progress-control"
                              disabled={
                                isUpdating ||
                                currentPage <= 0
                              }
                              onClick={() =>
                                decreaseProgress(
                                  book
                                )
                              }
                              aria-label={`Decrease ${book.title} progress by 10 pages`}
                            >
                              −10
                            </button>

                            <input
                              type="number"
                              min="0"
                              max={book.totalPages}
                              value={currentPage}
                              disabled={
                                isUpdating
                              }
                              onChange={(e) => {
                                const value =
                                  e.target.value;

                                if (
                                  value === ''
                                ) {
                                  return;
                                }

                                handleProgressInput(
                                  book,
                                  value
                                );
                              }}
                              aria-label={`Current page for ${book.title}`}
                            />

                            <button
                              type="button"
                              className="progress-control"
                              disabled={
                                isUpdating ||
                                currentPage >=
                                  book.totalPages
                              }
                              onClick={() =>
                                increaseProgress(
                                  book
                                )
                              }
                              aria-label={`Increase ${book.title} progress by 10 pages`}
                            >
                              +10
                            </button>

                          </div>
                        )}

                        {isUpdating && (
                          <small className="muted">
                            Saving progress…
                          </small>
                        )}

                        {book.status ===
                          'FINISHED' && (
                          <small className="progress-complete">
                            ✓ Finished
                          </small>
                        )}

                      </div>
                    )}

                    {/* Rating */}
{book.rating !== null &&
  book.rating !== undefined && (
    <div
      className="book-rating"
      aria-label={`Rating: ${book.rating} out of 5`}
    >
      {'★'.repeat(Number(book.rating))}
      {'☆'.repeat(
        5 - Number(book.rating)
      )}
    </div>
  )}

                    {/* Footer */}
                    <div className="book-card-footer">

                      <span className="muted">
                        {book.totalPages
                          ? `${book.totalPages} pages`
                          : 'Page count not set'}
                      </span>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          navigate(
                            `/books/${book.id}/edit`
                          )
                        }
                      >
                        Manage
                      </button>

                    </div>

                  </div>

                </article>
              );
            })}

          </section>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <section className="card library-pagination">

              <button
                type="button"
                className="secondary-button"
                disabled={
                  loading || page <= 1
                }
                onClick={() =>
                  goToPage(page - 1)
                }
              >
                ← Previous
              </button>

              <div className="pagination-pages">

                {Array.from(
                  {
                    length:
                      pagination.totalPages,
                  },
                  (_, index) => index + 1
                ).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={
                      pageNumber === page
                        ? 'pagination-page active'
                        : 'pagination-page'
                    }
                    disabled={loading}
                    onClick={() =>
                      goToPage(pageNumber)
                    }
                  >
                    {pageNumber}
                  </button>
                ))}

              </div>

              <button
                type="button"
                className="secondary-button"
                disabled={
                  loading ||
                  page >=
                    pagination.totalPages
                }
                onClick={() =>
                  goToPage(page + 1)
                }
              >
                Next →
              </button>

            </section>
          )}
        </>
      )}

    </div>
  );
}
