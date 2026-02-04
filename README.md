# Ramadan Tournament Platform (Frontend)

**Version:** 1.0.0 (Gold Master)
**Architecture:** Modular Monolith (Angular Standalone)

## 🏗️ Architecture Overview

This project follows a strict **Feature-Based Architecture**.

### 📂 Directory Structure

```
src/app/
├── core/           # Singleton services, Interceptors, Guards (NO COMPONENTS)
├── shared/         # Reusable UI Components, Pipes, Directives (NO BUSINESS LOGIC)
├── features/       # Business Domains (Matches, Tournaments). Lazy Loaded.
├── layouts/        # App Shells (Admin, Referee, Captain)
└── styles/         # Global Design System (_tokens.scss, _theme.scss)
```

### 🚫 Non-Negotiable Rules

1.  **Strict Layering**: Features cannot import from other Features. Shared cannot import from Features.
2.  **Performance**:
    - `OnPush` Change Detection is MANDATORY.
    - `trackBy` is MANDATORY for `*ngFor`.
    - Reactive State via Signals.
3.  **Design System**:
    - **No Inline Styles**.
    - **No Hardcoded Colors**. Use `var(--color-name)`.
    - Styles must be centralized in `_tokens.scss`.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Angular CLI 18+

### Installation
```bash
npm install
```

### Running the App
```bash
npm start
```
Navigate to `http://localhost:4200/`.

### Linting & Code Quality
```bash
npm run lint  # Checks TS and HTML
```

*Note: If lint scripts are missing, ensure `angular-eslint` and `stylelint` are installed.*

## 🧩 Adding a New Feature

1.  Create feature directory: `src/app/features/my-feature`.
2.  Define routes in `my-feature.routes.ts`.
3.  Register strict lazy route in `app.routes.ts`.
4.  Implement Smart Components using Signals.
5.  Use Shared Components for UI (Cards, Buttons).

## 🔐 Permissions & Roles

Access is controlled via `PermissionGuard` and `*appHasPermission`.

**Example:**
```html
<app-button *appHasPermission="[Permission.MANAGE_MATCHES]">
  Edit Match
</app-button>
```

## 📖 Key Documentation
- [Final Sign-Off & Architecture Rules](file:///C:/Users/musta/.gemini/antigravity/brain/3dfa2a6d-0d8f-401c-b724-1ae58b5be840/final_sign_off.md)
- [Design System Report](file:///C:/Users/musta/.gemini/antigravity/brain/3dfa2a6d-0d8f-401c-b724-1ae58b5be840/phase6_report.md)

---
**Status:** FROZEN ❄️
**System:** Ready for Production
