
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

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

  return (
    <section className="book-details-page">
      <Link to="/shelves" className="back-link">
        ← Back to Shelves
      </Link>

      <div className="book-details-card">
        <div className="book-details-header">
          <div>
            <span className="section-eyebrow">
              BOOK DETAILS
            </span>

            <h1>{book.title}</h1>

            <p className="book-author">
              by {book.author}
            </p>
          </div>

          {!book.isOwner && (
            <div className="book-read-only-badge">
              Read Only
            </div>
          )}
        </div>

        <div className="book-details-grid">
          <div className="book-detail-item">
            <span>Total Pages</span>
            <strong>
              {book.totalPages || 'Not set'}
            </strong>
          </div>

          <div className="book-detail-item">
            <span>Current Page</span>
            <strong>
              {book.currentPage}
              {book.totalPages
                ? ` / ${book.totalPages}`
                : ''}
            </strong>
          </div>

          <div className="book-detail-item">
            <span>Reading Status</span>
            <strong>
              {statusLabels[book.status] ||
                book.status}
            </strong>
          </div>

          <div className="book-detail-item">
            <span>Rating</span>
            <strong>
              {book.rating
                ? `${book.rating} / 5`
                : 'No rating'}
            </strong>
          </div>
        </div>

        {book.totalPages && (
          <div className="book-progress-section">
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

