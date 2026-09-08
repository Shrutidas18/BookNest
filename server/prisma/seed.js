const { PrismaClient, BookStatus, ShelfRole, ActivityType } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.lending.deleteMany();
  await prisma.shelfBook.deleteMany();
  await prisma.shelfShare.deleteMany();
  await prisma.shelf.deleteMany();
  await prisma.book.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const alice = await prisma.user.create({
    data: { name: 'Alice Reader', email: 'alice@booknest.test', passwordHash }
  });

  const bob = await prisma.user.create({
    data: { name: 'Bob Reader', email: 'bob@booknest.test', passwordHash }
  });

  const book1 = await prisma.book.create({
    data: {
      title: 'Atomic Habits',
      author: 'James Clear',
      status: BookStatus.READING,
      totalPages: 320,
      currentPage: 120,
      rating: 5,
      notes: 'Build better habits.',
      ownerId: alice.id
    }
  });

  const book2 = await prisma.book.create({
    data: {
      title: 'The Pragmatic Programmer',
      author: 'Andrew Hunt',
      status: BookStatus.WANT_TO_READ,
      totalPages: 352,
      ownerId: alice.id
    }
  });

  const bobBook = await prisma.book.create({
    data: {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      status: BookStatus.FINISHED,
      totalPages: 464,
      currentPage: 464,
      rating: 4,
      finishedAt: new Date(),
      ownerId: bob.id
    }
  });

  const shelf = await prisma.shelf.create({
    data: { name: 'Tech & Self Improvement', ownerId: alice.id }
  });

  await prisma.shelfBook.createMany({
    data: [
      { shelfId: shelf.id, bookId: book1.id },
      { shelfId: shelf.id, bookId: book2.id }
    ]
  });

  await prisma.shelfShare.create({
    data: { shelfId: shelf.id, userId: bob.id, role: ShelfRole.EDITOR }
  });

  await prisma.lending.create({
    data: {
      bookId: book2.id,
      ownerId: alice.id,
      borrowerId: bob.id
    }
  });

  await prisma.activityLog.createMany({
    data: [
      {
        userId: alice.id,
        type: ActivityType.BOOK_ADDED,
        message: 'Added Atomic Habits',
        metadata: { bookId: book1.id }
      },
      {
        userId: alice.id,
        type: ActivityType.SHELF_SHARED,
        message: 'Shared Tech & Self Improvement with Bob as editor',
        metadata: { shelfId: shelf.id, collaboratorId: bob.id }
      },
      {
        userId: bob.id,
        type: ActivityType.BOOK_LENT,
        message: 'Received The Pragmatic Programmer from Alice',
        metadata: { bookId: book2.id, ownerId: alice.id }
      },
      {
        userId: bob.id,
        type: ActivityType.BOOK_ADDED,
        message: 'Added Clean Code',
        metadata: { bookId: bobBook.id }
      }
    ]
  });

  console.log('Seed complete.');
  console.log('Alice: alice@booknest.test / Password123!');
  console.log('Bob:   bob@booknest.test / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
