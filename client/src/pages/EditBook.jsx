
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

export default function EditBook() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    author: '',
    totalPages: '',
    currentPage: 0,
    status: 'WANT_TO_READ',
    rating: '',
    notes: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadBook() {
      try {
        setLoading(true);
        setError('');

        // Your backend does not have GET /books/:id.
        // Load the library and find the selected book.
        const { data } = await api.get('/books', {
          params: {
            limit: 100,
          },
        });

        console.log('EDIT BOOK LIBRARY RESPONSE:', data);

        let books = [];

        if (Array.isArray(data)) {
          books = data;
        } else if (Array.isArray(data.items)) {
          books = data.items;
        } else if (Array.isArray(data.books)) {
          books = data.books;
        }

        const book = books.find(
          (item) => String(item.id) === String(id)
        );

        if (!book) {
          setError('Book not found in your library.');
          return;
        }

        setForm({
          title: book.title || '',
          author: book.author || '',
          totalPages: book.totalPages || '',
          currentPage: book.currentPage ?? 0,
          status: book.status || 'WANT_TO_READ',
          rating: book.rating ?? '',
          notes: book.notes || '',
        });
      } catch (err) {
        console.error('LOAD BOOK ERROR:', err);

        setError(
          err.response?.data?.message ||
            'Could not load this book.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const totalPages = Number(form.totalPages);
      const currentPage = Number(form.currentPage);

      if (!form.title.trim()) {
        setError('Book title is required.');
        setSaving(false);
        return;
      }

      if (!form.author.trim()) {
        setError('Author is required.');
        setSaving(false);
        return;
      }

      if (!totalPages || totalPages <= 0) {
        setError('Total pages must be greater than 0.');
        setSaving(false);
        return;
      }

      if (currentPage < 0 || currentPage > totalPages) {
        setError(
          'Current page must be between 0 and total pages.'
        );
        setSaving(false);
        return;
      }

      if (
        form.rating !== '' &&
        (Number(form.rating) < 1 ||
          Number(form.rating) > 5)
      ) {
        setError('Rating must be between 1 and 5.');
        setSaving(false);
        return;
      }

      const payload = {
        title: form.title.trim(),
        author: form.author.trim(),
        totalPages,
        currentPage,
        status: form.status,
        rating:
          form.rating === ''
            ? null
            : Number(form.rating),
        notes: form.notes.trim() || null,
      };

      console.log('UPDATING BOOK:', payload);

      // Backend uses PATCH /books/:id
      await api.patch(`/books/${id}`, payload);

      setSuccess('Book updated successfully.');

      setTimeout(() => {
        navigate('/books');
      }, 700);
    } catch (err) {
      console.error('UPDATE BOOK ERROR:', err);

      setError(
        err.response?.data?.message ||
          'Could not update this book.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this book? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await api.delete(`/books/${id}`);

      navigate('/books');
    } catch (err) {
      console.error('DELETE BOOK ERROR:', err);

      setError(
        err.response?.data?.message ||
          'Could not delete this book.'
      );

      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <section className="card edit-book-state">
        <p className="muted">
          Loading book…
        </p>
      </section>
    );
  }

  return (
    <div className="edit-book-page">
      <section className="edit-book-header">
        <div>
          <p className="eyebrow">
            LIBRARY MANAGEMENT
          </p>

          <h1>Edit Book</h1>

          <p className="muted">
            Update the details and reading progress
            for this book.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/books')}
        >
          ← Back to Library
        </button>
      </section>

      {error && (
        <section className="card">
          <p className="error">
            {error}
          </p>
        </section>
      )}

      {success && (
        <section className="card">
          <p className="success">
            {success}
          </p>
        </section>
      )}

      <section className="card edit-book-card">
        <form
          className="edit-book-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label htmlFor="title">
              Book Title
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter book title"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="author">
              Author
            </label>

            <input
              id="author"
              name="author"
              type="text"
              value={form.author}
              onChange={handleChange}
              placeholder="Enter author name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="totalPages">
                Total Pages
              </label>

              <input
                id="totalPages"
                name="totalPages"
                type="number"
                min="1"
                value={form.totalPages}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="currentPage">
                Current Page
              </label>

              <input
                id="currentPage"
                name="currentPage"
                type="number"
                min="0"
                max={form.totalPages || undefined}
                value={form.currentPage}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="status">
              Reading Status
            </label>

            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
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
          </div>

          <div className="form-group">
            <label htmlFor="rating">
              Rating
            </label>

            <select
              id="rating"
              name="rating"
              value={form.rating}
              onChange={handleChange}
            >
              <option value="">
                No rating
              </option>

              <option value="1">
                ★ 1 / 5
              </option>

              <option value="2">
                ★★ 2 / 5
              </option>

              <option value="3">
                ★★★ 3 / 5
              </option>

              <option value="4">
                ★★★★ 4 / 5
              </option>

              <option value="5">
                ★★★★★ 5 / 5
              </option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">
              Notes
            </label>

            <textarea
              id="notes"
              name="notes"
              rows="5"
              value={form.notes}
              onChange={handleChange}
              placeholder="Add your notes about this book..."
            />
          </div>

          <div className="edit-book-actions">
            <button
              type="submit"
              disabled={saving || deleting}
            >
              {saving
                ? 'Saving…'
                : 'Save Changes'}
            </button>

            <button
              type="button"
              className="danger-button"
              onClick={handleDelete}
              disabled={saving || deleting}
            >
              {deleting
                ? 'Deleting…'
                : 'Delete Book'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
