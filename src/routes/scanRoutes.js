import Router from 'express';
import { searchSocialMedia } from '../controllers/scanController.js';
import { verifyInternalKey } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/scanSocialMedia', verifyInternalKey, searchSocialMedia);

export default router;
