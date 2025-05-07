import Router from 'express';
import { searchSocialMedia } from '../controllers/scanController.js';

const router = Router();

router.post('/scanSocialMedia', searchSocialMedia);

export default router;
