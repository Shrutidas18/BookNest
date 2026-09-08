const { BookStatus, ActivityType } = require('@prisma/client');
const prisma = require('../utils/prisma');

const validStatuses = Object.values(BookStatus);

async function listBooks(req, res) {
  const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize || '10', 10), 1), 50);
  const { status, search, sort = 'date' } = req.query;

  const where = {
    ownerId: req.user.id,
    ...(status && validStatuses.includes(status) ? { status } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } }
      ]
    } : {})
  };

  const orderBy = sort === 'rating' ? { rating: 'desc' } :
    sort === 'title' ? { title: 'asc' } : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where, orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.book.count({ where })
  ]);

  res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}

async function addBook(req, res) {
  const { title, author, status = 'WANT_TO_READ', totalPages, rating, notes } = req.body;

  if (!title?.trim() || !author?.trim()) return res.status(400).json({ message: 'Title and author are required.' });
  if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid book status.' });
  if (totalPages != null && (!Number.isInteger(totalPages) || totalPages <= 0)) return res.status(400).json({ message: 'Total pages must be a positive integer.' });
  if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return res.status(400).json({ message: 'Rating must be between 1 and 5.' });

  const book = await prisma.book.create({
    data: {
      title: title.trim(), author: author.trim(), status,
      totalPages: totalPages ?? null, rating: rating ?? null, notes: notes || null,
      ownerId: req.user.id
    }
  });

  await prisma.activityLog.create({
    data: {
      userId: req.user.id,
      type: ActivityType.BOOK_ADDED,
      message: `Added "${book.title}"`,
      metadata: { bookId: book.id }
    }
  });

  res.status(201).json(book);
}

async function updateBook(req, res) {
  const existing = await prisma.book.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!existing) return res.status(404).json({ message: 'Book not found.' });

  const { title, author, status, totalPages, rating, notes } = req.body;
  if (status && !validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid book status.' });
  if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return res.status(400).json({ message: 'Rating must be between 1 and 5.' });

  const book = await prisma.book.update({
    where: { id: existing.id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(author !== undefined ? { author: author.trim() } : {}),
      ...(status !== undefined ? { status, ...(status === 'FINISHED' ? { finishedAt: new Date() } : {}) } : {}),
      ...(totalPages !== undefined ? { totalPages } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(notes !== undefined ? { notes } : {})
    }
  });

  if (status && status !== existing.status) {
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        type: ActivityType.STATUS_CHANGED,
        message: `"${book.title}" changed to ${status}`,
        metadata: { bookId: book.id, from: existing.status, to: status }
      }
    });
  }

  res.json(book);
}

async function deleteBook(req, res) {
  const book = await prisma.book.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!book) return res.status(404).json({ message: 'Book not found.' });

  await prisma.book.delete({ where: { id: book.id } });
  res.json({ message: 'Book deleted.' });
}

async function updateProgress(req, res) {
  const book = await prisma.book.findFirst({ where: { id: req.params.id, ownerId: req.user.id } });
  if (!book) return res.status(404).json({ message: 'Book not found.' });

  const { currentPage } = req.body;
  if (!Number.isInteger(currentPage) || currentPage < 0) {
    return res.status(400).json({ message: 'Current page cannot be negative and must be an integer.' });
  }
  if (!book.totalPages) return res.status(400).json({ message: 'Cannot record progress because total pages is not set.' });
  if (currentPage > book.totalPages) return res.status(400).json({ message: 'Page cannot exceed total pages.' });

  const finished = currentPage === book.totalPages;
  const updated = await prisma.book.update({
    where: { id: book.id },
    data: {
      currentPage,
      status: finished ? BookStatus.FINISHED : BookStatus.READING,
      finishedAt: finished ? (book.finishedAt || new Date()) : null
    }
  });

  res.json({
    ...updated,
    progressPercentage: Math.round((currentPage / book.totalPages) * 100)
  });
}

module.exports = { listBooks, addBook, updateBook, deleteBook, updateProgress };
