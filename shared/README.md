# Shared Code Directory

This directory contains shared code for both frontend and backend applications, including types, constants, utilities, and reusable components for all modules (ERP, ticket, chat, admin, etc).

## Structure

```
shared/
├── frontend/          # Frontend-specific shared code
│   ├── components/   # React components (UI, forms, feedback, ticket/chat/admin UIs)
│   ├── hooks/        # React hooks
│   ├── utils/        # Frontend utilities
│   ├── services/     # Frontend services
│   ├── types/        # Frontend TypeScript types
│   └── constants/    # Frontend constants
│
├── backend/          # Backend-specific shared code
│   ├── utils/        # Backend utilities
│   ├── types/        # Backend TypeScript types
│   ├── constants/    # Backend constants
│   ├── decorators/   # Custom decorators
│   └── guards/       # Custom guards
│
└── common/           # Truly shared code (used by both frontend and backend)
    ├── types/        # Shared TypeScript types/interfaces (User, Ticket, Chat, Admin, etc)
    ├── constants/    # Shared constants (API endpoints, status codes, etc)
    └── utils/        # Shared utility functions
```

## Usage

### Frontend

```typescript
// Import from frontend shared
import { Button, Input, Card } from '@shared/frontend';
import { usePagination } from '@shared/frontend/hooks';
import { TicketCard } from '@shared/frontend/components/ticket';
import { ChatWindow } from '@shared/frontend/components/chat';

// Import from common shared
import { ApiResponse, UserRole, Ticket, ChatMessage } from '@shared/common/types';
import { API_ENDPOINTS } from '@shared/common/constants';
```

### Backend

```typescript
// Import from backend shared
import { validateEmail } from '@shared/backend/utils';

// Import from common shared
import { ApiResponse, UserRole, Ticket, ChatMessage } from '@shared/common/types';
import { API_ENDPOINTS } from '@shared/common/constants';
```

## Path Aliases

### Frontend (`frontend/tsconfig.json` and `frontend/vite.config.ts`)
- `@shared/*` → `../shared/*`

### Backend (`tsconfig.json`)
- `@shared/*` → `shared/*`

---

## Best Practices
- Use shared types/interfaces for all cross-module data (ERP, ticket, chat, admin)
- Add new shared components/utilities here for reuse
- Keep business logic in app-specific modules, not in shared

---

## See Also
- [README.md](../README.md): Quick start and overview
- [Developer_Guide.md](../Developer_Guide.md): Setup and workflow
- `@shared/*` → `shared/*` (to be configured)

## Best Practices

1. **Frontend-specific code** → `shared/frontend/`
2. **Backend-specific code** → `shared/backend/`
3. **Code used by both** → `shared/common/`
4. **Avoid circular dependencies** - Common should not depend on frontend/backend
5. **Keep it minimal** - Only truly reusable code should be in shared

