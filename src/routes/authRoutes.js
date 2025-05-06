import Router from 'express';
import { handleGenerateToken } from '../controllers/authController';

const router = Router();

router.post('/generate-token', handleGenerateToken);

export default router;
