const prisma = require('../utils/prisma');

async function recentActivity(req, res) {
  const activities = await prisma.activityLog.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  res.json(activities);
}

module.exports = { recentActivity };
