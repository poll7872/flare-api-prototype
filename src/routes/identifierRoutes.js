import Router from 'express';
import { createIdentifier } from '../controllers/identifierController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/create', authMiddleware, createIdentifier);
//router.get('/:identifierId', authMiddleware, getIdentifierById);

export default router;
