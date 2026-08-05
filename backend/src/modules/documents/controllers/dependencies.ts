import { DocumentRepository } from '../repositories/document.repository.js';
import { storageProvider } from '../../../infrastructure/storage/storage.factory.js';
import { DocumentService } from '../services/document.service.js';

// Instantiate dependencies
export const documentRepository = new DocumentRepository();
export const documentService = new DocumentService(documentRepository, storageProvider);
