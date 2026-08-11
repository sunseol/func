# FunCommute Design System

This is an extraction of the visual system already present in the repository. It is an implementation contract for the existing UI, not a new visual direction. FunCommute currently has two intentionally different surfaces: a dark, brand-forward landing page and a neutral, utility-oriented authenticated workspace. The tokens below describe both where they are real and call out the places where they have not yet converged.

## 1. Atmosphere & Identity

The landing experience feels like a dark, energetic all-in-one work platform: emerald actions, atmospheric imagery, rounded cards, and visible depth. Its signature is the emerald accent moving through a nearly-black blue surface. The signed-in workspace feels like a practical command center: white or near-black application surfaces, compact information density, Ant Design controls, and a persistent navigation shell. AI PM adds a document/workflow layer with blue-to-green progress cues and mobile-first task surfaces. The product identity is therefore the green action color and document/workflow focus, not a single uniform material across every route.

## 2. Color

### Palette

The codebase does not expose a single CSS-variable palette; these names are the contract-level mapping of the literals and utility classes currently in use.

| Role | Token | Light / workspace | Dark / workspace | Landing / report usage |
|---|---|---|---|---|
| Surface / primary | `--surface-primary` | `#ffffff` | `#0a0a0a` | Landing base `#0a0f1a`; report page `#ffffff` |
| Surface / secondary | `--surface-secondary` | `#f9fafb` / `bg-gray-50` | `#0f0f0f` / `#0f172a` | Landing section `#111827` |
| Surface / elevated | `--surface-elevated` | `#ffffff` | `#111827` | Landing card `#1a1f2e`; Ant Card/Drawer/Modal use these values |
| Surface / editor | `--surface-editor` | `#ffffff` | `#1f1f1f` | MDEditor light/dark surfaces |
| Text / primary | `--text-primary` | `#111827` | `#f3f4f6` / `#e5e7eb` | Landing `#ffffff`; report headings `#111827` |
| Text / secondary | `--text-secondary` | `#4b5563` / `#6b7280` | `#9ca3af` / `#d1d5db` | Landing `#9ca3af`; report content `#374151` |
| Text / muted | `--text-muted` | `#9ca3af` / `#6b7280` | `#666666` | Metadata, disabled, skeleton labels |
| Border / default | `--border-default` | `#e5e7eb` / `#d1d5db` | `#374151` / `#2f2f2f` | Landing `#374151`; report table borders `#d1d5db` |
| Border / subtle | `--border-subtle` | `#f0f0f0` / `#f3f4f6` | `#1f1f1f` / `#1e1e1e` | Sidebar and card separators |
| Accent / primary | `--accent-primary` | `#10b981` (landing), `#00b96b` (Ant) | `#10b981` / `#00b96b` | Links and report emphasis also use `#2563eb` |
| Accent / hover | `--accent-hover` | Tailwind `hover:bg-green-700` / `hover:bg-blue-700` | Tailwind dark variants where present | Existing hover classes, not a normalized hex ramp |
| Status / success | `--status-success` | `#16a34a` / `#22c55e` | `#22c55e` | Approval, online, completed workflow steps |
| Status / warning | `--status-warning` | `#d97706` / `#eab308` | `#f59e0b` | Validation, slow connection, pending states |
| Status / error | `--status-error` | `#dc2626` / `#ef4444` | `#ef4444` | Destructive actions, offline, error states |
| Status / info | `--status-info` | `#2563eb` / `#3b82f6` | `#60a5fa` | Links, active workflow, informational callouts |
| Landing accent ramp | `--landing-accent` | `#10b981` → `#6ee7b7` | same | Primary CTA, logo, enterprise gradient |
| App header | `--app-header` | `#001529` | `#0b1420` | MainHeader background |

### Rules

- Workspace theme state is controlled by `ThemeProvider`: `html.dark`, `data-color-mode`, body classes/styles, and Ant Design's `defaultAlgorithm`/`darkAlgorithm` are updated together.
- Landing colors come from `src/app/landing/styles/theme.ts` and are consumed through styled-components. Do not assume landing dark values apply to workspace routes.
- Tailwind v4 is loaded from `@import "tailwindcss"` in `src/app/globals.css`; the same file also retains legacy `@tailwind base/components/utilities` directives, while `tailwind.config.js` still declares class dark mode and `src` content globs.
- Tailwind utility colors and Ant Design tokens are both active. New UI should map to this table before adding a new literal; existing raw literals are recorded as debt in Section 8.
- Accent colors are primarily interactive or status-bearing. The landing gradient is an existing brand treatment; it is not a permission to add decorative gradients to workspace surfaces.

## 3. Typography

### Scale

These levels summarize the recurring values rather than replacing component-library typography.

| Level | Size / line-height | Weight | Existing usage |
|---|---|---|---|
| Landing display | `56px / 3.5rem`, `1.2`; mobile `40px / 2.5rem` | 800 | Hero headline |
| Landing section title | `40px / 2.5rem` | 400–700 | Feature, pricing, FAQ section headings |
| App page title | Ant `Title` levels or `24–32px` | 600–700 | Workspace and report headings |
| App section/card title | `18–22px` | 600 | Project, workflow, document, and panel headings |
| Body | `16px`, usually `1.5–1.6` | 400 | Default workspace and landing copy |
| Body small | `14px`, usually `1.5` | 400–500 | Metadata, descriptions, controls |
| Caption | `12px`, `1.3–1.4` | 500 | Badges, timestamps, labels, unread counts |
| Report body | inherited `16px`, `1.6` | 400 | `.report-content-wrapper` |
| Report table | `0.9rem` | 400–600 | Report table cells and headings |

### Font Stack

- Workspace/global body: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", Arial, Helvetica, sans-serif` (`src/app/globals.css`).
- Landing: `'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif`.
- Generated report: `.report-content-wrapper` uses the offline-safe global stack `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", "Malgun Gothic", Arial, Helvetica, sans-serif`.
- No dedicated mono family is established. Code blocks use the browser/default monospace behavior through markdown/editor components.

### Rules

- Keep body text at or above `14px`; `input`, `textarea`, and `select` are globally forced to `16px` to prevent iOS zoom.
- Korean copy is first-class; preserve `lang="ko"`, Noto Sans KR/Malgun Gothic fallbacks, and wrapping behavior.
- Landing display sizes are intentionally larger than the app shell. Do not copy hero sizing into dense workspace controls.

## 4. Spacing & Layout

### Base Unit

Most Tailwind and styled-components values resolve to a 4px rhythm. Rem values are kept where they are part of the landing CSS; report dimensions use print units.

| Token | Value | Existing usage |
|---|---:|---|
| `--space-1` | `4px` | Icon gaps, compact metadata |
| `--space-2` | `8px` | Inline groups, menu padding, tight lists |
| `--space-3` | `12px` | Form/card compact padding, mobile trigger inset |
| `--space-4` | `16px` | Default card/header padding, controls |
| `--space-5` | `20px` | Report page margin, section inner gaps |
| `--space-6` | `24px` | Comfortable card padding, app headers |
| `--space-8` | `32px` | Landing container side padding, feature grid gap |
| `--space-10` | `40px` | Report generator outer padding |
| `--space-12` | `48px` | Major app/landing inner spacing |
| `--space-16` | `64px` | Landing mobile section vertical padding |
| `--space-20` | `80px` | Landing header offset / hero top padding |
| `--space-24` | `96px` | Landing desktop section vertical padding |

Report print tokens are intentionally separate: `15mm` page padding, `210mm` max page width, `297mm` minimum page height, and `20px` screen margin.

### Grid and Breakpoints

- Tailwind breakpoints used in classes: `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px` (with the framework defaults available beyond that).
- Landing theme breakpoints: mobile `768px`, tablet `1024px`; `Container` max width is `1200px` with `2rem` horizontal padding.
- App sidebar is `260px` wide and collapses at the Ant `lg` breakpoint; the mobile Drawer is `300px` wide. The mobile trigger is fixed at `12px` from the left and bottom.
- AI PM uses a full-viewport shell (`h-screen`, `min-h-0`) with a flex child owning vertical scroll and hidden horizontal overflow. The document workspace is a two-column `1/3 + 2/3` split on wide screens.
- Report generator uses a full-height column shell with the `main` element as the vertical scroll owner.

### Layout Primitives and Scroll Ownership

| Primitive | Existing role | Scroll owner |
|---|---|---|
| Root app shell | Ant `Layout` + `AppSidebar` + transparent main layout | Route content / nested route shell |
| Landing document | Fixed header, normal document flow, section stack | `body` / document |
| AI PM shell | `flex flex-col h-screen min-h-0 overflow-hidden` | Inner `flex-1` wrapper (`overflow-y-auto`) |
| Sidebar | Sticky desktop `Sider`; Drawer/overlay on mobile | Sidebar content or Drawer body |
| Workspace split | `DocumentWorkspace` list/editor columns | Each panel's local content where specified |
| Report shell | `h-screen` column + `main.overflow-y-auto` | Report `main` |
| Generated report | `.page-container` centered print page | Document flow; report content itself must wrap |

Asymmetric spacing is intentional in the landing page (large hero/header offset and 96px section rhythm) and in report print layout (millimeter page padding). The app shell favors compact 8–24px control spacing.

## 5. Components

The repository has shared components in both `src/components/ui` and `src/components/ai-pm`, plus Ant Design primitives. The following are the reusable patterns already used across routes; they describe the current states, not future variants.

### App shell and navigation (`RootLayout`, `ClientLayoutContent`, `AppSidebar`, `MainHeader`)

- **Structure**: Root providers → Ant `Layout` → optional 260px `Sider` → route `main`; `MainHeader` remains available to routes that render it.
- **Variants**: landing (no app sidebar), authenticated desktop sidebar, collapsed/mobile sidebar with 300px Drawer, signed-in vs signed-out header, light vs dark theme.
- **Spacing**: 16px/12px brand block and footer controls, 8px menu inset, 24px header horizontal padding, 12px mobile trigger inset.
- **States**: route active/selected, auth loading, signed out, signed in, unread notification badge, admin link, dark mode, mobile Drawer open/closed.
- **Accessibility**: route links are real links; mobile controls have labels (`메뉴 열기`, profile/home labels); Drawer and Ant Menu supply focus handling. Preserve keyboard navigation and visible focus.
- **Motion**: Ant Drawer transitions; mobile menu and button feedback are short color/opacity transitions.
- **Layout**: Sidebar primitive; desktop `Sider` is sticky, mobile Drawer owns its own scroll.

### Theme and Ant Design surface (`ThemeProvider`, `ConfigProvider`, `Card`, `Button`, `Tabs`, `Drawer`, `Modal`, `Table`)

- **Structure**: Context exposes `isDarkMode`/`setIsDarkMode`; Ant `ConfigProvider` receives algorithm, base colors, and component overrides.
- **Variants**: light/dark; primary, link, danger, disabled, loading, and compact Ant controls; editor light/dark via `data-color-mode`.
- **Spacing**: Ant defaults plus explicit 8–24px card/header spacing; mobile cards are reduced to 10–12px body padding by global CSS.
- **States**: default, hover, active, focus, disabled, loading, selected tab/menu item, open Drawer/Modal, empty/error content supplied by callers.
- **Accessibility**: use Ant semantic controls and labels; do not replace icons with text-only color changes. Preserve contrast and focus rings from Ant/theme.
- **Motion**: library-provided transitions; report progress adds a 2s animated gradient.
- **Layout**: surface primitive; Drawer/Modal are viewport overlays, Card is content flow.

### Landing shell (`Header`, `Footer`, `Container`, section cards)

- **Structure**: fixed translucent `Header` → section stack → `Footer`; `Container` constrains content to 1200px.
- **Variants**: desktop nav, mobile full-screen nav, authenticated CTA/profile links, feature card, pricing card (recommended/enterprise), FAQ/CTA sections.
- **Spacing**: header `1rem 2rem`; section desktop `6rem 0`, mobile `4rem 0`; feature/pricing grid gap `2rem`; card padding 2–2.5rem.
- **States**: nav hover/active underline, mobile menu open/closed, CTA hover/press, recommended plan, enterprise gradient, in-view reveal.
- **Accessibility**: real Next links, semantic header/nav/main/footer, preserve readable overlay text over the hero image; icons are decorative unless paired with visible text.
- **Motion**: Framer Motion opacity/y entry, 0.1–0.2s stagger, 0.5–0.6s entries; CTA scale hover/tap; CSS transform/shadow hover.
- **Layout**: document stack; header is fixed and section content offsets it by 80px.

### Forms and controls (`FormComponents.Input`, `MobileFormComponents`, Ant `Form`/`Input`/`Upload`)

- **Structure**: label + control + helper/error/success feedback; password controls add visibility toggle; security validation can add a threat message.
- **Variants**: text/email/password, required/optional, mobile keyboard avoidance, Ant upload vs direct text tabs, primary/danger/secondary actions.
- **Spacing**: 12–16px field/control spacing; mobile controls use 44px minimum touch targets and 16px text.
- **States**: default, focus, touched, validation error, success, disabled, loading, security threat, empty input, upload rejected/accepted.
- **Accessibility**: labels and `htmlFor`, focus management, inline error text, keyboard avoidance, semantic button/input controls. Error messages must not rely on color alone.
- **Motion**: small focus/validation feedback; keyboard-avoidance scroll is positional, not decorative.
- **Layout**: stack/field-group primitive; forms reflow to one column on mobile.

### Data and table primitives (`ResponsiveTable`, `MobileTableControls`, `MobileActionMenu`, `TableActionButtons`, `AdvancedColumnToggle`, `AdvancedTableFilters`)

- **Structure**: desktop table with column definitions and pagination; mobile card mode with expandable details, priority-driven visibility, horizontal-scroll indicator, and optional action menu.
- **Variants**: desktop table/mobile cards, loading/empty, searchable/sortable/filterable, column presets, CRUD/document/approval/user action presets.
- **Spacing**: 8–16px cell/control padding; mobile action targets are at least 44px; card rows use 12–16px.
- **States**: default, selected row, hover, focus, expanded row, loading, empty, horizontal-scroll affordance, hidden/visible columns, dangerous action confirmation.
- **Accessibility**: table semantics, ARIA labels/roles, keyboard navigation, focus management, and touch-safe buttons are part of the component contract.
- **Motion**: short menu/modal transitions and row/expand feedback; avoid animating table layout.
- **Layout**: table/grid on desktop, card/list on mobile; table wrapper owns horizontal scroll when enabled.

### Loading and progress (`LoadingSkeletons`, `RouteLoader`, `MobileLoadingStates`, Ant `Progress`)

- **Structure**: skeleton primitives compose into text/card/table/list/project/document/chat/page states; `RouteLoader` selects page/modal/sidebar/chat/editor/table fallback by viewport.
- **Variants**: animated or static skeleton, mobile vs desktop, pull-to-refresh, infinite-scroll, swipe loading, progress bar, report generation progress.
- **Spacing**: 8–24px internal gaps; preserve the shape and approximate density of the eventual content.
- **States**: loading, refreshing, infinite loading, no-more-results, progress percentage, completed/error supplied by caller.
- **Accessibility**: loading text is visible where provided; status updates should remain understandable without animation. Do not hide the only progress explanation in a color ramp.
- **Motion**: Tailwind pulse/spin, transform-based pull/swipe movement, report progress gradient (2s linear). Respect reduced motion when this system is consolidated.
- **Layout**: fills the parent or centers within a route; parent owns scroll unless a loader is explicitly local.

### Feedback, errors, and offline (`MobileToast`, `MobileToastContainer`, `MobileErrorMessage`, `ErrorBoundary`, `OfflineBanner`, `ConnectionStatus`, `OfflinePage`, `PriorityNotification`)

- **Structure**: icon + title/message + optional action/dismiss/details; portal-based toast region; full-page, page-level, and inline error variants.
- **Variants**: success/info/warning/error toast; top/bottom toast stack; network/server/validation/permission/timeout/offline/generic errors; online/slow/offline status.
- **Spacing**: mobile toast 16px padding, 64px minimum height, 8px stack gap, safe-area inset; error actions use 44–48px minimum heights.
- **States**: enter, visible, swipe-active, timed progress, dismissing, retrying, details expanded, auto-retry, stacked/overflow count.
- **Accessibility**: `role="alert"`, `aria-live="polite"`, labelled regions, dismiss buttons with labels, keyboard-accessible actions, and details disclosure. Avoid auto-retry loops that obscure the current state.
- **Motion**: toast transform/opacity entry and swipe dismissal; offline banners slide in; retry spinners use transform/opacity-compatible motion.
- **Layout**: fixed portal region for toasts; page/inline errors participate in normal flow.

### AI PM workflow and document primitives (`AIPMHeader`, `WorkflowSidebar`, `WorkflowProgress`, `WorkflowStepNavigation`, `ProjectCard`, `DocumentWorkspace`, `DocumentEditor`, `DocumentManager`, `DocumentApprovalPanel`, `DocumentVersionHistory`, `ConflictAnalysisPanel`, `ConversationHistoryPanel`, `WorkflowGuide`)

- **Structure**: project/workflow header, step navigation, project/document cards, list/editor split, approval/history/conflict overlays, and conversation/detail panes.
- **Variants**: desktop sidebar, tablet overlay, mobile bottom sheet/fullscreen; document edit/preview/fullscreen/read-only; workflow pending/current/completed; approval request/approve/reject; conflict loading/empty/result/no-conflict.
- **Spacing**: cards commonly 16px mobile / 24px desktop padding, 8–16px gaps, 44–48px mobile action heights; desktop sidebar 256px (`w-64`) and mobile overlay 320px (`w-80`, max 80vw).
- **States**: current/completed/not-started workflow, selected document, unsaved changes, saving/deleting, empty lists, loading, permission denied, modal open/closed, expanded conflict/version details.
- **Accessibility**: Heroicons/Ant icons paired with labels, close buttons labelled, status text and semantic headings, focusable actions, and touch-safe mobile controls. Read-only and permission states must be announced in text.
- **Motion**: 200–500ms transitions for overlays, progress, and navigation; only state changes should move.
- **Layout**: shell/sidebar/overlay/list-detail primitives; each fixed panel or overlay owns its local scroll (`overflow-y-auto`) while the AI PM shell owns route scrolling.

### Report generator and report document contract

- **Structure**: `report-generator/page.tsx` renders an Ant `Card` with non-printable controls, file/text `Tabs`, progress feedback, and a generated report inside `.page-container > .report-content-wrapper`.
- **Input states**: file selected/removed/rejected, text empty/non-empty, generate disabled/loading/success/error, generated report absent/present.
- **Document page contract** (these class names are trusted/static API and must remain stable):
  - `.page-container`: `width: 100%`, `max-width: 210mm`, `min-height: 297mm`, `padding: 15mm`, `margin: 20px auto`, white background, `box-shadow: 0 0 15px rgba(0,0,0,0.1)`, `position: relative`, `overflow: hidden`, `box-sizing: border-box`.
  - `.report-content-wrapper`: offline-safe Korean/system stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Noto Sans KR`, `Malgun Gothic`, `Arial`, `Helvetica`, `sans-serif`), full-width/full-height wrapper, `overflow-wrap: break-word`, `word-wrap: break-word`, base color `#1f2937`, line-height `1.6`; descendants are width-constrained and border-box.
  - `.report-content-wrapper .container`: full width, centered, `padding: 1.5rem`.
  - `.report-content-wrapper .header`: `margin-bottom: 1.5rem`, `padding-bottom: 1rem`, `2px solid #2563eb` bottom rule.
  - `.report-content-wrapper .section`: `margin: 1.25rem 0`; `.content` uses `#374151`.
  - `.report-content-wrapper .highlight-box`: `margin: 1rem 0`, `padding: 1rem`, `4px solid #2563eb` left rule, `#eff6ff` background, `0.25rem` radius.
  - Report headings use `#111827`, `margin: 1rem 0 0.5rem`, line-height `1.25`; paragraphs use `0.5rem` vertical margin; lists use `0.75rem` margin and `1.5rem` left padding; list items use `0.25rem` vertical margin.
  - Report tables are full width, `1rem` vertical margin, collapsed borders, `0.9rem` font; cells use `0.5rem 0.75rem` padding and `1px solid #d1d5db`; headers use `#f3f4f6` and weight 600.
  - `.animated-progress` uses an `#e6f7ff` track and a four-stop blue gradient (`#1890ff`, `#40a9ff`, `#69c0ff`, `#91d5ff`) animated across 2s; this is a loading affordance, not a global accent token.
  - `.printable-area` and `.non-printable` define print behavior: A4 page, 15mm print margin, hide all non-printable content, remove page shadow/border/padding, and remove Ant Card padding/borders/shadows.
- **Accessibility**: upload and text modes expose labels through Ant controls; generation errors use the Ant message API. The report HTML is sanitized before insertion. Print output remains readable in a single A4 column and must wrap long/unbroken content.
- **Motion**: report progress animation only while generation is active; print mode disables it by hiding non-printable UI.
- **Layout**: report `main` owns vertical scrolling; `.page-container` is the document surface and must not become a horizontal scroll trap.

## 6. Motion & Interaction

### Timing

| Type | Existing duration/easing | Usage |
|---|---|---|
| Micro | CSS `0.2–0.3s`, usually `ease`/`ease-out` | Button, hover, toast, row, icon, and disclosure feedback |
| Standard | `0.3s` / `ease-in-out` | Mobile navigation, drawers, workflow overlays, progress changes |
| Emphasis | Framer Motion `0.5–0.6s`, `[0.16, 1, 0.3, 1]` | Landing hero/section reveal |
| Stagger | `0.1–0.2s` | Landing cards and hero children |
| Continuous | `2s linear` | Report progress gradient |

### Rules

- Motion is tied to navigation, feedback, loading, workflow progress, or disclosure; do not add decorative motion to workspace content.
- Existing components mostly animate `transform`/`opacity`, but landing mobile navigation transitions `left` and some legacy CSS transitions may animate other properties. Treat this as consolidation debt rather than a new pattern.
- Every interactive control needs a visible hover/active/focus/disabled state. Ant and Tailwind supply many defaults; custom controls must preserve them.
- Scroll-reveal currently uses Framer Motion `whileInView`; pull/swipe interactions use transform. If adding scroll-driven work, prefer `IntersectionObserver`-equivalent behavior and avoid scroll listeners.
- A repository-wide `prefers-reduced-motion` rule is not currently present. New motion must provide a reduced-motion path, and existing motion is recorded as debt in Section 8.

## 7. Depth & Surface

### Strategy: mixed (existing)

The current product combines borders, shadows, tonal shifts, and one glass-like landing header. This is descriptive, not a request to broaden the visual language.

| Level | Existing treatment | Usage |
|---|---|---|
| Base tonal shift | `#ffffff`/`#f9fafb` light; `#0a0a0a`/`#0f0f0f`/`#111827` dark | App body, route shells, cards, editor surfaces |
| Subtle boundary | `1px solid #e5e7eb`, `#f0f0f0`, `#374151`, or Tailwind border utilities | Cards, separators, sidebars, workflow steps |
| Resting elevation | Tailwind/Ant `shadow-sm`; landing feature/pricing cards use `0 4px 16px` or `0 4px 20px rgba(0,0,0,0.3)` | Cards and project/workflow surfaces |
| Elevated overlay | `shadow-lg`/`shadow-xl`; landing header uses `0 2px 10px rgba(0,0,0,0.5)` | Drawers, menus, modals, mobile overlays |
| Document surface | `0 0 15px rgba(0,0,0,0.1)` on white A4 page | Generated report screen preview; removed for print |
| Brand material | `rgba(17,24,39,0.95)` + `backdrop-filter: blur(10px)` + bottom border | Landing fixed header |

Use surface contrast and borders before adding new shadows. Keep report page elevation isolated from app-shell cards. Do not treat the landing header's blur as a workspace default.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA: 4.5:1 minimum for normal text and 3:1 for large text, visible focus for every interactive element, full keyboard reachability, and semantic headings/landmarks.
- Keep the existing Korean-first document language (`<html lang="ko">`), preserve text alternatives for icons/images, and announce status/error changes with text or live regions rather than color alone.
- Preserve mobile touch affordances: shared mobile components document 44px minimum targets (48px for prominent actions), safe-area padding for toast stacks, and 16px form controls to prevent iOS auto-zoom.
- Preserve responsive intent at 375px, 768px, and desktop widths: primary content must reflow to one readable column without horizontal overflow; table components may own horizontal scroll only when the affordance is explicit.
- Respect `prefers-reduced-motion` for new or repaired transitions. Existing motion without a centralized reduced-motion path remains listed below.

### Accepted Debt

These items are accepted for this extraction-only change so the current UI can be documented without silently redesigning or editing product files. Each item needs an explicit consolidation/QA pass before it is considered closed.

| Item | Location | Why accepted | Owner / exit |
|---|---|---|---|
| Multiple token sources and raw literals | `globals.css`, `ThemeProvider.tsx`, landing `theme.ts`, inline styles, Tailwind utilities, Ant tokens | Existing routes ship with two visual systems; unifying them would change product appearance and is outside this documentation task. | Frontend maintainers; map shared roles to CSS/Ant tokens after visual QA |
| Dark/light inconsistency across routes | Report styles and many Tailwind/inline surfaces are light-only; global dark overrides are partial | Generated reports intentionally remain white for print and some legacy components have not been themed. | Report/UI owners; test each route in both themes and isolate print-only light surfaces |
| Emoji navigation labels/icons | `src/components/layout/MainHeader.tsx` uses `📝` and `🤖` in visible links; landing uses `react-icons` glyphs | Existing copy is user-visible and changing it would be a product edit. Emoji/icon replacement is not part of extraction. | App shell owner; replace emoji with the existing SVG/icon set and re-run accessibility QA |
| Viewport zoom disabled | `src/app/layout.tsx` sets `maximumScale: 1` and `userScalable: false` | Legacy mobile behavior prevents pinch zoom for the current app, but conflicts with WCAG guidance. | App shell owner; remove restrictions after mobile regression coverage |
| `100vh` shell assumptions | `src/app/ai-pm/layout.tsx`, `src/app/report-generator/layout.tsx`, landing mobile nav | Existing full-height shells can jump with mobile browser chrome; changing them can affect scroll ownership. | Layout owner; migrate to dynamic viewport units with 375px/keyboard QA |
| Reduced-motion coverage is incomplete | Framer Motion landing sections, CSS pulse/spin, toast and drawer transitions lack one global reduced-motion override | Motion communicates loading/navigation today, and this task must not rewrite it. | Frontend maintainers; add a shared reduced-motion policy and verify every primitive |
| Focus/contrast validation is not centralized | Inline colors and mixed Tailwind/Ant states are not covered by one token or contrast audit | Existing controls rely partly on library defaults and partly on custom classes. | Accessibility owner; run keyboard/contrast audit by route and record residual debt here |
| Print/report overflow edge cases | `.page-container` uses `overflow: hidden` and fixed A4 dimensions | Required for current one-page report preview/print contract, but long tables or unbroken strings need stress testing. | Report owner; add long-content/table stress fixtures and adjust only with contract approval |
