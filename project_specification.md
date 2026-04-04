# Project Specification: FocusFlow

## 1. Executive Summary

- **Product:** FocusFlow — A streamlined productivity workspace that merges goal-oriented execution with intelligent file management.
- **Problem:** Productivity-minded individuals juggle fragmented tools — one app for goals, another for savings tracking, a third for file organization. Context-switching kills focus and creates cognitive overhead. No single tool unifies *ambitions* (goals, savings milestones) with *assets* (files, documents, resources).
- **Solution:** FocusFlow provides a unified, minimalist environment where users track personal goals (including high-ticket savings milestones like saving for new tech), manage files with instant drag-and-drop, and view everything in a single dashboard. It merges financial targets with daily documentation in one vibrant, responsive workspace.
- **Platform:** Web application (SPA)
- **Target Launch:** Weekend MVP (2–3 days)
- **Scope:** MVP with phased expansion to V1.1

---

## 2. User Personas & Workflows

### Persona: **Alex — The Focused Achiever**
- **Role:** Solo professional, student, or freelancer who values deep organization
- **Primary goal:** Track personal milestones (career goals, savings targets, learning objectives) while keeping all related files organized in one place
- **Key workflow:**
  1. Opens FocusFlow → sees Dashboard with active goals, savings progress, and recent files
  2. Creates a new goal: "Save ₱50,000 for MacBook Pro" with a target date
  3. Logs a savings deposit of ₱5,000 → sees progress bar animate
  4. Drags a receipt PDF into the goal's attached files
  5. Switches to File Vault → organizes project documents into virtual folders
  6. Reviews dashboard → sees motivational progress across all goals
- **Frequency:** Daily (quick check-ins), weekly (file organization, goal reviews)
- **Pain points:** Scattered tools, no unified view of "what I'm working toward" + "what I'm working with," losing track of savings progress

---

## 3. Feature Specification

### MVP Features (Must Ship — Weekend Build)

---

#### 3.1 **Dashboard — Command Center**
- **Description:** The home screen. Shows an at-a-glance overview of all goals, savings progress, and recent file activity. The "mission control" for the user's ambitions.
- **User story:** "As a user, I want to see all my goals and recent activity in one view so that I stay motivated and oriented."
- **Inputs:** None (auto-populated from user data)
- **Outputs:**
  - Active goals with progress bars (percentage + visual indicator)
  - Total savings progress (aggregated across all savings goals)
  - Recent files (last 5 files uploaded/modified)
  - Quick-add buttons for new goal, new file upload
  - Motivational stat: "You've completed X of Y goals this month"
- **Business rules:**
  - Dashboard refreshes on every visit (reads from localStorage)
  - Goals sorted by: pinned first, then by closest deadline
  - Savings goals show animated progress bar with percentage
- **Edge cases:**
  - Empty state: First-time user sees a welcoming onboarding card with "Create your first goal" CTA
  - All goals completed: Show a celebration animation + "Set new goals" prompt
- **Dependencies:** Goal Tracker, File Vault, Savings Tracker

---

#### 3.2 **Goal Tracker — Broader Milestone System**
- **Description:** A flexible goal tracking system that supports multiple goal types: savings targets, learning milestones, habit streaks, career objectives, and custom goals.
- **User story:** "As a user, I want to create and track diverse goals (financial, personal, career) so that I can see all my ambitions in one organized system."
- **Inputs:**
  - Goal title (required, max 100 chars)
  - Goal type (enum: `savings`, `milestone`, `habit`, `project`, `custom`)
  - Description (optional, max 500 chars)
  - Target value (for savings: amount in ₱; for habits: streak count; for milestones: checklist items)
  - Target date (optional, date picker)
  - Category color (user picks from palette)
  - Priority (Low / Medium / High / Critical)
  - Attached files (drag-and-drop, optional)
- **Outputs:**
  - Goal card with:
    - Title, type badge, priority indicator
    - Progress bar (percentage-based)
    - Target date with countdown ("14 days left")
    - Quick-action buttons: Log Progress, Edit, Archive, Delete
  - Goal detail view with:
    - Full description
    - Progress history timeline (log entries with timestamps)
    - Attached files list
    - Notes section
- **Business rules:**
  - Goal types determine the progress mechanism:
    - `savings`: Progress = (current amount / target amount) × 100
    - `milestone`: Progress = (completed checklist items / total items) × 100
    - `habit`: Progress = current streak / target streak × 100
    - `project`: Progress = manual percentage set by user
    - `custom`: Progress = manual percentage set by user
  - Goals can be: `active`, `completed`, `archived`, `paused`
  - Completing a goal triggers a celebration animation (confetti burst)
  - Archived goals move to an "Archive" section, not deleted
  - Deleting a goal requires confirmation modal
  - Goals persist in localStorage (MVP) / IndexedDB + Supabase (V1.1)
- **Edge cases:**
  - Goal with past deadline: Show "overdue" badge in red
  - Target value of 0: Reject with validation error
  - Duplicate goal titles: Allowed (user may have recurring goals)
  - Max goals: No hard limit for MVP, but render performance may degrade past ~100 (acceptable for personal use)
- **Dependencies:** None (core feature)

---

#### 3.3 **Savings Tracker — Financial Goal Engine**
- **Description:** A dedicated sub-system within the goal tracker specifically for financial/savings goals. Provides deposit/withdrawal logging, running balance, and visual progress tracking.
- **User story:** "As a user, I want to track my savings toward specific purchases (laptop, phone, travel fund) so that I can see exactly how close I am to each target."
- **Inputs:**
  - Transaction type: Deposit (+) or Withdrawal (-)
  - Amount (positive number, required)
  - Note (optional, max 200 chars, e.g., "freelance payment" or "emergency expense")
  - Date (defaults to today, can backdate)
- **Outputs:**
  - Running balance for each savings goal
  - Transaction history (chronological list with type, amount, note, date)
  - Visual progress: animated circular or horizontal progress bar
  - Projected completion date (based on average deposit rate)
  - Total savings across all goals (shown on dashboard)
- **Business rules:**
  - Withdrawals cannot exceed current balance (show error: "Insufficient balance")
  - Minimum deposit/withdrawal: ₱1
  - Currency format: Philippine Peso (₱) with comma separators (₱50,000.00)
  - When balance reaches or exceeds target: Goal auto-marked as "completed" with celebration
  - Transaction history is append-only (no editing past transactions for integrity)
  - Projected completion = target date estimate based on (average daily deposit rate × remaining amount)
- **Edge cases:**
  - User deposits exact remaining amount: Trigger completion immediately
  - User withdraws all funds: Balance returns to ₱0, progress resets to 0%
  - No transactions yet: Show "Make your first deposit!" prompt
  - Negative balance prevention: Block, show friendly error
- **Dependencies:** Goal Tracker (savings goals are a type of goal)

---

#### 3.4 **File Vault — Drag-and-Drop File Manager**
- **Description:** A high-performance, in-browser file management system. Users can upload files via drag-and-drop, organize them into virtual folders, tag files, search, and optionally attach files to goals.
- **User story:** "As a user, I want to drag files into my workspace and organize them into folders so that my documents are always accessible alongside my goals."
- **Inputs:**
  - File upload: Drag-and-drop zone (accepts any file type)
  - Also supports: Click-to-browse file picker
  - Folder creation: Name (required, max 50 chars)
  - File tagging: Comma-separated tags
  - File rename: New name (max 100 chars)
- **Outputs:**
  - File grid/list view (toggle between grid and list)
  - Folder tree (sidebar navigation)
  - File preview: Images (inline preview), PDFs (thumbnail), others (icon + file info)
  - File metadata: Name, size, type, date uploaded, tags
  - Search: Real-time search by filename and tags
  - Storage usage indicator (% of IndexedDB/localStorage used)
- **Business rules:**
  - Files stored as base64 in localStorage (MVP) / IndexedDB blobs (V1.1)
  - Max file size: 5MB per file for localStorage MVP (warn user if exceeded)
  - Supported preview types: Images (jpg, png, gif, webp, svg), PDF (thumbnail only)
  - All other file types: Show generic icon with download button
  - Drag-and-drop supports:
    - Files → File Vault (upload)
    - Files → Folders (organize)
    - Files → Goal cards (attach to goal)
  - Folders can be nested up to 3 levels deep (keep UI manageable)
  - Deleting a folder moves contents to "Unfiled" (safety net)
  - File names sanitized: Strip special characters except `-`, `_`, `.`
- **Edge cases:**
  - File larger than 5MB: Show error toast "File too large. Max 5MB for local storage."
  - localStorage full: Show warning "Storage nearly full (X MB / 5 MB used). Consider removing old files."
  - Duplicate filename in same folder: Auto-append `(1)`, `(2)`, etc.
  - Empty folder: Show "Drop files here" placeholder
  - Browser doesn't support File API: Show fallback message (unlikely in modern browsers)
- **Dependencies:** None (standalone feature, but integrates with Goal Tracker via file attachments)

---

#### 3.5 **Theme System — Dark/Light Mode**
- **Description:** Full dark and light mode support with a user-togglable switch. Colorful, vibrant aesthetic in both modes.
- **User story:** "As a user, I want to switch between dark and light mode so that I can use the app comfortably in any lighting condition."
- **Inputs:** Toggle switch (sun/moon icon)
- **Outputs:** Entire UI re-themes smoothly with CSS transitions
- **Business rules:**
  - Default: Follows system preference (`prefers-color-scheme`)
  - User override persists in localStorage
  - Transition: 300ms ease-out on all color properties
  - Both themes use vibrant accent colors (not just grayscale)
- **Edge cases:**
  - System preference changes while app is open: Update only if user hasn't manually toggled
- **Dependencies:** None

---

#### 3.6 **Navigation — Sidebar + Header**
- **Description:** App-wide navigation with a collapsible sidebar and top header bar.
- **Screens/Routes:**
  - **Dashboard** (`/` or `#dashboard`) — Home/command center
  - **Goals** (`#goals`) — Full goal list with filters
  - **File Vault** (`#files`) — File management
  - **Settings** (`#settings`) — Theme toggle, data export/import, about
- **Business rules:**
  - Sidebar collapses to icons on narrow viewports (< 768px)
  - Active route highlighted in sidebar
  - Hash-based routing (no server needed for MVP)
  - Smooth page transitions (fade/slide)
- **Dependencies:** None

---

### V1.1 Features (Post-Weekend)

| Feature | Description | Complexity |
|---|---|---|
| **Supabase Auth** | Email/password + Google social login | Medium |
| **Cloud Sync** | Supabase database + Supabase Storage for files | High |
| **IndexedDB Migration** | Move file storage from localStorage to IndexedDB for larger files (up to 50MB) | Medium |
| **Goal Templates** | Pre-built goal templates ("Save for tech," "30-day challenge," "Learn a skill") | Low |
| **Data Export/Import** | Export all data as JSON backup, import from backup | Low |
| **Notifications** | Browser push notifications for goal deadlines | Medium |
| **Analytics Dashboard** | Charts showing savings trends, goal completion rate over time | Medium |
| **Drag-and-Drop Sorting** | Reorder goals and files via drag handle | Low |
| **Keyboard Shortcuts** | Power-user shortcuts (N = new goal, U = upload, / = search) | Low |

### Future Considerations
- Mobile PWA with offline support
- Collaborative shared goals (shared savings with partner/family)
- Integrations: Google Drive, Dropbox file sync
- AI-powered goal suggestions based on historical patterns
- Recurring goals (monthly savings auto-deposits)
- Kanban board view for project-type goals
- Pomodoro timer integration (FocusFlow → actual focus sessions)

### Anti-Features (Explicitly Out of Scope)
- ❌ **Social features** — This is a personal tool, not a social platform
- ❌ **Team collaboration** — No shared workspaces, no permissions
- ❌ **Calendar integration** — Keep it focused, don't become Google Calendar
- ❌ **Real banking integration** — No Plaid/bank connections; all savings are manual tracking
- ❌ **File editing** — View and organize files, don't build Google Docs
- ❌ **Mobile native app** — Web-first; PWA later

---

## 4. Technical Architecture

### Stack

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | Vanilla JavaScript (ES Modules) | Weekend timeline. No build complexity. Fast iteration. No framework overhead for a single-user app. |
| **Bundler** | Vite | Lightning-fast dev server, HMR, zero-config. Handles ES modules natively. |
| **Styling** | Vanilla CSS (Custom Properties) | Full control over the vibrant design system. CSS variables enable seamless dark/light theme switching. No Tailwind dependency. |
| **Persistence (MVP)** | localStorage + File API | Zero setup. Works offline. Perfect for single-user personal tool. |
| **Persistence (V1.1)** | IndexedDB + Supabase (PostgreSQL) | IndexedDB for large file blobs. Supabase for cloud sync and auth. |
| **Auth (V1.1)** | Supabase Auth | Email/password + Google OAuth. Free tier supports 50k MAU. |
| **File Storage (V1.1)** | Supabase Storage | S3-compatible. 1GB free tier. Handles file uploads without custom backend. |
| **Hosting** | Vercel | Free tier. Git-push deploys. Global CDN. Perfect for static SPA + future serverless functions. |
| **CI/CD** | Vercel auto-deploy | Push to `main` → auto-deploy to production. Zero config. |

### System Architecture (MVP)

```
┌─────────────────────────────────────────────────┐
│                  Browser (Client)                │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │Dashboard │  │  Goals   │  │  File Vault   │  │
│  │  View    │  │ Tracker  │  │  (Drag+Drop)  │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │               │           │
│       └──────┬───────┴───────┬───────┘           │
│              │               │                   │
│       ┌──────▼──────┐ ┌─────▼──────┐            │
│       │  State      │ │  Storage   │            │
│       │  Manager    │ │  Layer     │            │
│       │  (in-mem)   │ │ localStorage│            │
│       └─────────────┘ └────────────┘            │
└─────────────────────────────────────────────────┘
```

### System Architecture (V1.1 — Cloud Sync)

```
┌──────────────────┐        ┌──────────────────┐
│   Browser SPA    │◄──────►│    Supabase      │
│                  │  REST  │                  │
│  localStorage    │  API   │  PostgreSQL DB   │
│  IndexedDB       │        │  Auth Service    │
│  (offline cache) │        │  Storage (S3)    │
└──────────────────┘        └──────────────────┘
```

### Data Model (Key Entities)

#### **Goal**
| Field | Type | Constraints |
|---|---|---|
| `id` | string (UUID) | Primary key, auto-generated |
| `title` | string | Required, max 100 chars |
| `type` | enum | `savings` \| `milestone` \| `habit` \| `project` \| `custom` |
| `description` | string | Optional, max 500 chars |
| `targetValue` | number | Required for savings/habit; nullable for others |
| `currentValue` | number | Default 0 |
| `targetDate` | ISO date string | Optional |
| `priority` | enum | `low` \| `medium` \| `high` \| `critical` |
| `status` | enum | `active` \| `completed` \| `archived` \| `paused` |
| `color` | string (hex) | Default from palette |
| `attachedFileIds` | string[] | Array of File IDs |
| `createdAt` | ISO timestamp | Auto-generated |
| `updatedAt` | ISO timestamp | Auto-updated |

#### **Transaction** (for Savings goals)
| Field | Type | Constraints |
|---|---|---|
| `id` | string (UUID) | Primary key |
| `goalId` | string (UUID) | Foreign key → Goal.id |
| `type` | enum | `deposit` \| `withdrawal` |
| `amount` | number | Positive, min 1 |
| `note` | string | Optional, max 200 chars |
| `date` | ISO date string | Default: today |
| `createdAt` | ISO timestamp | Auto-generated |

#### **FileEntry**
| Field | Type | Constraints |
|---|---|---|
| `id` | string (UUID) | Primary key |
| `name` | string | Required, max 100 chars, sanitized |
| `type` | string | MIME type (e.g., `image/png`) |
| `size` | number | Bytes |
| `folderId` | string (UUID) | Foreign key → Folder.id; nullable = root |
| `tags` | string[] | Optional |
| `data` | string (base64) | File content (MVP); blob reference (V1.1) |
| `goalId` | string \| null | If attached to a goal |
| `createdAt` | ISO timestamp | Auto-generated |

#### **Folder**
| Field | Type | Constraints |
|---|---|---|
| `id` | string (UUID) | Primary key |
| `name` | string | Required, max 50 chars |
| `parentId` | string \| null | For nesting; null = root level |
| `createdAt` | ISO timestamp | Auto-generated |

#### **UserSettings**
| Field | Type | Constraints |
|---|---|---|
| `theme` | enum | `light` \| `dark` \| `system` |
| `currency` | string | Default: `PHP` (₱) |
| `sidebarCollapsed` | boolean | Default: false |

### API Design Philosophy
- **MVP:** No API. All operations are client-side read/write to localStorage.
- **Storage abstraction layer:** All data access goes through a `StorageService` class that can be swapped from localStorage to Supabase without changing business logic.
- **Data format:** All entities stored as JSON in localStorage under namespaced keys:
  - `focusflow_goals` → JSON array of Goal objects
  - `focusflow_transactions` → JSON array of Transaction objects
  - `focusflow_files` → JSON array of FileEntry objects (metadata only; file data stored separately)
  - `focusflow_file_data_{id}` → Base64 string for each file
  - `focusflow_folders` → JSON array of Folder objects
  - `focusflow_settings` → JSON UserSettings object

### Third-Party Integrations

| Service | Purpose | Tier/Cost | When |
|---|---|---|---|
| Vercel | Hosting + CDN | Free | MVP |
| Supabase | Auth + DB + Storage | Free (50k MAU, 500MB DB, 1GB storage) | V1.1 |
| Google Fonts | Typography (Inter, Space Grotesk) | Free | MVP |
| Canvas Confetti (npm) | Celebration animations | Free, ~3KB | MVP |

---

## 5. Design Direction

### Aesthetic
- **Vibrant, colorful, and modern** — think **Todoist** meets **Cron Calendar** meets **Arc Browser**
- Reference apps: Linear (precision), Raycast (polish), Notion (structure) — but with MORE COLOR
- Not flat or boring — use gradients, subtle glassmorphism, and playful color accents
- Professional enough to feel like a real tool, colorful enough to feel delightful

### Color Palette

#### Light Mode
| Role | Color | Hex |
|---|---|---|
| Background | Warm White | `#FAFAF8` |
| Surface | Pure White | `#FFFFFF` |
| Surface Elevated | Soft Gray | `#F5F5F3` |
| Text Primary | Rich Black | `#1A1A2E` |
| Text Secondary | Warm Gray | `#6B7280` |
| Accent Primary | Electric Violet | `#7C3AED` |
| Accent Secondary | Hot Pink | `#EC4899` |
| Success | Emerald | `#10B981` |
| Warning | Amber | `#F59E0B` |
| Danger | Rose | `#EF4444` |
| Info | Sky Blue | `#3B82F6` |

#### Dark Mode
| Role | Color | Hex |
|---|---|---|
| Background | Deep Navy | `#0F0F1A` |
| Surface | Dark Slate | `#1A1A2E` |
| Surface Elevated | Slate | `#252540` |
| Text Primary | Snow White | `#F8F8FF` |
| Text Secondary | Cool Gray | `#9CA3AF` |
| Accent Primary | Bright Violet | `#8B5CF6` |
| Accent Secondary | Pink | `#F472B6` |
| Success | Mint | `#34D399` |
| Warning | Gold | `#FBBF24` |
| Danger | Coral | `#F87171` |
| Info | Cyan | `#38BDF8` |

#### Goal Category Colors (shared across modes)
| Category | Color | Hex |
|---|---|---|
| Savings | Emerald Green | `#10B981` |
| Milestone | Royal Purple | `#8B5CF6` |
| Habit | Ocean Blue | `#3B82F6` |
| Project | Sunset Orange | `#F97316` |
| Custom | Hot Pink | `#EC4899` |

### Typography
| Role | Font | Weight | Size |
|---|---|---|---|
| Headings (H1–H3) | **Space Grotesk** | 700 | 32px / 24px / 20px |
| Body text | **Inter** | 400 | 15px |
| Body bold | **Inter** | 600 | 15px |
| Labels / Captions | **Inter** | 500 | 13px |
| Monospace (amounts) | **JetBrains Mono** | 500 | 16px |

### Themes
- **Light mode** (default during day) — warm whites, vibrant accents
- **Dark mode** — deep navy/slate backgrounds, glowing accents
- **Toggle:** Sun/moon icon in the header bar
- **Transition:** 300ms smooth fade between themes

### Key Screens (Priority Order)
1. **Dashboard** — Hero screen, first impression, shows everything at a glance
2. **Goals List** — All goals with filter/sort, create new goal modal
3. **Goal Detail** — Full goal view with progress, transactions (for savings), attached files
4. **File Vault** — Grid/list view, folder tree sidebar, drag-and-drop zone
5. **Settings** — Theme toggle, data management (export/import), about

### Responsive Strategy
- **Desktop-first** (primary use case for a productivity workspace)
- **Breakpoints:**
  - `> 1200px`: Full layout with sidebar + main content
  - `768px – 1200px`: Collapsible sidebar (icon-only)
  - `< 768px`: Bottom tab navigation, stacked layouts, full-width cards
- **Touch-friendly:** All interactive elements ≥ 44px tap targets

### Micro-Animations
| Element | Animation | Duration |
|---|---|---|
| Page transitions | Fade + subtle slide-up | 250ms |
| Progress bars | Smooth fill with easing | 600ms |
| Goal completion | Confetti burst + goal card pulse | 1500ms |
| Theme toggle | Sun/moon rotate + color fade | 300ms |
| File drop | Drop zone pulse + file slide-in | 200ms |
| Button hover | Subtle scale (1.02) + shadow lift | 150ms |
| Card hover | Slight lift (translateY -2px) | 200ms |
| Modal open/close | Scale from 0.95 + fade | 200ms |
| Toast notifications | Slide in from top-right | 300ms |
| Sidebar collapse | Width transition + icon fade | 250ms |

---

## 6. Security & Compliance

### Security Tier: **MVP (Local-First)**

Given this is a solo developer side project with a weekend timeline, security is scoped to what protects the user without over-engineering.

- **Authentication (MVP):** None. Single-user local tool. Data lives in the browser only.
- **Authentication (V1.1):** Supabase Auth with email/password + Google OAuth. JWT with refresh tokens handled by Supabase client library.
- **Data handling:** All data stored client-side in localStorage. No PII sent to any server in MVP.
- **Input validation:**
  - All user inputs sanitized (strip HTML/script tags)
  - File names sanitized (remove special chars)
  - Amount fields: Numeric only, positive values, min 1, max 999,999,999
  - Text fields: Length limits enforced (see feature specs)
- **XSS prevention:** No `innerHTML` usage — use `textContent` and DOM APIs for rendering
- **File upload safety:** Validate MIME types client-side (not relied upon for security, but for UX). No server execution since files are stored as base64 blobs.
- **HTTPS:** Enforced by Vercel deployment

### V1.1 Security Additions
- Supabase Row Level Security (RLS): Users can only read/write their own data
- JWT refresh token rotation
- Rate limiting via Supabase built-in protections
- Data encryption at rest (provided by Supabase/PostgreSQL)
- CORS policy: Restrict API access to app domain only

---

## 7. Infrastructure & DevOps

### Environments
| Environment | Purpose | URL |
|---|---|---|
| Local Dev | Development | `http://localhost:5173` (Vite default) |
| Production | Live app | `https://focusflow.vercel.app` (or custom domain) |

*Staging environment deferred — overkill for a solo weekend project.*

### Deployment Strategy
1. Push to `main` branch on GitHub
2. Vercel auto-deploys from `main`
3. Preview deploys for PRs (built into Vercel free tier)

### Monitoring (V1.1)
- Vercel Analytics (free tier — Web Vitals, page views)
- Console error tracking in development
- Supabase dashboard for DB/auth metrics (V1.1)

### Backup
- **MVP:** Data lives in localStorage — user's browser is the backup. Provide a "Export Data as JSON" button in Settings for manual backup.
- **V1.1:** Supabase provides automated PostgreSQL backups (daily, 7-day retention on free tier)

### Scaling Considerations
- Not applicable for MVP (single-user local tool)
- V1.1: Supabase free tier handles up to 50,000 MAU and 500MB database — more than sufficient for a personal productivity tool

---

## 8. Project Phases & Milestones

| Phase | Focus | Duration | Key Deliverables |
|---|---|---|---|
| **0** | Project setup, design system | **3 hours** | Vite project scaffold, CSS custom properties (colors, typography, spacing), Google Fonts loaded, dark/light theme toggle working |
| **1** | Navigation + layout shell | **2 hours** | Sidebar navigation, header bar, hash-based routing, responsive layout, page transition animations |
| **2** | Goal Tracker (core) | **4 hours** | Create/edit/delete goals, goal types, progress tracking, goal list with filters, goal detail view, localStorage persistence |
| **3** | Savings Tracker | **3 hours** | Deposit/withdrawal logging, transaction history, running balance, progress visualization, projected completion date |
| **4** | File Vault | **4 hours** | Drag-and-drop upload, virtual folders, file grid/list view, file preview (images), folder tree navigation, search |
| **5** | Dashboard | **3 hours** | Aggregate view, recent activity, quick actions, empty states, motivational stats |
| **6** | Polish + celebration | **3 hours** | Confetti on goal completion, micro-animations, empty states, responsive tweaks, toast notifications, theme transitions |
| **7** | Testing + deploy | **2 hours** | Manual testing all flows, edge case handling, Vercel deployment, README |

**Total estimated: ~24 hours** (aggressive but feasible across a weekend with focused work)

---

## 9. Open Questions & Risks

### Open Questions
1. **Currency flexibility:** Should the app support multiple currencies, or is PHP (₱) sufficient for MVP? *(Recommendation: PHP only for MVP, add currency selector in V1.1)*
2. **File storage limits:** localStorage is limited to ~5–10MB depending on browser. Is this acceptable for MVP, or should we start with IndexedDB? *(Recommendation: localStorage for MVP simplicity, document the limitation, migrate to IndexedDB early in V1.1)*
3. **Custom domain:** Do you want to deploy to a custom domain, or is `focusflow.vercel.app` sufficient?

### Risks & Mitigations
| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| localStorage size limit hit quickly with file uploads | Users can't upload more files | Medium | Show storage usage indicator. Set 5MB per-file limit. Warn at 80% capacity. Document limitation. |
| Weekend timeline is too tight for all MVP features | Shipped product feels incomplete | Medium | Prioritize phases 0-2-3-5 (setup + goals + savings + dashboard). File Vault can be simplified to upload-only in V1. |
| CSS custom properties don't look consistent across browsers | Visual bugs | Low | Stick to widely-supported properties. Test in Chrome + Firefox + Safari. |
| Base64 file encoding bloats localStorage | Faster storage exhaustion (~33% overhead) | Medium | Accept for MVP. IndexedDB migration in V1.1 stores raw blobs. |

---

## 10. Success Metrics

For a personal side project, success is measured differently than a SaaS:

| Metric | Target | How to Measure |
|---|---|---|
| **Completion** | Ship the MVP by end of weekend | Did you deploy it? |
| **Daily usage** | Use it yourself daily for 1 week | Self-report |
| **Goals created** | Create 5+ real goals in the first week | Count in localStorage |
| **Savings tracked** | Log 10+ transactions in the first month | Count in localStorage |
| **Files uploaded** | Upload 20+ files in the first month | Count in localStorage |
| **Load time** | Under 1.5 seconds on 4G | Lighthouse audit |
| **Lighthouse score** | 90+ on Performance, Accessibility, Best Practices | Lighthouse audit |
| **Portfolio value** | Can you demo this in a job interview? | Self-assessment |

---

## 11. Recommended Skills

| Phase | Skills | Purpose |
|---|---|---|
| Phase 0: Setup | `clean-code`, `cc-skill-coding-standards`, `environment-setup-guide`, `powershell-windows` | Establish code standards, project structure, Windows-specific tooling |
| Phase 1: Navigation | `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `scroll-experience` | Premium navigation, responsive layout, smooth transitions |
| Phase 2: Goal Tracker | `javascript-mastery`, `frontend-design`, `core-components`, `react-ui-patterns` | Component architecture, DOM manipulation, state management patterns |
| Phase 3: Savings | `javascript-mastery`, `frontend-design` | Financial calculation logic, progress visualization |
| Phase 4: File Vault | `file-uploads`, `frontend-design`, `ui-ux-pro-max` | Drag-and-drop patterns, file handling in browsers, grid/list layouts |
| Phase 5: Dashboard | `frontend-design`, `ui-ux-pro-max`, `web-performance-optimization` | Data aggregation views, performance with multiple widgets |
| Phase 6: Polish | `ui-ux-pro-max`, `web-performance-optimization`, `web-design-guidelines` | Micro-animations, celebration effects, accessibility audit |
| Phase 7: Deploy | `vercel-deployment`, `seo-fundamentals` | Production deployment, meta tags, Open Graph |
| V1.1: Auth | `nextjs-supabase-auth`, `cc-skill-security-review`, `api-security-best-practices` | Supabase auth integration, security hardening |
| V1.1: Cloud Sync | `database-design`, `api-patterns`, `cc-skill-backend-patterns` | Schema design, data migration, sync strategy |

---

*This specification is designed to be fed directly into the Implementation Guide prompt for phase-by-phase implementation instructions.*
