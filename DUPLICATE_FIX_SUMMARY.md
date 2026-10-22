# Duplicate Document Upload Fix

## Problem
User reported: "ALL document uploads are now failing with 'Ingestion failure: File upload failed'"

## Investigation Results

### What We Found
The upload system was **NOT broken**. The "failures" were actually the duplicate detection system working correctly:

1. **Backend logs showed** (from 02:42:10):
   - Upload middleware: ✅ File received
   - Validation: ✅ Passed
   - Duplicate check: ❌ Triggered
   - Error: `DUPLICATE_DOCUMENT` (HTTP 409 Conflict)
   - Existing document ID: `29513a52-e1ab-421f-8b09-e9add15e9e00`

2. **Files being "rejected"** were files that had already been uploaded in previous sessions:
   - `GATE.pdf`
   - `appointment slip.pdf`
   
3. **Storage path was correct** - no regression from previous fix

## Root Cause
The system has duplicate detection based on SHA-256 checksums. When users tried to re-upload the same file, the backend correctly rejected it, but the frontend showed a generic "File upload failed" message instead of explaining it was a duplicate.

## Solution Implemented

### 1. Backend Error Handler (`errorHandler.ts`)
**Before:**
```typescript
} else if ((err as any).code === 'DUPLICATE_DOCUMENT') {
  statusCode = 409;
  errorCode = 'CONFLICT';
  message = err.message;
}
```

**After:**
```typescript
} else if ((err as any).code === 'DUPLICATE_DOCUMENT') {
  statusCode = 409;
  errorCode = 'CONFLICT';
  message = err.message;
  details = {
    existingDocumentId: (err as any).existingDocumentId,
    checksum: (err as any).checksum,
  };
}
```

### 2. Frontend Upload Hook (`useDocumentUpload.ts`)
- Added `DUPLICATE` status type
- Added `existingDocumentId` field to `UploadProgressInfo`
- Detect `CONFLICT` error code with `existingDocumentId` in details
- Show friendly toast with "View Document" action button
- Store existing document ID for UI display

### 3. Frontend Upload Queue (`UploadQueue.tsx`)
- Added `DUPLICATE` status configuration (orange color)
- Display "This document was already uploaded" message
- Show clickable link to view the existing document
- Allow clearing duplicate items from queue

## Error Response Structure

**Before:**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "A document with this content already exists (id: 29513a52...)."
  }
}
```

**After:**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "A document with this content already exists (id: 29513a52...).",
    "details": {
      "existingDocumentId": "29513a52-e1ab-421f-8b09-e9add15e9e00",
      "checksum": "91a62f10acf81d5658a95e0eeb68402236445b15808b54a00930c578ec3561ba"
    }
  }
}
```

## User Experience

**Before:**
- Generic error: "File upload failed"
- No explanation
- No way to find the existing document

**After:**
- Clear message: "This document was already uploaded"
- Toast notification with document name
- "View Document" button in toast
- Link in upload queue to existing document
- Can clear duplicate item from queue

## Testing

To test the fix:
1. Open frontend at http://localhost:3000/documents/upload
2. Try to upload a file that's already in the system (e.g., GATE.pdf)
3. Should see:
   - Toast: "Duplicate Document" with "View Document" button
   - Upload queue shows orange "Duplicate" status
   - Clickable link to view existing document

## Files Modified

1. `backend/src/middleware/errorHandler.ts`
2. `frontend/src/features/documents/hooks/useDocumentUpload.ts`
3. `frontend/src/features/documents/components/UploadQueue.tsx`

## Status

✅ Code changes complete
✅ Backend restarted
✅ Frontend running in dev mode
⏳ Awaiting user testing with actual duplicate file upload
