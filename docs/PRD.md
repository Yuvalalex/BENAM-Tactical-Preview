# BENAM Tactical Preview — Master Product Requirements Document (PRD)

**Version:** 1.1.0  
**Classification:** Engineering Reference  
**Owner:** Yuval Alex  
**Last Updated:** 2026-08-11

---

## 1. Product Vision

BENAM (Battlefield Emergency Network & Aid Manager) is an **offline-first tactical medical incident management system** designed for combat medic teams operating in communications-degraded or communications-denied (COMMS-D/COMMS-DN) environments. The system enables real-time casualty tracking, MARCH protocol guidance, multi-device mesh data synchronisation, and structured medical handoff reporting — all without requiring a backend server or network infrastructure.

### 1.1 Strategic Objectives

| Objective | KPI | Target |
|---|---|---|
| Offline operational coverage | % of core workflows executable with zero connectivity | 100% |
| Casualty registration latency | Time from casualty event to first digital entry | < 30 seconds |
| Triage priority accuracy | System-calculated priority matches clinical reassessment | > 95% consistency |
| Data sync reliability | State preserved across device loss or crash | Zero data loss on crash-safe save |
| Time-to-evacuation-decision | Medic reaches evacuation priority decision with system guidance | < 60 seconds |
| Golden Hour compliance | System alerts when treatment window is at risk | Alert at 30 min, critical at 55 min |

### 1.2 Target Users

| Role | Environment | Key Needs |
|---|---|---|
| **Combat Medic (חובש)** | Active contact zone | Fast casualty creation, MARCH checklist, tourniquet timer |
| **Field Doctor (רופא / לורם)** | Forward treatment post | Vitals management, clinical status history, medical authority override |
| **Paramedic (פראמדיק)** | Evacuation corridor | Evacuation priority sorting, MEDEVAC reporting, handoff documentation |
| **Commander (מפקד ארן)** | Tactical overview | Force status, triage summary, operational situational awareness |

---

## 2. Operational Context and Constraints

### 2.1 Environmental Constraints

- **No network requirement**: The system must achieve full operational capability with no internet or LAN access.
- **Low-light operation**: UI must remain readable and operable in sub-optimal lighting conditions. High-contrast palette, minimum 4.5:1 contrast ratio.
- **Single-hand operation**: Touch targets must support one-handed operation on a gloved hand. Minimum 44×44 px touch targets.
- **Device loss resilience**: State must be persisted to local storage on every meaningful action. In-memory state loss must be recoverable on next launch.
- **Multi-device coordination**: Teams may operate with 2–6 devices. State must be shareable via QR code or BLE-mesh protocols without a central broker.

### 2.2 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Availability** | App must load and reach functional state within 3 seconds on low-end Android hardware |
| **Persistence** | `localStorage` save after every state mutation; IndexedDB async backup for full state snapshots |
| **Security** | PIN-protected session entry with bcrypt-lite key stretching; no plaintext credential storage |
| **Compatibility** | Chrome / Chromium-based browsers on Android 10+; PWA installable; APK via Capacitor |
| **Localisation** | RTL layout support; Hebrew as primary language; English as secondary |
| **Accessibility** | Touch-first; gesture navigation; large font mode supported |

---

## 3. Feature Specification

### 3.1 Mission Lifecycle

1. **Lock Screen** — PIN authentication with configurable salt-based key derivation.
2. **Mode Selection** — Operational (`operational`) or Training (`training`) mode selection.
3. **Role Assignment** — Commander, Medic, Doctor, Paramedic; role governs UI surface and action scope.
4. **Mission Type** — Open terrain, Urban, Ruins / PFC (Prolonged Field Care).
5. **Mission Start / End** — Timestamp anchoring for all subsequent timeline events.
6. **Pre-Mission Readiness** — Team composition, equipment check, medical supply manifest entry.

### 3.2 Casualty Management (WAR Mode)

- **Casualty Creation**: Name, gender, injury mechanism, time of injury, initial triage priority.
- **MARCH Protocol Checklist**: Structured per-casualty guidance across Massive Haemorrhage, Airway, Respiration, Circulation, Hypothermia/Head steps.
- **Triage Priority Levels**: T1 (Immediate / אדום), T2 (Delayed / צהוב), T3 (Minimal / ירוק), T4 (Expectant / שחור).
- **Tourniquet Timer**: Per-limb countdown timer with alerts at 1 hour (potential removal), 2 hours (risk threshold).
- **Vitals Timeline**: Chronological vitals snapshots (BP, pulse, SpO2, GCS, respiratory rate) with trend visualisation.
- **Body Map Annotation**: Anatomical diagram with tap-to-mark injury locations.
- **Casualty Deterioration Monitor**: Automated watcher compares sequential vitals and flags deterioration trends.

### 3.3 Evacuation Engine

- **Priority Sorting**: Auto-ranks casualties for evacuation by triage priority, golden-hour status, and transport readiness.
- **Evacuation Stages**: Tracks T1–T4 per evacuation phase (Point of Injury, CCP, Role 1, Role 2).
- **MEDEVAC Report Generator**: Produces a 9-Line MEDEVAC or structured handoff report formatted for radio transmission.
- **Heli Countdown**: Configurable ETA countdown for casualty evacuation helicopter arrival.

### 3.4 Offline-First Data Architecture

#### 3.4.1 Persistence Layers (in priority order)

| Layer | Technology | Use Case |
|---|---|---|
| **Primary Write-Through** | `localStorage` (`benam_state` key) | Synchronous, immediate, crash-safe |
| **Async Backup** | `IndexedDB` (via `openIDB`) | Full state snapshots, large payload storage |
| **PWA Cache** | Service Worker (`sw.js`) | App shell and asset caching for full offline startup |
| **Mesh Transfer** | QR code bundles / BLE (future) | Cross-device state delta exchange without a network |

#### 3.4.2 Service Worker Strategy

The Service Worker (`sw.js`) implements a **Cache-First, Network-Fallback** strategy for all static assets:
- On install: pre-cache `index.html`, `js/app.js`, `js/enhancements.js`, all vendor libraries, and CSS bundles.
- On fetch: serve from cache; update cache from network in background if online.
- On activate: purge stale cache versions.

This guarantees app launch in full offline mode after first visit.

#### 3.4.3 QR Mesh Synchronisation Protocol

When devices need to exchange state in a COMMS-DN environment:
1. **Export**: Source device serialises state delta to JSON, compresses, and encodes as QR chunks (configurable chunk size for scan reliability).
2. **Chunked Transfer**: Each QR frame contains a header (`chunk:N/TOTAL`), payload, and checksum.
3. **Import / Merge**: Receiving device scans all chunks, reassembles, decompresses, and applies merge logic.
4. **Conflict Resolution**: Last-write-wins per-casualty-id, with newer `_updatedAt` timestamp taking precedence.

### 3.5 PIN Security and Session Management

- PIN is never stored in plaintext.
- At PIN creation: a cryptographically random salt is generated (`crypto.getRandomValues`).
- PIN + salt are concatenated and hashed using `crypto.subtle.digest('SHA-256')` (WebCrypto API, available natively in all modern browsers and Android WebView).
- Hash and salt stored in `localStorage` under `benam_pin` / `benam_pin_salt`.
- Session unlock: input PIN + stored salt → SHA-256 hash → compare with stored hash.
- Auto-lock: configurable idle timeout (default 5 minutes in training mode, disabled in operational mode).

### 3.6 AI Situational Awareness Advisor

- Runs as a background service (`sa-pulse.service.ts`).
- Ingests triage summary, vitals trends, supply levels, and mission elapsed time.
- Emits structured advisory events via `EventBus` (`alert:ai-advisor`).
- Displayed as an overlay checklist in the UI — non-blocking, dismissable.
- Advisory categories: **Immediate Action**, **Monitor**, **Resource Alert**, **Evacuation Recommendation**.

### 3.7 Comms and Force Management

- **Force Roster**: Digital roster of all team members with assigned role and status.
- **Comms Log**: Structured log of radio communications per channel.
- **War Room / Cockpit**: Aggregated tactical dashboard combining triage summary, force status, supply level indicators, and timeline.

---

## 4. UX/UI Design Principles

### 4.1 Tactical UX Guidelines

| Principle | Implementation |
|---|---|
| **Minimal Cognitive Load** | Each screen exposes only role-relevant actions. Information density is calibrated to decision context. |
| **Progressive Disclosure** | Detail drawers expand from a summary tile; full form is shown only when needed. |
| **Error Prevention over Error Recovery** | Confirmation dialogs on destructive actions; undo available for triage priority changes within 10 seconds. |
| **Touch-First Geometry** | Swipe-to-sort in triage lists; drag-to-reorder evacuees; long-press for context menus. |
| **Night Mode by Default** | Dark theme (`#060908` background) as the base; high-contrast colour tokens for priority states. |

### 4.2 Triage Colour System

| Priority | Colour Token | CSS Class | Meaning |
|---|---|---|---|
| T1 Immediate | `#ff2d2d` | `.t1` | Life-threatening, treat now |
| T2 Delayed | `#ffaa00` | `.t2` | Serious, can wait briefly |
| T3 Minimal | `#00cc44` | `.t3` | Walking wounded |
| T4 Expectant | `#555` | `.t4` | Survival unlikely given resources |

---

## 5. Security and Privacy Requirements

| Requirement | Implementation |
|---|---|
| No plaintext secrets | PIN hash+salt only; no cleartext PIN in memory after entry |
| CSP enforcement | `Content-Security-Policy` meta tag blocks external scripts and `unsafe-eval` |
| No external data egress | No analytics, telemetry, or backend calls in the operational build |
| Data isolation | All state is scoped to the device; QR export is user-initiated and explicit |
| Session expiry | Auto-lock on idle; re-authentication required |

### 5.1 CSP Hardening Roadmap

Current CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; ...`

The `'unsafe-inline'` permission is currently required for the 173+ inline `onclick` handlers in `index.html`. The planned migration path:

1. **Phase 8** (in progress): Replace all `onclick="fn()"` attributes with `data-action="fn"` attributes.
2. **ActionDelegator** (`src/presentation/actions/action-delegator.ts`) will handle all events centrally.
3. **Upon completion**: Remove `'unsafe-inline'` from `script-src`, achieving a strict CSP with no inline script execution.
4. **Long-term**: Add a nonce-based CSP for any dynamic script injection requirements.

---

## 6. Android Delivery (Capacitor)

- **Framework**: Capacitor v8.x wraps the PWA into a native Android `WebView` shell.
- **Package**: `com.benam.app`
- **Build Pipeline**: `build_apk.sh` → `npm run build` → `npx cap sync android` → Gradle build.
- **Permissions**: Camera (QR scanning), network state (connectivity detection).
- **Target API**: Android 14 (API 34); minimum Android 10 (API 29).

---

## 7. CI/CD Pipeline

| Stage | Tool | Trigger |
|---|---|---|
| Type Check | `tsc --noEmit` | PR, push |
| Production Build | `vite build` | PR, push |
| E2E Tests | Playwright (Chromium) | PR, push |
| Android Build | Gradle (manual / release tag) | Tag push |

---

## 8. Open Engineering Decisions

| Item | Status | Notes |
|---|---|---|
| BLE Mesh Sync | Planned | Web Bluetooth API available on Android Chrome |
| IndexedDB as primary storage | Partially complete | `38-enh-prep-idb.js` sets up schema; migration from localStorage pending |
| Role-based access control | Partial | Role selected at session start; server-side RBAC N/A (no backend) |
| Nonce-based CSP | Planned | Blocked on inline handler migration (Phase 8) |
| i18n framework | Scaffold present (`25-i18n.js`) | Full translation pipeline not yet wired |
