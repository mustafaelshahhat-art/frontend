# Phase 2: Refactor Move Plan

This document maps the current files to their new locations according to the Architecture Canon.

## 1. Feature Modules (`src/app/features`)

| Current Location | Target Location | Reason |
| :--- | :--- | :--- |
| `src/app/shared/pages/matches-list` | `src/app/features/matches/pages/matches-list` | Domain logic (Matches) |
| `src/app/shared/pages/match-detail` | `src/app/features/matches/pages/match-detail` | Domain logic (Matches) |
| `src/app/shared/components/match-card` | `src/app/features/matches/components/match-card` | Feature-specific UI |
| `src/app/shared/components/match-timeline` | `src/app/features/matches/components/match-timeline` | Feature-specific UI |
| `src/app/shared/components/match-event-modal` | `src/app/features/matches/components/match-event-modal` | Feature-specific UI |
| `src/app/shared/components/end-match-confirm` | `src/app/features/matches/components/end-match-confirm` | Feature-specific UI |
| `src/app/captain/matches/match-chat` | `src/app/features/matches/pages/match-chat` | Shared feature (Admin uses it too) |
| `src/app/shared/pages/tournaments-list` | `src/app/features/tournaments/pages/tournaments-list` | Domain logic |
| `src/app/shared/pages/tournament-detail` | `src/app/features/tournaments/pages/tournament-detail` | Domain logic |
| `src/app/shared/components/tournament-card` | `src/app/features/tournaments/components/tournament-card` | Feature-specific UI |
| `src/app/shared/pages/objections-list` | `src/app/features/objections/pages/objections-list` | Domain logic |
| `src/app/shared/components/chat-box` | `src/app/features/chat/components/chat-box` | Feature-specific UI |
| `src/app/shared/pages/profile` | `src/app/features/users/pages/profile` | User domain logic |
| `src/app/shared/pages/notifications` | `src/app/features/notifications/pages/notifications` | Domain logic |

## 2. Layouts (`src/app/layouts`)

| Current Location | Target Location | Reason |
| :--- | :--- | :--- |
| `src/app/shared/layout/admin-layout` | `src/app/layouts/admin-layout` | App Shell |
| `src/app/shared/layout/captain-layout` | `src/app/layouts/captain-layout` | App Shell |
| `src/app/shared/layout/referee-layout` | `src/app/layouts/referee-layout` | App Shell |
| `src/app/shared/components/sidebar` | `src/app/layouts/components/sidebar` | Layout component |
| `src/app/shared/components/header` | `src/app/layouts/components/header` | Layout component |
| `src/app/shared/components/notifications-dropdown` | `src/app/layouts/components/notifications-dropdown` | Helper for Header |

## 3. Shared (`src/app/shared`)

| Current Location | Target Location | Reason |
| :--- | :--- | :--- |
| `src/app/shared/pages/not-found` | `src/app/shared/pages/not-found` | Generic Error Page (Keep) |
| `src/app/shared/pages/unauthorized` | `src/app/shared/pages/unauthorized` | Generic Error Page (Keep) |
| All other `shared/components/*` | `src/app/shared/components/*` | Truly generic UI (Keep) |

## 4. Execution Order

1.  **Create Directories**: `features/matches`, `features/tournaments`, `layouts`, etc.
2.  **Move Layouts**: Move shells and updating their imports.
3.  **Move Features**: Move pages and components one domain at a time.
4.  **Update Routes**: Point `admin.routes`, `captain.routes` to new locations.
