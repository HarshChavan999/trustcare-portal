# Implementation Plan - TrustCare Portal UI Revamp & Fixes

This plan outlines the steps to upgrade the TrustCare Portal with a premium, state-of-the-art styling system using Tailwind CSS v4, the OKLCH color space, Lucide React icons, and advanced micro-interactions. It also details the removal of the public landing page in favor of a direct Sign In page and resolves the issue where the Admission Form does not load when no Inquiry is pre-selected.

---

## User Review Required

> [!IMPORTANT]
> - **Direct Sign In Flow**: The public landing page will be completely bypassed. Users will now land directly on a premium, full-screen, centered login card.
> - **Admission Form Autonomy**: The Admission View will no longer block access with a "No Inquiry Selected" error. Instead, it will load the form directly, allowing manual details input or dynamic selection from existing inquiries (via an interactive Aadhaar/name search).
> - **FontAwesome to Lucide Transition**: We will install `lucide-react` and replace the FontAwesome icons across all views for a clean, cohesive design language.

---

## Open Questions

- *Do you have any specific corporate color variations for Shelar Training Institute (e.g. secondary/accent hues)?* We will use a premium deep slate/navy base with a vibrant teal (`oklch(0.75 0.15 180)`) and indigo (`oklch(0.65 0.2 280)`) gradient system.

---

## Proposed Changes

### Dependencies

#### [MODIFY] [package.json](file:///c:/Users/phita/project10/trustcare/package.json)
- Add `lucide-react` to dependencies.

---

### Core Styling System

#### [MODIFY] [globals.css](file:///c:/Users/phita/project10/trustcare/src/app/globals.css)
- Define variables in OKLCH space for light/dark themes.
- Implement custom utility classes:
  - `.glass-panel`, `.glass-panel-dark`, and `.glass-card` using backdrop filters.
  - `.hover-lift` using customized cubic-bezier animations (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
  - `.gpu-accelerated` with hardware-accelerated scroll-positions and translate properties.
  - Active category navigation underline expansions.
  - Floating animations (`floatUpHeart` / `floatUpScale`) and transitions.

---

### Navigation & Core Pages

#### [MODIFY] [page.tsx](file:///c:/Users/phita/project10/trustcare/src/app/page.tsx)
- Bypasses public landing page when `userProfile` is null; renders the direct full-screen Sign In page with glassmorphic cards and demo credentials.
- Replaces FontAwesome icons with `lucide-react` icons.
- Optimizes mobile menu layout.

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/phita/project10/trustcare/src/components/Sidebar.tsx)
- Replaces FontAwesome icons with `lucide-react` icons.
- Integrates GPU-accelerated scrolling.
- Adds active line underline/border slide-in animations.

---

### Dashboard Forms & Views

#### [MODIFY] [AdmissionView.tsx](file:///c:/Users/phita/project10/trustcare/src/components/AdmissionView.tsx)
- **Removal of Inquiry Blocker**: Removes the `if (!inquiryData)` crash/blocker.
- **Dynamic Field Mode**: Converts fields (First Name, Middle Name, Last Name, Branch, Course) into state variables.
  - If `inquiryData` is passed, they are pre-filled (and optionally locked).
  - If `inquiryData` is null, fields are empty, editable, and standard.
- **Dynamic Course Selector**: Adapts the course choices dropdown options based on the chosen Branch.
- **Interactive Search**: Adds an optional "Search Inquiries" select/search input at the top of the form when filling from scratch.
- **Premium Glassmorphic Design**: Applies the `.glass-card`, `.hover-lift`, and `.gpu-accelerated` classes.
- **Icons**: Transition to Lucide.

#### [MODIFY] [InquiryView.tsx](file:///c:/Users/phita/project10/trustcare/src/components/InquiryView.tsx)
- Enhances form layouts using glassmorphism.
- Adds `.hover-lift` classes to actions.
- Replaces FontAwesome icons with Lucide.

#### [MODIFY] [PaymentView.tsx](file:///c:/Users/phita/project10/trustcare/src/components/PaymentView.tsx)
- Enhances fee schedule, payment cards, and tables using glassmorphic styling.
- Transitions all icons to Lucide.

#### [MODIFY] [ExamReceiptView.tsx](file:///c:/Users/phita/project10/trustcare/src/components/ExamReceiptView.tsx)
- Enhances receipt generation UI using glassmorphism.
- Transitions all icons to Lucide.

#### [MODIFY] [AnalyticsView.tsx](file:///c:/Users/phita/project10/trustcare/src/components/AnalyticsView.tsx)
- Restyles statistics cards using dynamic glass panels.
- Adds `.hover-lift` onto KPI blocks.
- Transitions all icons to Lucide.

---

## Verification Plan

### Automated Tests
- Build and run standard lint and compilation checks:
  ```bash
  npm run build
  ```

### Manual Verification
1. **Direct Login Page**: Load the app, verify that the landing page is gone and the Sign In page shows directly. Log in with demo credentials.
2. **Admission Form Flow**: Click on "New Admission" directly without picking an inquiry. Verify that the form loads with editable fields. Select a branch and verify that courses change.
3. **Inquiry Selection inside Admission**: Test typing an Aadhaar number or selecting a student in Inquiry first and clicking "Take Admission". Verify that the fields auto-fill.
4. **Visual & Animations**: Hover over buttons and cards to verify the springy lift effect. Verify that Lucide icons render correctly.
