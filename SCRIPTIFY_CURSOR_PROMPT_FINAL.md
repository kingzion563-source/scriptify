You are a Senior Full-Stack Engineer with 10+ years of experience building production-grade web applications. You write clean, typed, scalable code with zero shortcuts. You follow the design system and architecture below with absolute precision. You never deviate from the specified colors, fonts, border-radius values, or component structure. You never add features that are not specified. You never use gradients, blue or purple accents, border-radius above 8px on cards, or emoji in UI text. Every component you build is production-ready on the first pass.

---

PROJECT: Scriptify
STUDIO: Anti Gravity
TAGLINE: The Script. The Source. The Scene.
DESCRIPTION: A free Roblox Lua script sharing platform. Community uploads scripts. All scripts are free. Users can browse without an account but must register to publish.

---

LOGO:
The logo is a black-and-white illustration of a brain pierced by two crossed weapons — a spear from the lower-left and a katana from the upper-right. Render it at 32x32px in the navbar. Never colorize it. Never animate it. Use it as the favicon.

---

TECH STACK:

Frontend:
- Next.js 14 App Router, TypeScript strict mode
- Tailwind CSS v3 with all design tokens as CSS custom properties
- Framer Motion v11 for all animations
- Monaco Editor for code display and input
- Zustand v4 for global state
- TanStack Query v5 for data fetching
- React Hook Form v7 + Zod v3 for forms
- Lucide React for icons
- DOMPurify on all user-generated content before render
- Space Grotesk font for UI, JetBrains Mono for code — loaded via next/font

Backend:
- Node.js 20 with Express.js
- PostgreSQL via Supabase with Prisma v5 ORM
- Redis via Upstash for rate limiting and caching
- Meilisearch for full-text search
- JWT access tokens (15min, httpOnly cookie) + rotating refresh tokens (7 day, httpOnly)
- bcrypt cost factor 12 for passwords
- OpenAI GPT-4o for AI features
- Resend for transactional email
- BullMQ for background jobs
- Supabase Realtime for live comments and notifications
- Stripe for payments
- Cloudflare R2 for file storage

Infrastructure:
- Vercel for frontend
- Railway for backend and BullMQ workers
- Cloudflare for DDoS protection and CDN
- Cloudflare Turnstile on register, publish, and AI chat
- Doppler for environment variables
- Sentry for error monitoring

Monorepo structure:
apps/web — Next.js 14
apps/api — Express.js
packages/db — Prisma schema and generated types
packages/ui — shared component library
packages/shared — shared types, validators, constants

---

DESIGN SYSTEM:

CSS Custom Properties — define all of these in globals.css and extend Tailwind config to reference them:

--bg-page: #FAFAFA
--bg-surface: #FFFFFF
--bg-surface-2: #F5F5F5
--bg-surface-3: #EEEEEE
--bg-code: #111111
--bg-navbar: #FFFFFF
--bg-sidebar: #FAFAFA
--border: #E4E4E4
--border-strong: #CACACA
--border-code: #2A2A2A
--text-primary: #111111
--text-secondary: #666666
--text-muted: #999999
--text-inverse: #FAFAFA
--text-code: #E4E4E4
--text-link: #111111
--accent: #111111
--accent-text: #FFFFFF
--accent-hover: #333333
--status-verified: #16A34A
--status-patched: #DC2626
--status-testing: #D97706
--status-bg-verified: #F0FDF4
--status-bg-patched: #FEF2F2
--status-bg-testing: #FFFBEB
--pro-gold: #C8962E
--pro-gold-bg: #FFFAEB
--stripe-purple: #635BFF
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--radius-sm: 4px
--radius-md: 6px
--radius-lg: 8px

Typography:
- Display and body font: Space Grotesk, weights 400 500 600 700
- Code font: JetBrains Mono, weights 400 500
- Base font size: 13px
- Font scale: 11px, 12px, 13px, 14px, 16px, 20px, 26px, 36px
- All headings: font-weight 700, letter-spacing -0.02em
- Uppercase labels: letter-spacing 0.08em, font-size 10-11px

Animation:
- Default easing: cubic-bezier(0.16, 1, 0.3, 1)
- Hover states: 100ms
- Button presses: 180ms
- Panel slides and card entrances: 260ms
- Modals: scale(0.97 to 1) + opacity, 220ms
- Card entrance: opacity 0 to 1 + translateY(8px to 0), staggered 25ms per card
- Never animate layout properties. Use transform and opacity only.
- Always add prefers-reduced-motion override setting duration to 0ms

---

ABSOLUTE DESIGN RULES — NEVER VIOLATE:

1. Never use gradients as backgrounds or fills anywhere on the site
2. Never use border-radius above 8px on any card, panel, or button
3. Never use Inter as the font
4. Never use blue, purple, or teal as accent colors. The accent is black #111111
5. Never add a hero section with centered headline and gradient background
6. Never use emoji in headings, navigation labels, or UI text
7. Never use box-shadow with blur above 16px
8. Never use rounded-full or rounded-3xl Tailwind classes on cards or buttons
9. Never add testimonials, fake social proof, or marketing sections
10. Never add features not specified in this prompt

---

GLOBAL LAYOUT:

The layout is two-panel: a fixed left sidebar (220px) and a main content area that fills the remaining width. Max content width 1200px centered. There is no right sidebar.

Sidebar:
- Width: 220px
- Background: var(--bg-sidebar)
- Border-right: 1px solid var(--border)
- Position: fixed, left 0, top 56px, height calc(100vh - 56px)
- Padding: 20px 0
- Custom scrollbar: 4px wide, transparent track, #CACACA thumb

Sidebar top: Anti Gravity logo (32px) + "SCRIPTIFY" text (14px, weight 700, letter-spacing -0.01em) with 16px horizontal padding. Thin divider below.

Sidebar nav — exactly three items, no more:

Item 1: Discover Scripts — Compass icon — route /
Item 2: Search Scripts — Search icon — route /search
Item 3: Publish Script — Upload icon — route /publish — requires login, clicking while logged out opens sign-in modal

Nav item CSS:
display flex, align-items center, gap 10px, padding 10px 16px, font-size 13px, font-weight 500, color var(--text-secondary), border-left 2px solid transparent, transition all 100ms ease
Hover: color var(--text-primary), background var(--bg-surface-2)
Active: color var(--text-primary), background var(--bg-surface-3), border-left-color var(--accent)

Sidebar bottom (margin-top auto):
If logged out: full-width outline Sign In button + Register link
If logged in: 32px avatar circle + username (13px, weight 500) + Pro badge if applicable. Clicking avatar opens dropdown: Profile, Settings, Sign Out.

Navbar:
- Height: 56px
- Background: #FFFFFF
- Border-bottom: 1px solid var(--border)
- Position: fixed top 0, width 100%, z-index 100
- On scroll past 8px: add box-shadow 0 1px 4px rgba(0,0,0,0.08), transition 150ms

Navbar center: search bar, 480px wide, centered
- Input: background #F5F5F5, border 1px solid var(--border), border-radius 6px, font-size 13px
- Left icon: Search 16px color #999
- On focus: border-color #111, background #FFFFFF
- On type: Meilisearch dropdown appears below

Navbar right:
If logged out: Sign In ghost button + Get Pro black filled button (32px height)
If logged in: Notifications bell icon + avatar dropdown

Mobile (below 768px): sidebar hidden, replaced by bottom tab bar (56px, fixed bottom) with tabs: Home, Search, Publish, Notifications, Profile

---

DATABASE SCHEMA (Prisma):

model User {
  id                String    @id @default(cuid())
  username          String    @unique @db.VarChar(30)
  email             String    @unique
  passwordHash      String
  avatarUrl         String?
  bio               String?   @db.VarChar(200)
  role              UserRole  @default(USER)
  xp                Int       @default(0)
  level             Int       @default(1)
  isVerified        Boolean   @default(false)
  isBanned          Boolean   @default(false)
  banReason         String?
  isShadowbanned    Boolean   @default(false)
  isPro             Boolean   @default(false)
  proExpiresAt      DateTime?
  stripeCustomerId  String?   @unique
  discordId         String?   @unique
  twoFactorEnabled  Boolean   @default(false)
  trustScore        Int       @default(50)
  followerCount     Int       @default(0)
  followingCount    Int       @default(0)
  createdAt         DateTime  @default(now())
  lastActiveAt      DateTime  @default(now())
  scripts           Script[]
  comments          Comment[]
  votes             Vote[]
  reports           Report[]  @relation("ReporterReports")
  notifications     Notification[]
  refreshTokens     RefreshToken[]
  follows           Follow[]  @relation("Follower")
  followedBy        Follow[]  @relation("Following")
  collections       Collection[]
}

enum UserRole { USER MOD ADMIN DEV }

model Script {
  id               String         @id @default(cuid())
  slug             String         @unique
  title            String         @db.VarChar(80)
  description      String?        @db.Text
  coverUrl         String?
  rawCode          String         @db.Text
  status           ScriptStatus   @default(TESTING)
  version          String         @default("1.0.0")
  platform         Platform       @default(BOTH)
  executorCompat   Json           @default("[]")
  viewCount        Int            @default(0)
  copyCount        Int            @default(0)
  likeCount        Int            @default(0)
  dislikeCount     Int            @default(0)
  reportCount      Int            @default(0)
  aiSafetyScore    Int?
  aiSummary        String?        @db.Text
  aiFeatures       Json           @default("[]")
  aiTags           Json           @default("[]")
  requiresKey      Boolean        @default(false)
  isTrending       Boolean        @default(false)
  isFeatured       Boolean        @default(false)
  isPublished      Boolean        @default(false)
  authorId         String
  gameId           String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  lastVerifiedAt   DateTime?
  author           User           @relation(fields: [authorId], references: [id])
  game             Game?          @relation(fields: [gameId], references: [id])
  comments         Comment[]
  votes            Vote[]
  reports          Report[]
  tags             ScriptTag[]
  versions         ScriptVersion[]
  collectionItems  CollectionItem[]
}

enum ScriptStatus { VERIFIED PATCHED TESTING }
enum Platform { PC MOBILE BOTH }

model ScriptVersion {
  id          String   @id @default(cuid())
  scriptId    String
  version     String
  changelog   String?  @db.Text
  rawCode     String   @db.Text
  authorId    String
  createdAt   DateTime @default(now())
  script      Script   @relation(fields: [scriptId], references: [id])
}

model Game {
  id                 String   @id @default(cuid())
  robloxGameId       String   @unique
  name               String
  slug               String   @unique
  thumbnailUrl       String?
  playerCountCached  Int      @default(0)
  scriptCount        Int      @default(0)
  category           String?
  createdAt          DateTime @default(now())
  scripts            Script[]
}

model Comment {
  id         String    @id @default(cuid())
  scriptId   String
  userId     String
  parentId   String?
  body       String    @db.VarChar(2000)
  likeCount  Int       @default(0)
  isEdited   Boolean   @default(false)
  isDeleted  Boolean   @default(false)
  isPinned   Boolean   @default(false)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  script     Script    @relation(fields: [scriptId], references: [id])
  user       User      @relation(fields: [userId], references: [id])
  parent     Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies    Comment[] @relation("CommentReplies")
}

model Vote {
  id          String     @id @default(cuid())
  userId      String
  targetType  VoteTarget
  targetId    String
  value       Int
  createdAt   DateTime   @default(now())
  user        User       @relation(fields: [userId], references: [id])
  @@unique([userId, targetType, targetId])
}

enum VoteTarget { SCRIPT COMMENT }

model Report {
  id           String       @id @default(cuid())
  reporterId   String
  targetType   ReportTarget
  targetId     String
  reason       ReportReason
  body         String?      @db.VarChar(500)
  status       ReportStatus @default(PENDING)
  reviewedById String?
  createdAt    DateTime     @default(now())
  reporter     User         @relation("ReporterReports", fields: [reporterId], references: [id])
}

enum ReportTarget  { SCRIPT COMMENT }
enum ReportReason  { MALWARE STOLEN BROKEN SPAM NSFW OTHER }
enum ReportStatus  { PENDING REVIEWED RESOLVED DISMISSED }

model Tag {
  id         String      @id @default(cuid())
  name       String      @unique @db.VarChar(30)
  slug       String      @unique
  usageCount Int         @default(0)
  scripts    ScriptTag[]
}

model ScriptTag {
  scriptId   String
  tagId      String
  script     Script @relation(fields: [scriptId], references: [id])
  tag        Tag    @relation(fields: [tagId], references: [id])
  @@id([scriptId, tagId])
}

model Follow {
  id           String     @id @default(cuid())
  followerId   String
  targetType   FollowType
  targetId     String
  createdAt    DateTime   @default(now())
  follower     User       @relation("Follower", fields: [followerId], references: [id])
  @@unique([followerId, targetType, targetId])
}

enum FollowType { USER GAME }

model Collection {
  id          String           @id @default(cuid())
  userId      String
  title       String           @db.VarChar(80)
  description String?          @db.VarChar(300)
  isPublic    Boolean          @default(true)
  scriptCount Int              @default(0)
  createdAt   DateTime         @default(now())
  user        User             @relation(fields: [userId], references: [id])
  items       CollectionItem[]
}

model CollectionItem {
  id           String     @id @default(cuid())
  collectionId String
  scriptId     String
  sortOrder    Int        @default(0)
  addedAt      DateTime   @default(now())
  collection   Collection @relation(fields: [collectionId], references: [id])
  script       Script     @relation(fields: [scriptId], references: [id])
  @@unique([collectionId, scriptId])
}

model Notification {
  id          String           @id @default(cuid())
  userId      String
  type        NotificationType
  actorId     String?
  targetType  String?
  targetId    String?
  isRead      Boolean          @default(false)
  createdAt   DateTime         @default(now())
  user        User             @relation(fields: [userId], references: [id])
}

enum NotificationType {
  COMMENT_ON_SCRIPT
  REPLY_TO_COMMENT
  NEW_FOLLOWER
  SCRIPT_MILESTONE
  SCRIPT_FEATURED
  LEVEL_UP
  SCRIPT_FLAGGED
  SCRIPT_APPROVED
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  family    String
  isRevoked Boolean  @default(false)
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

model AiScanLog {
  id            String   @id @default(cuid())
  scriptId      String
  safetyScore   Int
  resultJson    Json
  flagged       Boolean  @default(false)
  flaggedReason String?
  scannedAt     DateTime @default(now())
}

---

SCRIPT CARD COMPONENT:

Props interface:
id: string
title: string
coverUrl: string or null
gameName: string
gameSlug: string
authorUsername: string
authorAvatar: string or null
status: verified | patched | testing
likeCount: number
viewCount: number
copyCount: number
tags: string[]
aiScore: number optional
rawCode: string
isAuthorPro: boolean optional
index: number optional

Layout: vertical card with 16:9 cover image on top, content below.

Cover image: width 100%, aspect-ratio 16/9, object-fit cover, background var(--bg-surface-2). Status badge positioned absolute top-left 8px with 8px offset.

On card hover: cover image scales to 1.03 with 300ms ease transition. Card translateY(-2px) with 180ms ease.

Status badge: font-size 10px, font-weight 700, letter-spacing 0.06em, text-transform uppercase, padding 3px 7px, border-radius 4px
VERIFIED badge: background var(--status-bg-verified), color var(--status-verified)
PATCHED badge: background var(--status-bg-patched), color var(--status-patched)
TESTING badge: background var(--status-bg-testing), color var(--status-testing)

Card body padding: 12px 14px 14px, display flex flex-direction column, gap 6px

Title: font-size 14px, font-weight 600, color var(--text-primary), line-height 1.35, max 2 lines with webkit-line-clamp

Game name: font-size 12px, color var(--text-secondary)

Tags: display flex flex-wrap gap 4px. Each tag: font-size 11px, padding 2px 7px, background var(--bg-surface-2), border 1px solid var(--border), border-radius 4px

Card footer: display flex justify-content space-between align-items center, margin-top auto, padding-top 8px, border-top 1px solid var(--border)

Author: font-size 11px, color var(--text-muted)

Stats: font-size 11px, color var(--text-muted), display flex gap 10px

Copy button: background var(--accent), color var(--accent-text), border none, padding 5px 10px, border-radius 4px, font-size 11px, font-weight 600, cursor pointer, transition background 100ms
On hover: background var(--accent-hover)
On active: transform scale(0.96)
On copied state: background var(--status-verified), label changes to Copied!

Card entrance animation with Framer Motion:
hidden state: opacity 0, y 8
visible state: opacity 1, y 0, duration 0.26, ease [0.16, 1, 0.3, 1], delay index times 0.025

Card grid: CSS grid, grid-template-columns repeat(auto-fill, minmax(280px, 1fr)), gap 16px, padding 20px

Skeleton loading state: same card dimensions, background #F0F0F0, shimmer via CSS keyframe animation — no spinner

---

HOMEPAGE ROUTE /:

No hero section. No marketing copy. Users land directly on the script feed.

Page title: Discover Scripts — 18px, weight 700
Subtext: Free Lua scripts uploaded by the community. — 13px, color var(--text-secondary)

Trending strip above main grid:
Label: TRENDING NOW — 10px, uppercase, letter-spacing 0.1em, color var(--text-muted)
Horizontal scrollable row of 8 trending scripts — each 200px wide mini-card with cover and title only
Drag-scrollable with Framer Motion drag
No visible scrollbar

Filter tab bar below trending: All | Trending | New | Verified Only
Active tab: background var(--accent), color var(--accent-text), border-radius 4px, padding 5px 12px, font-size 12px, font-weight 600
Inactive tab: color var(--text-secondary), same padding, hover color var(--text-primary)

Sort dropdown right-aligned: Most Copied, Most Recent, Top Rated, AI Score

Script card grid with infinite scroll using IntersectionObserver. Load 12 cards per page. Show skeleton cards while loading.

---

SEARCH ROUTE /search:

Large search bar full width at top of content area.
Results update in real time debounced 150ms via Meilisearch.

Left filter panel 240px with collapsible groups:
Game — checkboxes with script counts
Status — Verified, Patched, Testing checkboxes
Executor — checkboxes for Synapse Z, Wave, Solara, Fluxus, Delta, Krnl, Xeno, Arceus X, Hydrogen, Codex
Platform — PC, Mobile, Both
Has AI Summary — toggle
No Key Required — toggle
Sort — radio: Recent, Most Copied, Top Rated, AI Score

All filters update results in real time via URL params. Results count displayed. Zero results shows suggested terms.

Search dropdown spec (appears below navbar search bar while typing):
Position absolute, top 100%, background white, border 1px solid var(--border), border-radius 6px, box-shadow 0 4px 16px rgba(0,0,0,0.08), z-index 200, max-height 400px, overflow-y auto
Each result: thumbnail 40x27px + title + game name + status badge
Sections: Scripts and Games with thin divider between
Keyboard navigable: ArrowUp, ArrowDown, Enter

---

PUBLISH ROUTE /publish:

Requires login. If not logged in: redirect to /login?return=/publish

Two-column layout: form 60%, live preview 40%. Single column on mobile.

Page title: Publish a Script — H1
Subtext: Scripts are reviewed by AI before going live. All scripts are free.

Form fields in exact this order:

1. Cover Art
Drag-and-drop image upload zone. Label: Click or drag image to upload. Subtext: 1:1 Aspect Ratio recommended. Max 2MB, accepts JPG PNG WebP. If no image: auto-generate cover using game thumbnail plus script title overlay.

2. Script Title
Text input, max 80 characters, live character count. AI Guesser auto-fills this after code is pasted. User can override.

3. Target Game
Searchable dropdown. Each result shows game thumbnail plus name plus player count. Add new game option at bottom.

4. Description
Textarea with Markdown support, max 2000 characters, live character count. Preview toggle: raw and rendered.

5. Tags
Comma-separated tag input, up to 10 tags, max 30 chars each. Suggestions from existing tags as user types. AI Guesser auto-suggests tags. Dismissible chips below input.

6. Executor Compatibility
Default: Auto-Detect selected. Manual override checkbox grid: Synapse Z, Wave, Solara, Fluxus, Delta, Krnl, Xeno, Arceus X, Hydrogen, Codex.

7. Platform
Toggle group: PC only, Mobile only, PC and Mobile.

8. Source Code (Lua)
Monaco Editor write mode, language lua, min-height 240px, max-height 600px with resize handle.
Custom dark theme: background #111111, keywords #CC99CD, strings #7EC699, comments #666666, numbers #F08D49, function names #6FB3D2.
Live Lua syntax validation. Line count and character count in status bar. Paste from clipboard button top-right.
On paste: AI Guesser triggers automatically after 800ms debounce.

9. AI Analysis Panel (appears after code is pasted)
Read-only. Shows: detected features, safety score circular SVG progress 60px diameter, suggested title, suggested tags.
Text streams in character by character at 15ms per character interval.
Apply AI Suggestions button fills title and tags from AI output.
If safety score below 50: yellow warning banner.
If safety score below 20: red error banner, submit button disabled.

10. Confirmation checkbox
Label: I confirm this script does not contain malware, stolen code, or data exfiltration. Required to submit.

11. Cloudflare Turnstile widget.

Submit button: label Publish Script, background var(--accent), color var(--accent-text), full width, height 44px, font-size 14px, font-weight 600, border-radius 6px. Shows loading spinner on submit. On success: toast notification and redirect to new script page.

Right column live preview: ScriptCard component that updates as user types, debounced 300ms. Label: PREVIEW in 10px uppercase.

---

SCRIPT DETAIL ROUTE /script/[slug]:

Two-column on desktop: left content 70%, right sticky panel 30%. Single column on mobile.

Left column:
Breadcrumb: Home > Game Name > Script Title — 12px, color var(--text-muted)
Script title H1: 26px, font-weight 700
Status badge row: VERIFIED/PATCHED/TESTING badge + version chip + Updated X ago
Description rendered Markdown
AI Analysis card (see below)
Code blocks with Monaco Editor read-only, one per script variant
Each code block header: label left, Copy button right
Copy button: on click copies rawCode to clipboard, state changes to Copied! with var(--status-verified) background
View Raw link opens /raw/[id]
Comments section

AI Analysis card:
Sits between description and first code block.
Header: AI ANALYSIS — 10px, uppercase, letter-spacing 0.08em, color var(--text-muted). Safety score badge right-aligned.
Body: 2-3 sentence summary streaming in character by character on first page load.
Features: pill chips same style as tags.
Risk warnings if any: collapsible.

Right column sticky panel:
Cover image 16:9 full width of panel
COPY SCRIPT button: full width, black, 44px height, font-weight 600
Icon button row: Bookmark, Share, Report
Stats row: Views, Copies, Likes — 12px, color var(--text-muted)
Like and Dislike buttons with animated count updates, optimistic UI
Author card: 40px avatar + username + follower count + Follow button
Game card: thumbnail + name + player count + View all scripts for this game link
Executor compatibility grid: small logo chips with compatible status
Tags: same pill chips as card
Related scripts: 3 items, vertical list, ScriptCard condensed format

---

PROFILE ROUTE /u/[username]:

Header: 64px avatar circle + username + level badge + Pro badge if applicable
Bio text if set, max 200 chars
Stats bar: Scripts Posted, Total Copies, Followers, Following — 13px
Tab bar: Scripts, Liked, Collections, Activity
Content: ScriptCard grid filtered to selected tab

---

LOGIN ROUTE /login:

Centered card, 400px wide, border 1px solid var(--border), border-radius 8px, padding 32px, background white.
Anti Gravity logo 32px + SCRIPTIFY heading 20px weight 700
Email input + Password input, both full width, border 1px solid var(--border), border-radius 6px, padding 10px 12px, font-size 13px
Forgot password link below password field
Sign In button: full width, black, 40px height, weight 600
Divider: or — 12px color var(--text-muted)
Register link: Do not have an account? Register — 13px

---

REGISTER ROUTE /register:

Same centered card as login.
Fields: Username, Email, Password, Confirm Password
Password strength indicator: 4 horizontal segments below password input, colored by strength — grey, red, orange, green
HaveIBeenPwned API check on password blur
Create Account button: full width, black, 40px height, weight 600
Cloudflare Turnstile on submit
Already have an account? Sign In link

---

AUTH SYSTEM:

JWT access token: 15 minute expiry, httpOnly cookie, SameSite Strict, Secure
Refresh token: 7 day expiry, httpOnly cookie, rotating family tracked in database
On stolen refresh token detected: revoke entire family

All protected routes check access token. On 401: attempt refresh. On refresh fail: redirect to login.

Middleware: all protected Express routes use authenticateToken middleware that verifies JWT from cookie.

---

RATE LIMITING (Redis sliding window middleware):

POST /auth/login: 5 per 15 minutes per IP
POST /auth/register: 3 per hour per IP
POST /scripts: 5 per hour per userId
GET /search: 60 per minute per IP
POST /ai/analyze: 5 per hour per IP, 20 per hour per userId
POST /ai/chat free users: 10 per day per IP
POST /ai/chat Pro users: 50 per day per userId
POST /comments: 20 per minute per userId
POST /reports: 10 per hour per userId

---

INPUT VALIDATION:

All request bodies validated through Zod schemas before any processing.
Unknown fields stripped.
Script code: max 512KB, UTF-8 enforced.
User bio: max 200 chars, DOMPurify sanitized.
Comments: max 2000 chars, DOMPurify sanitized before render.
File uploads: magic byte validation, max 2MB.
All Prisma queries use parameterized syntax only.

---

AI FEATURES:

1. AI Guesser on Publish page
Trigger: 800ms after user stops typing in code editor
API call: POST /api/v1/ai/analyze with the Lua code
Model: gpt-4o
Returns JSON: title, game, tags array, features array, summary, safety_score 0-100, risks array with severity and description and optional line number, executor_compat array with name and compatible, requires_key boolean
Response streams into the AI Analysis panel character by character at 15ms per character.
If safety_score below 20: block form submission.

System prompt for AI analysis:
You are a Roblox Lua exploit script analyzer for Scriptify. Analyze the provided Lua script and return ONLY a raw JSON object with no markdown and no preamble with these exact keys: title as string max 80 chars, game as string or null, tags as string array up to 8 items lowercase hyphenated, features as string array of human-readable feature names, summary as string 2-3 sentences, safety_score as number 0-100 where 100 is completely safe deducting points for webhooks suspicious HTTP calls obfuscation and data exfiltration, risks as array of objects each with severity as low or medium or high and description as string and optional line as number, executor_compat as array of objects each with name as string and compatible as boolean or null, requires_key as boolean.

2. AI Sensei floating chatbot
Trigger button: 48px circle, position fixed, bottom 24px, right 24px, background #111111, color white, z-index 500
Panel: 360px wide, 520px height, position fixed, bottom 84px, right 24px, background white, border 1px solid var(--border), border-radius 8px, z-index 500
Chat layout: messages area scrollable, input bar fixed at bottom of panel
User bubbles: background #111111, color white, border-radius 6px, padding 8px 12px, max-width 80%, align-self flex-end
Assistant bubbles: background var(--bg-surface-2), border 1px solid var(--border), border-radius 6px, padding 8px 12px, max-width 80%, align-self flex-start
Input: full width textarea, border-top 1px solid var(--border), padding 10px 12px, font-size 13px, resize none, max 2 lines
Send button: black, border-radius 4px, padding 6px 12px
Rate limit indicator for free users: X/10 queries remaining today — 11px, color var(--text-muted), shown above input
Header for Pro users: Powered by GPT-4o — 11px, color var(--pro-gold)
Free users: model gpt-4o-mini. Pro users: model gpt-4o.
Context injection: inject current script title, game, features, and summary into system prompt automatically.
Response streams via ReadableStream from the API.

System prompt for AI Sensei:
You are Scriptify AI Sensei. Help users understand how to use Roblox Lua exploit scripts. Answer questions about what script features do, which executors to use for their platform, and basic executor setup steps. Keep responses under 3 paragraphs. Use simple clear language. Format code with backticks. Do not write new Lua scripts for users. Do not help with account hacking or targeted griefing. Current script context: {script_context}

3. AI Trending Detection
BullMQ job running every 30 minutes.
trending_score = (copyCount * 0.5) + (likeCount * 0.3) + (viewCount * 0.2) multiplied by time decay e to the power of negative 0.1 times hours since posted.
Scripts above dynamic threshold (top 5% of scores in last 48 hours): set isTrending true.
Scripts previously trending but no longer above threshold: set isTrending false.
Trending scripts show a HOT badge on their card: background #DC2626, color white, same font and padding as status badge.

---

MONETIZATION:

Pro subscription: $1.00 per month
Stripe checkout link: https://buy.stripe.com/test_eVq5kF3EZ1zP5yu3DRb7y00

Donation: $0.99 one-time
Stripe donate link: https://donate.stripe.com/test_00wcN76Rb0vLd0Wcanb7y01

Pro features:
- GPT-4o model in AI Sensei instead of GPT-4o-mini
- 50 AI chat queries per day instead of 10
- Trending Boost button on own scripts: one use per month, sets isTrending true for 24 hours
- Pro badge next to username everywhere
- Advanced analytics on own scripts
- Private collections

Pro badge: text PRO, uppercase, font-size 10px, font-weight 700, padding 2px 6px, background var(--pro-gold-bg), color var(--pro-gold), border 1px solid var(--pro-gold), border-radius 4px. Never animated. Displayed next to username in navbar, comments, profile, and script author card.

Stripe webhook handler at POST /api/v1/payments/webhook:
Verify signature with Stripe secret.
Handle checkout.session.completed: set isPro true, set proExpiresAt to one month from now.
Handle customer.subscription.deleted: set isPro false.

Support Scriptify text link in footer, no button styling.

---

GAMIFICATION:

XP events:
Publish a script: +100 XP
Script gets 10 copies: +10 XP
Script gets 100 copies: +50 XP
Script gets 1000 copies: +150 XP
Script gets a like: +2 XP
Comment on your script: +1 XP
Daily login: +10 XP
Script featured: +500 XP
Valid report received against user: -50 XP

Level thresholds and names:
Level 1: Newcomer — 0 XP — badge color #9E9E9E
Level 5: Script Kiddie — 500 XP — badge color #42A5F5
Level 10: Lua Learner — 1500 XP — badge color #26C6DA
Level 20: Hub Dev — 5000 XP — badge color #AB47BC
Level 35: Exploit Wizard — 15000 XP — badge color #FFA726
Level 50: AG Legend — 50000 XP — badge color #111111

Level badge: displayed next to username in navbar, comments, profile, and script author card. Format: Lv.N — JetBrains Mono, 10px, white text, colored background, border-radius 3px, padding 1px 5px.

Level up toast: slide up from bottom with Framer Motion spring, display 4 seconds, fade out 300ms. Text: Level Up! You are now [Level Name] Lv.[N]. No confetti.

---

COMMENTS SYSTEM:

Two-level nesting maximum: comment and reply. No reply-to-reply.
DOMPurify on all rendered comment bodies.
Markdown support: bold, italic, inline code, code blocks. No links allowed.
Like and dislike on comments.
Pin comment available to script author only, pinned comment shows at top.
Edit shows edited label. Soft-delete shows [deleted] placeholder, replies preserved.
New top-level comments appear via Supabase Realtime without page refresh, Framer Motion entrance animation.
Load more button, not infinite scroll.
Sort: Top by likes, New by date.
AI moderation via OpenAI Moderation endpoint on all comments before publishing. Flagged comments held for mod review silently.

---

NOTIFICATIONS:

Bell icon in navbar with unread count badge.
Dropdown panel: 320px wide, max-height 400px, scrollable, background white, border 1px solid var(--border), border-radius 8px.
Each notification: Lucide icon + text + timestamp + unread dot.
Mark all read link at top of dropdown.

Notification types with icons:
COMMENT_ON_SCRIPT: MessageSquare icon
REPLY_TO_COMMENT: CornerDownRight icon
NEW_FOLLOWER: UserPlus icon
SCRIPT_MILESTONE: TrendingUp icon
SCRIPT_FEATURED: Star icon
LEVEL_UP: Award icon
SCRIPT_FLAGGED: AlertTriangle icon
SCRIPT_APPROVED: CheckCircle icon

---

MODERATION:

Mod panel at /mod — accessible only to users with role MOD or ADMIN.
Same sidebar and navbar layout as rest of site.
Pending reports queue with filters: target type, reason, AI score.
Each report shows: condensed ScriptCard, reporter username and trust score, AI scan result, action buttons.
Action buttons: Approve Script, Remove Script, Warn Author, Ban Author, Shadowban.

AI pre-moderation thresholds:
Above 50: auto-approved, published immediately.
Between 20 and 50: held in mod queue, shown AI flagged label.
Below 20: auto-rejected, author notified with reason, never published.
3 or more community reports regardless of AI score: pulled back into mod queue.

Report submission modal: reason dropdown (Malware, Stolen Code, Broken, Spam, NSFW, Other), optional body textarea, Submit Report button.

---

SEO:

Every script page uses Next.js generateMetadata.
og:title: [Script Title] — [Game Name] Scripts | Scriptify
og:description: AI summary truncated to 160 characters
og:image: auto-generated via Vercel OG — 1200x630px, black background, cover art left, title and status badge and game name right, Space Grotesk font, Anti Gravity logo bottom-right corner
JSON-LD SoftwareApplication schema on all script pages
Sitemap.xml auto-generated and updated on every publish
robots.txt: allow all, disallow /mod/, /api/, /settings/

---

ERROR PAGES:

404: That script's gone. Patched, maybe. — Back to Discover button
403: You're not supposed to be here. Yet. — Sign In button
500: Our side. We are on it. — Reload button
Rate limited: Easy. You are moving too fast. — countdown timer

All error pages use the same sidebar and navbar layout.

---

API ROUTES:

POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/verify-email
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET /api/v1/scripts
GET /api/v1/scripts/trending
GET /api/v1/scripts/:slug
POST /api/v1/scripts (auth required)
PATCH /api/v1/scripts/:id (auth required, own script only)
DELETE /api/v1/scripts/:id (auth required, own script only)
POST /api/v1/scripts/:id/copy
GET /api/v1/scripts/:id/raw
POST /api/v1/scripts/:id/vote (auth required)
GET /api/v1/scripts/:id/comments
POST /api/v1/scripts/:id/comments (auth required)
POST /api/v1/comments/:id/vote (auth required)
DELETE /api/v1/comments/:id (auth required)
POST /api/v1/reports (auth required)
GET /api/v1/users/:username
GET /api/v1/users/:username/scripts
PATCH /api/v1/users/me (auth required)
POST /api/v1/users/:id/follow (auth required)
GET /api/v1/search
GET /api/v1/search/suggestions
POST /api/v1/ai/analyze
POST /api/v1/ai/chat
GET /api/v1/games
GET /api/v1/games/:slug
GET /api/v1/notifications (auth required)
PATCH /api/v1/notifications/read-all (auth required)
POST /api/v1/payments/create-checkout (auth required)
POST /api/v1/payments/donate
POST /api/v1/payments/webhook
GET /api/v1/mod/reports (mod required)
POST /api/v1/mod/reports/:id/resolve (mod required)
POST /api/v1/mod/users/:id/ban (mod required)
POST /api/v1/mod/users/:id/shadowban (mod required)
POST /api/v1/mod/scripts/:id/feature (mod required)

---

BEGIN BY:

Setting up the Turborepo monorepo with apps/web and apps/api and packages/db. Configure Next.js 14 App Router with TypeScript strict. Set up Tailwind with all CSS custom properties defined above. Create the Prisma schema. Build the global layout with fixed sidebar and navbar. Then build the ScriptCard component. Then build the homepage. Follow the design rules without exception.
