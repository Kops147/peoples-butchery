import express from 'express';
import { getMe, updateMe, getLoyalty } from '../controllers/userController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', auth, getMe);
router.put('/me', auth, updateMe);
router.get('/loyalty', auth, getLoyalty);

export default router;
