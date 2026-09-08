import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/signup', form);

      console.log('SIGNUP SUCCESS:', data);

      setSuccess('Account created successfully! Redirecting to login...');

      // Clear the form
      setForm({
        name: '',
        email: '',
        password: '',
      });

      // Give the user a moment to see the success message,
      // then force navigation to the login page.
      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (err) {
      console.error('SIGNUP ERROR:', err);

      setError(
        err.response?.data?.message ||
          'Could not create your account.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card form-card">
      <div className="form-header">
        <p className="eyebrow">GET STARTED</p>

        <h1>Create your BookNest</h1>

        <p className="muted">
          Build your personal library, track your reading, and share
          shelves with others.
        </p>
      </div>

      <form onSubmit={submit}>
        <label>
          Name

          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </label>

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
            placeholder="Create a strong password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <p className="password-hint">
          Use at least 8 characters, including one uppercase letter
          and one number.
        </p>

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {success && (
          <p className="success">
            {success}
          </p>
        )}

        <button type="submit" disabled={loading || Boolean(success)}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="form-footer">
        Already have an account?{' '}
        <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}