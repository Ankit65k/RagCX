import type { IStorageProvider, StorageProvider } from './interfaces/storage-provider.interface.js';
import { LocalStorageProvider } from './providers/local-storage.provider.js';
import { StorageError } from './errors/storage.errors.js';
import { storageConfig } from '../../config/storage.config.js';
import logger from '../logger/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StorageFactory — resolves and instantiates the correct storage backend at
 * application startup based on the `STORAGE_PROVIDER` environment variable.
 *
 * **Why a factory instead of direct instantiation?**
 *
 * The Document Service depends on `IStorageProvider`, not on any concrete
 * class. The factory is the single place that reads `storageConfig.provider`
 * and wires the right implementation. Switching from local → S3 → GCS means
 * only changing one case branch here — zero changes to service code.
 *
 * **Adding a new provider**
 * 1. Create `src/infrastructure/storage/providers/<name>-storage.provider.ts`
 *    implementing `IStorageProvider`.
 * 2. Add a case to the switch below.
 * 3. Set `STORAGE_PROVIDER=<name>` in `.env`.
 */
export class StorageFactory {
  /**
   * Returns a fully initialised storage provider instance.
   *
   * @throws {StorageError}  When the configured provider name is not recognised.
   */
  static create(): IStorageProvider {
    const provider = storageConfig.provider as StorageProvider;

    logger.info({ provider }, 'Initialising storage provider');

    switch (provider) {
      case 'local':
        return new LocalStorageProvider(storageConfig.localPath);

      case 's3':
        /**
         * TODO: Implement S3StorageProvider when cloud deployment is required.
         *
         * return new S3StorageProvider({
         *   bucket:          storageConfig.s3.bucket!,
         *   region:          storageConfig.s3.region!,
         *   endpoint:        storageConfig.s3.endpoint,
         *   accessKeyId:     storageConfig.s3.credentials.accessKeyId!,
         *   secretAccessKey: storageConfig.s3.credentials.secretAccessKey!,
         * });
         */
        throw new StorageError(
          'S3 storage provider is not yet implemented. Set STORAGE_PROVIDER=local or implement S3StorageProvider.',
          'PROVIDER_NOT_IMPLEMENTED',
        );

      case 'gcs':
        throw new StorageError(
          'GCS storage provider is not yet implemented.',
          'PROVIDER_NOT_IMPLEMENTED',
        );

      case 'azure':
        throw new StorageError(
          'Azure Blob storage provider is not yet implemented.',
          'PROVIDER_NOT_IMPLEMENTED',
        );

      case 'minio':
        throw new StorageError(
          'MinIO storage provider is not yet implemented.',
          'PROVIDER_NOT_IMPLEMENTED',
        );

      default: {
        // Unreachable in production — acts as a runtime guard when the
        // StorageProvider union and switch cases drift out of sync.
        const unknownProvider = provider as string;
        throw new StorageError(
          `Unknown storage provider: "${unknownProvider}".`,
          'UNKNOWN_PROVIDER',
        );
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Application-wide storage provider singleton.
 *
 * Resolved once at startup; dependency-injected from here into services.
 * Import this value in the DI container / service constructor, not the factory.
 */
export const storageProvider: IStorageProvider = StorageFactory.create();
