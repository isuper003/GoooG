# Web Application Layout & Spatial Architecture Specification

> **Document Purpose**: This document provides an exhaustive, purely structural and spatial breakdown of the entire web application. It describes every page, container, component wireframe, responsive behavior, visual hierarchy, and layout flow.
> 
> **Important Directive for the Implementing Agent**: **DO NOT FOCUS ON COLORS, PALETTES, OR SURFACE COSMETICS.** The goal of this document is to enable a complete, ground-up rebuild of the site's **layout architecture, spatial distribution, grid structures, view compositions, and responsive reflow patterns**.

---

## Table of Contents
1. [Core Architectural Overview & Viewport Strategy](#1-core-architectural-overview--viewport-strategy)
2. [Global Application Shell & Navigation](#2-global-application-shell--navigation)
3. [View 1: Home View (Category Selection Hub)](#3-view-1-home-view-category-selection-hub)
4. [View 2: Game Setup Modal](#4-view-2-game-setup-modal)
5. [View 3: Game Arena (Active Session / Play Screen)](#5-view-3-game-arena-active-session--play-screen)
6. [View 4: Game Results & Remediation Screens](#6-view-4-game-results--remediation-screens)
7. [View 5: Gallery & Character Archive Page](#7-view-5-gallery--character-archive-page)
8. [View 6: Supporting Gallery Modals (Lightbox, Manager, Editor)](#8-view-6-supporting-gallery-modals)
9. [View 7: Character Importer Studio (3 Modes)](#9-view-7-character-importer-studio)
10. [View 8: Statistics & Analytics Page](#10-view-8-statistics--analytics-page)
11. [Current Layout Flaws & Structural Diagnosis](#11-current-layout-flaws--structural-diagnosis)
12. [Architectural Recommendations for the Next Rebuild](#12-architectural-recommendations-for-the-next-rebuild)

---

## 1. Core Architectural Overview & Viewport Strategy

### 1.1 Spatial Foundation
- **Canvas Sizing**: The application currently enforces a global outer canvas constraint (`max-w-6xl`, approximately `1152px`) centered with `mx-auto` and horizontal gutters (`px-3 sm:px-6`).
- **Vertical Rhythm**: A standard flex column container (`min-h-screen flex flex-col`) with a sticky top bar (`h-16`) and an expandable main content canvas (`flex-1 py-6`).
- **Screen Breakpoints**:
  - `Mobile` (< 640px): 1 to 2 columns, vertical linear stacking, touch-first targets.
  - `Tablet` (640px – 1024px): 2 to 3 columns, inline filter bars, flex wrapping.
  - `Desktop` (> 1024px): 3 to 4 columns, side-by-side comparison panes, split arenas.

---

## 2. Global Application Shell & Navigation

```
+-----------------------------------------------------------------------------------+
| [BRAND LOGO] | [SUB-TITLE]                     [Home] [Play] [Gallery] [Stats] [Import] |  <- Sticky Header (64px)
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                                                                                   |
|                             ACTIVE PAGE VIEWPORT CONTAINER                        |
|                                  (max-w-6xl, centered)                            |
|                                                                                   |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Component Breakdown
1. **Header Outer Container**: Fixed height `64px` (`h-16`), pinned to top (`sticky top-0 z-50`). Full-width edge-to-edge backdrop blur.
2. **Left Brand Cluster**:
   - Primary Application Wordmark (`font-display text-2xl font-semibold`).
   - Secondary Archive Badge (hidden on mobile, visible on desktop with a vertical separator).
3. **Right Navigation Cluster**:
   - Horizontal list of 5 navigational anchors (`Home`, `Play`, `Gallery`, `Stats`, `Import`).
   - Mobile state: Currently set to horizontal inline scrolling (`overflow-x-auto flex-nowrap`).
   - Active state indicator: Bottom border stroke (`border-b-2`) attached to the text link.
4. **Main Viewport Outlet**:
   - `max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col`.

---

## 3. View 1: Home View (Category Selection Hub)

The landing page functions as the starting launchpad for game sessions. It is vertically centered in the viewport.

### Spatial Wireframe
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                                [ SUB-HEADING ]                                    |
|                         [ MAIN DISPLAY HEADING (H1) ]                             |
|                                                                                   |
|   +----------------+  +----------------+  +----------------+  +----------------+  |
|   |  CATEGORY 1    |  |  CATEGORY 2    |  |  CATEGORY 3    |  |  CATEGORY 4    |  |
|   |  [TAG]         |  |  [TAG]         |  |  [TAG]         |  |  [TAG]         |  |
|   |                |  |                |  |                |  |                |  |
|   |  [ 2x2 IMAGE   |  |  [ 2x2 IMAGE   |  |  [ 2x2 IMAGE   |  |  [ 2x2 IMAGE   |  |
|   |    COLLAGE     |  |    COLLAGE     |  |    COLLAGE     |  |    COLLAGE     |  |
|   |    PREVIEW ]   |  |    PREVIEW ]   |  |    PREVIEW ]   |  |    PREVIEW ]   |  |
|   |                |  |                |  |                |  |                |  |
|   |  [Title Label] |  |  [Title Label] |  |  [Title Label] |  |  [Title Label] |  |
|   +----------------+  +----------------+  +----------------+  +----------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Layout Elements & Grid Rules
- **Header Stack**: Centered text block with small uppercase tracking label above an H1 title.
- **Category Grid**:
  - Mobile: `grid-cols-2` with `gap-4`.
  - Desktop: `grid-cols-4` with `gap-6`, max-width `max-w-5xl`.
- **Category Card Anatomy**:
  - Aspect ratio: Vertical rectangle card with an internal 1:1 image container.
  - Card Top Header: Category Tag Badge (top-left) + Category Name.
  - Center Media Block: A dynamic 2x2 image mosaic (or staggered multi-photo stack) showing preview portraits of characters inside that category.
  - Card Footer / Hover Prompt: Visual action cue indicating clickability.
  - Interaction: Clicking any category card triggers the **Game Setup Modal**.

---

## 4. View 2: Game Setup Modal

A modal dialog that appears over the Home screen when a category is selected, configuring round parameters before entering the Game Arena.

### Spatial Wireframe
```
+-------------------------------------------------------------------+
|  [CATEGORY TAG]                                                   |
|  Open File — [Category Name]                                      |
|  Configure your investigation round parameters.                   |
|-------------------------------------------------------------------|
|  GAME MODE                                                        |
|  +-----------------------------+ +-----------------------------+  |
|  | [x] Classic                 | | [ ] Match                   |  |
|  | 1 photo -> 4 names          | | 1 name -> 2 photos          |  |
|  +-----------------------------+ +-----------------------------+  |
|-------------------------------------------------------------------|
|  SESSION LENGTH                                                   |
|  +--------+  +--------+  +--------+  +-----------+                |
|  | 10 Rds |  | 20 Rds |  | 50 Rds |  |  Endless  |                |
|  +--------+  +--------+  +--------+  +-----------+                |
|-------------------------------------------------------------------|
|  [ Cancel Button ]                           [ Start Game Button ]|
+-------------------------------------------------------------------+
```

### Layout Elements
- **Backdrop**: Fixed fullscreen modal overlay (`fixed inset-0 z-50 flex items-center justify-center p-4`).
- **Dialog Box**: Centered modal box (`max-w-md w-full p-6 flex flex-col gap-6`).
- **Section 1 (Header)**: Category context, modal title, description.
- **Section 2 (Mode Selection)**: 2 equal columns displaying card-like radio options with title and descriptive subtext.
- **Section 3 (Session Length Selection)**: Horizontal row of 4 segmented pills/buttons for round counts (10, 20, 50, Endless).
- **Section 4 (Footer Actions)**: Cancel button (left/secondary) and Start Game button (right/primary full CTA).

---

## 5. View 3: Game Arena (Active Session / Play Screen)

The main interactive play screen. Clean, distraction-free environment with high visual focus on guessing.

### 5.1 Game HUD (Top Bar)
- **Top Row**: Full-width bar (`max-w-3xl`) containing:
  - Left: Round Counter Pill (`Round X of Y` or `Round X` in endless mode).
  - Right: `End session` prompt (with confirmation inline toggle: `Yes` / `Cancel`).

---

### 5.2 Variant A: Classic Mode Layout (1 Picture -> 4 Name Options)

```
                    [ Round 3 of 20 ]          [ End session ]
+-------------------------------------------------------------------+
|                                 |                                 |
|                                 |   +-------------------------+   |
|                                 |   | [1] Character Name A    |   |
|                                 |   +-------------------------+   |
|                                 |                                 |
|         PRIMARY IMAGE           |   +-------------------------+   |
|         PORTRAIT CONTAINER      |   | [2] Character Name B    |   |
|         (1:1 Square, Notch)     |   +-------------------------+   |
|                                 |                                 |
|       [ STAMP: CORRECT /        |   +-------------------------+   |
|         MISSED (ON FEEDBACK) ]  |   | [3] Character Name C    |   |
|                                 |   +-------------------------+   |
|                                 |                                 |
|                                 |   +-------------------------+   |
|                                 |   | [4] Character Name D    |   |
|                                 |   +-------------------------+   |
|                                 |                                 |
+-------------------------------------------------------------------+
```

#### Spatial Rules (Classic Mode):
- **Desktop**: 50/50 two-column split layout (`flex flex-row gap-8 max-w-3xl items-center`).
  - **Left Column**: Aspect-ratio 1:1 image frame. Contains dynamic overlay stamp ("Correct" / "Missed") when feedback state triggers.
  - **Right Column**: Vertical stack of 4 full-width choice buttons (`flex flex-col gap-3`).
- **Choice Button Anatomy**:
  - Fixed-width circular keyboard numeral badge (`1`, `2`, `3`, `4`).
  - Character display name text.
- **Mobile**: Linear vertical stack (Image on top, 4 full-width choice buttons below).

---

### 5.3 Variant B: Match Mode Layout (1 Name -> 2 Picture Options)

```
                    [ Round 3 of 20 ]          [ End session ]
+-------------------------------------------------------------------+
|                                                                   |
|                    TARGET CHARACTER NAME (H2)                     |
|                                                                   |
|          +---------------------+       +---------------------+    |
|          |                     |       |                     |    |
|          |    IMAGE TILE 1     |       |    IMAGE TILE 2     |    |
|          |                     |       |                     |    |
|          |    (1:1 Square)     |       |    (1:1 Square)     |    |
|          |                     |       |                     |    |
|          |    [ MATCH STAMP ]  |       |                     |    |
|          +---------------------+       +---------------------+    |
|               [ <- Left ]                   [ Right -> ]          |
|                                                                   |
+-------------------------------------------------------------------+
```

#### Spatial Rules (Match Mode):
- **Centered Top Header**: Prominent character name to identify.
- **Center Decision Arena**: Two square photo tiles placed side-by-side (`flex flex-row gap-6 justify-center`).
- **Interaction Zone**: Keyboard left/right arrow indicators or direct touch/click on either tile.
- **Feedback State**: Selected tile rings highlight (green for correct, red for incorrect), stamp overlays on match.

---

## 6. View 4: Game Results & Remediation Screens

When a session finishes or is ended, the flow transitions through three possible post-game layouts.

### 6.1 Results / Scorecard Screen
```
+-------------------------------------------------------------------+
|                        [ SESSION SUMMARY ]                        |
|                                                                   |
|   +-----------------------+       +-----------------------+       |
|   |          18           |       |          85%          |       |
|   |     Rounds Played     |       |       Accuracy        |       |
|   +-----------------------+       +-----------------------+       |
|   +-----------------------+       +-----------------------+       |
|   |          15           |       |           3           |       |
|   |        Correct        |       |         Wrong         |       |
|   +-----------------------+       +-----------------------+       |
|                                                                   |
|   MISSED CHARACTERS ON THIS RUN:                                  |
|   +-----------------------+ +-----------------------+             |
|   | [Img] Character 1     | | [Img] Character 2     |             |
|   +-----------------------+ +-----------------------+             |
|                                                                   |
|   [ Practice Missed (Remediation) ]               [ Skip & End ]  |
+-------------------------------------------------------------------+
```
- **KPI Matrix**: 2x2 grid of metric cards (Total Rounds, Accuracy %, Correct count, Wrong count).
- **Review Drawer / Carousel**: Visual horizontal gallery of characters that were missed during the session.
- **Decision Actions**: Primary button to launch immediate Remediation practice vs secondary button to skip.

---

### 6.2 Session Complete Screen
- Centered layout (`max-w-md mx-auto text-center gap-6`).
- Large stat numbers with summary badges.
- Dual navigation footer: `[ Home ]` and `[ Gallery ]` equal-width side-by-side buttons.

---

## 7. View 5: Gallery & Character Archive Page

The master catalog view for browsing, inspecting, searching, and managing all characters on file.

### Spatial Wireframe
```
+-----------------------------------------------------------------------------------+
| Gallery                                                    [ 124 records on file ]|
| Browse, inspect, and organize character case files.                               |
|-----------------------------------------------------------------------------------|
| [ Search input...       ] [ All Categories v ] [ All Labels v ] [ Sort v ] [Manage Labels]
|-----------------------------------------------------------------------------------|
|                                                                                   |
|  +-----------------+  +-----------------+  +-----------------+  +-----------------+  |
|  | [IMAGE PREVIEW] |  | [IMAGE PREVIEW] |  | [IMAGE PREVIEW] |  | [IMAGE PREVIEW] |  |
|  | (1:1 Ratio)     |  | (1:1 Ratio)     |  | (1:1 Ratio)     |  | (1:1 Ratio)     |  |
|  |                 |  |                 |  |                 |  |                 |  |
|  | Name   [CatTag] |  | Name   [CatTag] |  | Name   [CatTag] |  | Name   [CatTag] |  |
|  | [Tag1] [Tag2]   |  | [Tag1]          |  | [Tag1] [Tag2]   |  | (no labels)     |  |
|  | + 12  - 2  SRS3 |  | + 8   - 0  SRS5 |  | + 2   - 5  SRS1 |  | + 0   - 0  SRS0 |  |
|  | [In Rotation   ]|  | [In Rotation   ]|  | [Sealed        ]|  | [In Rotation   ]|  |
|  | [Edit]  [Delete]|  | [Edit]  [Delete]|  | [Edit]  [Delete]|  | [Edit]  [Delete]|  |
|  +-----------------+  +-----------------+  +-----------------+  +-----------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Layout Elements & Grid Rules
1. **Header Row**:
   - Left: Page Title (H1) + descriptive subtext.
   - Right: Record Counter Pill (`X records on file`).
2. **Filter & Search Toolbar (Single Row Flex Container)**:
   - Flexible Search Input field (takes remaining space, `min-w-[10rem]`).
   - Category Filter dropdown (`All categories`, `Trans`, `Sluts`, `Twinks`).
   - Label Filter dropdown (`All labels`, dynamic list).
   - Sort Filter dropdown (`Newest`, `Oldest`, `Category`, `Most correct`, `Least correct`, `Weakest first`).
   - Action Button: `Manage labels` modal trigger.
3. **Character Grid Layout**:
   - Mobile (< 640px): `grid-cols-2 gap-4`.
   - Tablet (640px – 1024px): `grid-cols-3 gap-4`.
   - Desktop (> 1024px): `grid-cols-4 gap-4`.
4. **Individual Character Card Anatomy**:
   - **Top Thumbnail Area**: 1:1 square clickable image container. Triggers fullscreen Lightbox. Contains "Sealed" badge when inactive.
   - **Content Section**:
     - Row 1: Character Name (truncated) + Category Badge (pill, right-aligned).
     - Row 2: Label tags cluster (horizontal flex-wrap of mini-badges).
     - Row 3: Performance metrics row (`✓ Correct`, `✗ Wrong`, `SRS Level`).
     - Row 4: Rotation toggle button (`In rotation` vs `Sealed`).
     - Row 5: Dual action footer (`[ Edit ]` and `[ Delete ]` side-by-side).

---

## 8. View 6: Supporting Gallery Modals

### 8.1 Image Lightbox Overlay
- Fullscreen blacked-out modal overlay (`fixed inset-0 z-50 flex items-center justify-center`).
- Top bar: Character name + Image position counter (`Photo X of Y`) + Close button.
- Center viewport: Large high-resolution photo with smooth aspect containment.
- Navigation triggers: Left and right arrow buttons at the viewport edges + keyboard arrow bindings.

### 8.2 Label Manager Modal
- Small centered modal dialog (`max-w-sm w-full`).
- Header: Title + Close action.
- Add Label input row: Textfield + `Add` button.
- Scrollable list container: Vertical list of labels, each with a tag name and a trash/delete icon.

### 8.3 Character Edit Modal
- Medium centered modal dialog (`max-w-lg w-full`).
- Form stack:
  - Name textfield.
  - Category select dropdown.
  - Multi-label tag picker.
  - Multi-image URL list editor (allows adding, deleting, and reordering image URLs).
  - Save / Cancel button footer.

---

## 9. View 7: Character Importer Studio (3 Modes)

The most feature-dense area of the application. Handles web scraping, batch name lookup, and manual character creation.

### Header & Mode Switcher
```
+-----------------------------------------------------------------------------------+
| Character Importer                                 [ 🌐 Crawler ] [ 🔎 By Name ] [ ✍ Manual ]
| Crawl target pages, look characters up by name, or add a single character.        |
+-----------------------------------------------------------------------------------+
```
- Segmented mode switcher button pill in top right corner.

---

### 9.1 Mode 1 & 2: Crawler & By-Name Review Queue

The crawler and by-name modes populate an interactive review queue with rich horizontal cards.

#### Top Control Bar
```
+-----------------------------------------------------------------------------------+
| [ Category: Sluts v ]  [ Page: [-] [ 1 ] [+] ]  [x] All (4/4) [Select All] [Deselect] | [🚀 Start Fetching]
+-----------------------------------------------------------------------------------+
```
- **Category Select**: Global category dropdown (applies to all fetched items).
- **Page Stepper**: Stepper input with decrement and increment buttons.
- **Queue Selection Bar**:
  - Indeterminate master checkbox.
  - Selection counter (`X/Total selected`).
  - Quick action links: `Select All` and `Deselect All`.
- **Fetch Button**: Large primary action button with loading spinner state.

#### Horizontal Crawled Character Card Anatomy
```
+-----------------------------------------------------------------------------------+
| [x] [AVATAR]  Character Name  [CATEGORY]  [⚠️ Exists Warning]   Labels: [+ Label v]  [✓ Saved / ✗ Failed]
|     (56x56)
|-----------------------------------------------------------------------------------|
| CANDIDATE IMAGES (12)                    [6/6 selected]      [Select Top 6] [Clear Selected]
|
| <  +---------+  +---------+  +---------+  +---------+  +---------+  +---------+  >
|    | ★ Primary|  | #2      |  | #3      |  | #4      |  | #5      |  | #6      |
|    | 144x144 |  | 144x144 |  | 144x144 |  | 144x144 |  | 144x144 |  | 144x144 |
|    +---------+  +---------+  +---------+  +---------+  +---------+  +---------+
+-----------------------------------------------------------------------------------+
```

#### Structural Breakdown of Horizontal Card:
1. **Header Row (Flex Wrap, Vertically Aligned)**:
   - Checkbox: Selects/deselects character for batch saving.
   - Avatar thumbnail: 56x56px (`w-14 h-14`) square cropped profile picture.
   - Name & Badges block: Character Name + Category badge + Duplicate warning flag if character already exists in DB.
   - Compact Label Multi-Select: Popover tag selector to assign taxonomy tags.
   - Status Indicator: `✓ Saved`, `✗ Failed`, or `⚠ No images`.
   - Error Message banner (if save failed, displays exact server error reason).
2. **Bottom Candidate Photo Album Reel**:
   - Album header: Count of found images + `X/6 selected` pill + `Select Top 6` & `Clear Selected` quick buttons.
   - Horizontal scroll reel (`overflow-x-auto no-scrollbar`):
     - Scroll navigation buttons (`‹` left, `›` right).
     - Photo thumbnails: 128px–144px square (`w-32 sm:w-36 aspect-square`).
     - Badge overlay on selected images (`★ Primary`, `#2`, `#3`...).
     - Hover overlay: `Make primary` and `Remove candidate (×)` controls.
3. **Sticky Bottom Floating Save Bar**:
   - Pinned to bottom of viewport (`sticky bottom-4 z-20 flex justify-center`).
   - Large floating pill button: `💾 Save Selected Characters (X)`.

---

### 9.2 Mode 3: Single Manual Add Form
- Centered narrow card layout (`max-w-xl`).
- Form stack: Name input, Category dropdown, Label selector, Image URL list editor, `Add character` CTA button.

---

## 10. View 8: Statistics & Analytics Page

Data visualization and historical ledger of player accuracy and SRS (Spaced Repetition System) progress.

### Spatial Wireframe
```
+-----------------------------------------------------------------------------------+
| Statistics                                                                        |
| Recognition accuracy ledger, category proficiency, and SRS retention levels.      |
|-----------------------------------------------------------------------------------|
|  +-------------------+ +-------------------+ +-------------------+ +-------------------+  |
|  | GAMES PLAYED      | | OVERALL ACCURACY  | | TOTAL CORRECT     | | TOTAL WRONG       |  |
|  |       42          | |       78.4%       | |        312        | |        86         |  |
|  +-------------------+ +-------------------+ +-------------------+ +-------------------+  |
|-----------------------------------------------------------------------------------|
|  +---------------------------------------+ +---------------------------------------+  |
|  | CATEGORY ACCURACY CHART               | | SRS DISTRIBUTION RETENTION CHART      |  |
|  | Trans   [====================] 88%    | | Level 5 (Mastered) [==========] 24   |  |
|  | Sluts   [==============      ] 65%    | | Level 4            [======    ] 14   |  |
|  | Twinks  [=================   ] 79%    | | Level 0 (Learning) [===============]35|  |
|  +---------------------------------------+ +---------------------------------------+  |
|-----------------------------------------------------------------------------------|
|  CHARACTER RECOGNITION LEDGER                            [ Sort: Weakest first v ]|
|  +-------------------------------------------------------------------------------+|
|  | Name                Category            Correct        Wrong        SRS Level ||
|  |-------------------------------------------------------------------------------||
|  | Character Alpha     Sluts               12             1            Level 4   ||
|  | Character Beta      Twinks              4              8            Level 1   ||
|  +-------------------------------------------------------------------------------+|
+-----------------------------------------------------------------------------------+
```

### Layout Elements & Grid Rules
1. **Overview KPI Row**:
   - 4-column responsive grid (`grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4`).
   - Large mono metric numerals with small uppercase description labels.
2. **Analytics Charts Row**:
   - 2-column responsive grid (`grid-cols-1 lg:grid-cols-2 gap-4`).
   - Left: Horizontal percentage accuracy bars per category.
   - Right: SRS Level distribution breakdown (Levels 0 through 5).
3. **Ledger Table**:
   - Header with title and Sort dropdown (`Weakest first`, `Most correct`, etc.).
   - Full-width tabular structure (`table w-full`) with alignment: Name (left), Category (center), Numbers (right-aligned).

---

## 11. Current Layout Flaws & Structural Diagnosis

*(Why simply changing color schemes fails to make the application feel cohesive or modern)*

1. **Monotonous "Box-in-a-Box" Nesting Syndrome**:
   - Almost every screen uses the exact same pattern: outer container -> inner rounded card -> inner rounded box -> button.
   - There is no variation in elevation, density, or edge treatment. Everything feels like uniform cards floating in space without visual hierarchy.
2. **Underutilized Desktop Viewport (Excessive Dead Margin)**:
   - Forcing `max-w-6xl` (1152px) across all views means that on standard 1080p and 1440p desktop displays, more than 40% of the screen is empty space on either side.
   - Data-heavy screens (like the Importer and Gallery) are cramped into narrow vertical lists when they could use split panes or wide multi-panel layouts.
3. **Mobile Navigation Breakage**:
   - The top navigation bar currently relies on horizontal text overflow (`overflow-x-auto flex-nowrap`). On small mobile devices, tabs are cut off horizontally, requiring clumsy side-scrolling. It lacks a proper mobile navigation paradigm (such as a bottom tab bar or collapsible drawer).
4. **Disjointed Action Proximity**:
   - In the Importer, the button to "Save Selected Characters" is detached from the individual cards and sits in a floating bottom button. While sticky, there is no inline per-card quick save or batch floating selection counter that feels connected to the items.
5. **Rigid Grid Rigidity (Lack of Asymmetry)**:
   - The Home page is just 4 identical cards in a row. The Gallery is a repetitive wall of identical cards. There is no editorial layout rhythm, no "Hero" feature, and no dynamic density toggle (e.g., table view vs grid view vs compact list).
6. **Game Arena Visual Balance**:
   - In Classic Mode, the 50/50 split puts an enormous image on the left and 4 text buttons on the right. If the image aspect ratio fluctuates, the left and right sides feel unevenly weighted.

---

## 12. Architectural Recommendations for the Next Rebuild

When redesigning the site layout, the next AI agent should implement these architectural principles:

### A. Viewport-Adaptive Shell (Dynamic Full-Width vs Contained)
- Use fluid, dynamic container strategies:
  - **Focused/Interactive Views** (Home, Game Arena, Setup): Keep centered, tight, distraction-free container (`max-w-4xl` or `max-w-3xl`).
  - **Data/Management Views** (Gallery, Importer, Stats): Expand to fluid wide canvas (`max-w-7xl` or full-width with 32px margins) to allow split panes, multi-column tables, and dense image inspection.

### B. Two-Pane / Master-Detail Workspaces
- **For the Importer**: Instead of vertical stacking of enormous horizontal cards, consider a **Split Workspace**:
  - Left pane (30% width): Vertical list of crawled performer names with selection checkboxes and status icons.
  - Right pane (70% width): Large dedicated inspection tray showing the selected character's avatar, metadata form, and high-resolution photo picker grid.
- **For the Gallery**: Allow switching between a **Visual Grid View** and a **Compact Ledger/Table View** with inline editing.

### C. Mobile-First Navigation Refactor
- On mobile (< 640px), replace the top header link list with a **Bottom Navigation Bar** (`fixed bottom-0 inset-x-0 h-16 z-50`) with icons + short labels (`Home`, `Play`, `Gallery`, `Stats`, `Import`).
- Move secondary actions into slide-over bottom sheets rather than centered popups.

### D. Game Arena Spatial Ergonomics
- Elevate the Game Arena into a dedicated focused stage:
  - Fixed-height viewport canvas (`h-[calc(100vh-100px)]`) where the image and answer choices always fit on the screen without vertical scrolling, even on mobile.
  - Numbered keyboard bindings and touch targets positioned ergonomically within thumb reach on mobile.

---

*End of Layout Specification Document.*
