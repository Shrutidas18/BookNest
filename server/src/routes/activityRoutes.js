const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/activityController');

router.use(requireAuth);
router.get('/', controller.recentActivity);

module.exports = router;
