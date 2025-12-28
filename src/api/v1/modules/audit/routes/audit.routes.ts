// routes/audit.routes.ts
import { Router } from 'express';
import { authenticate } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { AuditController } from '@/controllers/audit.controller';

const router = Router();

// All audit routes require ADMIN role
router.use(authenticate, requireRole(['ADMIN']));

// Get audit logs with filtering
router.get('/', AuditController.getLogs);

// Get logs by specific category
router.get('/category/:category', AuditController.getLogsByCategory);

// Search logs
router.get('/search', AuditController.searchLogs);

// Get category statistics
router.get('/stats/category', AuditController.getCategoryStats);

// Get system-wide statistics
router.get('/stats/system', AuditController.getSystemStats);

// Optional: Allow users to see their own logs (non-admin)
router.get('/my-logs', authenticate, AuditController.getUserLogs);

export default router;