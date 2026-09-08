import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { setAccessToken } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const successMessage = location.state?.message;

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
      const { data } = await api.post('/auth/login', form);

      setAccessToken(data.accessToken);

      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to sign in. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card form-card">
      <div className="form-header">
        <p className="eyebrow">WELCOME BACK</p>

        <h1>Sign in to BookNest</h1>

        <p className="muted">
          Continue managing your books, shelves, and reading progress.
        </p>
      </div>

      {successMessage && (
        <div className="success">
          {successMessage}
        </div>
      )}

      <form onSubmit={submit}>
        <label>
          Email

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="form-footer">
        New to BookNest?{' '}
        <Link to="/signup">Create an account</Link>
      </p>
    </section>
  );
}