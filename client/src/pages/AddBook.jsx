
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
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
  }

  async function submit(e) {
    e.preventDefault();

    setError('');

    const title = form.title.trim();
    const author = form.author.trim();
    const totalPages = Number(form.totalPages);
    const currentPage = Number(
      form.currentPage || 0
    );

    if (!title) {
      setError('Book title is required.');
      return;
    }

    if (!author) {
      setError('Author is required.');
      return;
    }

    if (
      !Number.isInteger(totalPages) ||
      totalPages <= 0
    ) {
      setError(
        'Total pages must be a positive integer.'
      );
      return;
    }

    if (
      !Number.isInteger(currentPage) ||
      currentPage < 0 ||
      currentPage > totalPages
    ) {
      setError(
        'Current page must be between 0 and total pages.'
      );
      return;
    }

    if (
      form.rating !== '' &&
      (
        !Number.isInteger(Number(form.rating)) ||
        Number(form.rating) < 1 ||
        Number(form.rating) > 5
      )
    ) {
      setError(
        'Rating must be between 1 and 5.'
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title,
        author,
        status: form.status,
        totalPages,
        currentPage,
        rating:
          form.rating === ''
            ? null
            : Number(form.rating),
        notes: form.notes.trim() || null,
      };

      console.log(
        'ADDING BOOK:',
        payload
      );

      const { data } = await api.post(
        '/books',
        payload
      );

      console.log(
        'BOOK CREATED:',
        data
      );

      navigate('/', {
        replace: true,
      });
    } catch (err) {
      console.error(
        'ADD BOOK ERROR:',
        err
      );

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
        <Link
          to="/"
          className="back-link"
        >
          ← Back to dashboard
        </Link>

        <p className="eyebrow">
          YOUR LIBRARY
        </p>

        <h1>Add a new book</h1>

        <p className="muted">
          Add a book to your personal BookNest
          library and start tracking your
          reading journey.
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
            disabled={loading}
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
            disabled={loading}
          />
        </label>

        <label>
          Reading status

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            disabled={loading}
          >
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
              disabled={loading}
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
              max={
                form.totalPages ||
                undefined
              }
              disabled={loading}
            />
          </label>

        </div>

        <label>
          Rating

          <select
            name="rating"
            value={form.rating}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="">
              No rating yet
            </option>

            <option value="1">
              1 / 5
            </option>

            <option value="2">
              2 / 5
            </option>

            <option value="3">
              3 / 5
            </option>

            <option value="4">
              4 / 5
            </option>

            <option value="5">
              5 / 5
            </option>
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
            disabled={loading}
          />
        </label>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Adding book…'
            : 'Add book'}
        </button>

      </form>
    </section>
  );
}

