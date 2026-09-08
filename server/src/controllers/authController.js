const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');
const { createAccessToken, createRefreshToken, hashToken } = require('../utils/auth');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function signup(req, res) {
  const { name, email, password } = req.body;

  if (!name?.trim()) return res.status(400).json({ message: 'Name is required.' });
  if (!emailRegex.test(email || '')) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters and include an uppercase letter and a number.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: normalizedEmail, passwordHash }
  });

  res.status(201).json({ id: user.id, name: user.name, email: user.email });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email?.toLowerCase().trim() } });

  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const accessToken = createAccessToken(user.id);
  const refreshToken = createRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email }
  });
}

async function refresh(req, res) {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'Refresh token missing.' });

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ message: 'Refresh token is invalid or expired.' });
  }

  res.json({ accessToken: createAccessToken(stored.userId) });
}

async function logout(req, res) {
  const token = req.cookies.refreshToken;
  if (token) await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } });
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out.' });
}

module.exports = { signup, login, refresh, logout };
