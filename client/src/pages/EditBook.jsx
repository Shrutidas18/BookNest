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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadBook() {
      try {
        setLoading(true);
        setError('');

        // Load enough books from the server to find the
        // selected book using the current API contract.
        const { data } = await api.get('/books', {
          params: {
            page: 1,
            pageSize: 50,
          },
        });

        console.log(
          'EDIT BOOK LIBRARY RESPONSE:',
          data
        );

        const books = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        const book = books.find(
          (item) =>
            String(item.id) === String(id)
        );

        if (!book) {
          setError(
            'Book not found in your library.'
          );
          return;
        }

        console.log(
          'BOOK LOADED FOR EDIT:',
          book
        );

        setForm({
          title: book.title || '',
          author: book.author || '',
          totalPages:
            book.totalPages ?? '',
          currentPage:
            book.currentPage ?? 0,
          status:
            book.status || 'WANT_TO_READ',
          rating:
            book.rating ?? '',
          notes: book.notes || '',
        });
      } catch (err) {
        console.error(
          'LOAD BOOK ERROR:',
          err
        );

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
      const totalPages = Number(
        form.totalPages
      );

      const currentPage = Number(
        form.currentPage
      );
      if (!form.title.trim()) {
        setError(
          'Book title is required.'
        );
        return;
      }

      if (!form.author.trim()) {
        setError(
          'Author is required.'
        );
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
          !Number.isInteger(
            Number(form.rating)
          ) ||
          Number(form.rating) < 1 ||
          Number(form.rating) > 5
        )
      ) {
        setError(
          'Rating must be between 1 and 5.'
        );
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
        notes:
          form.notes.trim() || null,
      };

      console.log(
        'UPDATING BOOK:',
        payload
      );

      const { data: updatedBook } =
        await api.patch(
          `/books/${id}`,
          payload
        );

      console.log(
        'UPDATED BOOK FROM SERVER:',
        updatedBook
      );

      if (
        Number(updatedBook.currentPage) !==
        currentPage
      ) {
        throw new Error(
          'The server did not save the current page correctly.'
        );
      }
      setForm({
        title:
          updatedBook.title || '',
        author:
          updatedBook.author || '',
        totalPages:
          updatedBook.totalPages ?? '',
        currentPage:
          updatedBook.currentPage ?? 0,
        status:
          updatedBook.status ||
          'WANT_TO_READ',
        rating:
          updatedBook.rating ?? '',
        notes:
          updatedBook.notes || '',
      });

      setSuccess(
        `Book updated successfully. Current page: ${updatedBook.currentPage}/${updatedBook.totalPages}.`
      );

      // Give the success message a moment to be
      // visible before returning to the library.
      setTimeout(() => {
        navigate('/books');
      }, 700);
    } catch (err) {
      console.error(
        'UPDATE BOOK ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          'Could not update this book.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError('');

    try {
      await api.delete(
        `/books/${id}`
      );

      navigate('/books');
    } catch (err) {
      console.error(
        'DELETE BOOK ERROR:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not delete this book.'
      );

      setDeleting(false);
    } finally {
      setShowDeleteModal(false);
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
          onClick={() =>
            navigate('/books')
          }
          disabled={saving || deleting}
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
              disabled={saving}
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
              disabled={saving}
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
                disabled={saving}
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
                max={
                  form.totalPages ||
                  undefined
                }
                value={form.currentPage}
                onChange={handleChange}
                disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
            />
          </div>

          <div className="edit-book-actions">

            <button
              type="submit"
              disabled={
                saving || deleting
              }
            >
              {saving
                ? 'Saving…'
                : 'Save Changes'}
            </button>

            <button
              type="button"
              className="danger-button"
              onClick={() =>
                setShowDeleteModal(true)
              }
              disabled={
                saving || deleting
              }
            >
              {deleting
                ? 'Deleting…'
                : 'Delete Book'}
            </button>

          </div>

        </form>

      </section>

      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div
            className="delete-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <h2 id="delete-modal-title">
              Delete this book?
            </h2>

            <p className="muted">
              Are you sure you want to delete{' '}
              <strong>{form.title}</strong>?
              This action cannot be undone.
            </p>

            <div className="delete-modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? 'Deleting…'
                  : 'Delete Book'}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}