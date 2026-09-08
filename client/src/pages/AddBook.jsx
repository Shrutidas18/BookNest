
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AddBook() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    author: '',
    status: 'WANT_TO_READ',
    totalPages: '',
    currentPage: '0',
    rating: '',
    notes: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  }

  async function submit(e) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await api.post('/books', {
        title: form.title.trim(),
        author: form.author.trim(),
        status: form.status,
        totalPages: Number(form.totalPages),
        currentPage: Number(form.currentPage || 0),
        rating: form.rating ? Number(form.rating) : null,
        notes: form.notes.trim() || null,
      });

      navigate('/', {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not add this book.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card form-card">
      <div className="form-header">
        <Link to="/" className="back-link">
          ← Back to dashboard
        </Link>

        <p className="eyebrow">YOUR LIBRARY</p>

        <h1>Add a new book</h1>

        <p className="muted">
          Add a book to your personal BookNest library and start
          tracking your reading journey.
        </p>
      </div>

      <form onSubmit={submit}>
        <label>
          Book title

          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Atomic Habits"
            required
          />
        </label>

        <label>
          Author

          <input
            type="text"
            name="author"
            value={form.author}
            onChange={handleChange}
            placeholder="e.g. James Clear"
            required
          />
        </label>

        <label>
          Reading status

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="WANT_TO_READ">Want to Read</option>
            <option value="READING">Reading</option>
            <option value="FINISHED">Finished</option>
          </select>
        </label>

        <div className="form-row">
          <label>
            Total pages

            <input
              type="number"
              name="totalPages"
              value={form.totalPages}
              onChange={handleChange}
              placeholder="320"
              min="1"
              required
            />
          </label>

          <label>
            Current page

            <input
              type="number"
              name="currentPage"
              value={form.currentPage}
              onChange={handleChange}
              min="0"
              max={form.totalPages || undefined}
            />
          </label>
        </div>

        <label>
          Rating

          <select
            name="rating"
            value={form.rating}
            onChange={handleChange}
          >
            <option value="">No rating yet</option>
            <option value="1">1 / 5</option>
            <option value="2">2 / 5</option>
            <option value="3">3 / 5</option>
            <option value="4">4 / 5</option>
            <option value="5">5 / 5</option>
          </select>
        </label>

        <label>
          Notes

          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Add any thoughts or notes about this book..."
            rows="5"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Adding book…' : 'Add book'}
        </button>
      </form>
    </section>
  );
}

