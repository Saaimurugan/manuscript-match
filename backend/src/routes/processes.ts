import { Router } from 'express';
import { ProcessController } from '../controllers/ProcessController';
import { authenticate } from '../middleware/auth';

const router = Router();
const processController = new ProcessController();

// Apply authentication middleware to all routes
router.use(authenticate);

// Process management routes
router.post('/', processController.createProcess);
router.get('/', processController.getProcesses);
router.get('/stats', processController.getProcessStats);
router.get('/:id', processController.getProcess);
router.put('/:id', processController.updateProcess);
router.put('/:id/step', processController.updateProcessStep);
router.delete('/:id', processController.deleteProcess);

export default router;