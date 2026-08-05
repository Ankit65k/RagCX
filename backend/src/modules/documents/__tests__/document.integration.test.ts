import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UploadDocumentController } from '../controllers/upload-document.controller.js';
import { GetDocumentController } from '../controllers/get-document.controller.js';
import { GetDocumentListController } from '../controllers/get-document-list.controller.js';
import { SearchDocumentsController } from '../controllers/search-documents.controller.js';
import { DeleteDocumentController } from '../controllers/delete-document.controller.js';
import { RestoreDocumentController } from '../controllers/restore-document.controller.js';
import { ReprocessDocumentController } from '../controllers/reprocess-document.controller.js';
import { documentService } from '../controllers/dependencies.js';
import { ProcessingStatus, UploadStatus } from '@prisma/client';
import { DocumentNotFoundError, InvalidDocumentStateError } from '../errors/document-service.errors.js';

// Mock DocumentService
vi.mock('../controllers/dependencies.js', () => {
  return {
    documentRepository: {},
    documentService: {
      uploadDocument: vi.fn(),
      getDocument: vi.fn(),
      listDocuments: vi.fn(),
      searchDocuments: vi.fn(),
      deleteDocument: vi.fn(),
      restoreDocument: vi.fn(),
      reprocessDocument: vi.fn(),
    },
  };
});

describe('Document API Integration Test Suite', () => {
  let app: express.Express;
  
  const mockDoc = {
    id: 'd-123',
    originalFileName: 'test.pdf',
    storedFileName: 'stored-test.pdf',
    checksum: 'hash-123',
    mimeType: 'application/pdf',
    fileSize: 1024,
    totalPages: 5,
    uploadStatus: UploadStatus.UPLOADED,
    processingStatus: ProcessingStatus.PENDING,
    uploadedBy: 'u-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());

    // Inject mock authentication/request middleware
    app.use((req, res, next) => {
      req.user = { id: 'u-123', email: 'user@example.com', role: 'USER' };
      req.id = 'r-123';
      next();
    });

    // Mount Document Controllers
    const uploadCtrl = new UploadDocumentController();
    const getCtrl = new GetDocumentController();
    const listCtrl = new GetDocumentListController();
    const searchCtrl = new SearchDocumentsController();
    const deleteCtrl = new DeleteDocumentController();
    const restoreCtrl = new RestoreDocumentController();
    const reprocessCtrl = new ReprocessDocumentController();

    app.post('/api/v1/documents', (req, res, next) => uploadCtrl.handle(req, res, next));
    app.get('/api/v1/documents', (req, res, next) => listCtrl.handle(req, res, next));
    app.get('/api/v1/documents/search', (req, res, next) => searchCtrl.handle(req, res, next));
    app.get('/api/v1/documents/:id', (req, res, next) => getCtrl.handle(req, res, next));
    app.delete('/api/v1/documents/:id', (req, res, next) => deleteCtrl.handle(req, res, next));
    app.post('/api/v1/documents/:id/restore', (req, res, next) => restoreCtrl.handle(req, res, next));
    app.post('/api/v1/documents/:id/reprocess', (req, res, next) => reprocessCtrl.handle(req, res, next));

    // Global Error Handler Mock
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const statusCode = err.code === 'DOCUMENT_NOT_FOUND' ? 404 : 422;
      res.status(statusCode).json({
        success: false,
        message: err.message,
      });
    });
  });

  describe('POST /api/v1/documents (Upload)', () => {
    it('should return 201 and document metadata on successful upload context', async () => {
      vi.mocked(documentService.uploadDocument).mockResolvedValue(mockDoc as any);

      // Simulate the uploadMiddleware hydration in the test route
      app.post('/api/v1/documents-test', (req: any, res, next) => {
        req.uploadedFile = {
          originalFilename: 'test.pdf',
          storedFilename: 'stored.pdf',
          mimeType: 'application/pdf',
          extension: '.pdf',
          fileSize: 1024,
          storagePath: '/uploads/stored.pdf',
          checksum: 'hash-123',
          buffer: Buffer.from('pdf data'),
        };
        new UploadDocumentController().handle(req, res, next);
      });

      const response = await request(app)
        .post('/api/v1/documents-test')
        .send();

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('d-123');
    });

    it('should return 422 if upload middleware did not execute or failed', async () => {
      const response = await request(app)
        .post('/api/v1/documents')
        .send();

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/documents/:id (Retrieve)', () => {
    it('should return 200 and document metadata', async () => {
      vi.mocked(documentService.getDocument).mockResolvedValue(mockDoc as any);

      const response = await request(app).get('/api/v1/documents/d-123');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe('d-123');
      expect(documentService.getDocument).toHaveBeenCalledWith('d-123', 'u-123');
    });

    it('should return 404 if document is not found', async () => {
      vi.mocked(documentService.getDocument).mockRejectedValue(new DocumentNotFoundError('d-999'));

      const response = await request(app).get('/api/v1/documents/d-999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/documents (List)', () => {
    it('should return 200 with paginated items list', async () => {
      const paginatedResult = {
        items: [mockDoc],
        meta: {
          totalItems: 1,
          itemCount: 1,
          itemsPerPage: 20,
          totalPages: 1,
          currentPage: 1,
        },
      };
      vi.mocked(documentService.listDocuments).mockResolvedValue(paginatedResult as any);

      const response = await request(app).get('/api/v1/documents?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.meta.totalItems).toBe(1);
    });
  });

  describe('GET /api/v1/documents/search (Search)', () => {
    it('should return 200 with search items', async () => {
      const paginatedResult = {
        items: [mockDoc],
        meta: {
          totalItems: 1,
          itemCount: 1,
          itemsPerPage: 20,
          totalPages: 1,
          currentPage: 1,
        },
      };
      vi.mocked(documentService.searchDocuments).mockResolvedValue(paginatedResult as any);

      const response = await request(app).get('/api/v1/documents/search?search=test');

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should return 422 if search query is missing', async () => {
      const response = await request(app).get('/api/v1/documents/search');

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/documents/:id/reprocess (Reprocess)', () => {
    it('should return 200 and success status', async () => {
      vi.mocked(documentService.reprocessDocument).mockResolvedValue(mockDoc as any);

      const response = await request(app).post('/api/v1/documents/d-123/reprocess');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 422 if document state is invalid for reprocessing', async () => {
      vi.mocked(documentService.reprocessDocument).mockRejectedValue(new InvalidDocumentStateError('d-123', 'PROCESSING'));

      const response = await request(app).post('/api/v1/documents/d-123/reprocess');

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
    });
  });
});
