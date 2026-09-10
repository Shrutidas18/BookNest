
import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-image-section">
        <div className="image-overlay">
          <span>Every story leaves a mark.</span>
        </div>
      </div>

      <div className="landing-content">
        <div className="landing-inner">
          <div className="brand-mark">BOOKNEST</div>

          <div className="book-visual">
            <div className="book-cover">
              <div className="book-line"></div>
              <h2>BOOK<br />NEST</h2>
              <p>A place for every story.</p>
            </div>
          </div>

          <h1>
            Your books.
            <br />
            Your little world.
          </h1>

          <p className="landing-description">
            Keep track of what you're reading, build shelves for every mood,
            share your favorite collections, and never lose your place in a story.
          </p>

          <blockquote>
            “A reader lives a thousand lives before he dies.”
            <span>— George R. R. Martin</span>
          </blockquote>

          <div className="landing-actions">
            <button
              className="landing-btn primary"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </button>

            <button
              className="landing-btn secondary"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          </div>

          <p className="landing-footer-text">
            Your reading journey, all in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;

