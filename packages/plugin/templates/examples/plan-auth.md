# Implementation Plan: User Authentication System

> Plan ID: plan-001
> Spec: spec-001
> Created: 2024-01-15T11:30:00Z
> Status: approved

## Executive Summary

Implement a complete JWT authentication system in 6 tasks over approximately 120 iterations. The work is structured to build foundational components first (password service, token service), then core features (auth service, middleware), followed by API routes and comprehensive tests.

## Architecture Decisions

### AD-1: Token Storage Strategy
- **Decision**: Access tokens in memory, refresh tokens in httpOnly cookies
- **Rationale**: Prevents XSS attacks on refresh tokens while allowing frontend token management
- **Alternatives Considered**: All tokens in cookies, all in localStorage
- **Trade-offs**: Slightly more complex frontend logic, but better security

### AD-2: Password Hashing
- **Decision**: bcrypt with cost factor 12
- **Rationale**: Industry standard, good balance of security and performance
- **Alternatives Considered**: Argon2 (newer), scrypt
- **Trade-offs**: bcrypt is well-tested and widely supported

### AD-3: Token Refresh Strategy
- **Decision**: Rotate refresh tokens on each use
- **Rationale**: Limits damage from token theft, detects compromised tokens
- **Alternatives Considered**: Static refresh tokens, sliding window
- **Trade-offs**: More database writes, but better security

### AD-4: Service Layer Pattern
- **Decision**: Dedicated services with dependency injection
- **Rationale**: Matches existing codebase patterns, testable, maintainable
- **Alternatives Considered**: Controller-based logic, middleware-only
- **Trade-offs**: More boilerplate, but cleaner separation

## Component Design

### Component: PasswordService

**Purpose**: Handle password hashing and comparison

**Location**: `src/services/password.service.ts`

**Interface**:
```typescript
interface PasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
  validate(password: string): { valid: boolean; errors: string[] };
}
```

**Dependencies**:
- bcrypt

**Notes**: Stateless, can be singleton

---

### Component: TokenService

**Purpose**: JWT generation and validation

**Location**: `src/services/token.service.ts`

**Interface**:
```typescript
interface TokenService {
  generateAccessToken(userId: string, claims?: object): string;
  generateRefreshToken(userId: string): string;
  verifyAccessToken(token: string): TokenPayload | null;
  verifyRefreshToken(token: string): RefreshPayload | null;
  decodeToken(token: string): object | null;
}
```

**Dependencies**:
- jsonwebtoken
- Environment config (secrets, expiry times)

---

### Component: AuthService

**Purpose**: Core authentication business logic

**Location**: `src/services/auth.service.ts`

**Interface**:
```typescript
interface AuthService {
  register(email: string, password: string, name?: string): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<AuthResult>;
  logout(refreshToken: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  validateSession(accessToken: string): Promise<User | null>;
}
```

**Dependencies**:
- PasswordService
- TokenService
- UserRepository
- EmailService

---

### Component: AuthMiddleware

**Purpose**: Protect routes, extract user from token

**Location**: `src/middleware/auth.middleware.ts`

**Interface**:
```typescript
// Middleware functions
function requireAuth(req, res, next): void;
function optionalAuth(req, res, next): void;
function requireRole(...roles: string[]): MiddlewareFunction;
```

**Dependencies**:
- TokenService

## Data Flow

```
Registration Flow:
User Input → Validate → Hash Password → Create User → Generate Tokens → Set Cookie → Response

Login Flow:
Credentials → Find User → Compare Password → Generate Tokens → Set Cookie → Response

Protected Request Flow:
Request → Extract Token → Verify Token → Load User → Attach to Request → Next Handler

Token Refresh Flow:
Cookie → Extract Refresh Token → Verify → Rotate Token → Generate New Access → Response
```

## File Structure

```
src/
├── services/
│   ├── password.service.ts   ← Password hashing
│   ├── token.service.ts      ← JWT handling
│   ├── auth.service.ts       ← Auth business logic
│   └── index.ts              ← Export all services
├── middleware/
│   ├── auth.middleware.ts    ← Route protection
│   └── index.ts              ← Export middleware
├── routes/
│   └── auth.routes.ts        ← Auth API endpoints
├── types/
│   └── auth.types.ts         ← Auth type definitions
└── tests/
    └── services/
        ├── password.service.test.ts
        ├── token.service.test.ts
        └── auth.service.test.ts
```

## Task Breakdown

### Overview

| ID | Title | Type | Deps | Complexity | Est. Iterations |
|----|-------|------|------|------------|-----------------|
| t001 | Create PasswordService | feature | - | low | 10-12 |
| t002 | Create TokenService | feature | - | low | 12-15 |
| t003 | Create AuthService | feature | t001, t002 | high | 25-30 |
| t004 | Create AuthMiddleware | feature | t002 | medium | 15-18 |
| t005 | Create Auth API Routes | feature | t003, t004 | medium | 18-22 |
| t006 | Integration Tests | test | t005 | medium | 15-20 |

### Task Details

#### t001: Create PasswordService
- **Description**: Create password hashing service using bcrypt
- **Dependencies**: None (foundation task)
- **Complexity**: low
- **Files to create**:
  - `src/services/password.service.ts`
  - `tests/services/password.service.test.ts`
- **Files to modify**:
  - `src/services/index.ts`
- **Success criteria**:
  - Can hash passwords
  - Can compare passwords
  - Validates password strength
  - All tests pass

#### t002: Create TokenService
- **Description**: Create JWT token generation and validation service
- **Dependencies**: None (parallel with t001)
- **Complexity**: low
- **Files to create**:
  - `src/services/token.service.ts`
  - `src/types/auth.types.ts`
  - `tests/services/token.service.test.ts`
- **Files to modify**:
  - `src/services/index.ts`
  - `src/types/index.ts`
- **Success criteria**:
  - Generates valid JWTs
  - Verifies tokens correctly
  - Rejects expired/invalid tokens
  - All tests pass

#### t003: Create AuthService
- **Description**: Core authentication business logic
- **Dependencies**: t001, t002
- **Complexity**: high
- **Files to create**:
  - `src/services/auth.service.ts`
  - `tests/services/auth.service.test.ts`
- **Files to modify**:
  - `src/services/index.ts`
  - Database migrations (add password field)
- **Success criteria**:
  - Register creates user with hashed password
  - Login validates credentials and returns tokens
  - Refresh rotates tokens correctly
  - Password reset flow works
  - All tests pass

#### t004: Create AuthMiddleware
- **Description**: Express middleware for route protection
- **Dependencies**: t002
- **Complexity**: medium
- **Files to create**:
  - `src/middleware/auth.middleware.ts`
  - `tests/middleware/auth.middleware.test.ts`
- **Files to modify**:
  - `src/middleware/index.ts`
- **Success criteria**:
  - Blocks unauthenticated requests
  - Extracts and validates token
  - Attaches user to request
  - Handles missing/invalid tokens gracefully
  - All tests pass

#### t005: Create Auth API Routes
- **Description**: REST endpoints for authentication
- **Dependencies**: t003, t004
- **Complexity**: medium
- **Files to create**:
  - `src/routes/auth.routes.ts`
- **Files to modify**:
  - `src/routes/index.ts`
  - `src/app.ts` (mount routes)
- **Success criteria**:
  - POST /auth/register works
  - POST /auth/login works
  - POST /auth/refresh works
  - POST /auth/logout works
  - POST /auth/forgot-password works
  - POST /auth/reset-password works
  - All endpoints have proper validation
  - All tests pass

#### t006: Integration Tests
- **Description**: End-to-end auth flow tests
- **Dependencies**: t005
- **Complexity**: medium
- **Files to create**:
  - `tests/integration/auth.test.ts`
- **Success criteria**:
  - Full registration flow works
  - Full login flow works
  - Token refresh flow works
  - Password reset flow works
  - Error cases handled correctly

## Dependency Graph

```
t001 (PasswordService)     t002 (TokenService)
        │                         │
        └──────────┬──────────────┘
                   │
                   ▼
            t003 (AuthService)
                   │
                   │              t004 (AuthMiddleware)
                   │                      │
                   └──────────┬───────────┘
                              │
                              ▼
                    t005 (Auth Routes)
                              │
                              ▼
                    t006 (Integration Tests)
```

## Execution Order

### Phase 1: Foundation (Parallel)
1. **t001** - PasswordService (no dependencies)
2. **t002** - TokenService (no dependencies, parallel with t001)

### Phase 2: Core Services
3. **t003** - AuthService (after t001, t002)
4. **t004** - AuthMiddleware (after t002, parallel with t003)

### Phase 3: API Layer
5. **t005** - Auth Routes (after t003, t004)

### Phase 4: Validation
6. **t006** - Integration Tests (after t005)

## Risk Assessment

| Risk | Probability | Impact | Mitigation | Contingency |
|------|-------------|--------|------------|-------------|
| Token expiry edge cases | Medium | Medium | Comprehensive tests | Manual testing |
| Cookie handling cross-browser | Medium | Low | Use well-tested libraries | Fallback to header |
| Password reset security | Low | High | Time-limited tokens, single use | Rate limiting |

## Quality Gates

| Gate | Trigger | Command | Action on Fail |
|------|---------|---------|----------------|
| Lint | every iteration | `npm run lint` | auto-fix |
| Type Check | every 3 iterations | `npm run typecheck` | block |
| Unit Tests | every 5 iterations | `npm test` | block |
| Build | before complete | `npm run build` | block |

## Estimated Effort

| Metric | Estimate |
|--------|----------|
| Total Tasks | 6 |
| Total Iterations | 95-117 |
| Parallel Opportunities | t001+t002, t003+t004 |

---

## Metadata

```json
{
  "id": "plan-001",
  "title": "User Authentication System",
  "spec_id": "spec-001",
  "status": "approved",
  "decisions": [
    "Access tokens in memory, refresh tokens in httpOnly cookies",
    "bcrypt with cost factor 12 for password hashing",
    "Rotate refresh tokens on each use",
    "Dedicated services with dependency injection"
  ],
  "task_ids": ["t001", "t002", "t003", "t004", "t005", "t006"],
  "task_order": ["t001", "t002", "t003", "t004", "t005", "t006"],
  "created_at": "2024-01-15T11:30:00Z",
  "started_at": null,
  "completed_at": null
}
```
