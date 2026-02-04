# RAMADAN TOURNAMENT - ARCHITECTURE CANON

This document defines the strict architectural rules for the project. All future development must adhere to these guidelines to ensure scalability, maintainability, and clean separation of concerns.

---

## 1. High-Level Folder Structure

The application is divided into horizontal layers of responsibility.

```text
src/app/
├── core/           # GLOBAL SINGLETONS. (Services, Guards, Interceptors, Models)
├── shared/         # REUSABLE UI. (Dumb Components, Pipes, Directives)
├── features/       # BUSINESS DOMAIN. (Pages, Smart Components, Feature-specific Modals)
├── layouts/        # APP SHELLS. (Wrappers for RouterOutlet)
├── app.routes.ts   # Root Routing configuration
└── app.component   # Root Component (Bootstrapping only)
```

---

## 2. The Golden Rules of Dependency

To prevent circular dependencies and "spaghetti code," strict import rules apply:

### ✅ DO:
*   **Features** can import from `Core` and `Shared`.
*   **Layouts** can import from `Core` and `Shared`.
*   **Root (`app` folder)** can import from *anywhere* (mainly for routing).
*   **Shared** can import helper libraries (e.g., date-fns) but should minimize app-specific imports.

### ❌ DO NOT:
*   **Shared** MUST NOT import from `Core` or `Features`. (Shared is "dumb" and generic).
*   **Core** MUST NOT import from `Features` or `Shared`. (Core is pure logic/data).
*   **Feature A** MUST NOT import from **Feature B**. (If they need to share something, move it to `Shared` or `Core`).

---

## 3. Layer Definitions & Responsibilities

### A. Core Module (`src/app/core`)
*   **Role**: Application-wide singleton services and data models.
*   **Contents**:
    *   `services/`: interacting with APIs (AuthService, MatchService).
    *   `guards/`: Authentication and Role checks.
    *   `interceptors/`: HTTP token attachment, error handling.
    *   `models/`: TypeScript interfaces/types used across the app (User, Match).
*   **Rule**: Services here must be `providedIn: 'root'`.

### B. Shared Module (`src/app/shared`)
*   **Role**: Reusable UI components that have **NO business logic**.
*   **Contents**:
    *   `components/`: Buttons, Cards, Badges, Loaders with `@Input()` and `@Output()` only.
    *   `pipes/`: Data formatting.
    *   `directives/`: UI behavior manipulation (e.g., `*appHasRole`).
*   **Rule**: Never inject `HttpClient` or specialized services (like `MatchService`) into Shared components. They should receive data via inputs.

### C. Feature Modules (`src/app/features`)
*   **Role**: The actual application pages and business logic.
*   **Migration**: *Future Refactor Target*. Currently, this role is filled by `admin/`, `captain/`, `referee/`.
*   **Structure**: Group by **Domain**, not by User Role.
    *   `features/matches/` (List, Detail, Edit)
    *   `features/teams/` (Profile, Register)
*   **Rule**: All features must be **Lazy Loaded** in the router. Use standalone components.

### D. Layouts (`src/app/shared/layouts`)
*   **Role**: Define the wrapper for pages (Sidebar + Header + RouterOutlet).
*   **Usage**: Assigned in the Route configuration (e.g., Admin routes use `AdminLayout`).

---

## 4. Logic & State Management

### Guards vs. Directives vs. Services
1.  **Guards (`CanActivate`)**:
    *   Use for **Routing Security**. Prevent a user from *navigation* to a URL they don't own.
2.  **Directives (`*appHasRole`)**:
    *   Use for **UI Visibility**. Show/Hide specific buttons or elements on a valid page based on permissions.
3.  **Services**:
    *   Use for **Data & Business Logic**. Fetching data, mapping objects, holding session state.

### Components
*   **Smart Components (Pages)**: Inject services, subscribe to data, pass data to children.
*   **Dumb Components (Shared)**: No dependencies. Display data given via `@Input`. Signal user intent via `@Output`.

---

## 5. Performance Standards

1.  **Change Detection**:
    *   All new components must use `changeDetection: ChangeDetectionStrategy.OnPush`.
    *   Use **Async Pipe** (`| async`) or **Angular Signals** (`computed()`, `signal()`) instead of manual `.subscribe()`.
2.  **Lazy Loading**:
    *   Every major route (Auth, Admin, Captain, Referee) must use `loadChildren`.
    *   Heavy components (Rich Text Editors, Charts) should be defer-loaded (`@defer`).
3.  **Getters**:
    *   **Do not** use getters for heavy logic (`get filteredItems() { ... }`). This runs on every change detection cycle. Use `computed()` signals or RxJS `pipes` instead.

---

## 6. CSS & Styling

*   **Global Styles**: Defined in `src/styles.scss` (CSS Variables for colors, spacing).
*   **Component Styles**: Encapsulated within the component (`:host`).
*   **Overrides**: accessing child components via `::ng-deep` is **strictly forbidden** except for styling 3rd-party libraries where no API exists.

---

## 7. Migration Checklist (Immediate)

1.  [ ] Move `MatchesList` and `MatchDetail` to `src/app/features/matches/`.
2.  [ ] Refactor `MachesListComponent` to use `OnPush` and Signals.
3.  [ ] Implement `appHasRole` directive in `Shared` and remove manual `*ngIf="isAdmin()"` checks.
4.  [ ] Ensure `Admin/Captain/Referee` routes point to these shared feature components instead of duplicating them.
