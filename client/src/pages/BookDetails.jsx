import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

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

const STATUS_ACCENT_CLASSES = {
  WANT_TO_READ: 'status-want-to-read',
  READING: 'status-reading',
  FINISHED: 'status-finished',
};

export default function BookDetails() {
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBook() {
      try {
        setLoading(true);
        setError('');

        const response = await api.get(`/books/${id}`);
        setBook(response.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Unable to load this book.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, [id]);

  if (loading) {
    return (
      <section className="page-section">
        <p>Loading book...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-section">
        <Link to="/shelves" className="back-link">
          ← Back to Shelves
        </Link>

        <div className="empty-state">
          <h2>Book unavailable</h2>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!book) {
    return null;
  }

  const progress =
    book.totalPages > 0
      ? Math.min(
          100,
          Math.round(
            (book.currentPage / book.totalPages) * 100
          )
        )
      : 0;

  const statusLabels = {
    WANT_TO_READ: 'Want to Read',
    READING: 'Reading',
    FINISHED: 'Finished',
  };

  const statusAccentClass =
    STATUS_ACCENT_CLASSES[book.status] || '';

  return (
    <section className="book-details-page">
      <Link to="/shelves" className="back-link">
        ← Back to Shelves
      </Link>

      <div
        className={`book-details-card ${statusAccentClass}`}
      >
        <div className="book-details-header">
          <div className="book-details-title-group">
            <img
              src={getBookCoverImage(book)}
              alt={`Cover of ${book.title}`}
              className="book-details-cover"
            />

            <div>
              <span className="section-eyebrow">
                BOOK DETAILS
              </span>

              <h1>{book.title}</h1>

              <p className="book-author">
                by {book.author}
              </p>
            </div>
          </div>

          <div className="book-details-badges">
            <span
              className={`pill status-pill ${statusAccentClass}`}
            >
              {statusLabels[book.status] ||
                book.status}
            </span>

            {!book.isOwner && (
              <div className="book-read-only-badge">
                Read Only
              </div>
            )}
          </div>
        </div>

        <div className="book-details-grid">
          <div className="book-detail-item detail-pages">
            <span>Total Pages</span>
            <strong>
              {book.totalPages || 'Not set'}
            </strong>
          </div>

          <div className="book-detail-item detail-current">
            <span>Current Page</span>
            <strong>
              {book.currentPage}
              {book.totalPages
                ? ` / ${book.totalPages}`
                : ''}
            </strong>
          </div>

          <div
            className={`book-detail-item detail-status ${statusAccentClass}`}
          >
            <span>Reading Status</span>
            <strong>
              {statusLabels[book.status] ||
                book.status}
            </strong>
          </div>

          <div className="book-detail-item detail-rating">
            <span>Rating</span>
            <strong>
              {book.rating
                ? `${book.rating} / 5`
                : 'No rating'}
            </strong>
          </div>
        </div>

        {book.totalPages && (
          <div
            className={`book-progress-section ${statusAccentClass}`}
          >
            <div className="progress-heading">
              <span>Reading Progress</span>
              <strong>{progress}%</strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="book-notes-section">
          <h2>Notes</h2>

          <div className="book-notes">
            {book.notes?.trim()
              ? book.notes
              : 'No notes added for this book.'}
          </div>
        </div>

        {book.owner && (
          <div className="book-owner-section">
            <span>Owned by</span>

            <strong>
              {book.owner.name ||
                book.owner.email}
            </strong>
          </div>
        )}
      </div>
    </section>
  );
}