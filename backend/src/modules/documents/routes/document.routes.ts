import { Router } from 'express';
import { requireAuth, requireRole } from '../../../middleware/auth/auth.middleware.js';
import { uploadMiddleware } from '../../../infrastructure/storage/middleware/upload.middleware.js';
import {
  UploadDocumentController,
  GetDocumentController,
  GetDocumentListController,
  SearchDocumentsController,
  DeleteDocumentController,
  RestoreDocumentController,
  ReprocessDocumentController,
} from '../controllers/index.js';

const router = Router();

const uploadCtrl = new UploadDocumentController();
const getCtrl = new GetDocumentController();
const listCtrl = new GetDocumentListController();
const searchCtrl = new SearchDocumentsController();
const deleteCtrl = new DeleteDocumentController();
const restoreCtrl = new RestoreDocumentController();
const reprocessCtrl = new ReprocessDocumentController();

/**
 * Document management routes protected by requireAuth.
 */
router.post('/', requireAuth, requireRole('ADMIN'), uploadMiddleware, uploadCtrl.handle.bind(uploadCtrl));
router.get('/', requireAuth, listCtrl.handle.bind(listCtrl));
router.get('/search', requireAuth, searchCtrl.handle.bind(searchCtrl));
router.get('/:id', requireAuth, getCtrl.handle.bind(getCtrl));
router.delete('/:id', requireAuth, requireRole('ADMIN'), deleteCtrl.handle.bind(deleteCtrl));
router.post('/:id/restore', requireAuth, requireRole('ADMIN'), restoreCtrl.handle.bind(restoreCtrl));
router.post('/:id/reprocess', requireAuth, requireRole('ADMIN'), reprocessCtrl.handle.bind(reprocessCtrl));

export const documentRoutes = router;
export default documentRoutes;
