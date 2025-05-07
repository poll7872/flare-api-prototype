import Router from 'express';
import { handleGenerateToken } from '../controllers/authController.js';

const router = Router();

router.post('/generate-token', handleGenerateToken);

export default router;
