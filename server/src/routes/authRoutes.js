const router = require('express').Router();
const controller = require('../controllers/authController');

router.post('/signup', controller.signup);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

module.exports = router;
