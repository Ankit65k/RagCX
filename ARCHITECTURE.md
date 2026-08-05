# AI Knowledge Base Chatbot - 10/10 Enterprise Architecture Design

This document details the finalized architectural rules, folder structures, and implementation specifications for the AI Knowledge Base Chatbot.

---

## 1. Root Project Structure

```
/
├── backend/                  # Node.js + Express + Prisma Microservice
├── frontend/                 # Next.js App Router Service
├── ai-service/               # Python + FastAPI + LangGraph Service
├── shared/                   # Cross-service schemas, types, and contracts
│   ├── contracts/            # Standardized event payload models (e.g., versioned Redis schemas)
│   │   └── events/           # Identical event structure definitions shared by JS and Python
│   ├── responses/            # API Response contract definitions
│   ├── schemas/              # Common validation schemas
│   ├── enums/                # Common enums
│   ├── errors/               # Standardized error definitions
│   └── interfaces/           # Shared interface definitions
├── docs/                     # API specification documents (OpenAPI, Swagger, flows)
├── scripts/                  # Operations and bootstrap scripts
├── docker/                   # Deployment and Docker configurations
├── husky/                    # Git Hooks configuration
├── .env.example              # Template for environment configuration
├── .prettierrc               # Prettier code formatting rules
├── .eslintrc.json            # ESLint static analysis configuration
├── .editorconfig             # Universal editor settings
├── lint-staged.config.js     # Linting commands for staged files
├── commitlint.config.js      # Git commit message linting rules
├── ARCHITECTURE.md           # Architecture specifications (this file)
└── README.md                 # Project bootstrapper guide
```

---

## 2. Backend Service Folder Tree

```
backend/
├── prisma/
│   └── schema.prisma          # Prisma schema definition
├── src/
│   ├── app.ts                 # Express application instantiation
│   ├── server.ts              # Server runner & bootstrap
│   ├── core/                  # Application composition root
│   │   ├── bootstrap/         # Express initialization & middleware configuration
│   │   ├── env/               # Environment variables loading and validation schema
│   │   ├── container/         # Dependency injection container & wireups
│   │   └── startup/           # Pre-launch connections checks (Postgres, Redis)
│   ├── routes/                # Explicit Routing Layer (e.g., /api/v1/...)
│   │   ├── index.ts           # Central router aggregator
│   │   ├── public.routes.ts   # Publicly accessible routes (Auth, Health)
│   │   ├── protected.routes.ts# Authenticated user routes (Chat, Documents)
│   │   └── admin.routes.ts    # Operations and administrative routes
│   ├── config/                # Granular, validation-backed configurations
│   │   ├── app.config.ts      # Port, ENV, base URL configurations
│   │   ├── auth.config.ts     # JWT, expiry, session configurations
│   │   ├── database.config.ts # Postgres URL and pool size configurations
│   │   ├── redis.config.ts    # Redis host, port, credentials configurations
│   │   ├── storage.config.ts  # AWS S3 / Local storage configurations
│   │   ├── logger.config.ts   # Winston/Pino configs
│   │   └── swagger.config.ts  # Swagger UI configuration parameters
│   ├── common/                # Shared utilities & components across backend
│   │   ├── responses/         # Standardized API format responses
│   │   ├── exceptions/        # Domain exceptions mapping to HTTP responses
│   │   ├── validators/        # Custom validation attributes/decorators
│   │   ├── decorators/        # Express request modifiers (e.g., @CurrentUser)
│   │   ├── errors/            # Standard error instances
│   │   ├── constants/         # Global backend constants
│   │   └── types/             # Common TypeScript interfaces
│   ├── database/              # DB clients and extensions
│   │   ├── client/            # Prisma client singleton exports
│   │   ├── repositories/      # Core persistence abstractions
│   │   │   └── base.repository.ts # Abstract base class for CRUD operations
│   │   ├── migrations/        # Prisma migration logs
│   │   ├── seed/              # Development seed data
│   │   └── extensions/        # Prisma Client extensions (auditing, encryption)
│   ├── infrastructure/        # Third-party wrappers and services
│   │   ├── redis/             # Pub/Sub infrastructure
│   │   │   ├── client/        # Redis connection pool
│   │   │   ├── publisher/     # Event publishing service
│   │   │   ├── subscriber/    # Queue subscriptions loop
│   │   │   ├── channels/      # Redis pub/sub channel configurations
│   │   │   └── events/        # Typed event classes
│   │   ├── logger/            # Application logs
│   │   │   ├── logger.ts          # Core logger singleton
│   │   │   ├── request.logger.ts  # HTTP request auditor
│   │   │   ├── audit.logger.ts    # Critical resource audit logger
│   │   │   └── security.logger.ts # Intrusion/Security auditor logger
│   │   ├── storage/           # S3/Local file storage engine abstraction
│   │   ├── cache/             # Redis-backed cache layer
│   │   ├── security/          # Encryption and decryption providers
│   │   └── mail/              # Mail delivery client (SMTP, Sendgrid)
│   ├── middleware/            # Standard middleware implementations
│   │   ├── auth/              # Authentication/Authorization checkers
│   │   ├── validation/        # Payload parsing middleware
│   │   ├── logging/           # Request/audit instrumentation
│   │   ├── security/          # CORS, Helmet headers configuration
│   │   └── rate-limit/        # Rate limiting controls per API group
│   ├── utils/                 # Pure domain-agnostic stateless helpers
│   │   ├── crypto/            # Cryptographic & Password hashing utilities
│   │   ├── date/              # Date manipulation & formatting utilities
│   │   ├── files/             # Mimetype & size checker helpers
│   │   ├── strings/           # String parse/sanitization helpers
│   │   └── ids/               # UUID/NanoID generators
│   ├── types/                 # Type declarations
│   │   ├── api/
│   │   ├── express/
│   │   ├── redis/
│   │   └── database/
│   └── modules/               # Self-contained Feature Modules
│       ├── auth/              # Authentication Feature Module
│       │   ├── controllers/   # Auth route handlers
│       │   ├── services/      # Login, registration, OTP operations
│       │   ├── repositories/  # Auth credential querying
│       │   ├── routes/        # Router configuration
│       │   ├── dtos/          # Req/Res data transfer objects
│       │   ├── schemas/       # Zod validation schemas
│       │   ├── middlewares/   # Module-scoped middlewares
│       │   ├── guards/        # Route protection rules
│       │   ├── jwt/           # Access token generators
│       │   ├── tokens/        # Token validation logic
│       │   ├── strategies/    # Authentication strategies (Local, OAuth)
│       │   └── index.ts       # Module entry gate
│       ├── sessions/          # Session tracking & audit logging
│       │   ├── controllers/ | services/ | repositories/ | routes/ | dtos/ | schemas/ | guards/ | events/ | index.ts
│       ├── users/             # User profiles feature module
│       ├── documents/         # Files, metadata and vectors ingestion module
│       ├── dashboard/         # Dashboard telemetry aggregation module
│       ├── chat/              # Chat conversations module
│       ├── health/            # Health monitoring module
│       └── notifications/     # Event notification module
```

---

## 3. Session vs Auth Responsibilities

To keep authentication separate from session auditing and lifecycle tracking:

* **Auth Module**:
  * Login (credential checking)
  * Logout (clearing client state)
  * Refresh token generation
  * Password hashing
  * JWT generation & signature
  * Authorization checking
* **Sessions Module**:
  * Active devices listing
  * Refresh token database persistence records
  * Session revocation / device termination
  * Login history (IP addresses, User-Agents)
  * Activity/Idle tracking and TTL management

---

## 4. API Response and Routing Infrastructure

### API Versioning
All backend API routes must mount under `/api/v1/...` (e.g., `/api/v1/auth/login`, `/api/v1/chat/message`).

### API Boundary Request Validation
A controller or service must never receive raw/unvalidated payloads. Validation schemas must run inside validation middleware before request parameters hit controllers:
$$\text{Route} \longrightarrow \text{Validation Middleware} \longrightarrow \text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Repository}$$

### Standard API Response Contract
All HTTP responses returned from Controllers must conform to the following schema structure:

* **Success Payload**:
  ```json
  {
    "success": true,
    "message": "Resource successfully retrieved",
    "data": {}
  }
  ```
* **Error Payload**:
  ```json
  {
    "success": false,
    "error": {
      "code": "AUTH_INVALID_CREDENTIALS",
      "message": "Invalid password or email address provided"
    }
  }
  ```

---

## 5. Event-Driven Systems & Redis Contracts

### Standardized Event Names
All messages in the system utilize structured constant strings to prevent typo-based configuration drifts:
* `CHAT_REQUEST`
* `CHAT_RESPONSE`
* `CHAT_ERROR`
* `PDF_UPLOADED`
* `PDF_PROCESSING`
* `PDF_PROCESSED`
* `PDF_FAILED`

### Correlation IDs
For traceability, every request must receive an ID at the gateway. This ID is passed to every downstream handler, Redis message, and Python microservice to build unified tracing:
$$\text{Client} \xrightarrow{\text{Correlation-ID}} \text{Backend} \xrightarrow{\text{Correlation-ID}} \text{Redis} \xrightarrow{\text{Correlation-ID}} \text{Python AI} \dots$$

### Versioned Redis Payload Structure
```json
{
  "version": "1.0",
  "requestId": "uuidv4-correlation-id",
  "timestamp": "2026-08-03T18:42:16Z",
  "type": "CHAT_REQUEST",
  "payload": {}
}
```

---

## 6. Strict Dependency Rules

1. **Module Public API Boundary**:
   Every module inside `backend/src/modules/` exports a public api index: `module/index.ts`. All external modules **must only** import from this index file. Direct reference to subfolders or internal files (e.g., `import { X } from '../auth/services/auth.service'`) is strictly forbidden.
2. **Feature-to-Feature Isolation**:
   Feature modules cannot directly call services in another module. Inter-module communication must happen using events via Redis Pub/Sub, shared repositories, or via standardized services registered in the core container.

---

## 7. Configuration and Variable Standards

### Environment Variables
Environment variables must use standardized prefix groupings to simplify devops management:
* `APP_*` (Express ports, hostnames, environment type)
* `DATABASE_*` (Postgres URL, pool sizes, timeout thresholds)
* `REDIS_*` (Redis server url, channels, prefixes)
* `JWT_*` (Secret signatures, TTL parameters)
* `OPENAI_*` / `ANTHROPIC_*` (AI model credentials)
* `CHROMA_*` (Chroma database host, collections)
* `LOG_*` (Logging output level, write paths)
* `STORAGE_*` (S3 credentials, base bucket directories)

### Error Code Enum
Error payload error codes must be mapped to constants:
* `AUTH_INVALID_CREDENTIALS`
* `AUTH_TOKEN_EXPIRED`
* `AUTH_REFRESH_INVALID`
* `DOCUMENT_NOT_FOUND`
* `DOCUMENT_UPLOAD_FAILED`
* `CHAT_TIMEOUT`
* `CHAT_PROCESSING_FAILED`

---

## 8. Frontend Feature Modules

### Settings & System Administration Configuration
- **Access Gating**: Only authenticated users with the `ADMIN` role can save configuration updates for AI execution (Chat models, max tokens, temperature), RAG parameters (Top K, score threshold, context size), or document chunk configs. Regular `USER` profiles are restricted to read-only views.
- **Section Forms**:
  - `GeneralSettingsForm`: Portals and timezone parameters.
  - `AiSettingsForm`: Models and temperature hyperparameters.
  - `RetrievalSettingsForm`: Chunks boundaries and cosine thresholds.
  - `DocumentSettingsForm`: Split token sizes and overlaps.
  - `PreferencesForm`: Status query timers.

### Suggested Questions UI Module
- **Question Chips**: Displays dynamic question boxes complete with:
  - Cosine Similarity Grounding badges.
  - Page reference tags.
  - Model generation latency indicators (ms).
- **Trigger Actions**:
  - Clicking cards automatically populates the text composer.
  - Includes a "Regenerate" trigger requesting new questions.

### Testing Suite Architecture
- **Unit & Integration Suite (Vitest)**:
  - Uses `jsdom` to emulate UI browser elements.
  - Tests custom hooks, API mutations, and authentication guards.
- **End-to-End Suite (Playwright)**:
  - Models user actions: Login -> Document Ingestion -> Status Verification -> Creating Chats -> Prompting -> Logout.

