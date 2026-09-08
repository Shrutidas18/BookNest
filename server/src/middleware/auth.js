const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) return res.status(401).json({ message: 'User no longer exists.' });

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch {
    return res.status(401).json({ message: 'Access token is invalid or expired.' });
  }
}

module.exports = { requireAuth };
