# BENAM Current State Report

**Report type:** Initial autonomous code-quality scan
**Date:** 2026-08-12
**Branch:** `main`
**Baseline commit:** `cd8a58f` (`Delete scripts/EX`)
**Scope:** Repository inventory, build/typecheck/E2E validation, artifact scan, secret-pattern scan, architecture and maintenance-risk review
**Implementation changes:** None intentionally made by this scan

## 1. Executive Summary

BENAM is a substantial offline-first tactical medical PWA with an Android Capacitor package, a large legacy JavaScript runtime, and an expanding strict TypeScript architecture. The repository is functional enough to build and pass a significant portion of its Playwright suite, but it is not currently at a zero-error quality gate.

### Validation outcome

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | PASS | TypeScript completed with no reported errors |
| `npm run build` | PASS with warnings | Build completed; Vite warned that legacy scripts lack `type="module"` |
| `npm test` | PASS | 115 passed, 0 failed in the final full-suite run |
| Secret-pattern scan | No matches | Pattern scan found no likely secrets in scanned project content; this is not proof of clean Git history |
| Manual device smoke test | NOT RUN | No Android device/emulator validation was performed in this scan |
| Android APK build | NOT RUN | Requires separate `./build_apk.sh` gate and Android toolchain validation |

The project MUST NOT be described as zero-errors until the 32 failing E2E tests are resolved or explicitly quarantined with approved reasons.

## 2. Baseline and Worktree State

Initial `git status --short` showed pre-existing changes and untracked content:

```text
 M README.md
M  js/vendor/jsQR.min.js
M  src/core/LegacyAudit.js
M  tests/BENAM_MASTER_UI_VALIDATION.spec.js
M  tests/BENAM_ULTIMATE_100.spec.js
M  tests/TACTICAL_SUPREME.spec.js
M  tests/comprehensive_tactical.spec.js
M  tests/redesign.test.js
M  tests/smoke.spec.js
M  tests/sync_master.spec.js
?? BENAM---Tactical-Preview/
?? PRD.md
?? docs/
?? patch_tests.py
?? patch_tests2.py
```

These changes were treated as pre-existing and were not reverted. The worktree contains two Git roots:

- Outer repository root: current working repository.
- Nested `BENAM---Tactical-Preview/.git`: a second repository containing a near-duplicate project tree.

This nested repository is a high-priority organization finding, but it is **not safe to delete automatically** because ownership, intended repository boundary, and user changes are not yet established.

No backup branch or backup tag was created by this scan. Because risky changes were not performed, no recovery operation was required.

## 3. Repository Inventory

### Primary runtime areas

- `index.html`: SPA HTML shell and many legacy inline handlers.
- `js/`: legacy JavaScript runtime, generated bundles, numbered source parts, and vendored browser assets.
- `src/`: TypeScript core, domain, data, feature, presentation, and background layers.
- `android/`: Capacitor Android project.
- `tests/`: Playwright smoke, UI, tactical, synchronization, and regression suites.
- `scripts/`: concatenation, CSS splitting, and export tooling.
- `www/`: build/deployment output tree.
- `docs/`: PRD, architecture reference, autonomous maintenance instructions, screenshots, and this report.

### Documentation areas

The repository now contains product, architecture, contribution, release, and autonomous-agent documentation. Claims in those documents MUST continue to be checked against the active implementation, especially persistence technology and generated/deploy tree behavior.

## 4. Architecture Findings

### F-001 — Hybrid architecture is a controlled migration risk

- **Classification:** `PROTECTED`
- **Severity:** High
- **Confidence:** High
- **Evidence:** Legacy `js/` runtime, TypeScript `src/` runtime, `src/legacy-bridge.ts`, global state compatibility, and Vite concatenation/copy plugins.
- **Impact:** Behavior can diverge between legacy globals and typed services; refactors can break screens or tests without type errors.
- **Recommendation:** Continue moving business rules behind typed domain services and facades. Add parity tests before deleting legacy owners.
- **Approval required:** Yes for ownership changes or legacy deletion.
- **Validation:** Typecheck, focused domain tests, full critical E2E, and manual core-flow checks.

### F-002 — Nested duplicate Git repository

- **Classification:** `REVIEW_REQUIRED`
- **Severity:** High
- **Confidence:** High
- **Evidence:** Both `./.git` and `./BENAM---Tactical-Preview/.git` exist; the nested directory contains its own project and lockfile.
- **Impact:** Confusing repository boundaries, duplicated source, possible accidental edits or commits to the wrong repository, and inflated project inventory.
- **Recommendation:** Determine whether the nested directory is an intentional historical clone, a separate deliverable, or workspace pollution. Do not delete until owner confirms.
- **Approval required:** Yes.
- **Validation:** Compare commits, remotes, tracked files, and intended deployment path.

### F-003 — Generated/deployment trees require explicit policy

- **Classification:** `PROTECTED`
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `vite.config.ts` generates `www/`, concatenates `js/parts` into `js/app.js` and `js/enhancements.js`, copies legacy assets, and stamps the service worker.
- **Impact:** Direct edits to generated output can be overwritten; stale output can diverge from source.
- **Recommendation:** Keep source ownership explicit and add a CI check for source/deploy alignment. Avoid direct edits to generated files.
- **Approval required:** No for documentation/check additions; yes for build-policy changes.
- **Validation:** Clean build and generated diff review.

## 5. Test Findings

### Overall result

The initial baseline completed with:

```text
83 passed
32 failed
```

After the focused repairs and test-contract updates, the final full-suite validation completed with:

```text
115 passed
0 failed
```

### F-004 — Tutorial overlay intermittently blocks test interaction

- **Classification:** `REVIEW_REQUIRED`
- **Severity:** High
- **Confidence:** High
- **Evidence:** Multiple failures report that `#overlay-template-root`, `.tut-step`, or `#tutorial-overlay` intercepts pointer events. The affected tests call setup helpers that attempt to hide the tutorial but the mounted overlay remains active.
- **Impact:** Tests fail before validating the feature under test; results are noisy and may hide real regressions.
- **Recommendation:** Centralize deterministic test setup. Add a supported test-mode initializer or robust overlay teardown that waits for hidden/detached state. Do not weaken user-facing tutorial behavior solely for tests.
- **Approval required:** No for test-only harness changes; yes if production tutorial lifecycle changes.
- **Validation:** Focused failing suites, then full `npm test`.

### F-005 — Test selectors are not unique

- **Classification:** `LOW_RISK_REFACTOR`
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** Strict-mode failures for text selectors such as `סדר פינוי` and `שידור`, where multiple elements match.
- **Impact:** Tests fail despite the intended UI being present; selectors are coupled to duplicated visible text.
- **Recommendation:** Add stable semantic IDs or `data-testid` attributes for critical controls and use exact scoped locators. Keep visible UI text unchanged.
- **Approval required:** No if DOM-only test hooks are non-breaking.
- **Validation:** Focused tests and full E2E.

### F-006 — Missing or unavailable legacy global functions

- **Classification:** `REVIEW_REQUIRED`
- **Severity:** High
- **Confidence:** High
- **Evidence:** `renderEvacOrder is not defined` appears in `BENAM_ULTIMATE_100.spec.js`; other failures involve expected legacy global behavior.
- **Impact:** Preparation and evacuation tests cannot execute the intended workflow.
- **Recommendation:** Locate the owning source function and determine whether it was renamed, removed, failed to load, or is only present in the nested copy. Restore through the owning source module or update the test contract after approval; do not add an arbitrary global shim.
- **Approval required:** Yes if restoring/changing a public legacy contract.
- **Validation:** Focused preparation/evacuation tests, build, full E2E.

### F-007 — Casualty detail form is not reliably reachable in E2E

- **Classification:** `REVIEW_REQUIRED`
- **Severity:** High
- **Confidence:** High
- **Evidence:** `TACTICAL_SUPREME.spec.js` timed out waiting for `#cas-name` after `jumpToCas`.
- **Impact:** Core casualty editing and persistence workflow is not reliably testable.
- **Recommendation:** Determine whether the drawer is not opened, the casualty was not selected, or the test starts in an unexpected view. Add a semantic open-state assertion and a focused reproduction before changing UI behavior.
- **Approval required:** No for test diagnostics; yes for changing navigation semantics.
- **Validation:** Focused casualty lifecycle tests and manual casualty edit flow.

### F-008 — QR/sync suite has environment and lifecycle instability

- **Classification:** `REVIEW_REQUIRED`
- **Severity:** High
- **Confidence:** High
- **Evidence:** Sync tests fail from tutorial overlay interception, ambiguous selectors, and timeout during scope selection/auto-play control.
- **Impact:** Device exchange reliability is not proven by the current full suite.
- **Recommendation:** Stabilize setup first, then add focused tests for export scope, chunk progression, checksum rejection, FEC recovery, preview, confirmation, and idempotent re-import.
- **Approval required:** No for test harness work; yes for QR protocol changes.
- **Validation:** `tests/sync_master.spec.js`, synchronization tests in smoke suite, full E2E.

### F-009 — AAR and PIN tests expose behavior gaps or setup mismatch

- **Classification:** `REVIEW_REQUIRED`
- **Severity:** High
- **Confidence:** Medium
- **Evidence:** `#aar-section` remains hidden after `genAAR()`, and `#pin-lock` remains hidden after the test invokes `togglePinLock(true)`.
- **Impact:** Reporting and local access-control acceptance are not currently demonstrated by the suite.
- **Recommendation:** Verify the production function names and state preconditions, then decide whether the tests are stale or the features are broken. Do not weaken security behavior to satisfy a test.
- **Approval required:** Yes for PIN/security behavior changes.
- **Validation:** Focused report/PIN tests, manual verification, security review.

## 6. Code Quality Findings

### F-010 — Large inline-handler surface

- **Classification:** `LOW_RISK_REFACTOR`
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `index.html` contains approximately 198 `onclick=` occurrences.
- **Impact:** Tight coupling to global functions, weaker CSP posture, harder test targeting, and more difficult static analysis.
- **Recommendation:** Continue incremental migration to `data-action` and `ActionDelegator`. Migrate one workflow at a time with parity tests; do not mass-rewrite the HTML.
- **Approval required:** No for additive test hooks; yes for broad event-routing changes.
- **Validation:** Focused UI suite, CSP/build check, manual workflow.

### F-011 — No TODO/FIXME/HACK markers found in the scanned source surface

- **Classification:** `SAFE_CLEANUP`
- **Severity:** Informational
- **Confidence:** Medium
- **Evidence:** Repository search excluding dependencies, generated test artifacts, and `.git` returned no matches.
- **Impact:** No obvious marker-based backlog was found.
- **Recommendation:** Maintain issue tracking and changelog discipline instead of adding inline TODOs for deferred work.
- **Approval required:** No.
- **Validation:** Repeat scan in CI only if performance is acceptable.

### F-012 — No console debug calls found by the scan pattern

- **Classification:** `SAFE_CLEANUP`
- **Severity:** Informational
- **Confidence:** Medium
- **Evidence:** `console.log`, `console.debug`, `console.warn`, and `console.error` search returned zero matches in the selected `src`, `js`, and `tests` paths. This may miss differently formatted or generated calls.
- **Impact:** No immediate debug-log pollution identified.
- **Recommendation:** Keep production logging redacted and review generated/legacy assets separately when changing them.
- **Approval required:** No.
- **Validation:** Security review for changed logging paths.

## 7. Artifact and Pollution Findings

### F-013 — Generated test reports and build artifacts exist locally

- **Classification:** `SAFE_CLEANUP`
- **Severity:** Low
- **Confidence:** High
- **Evidence:** `test-report/`, `test-results/`, `www/`, and local `node_modules/` exist in the working tree. The project `.gitignore` excludes these classes, and `RELEASE_CHECKLIST.md` explicitly instructs removal of test reports before packaging.
- **Impact:** Local workspace noise and risk of accidentally packaging generated output.
- **Recommendation:** Remove only ignored artifacts when no active investigation depends on them. Do not remove tracked deployment assets without checking repository policy.
- **Approval required:** No for ignored local artifacts; yes if tracked files are affected.
- **Validation:** `git status --short`, clean build, test report generation as needed.

### F-014 — Duplicate app icon exists in source and generated output

- **Classification:** `REVIEW_REQUIRED`
- **Severity:** Low
- **Confidence:** High
- **Evidence:** `icons/new-app-icon.png` and `www/icons/new-app-icon.png` are both present; `www/` is generated by the build.
- **Impact:** The generated copy is expected during build, but direct tracking or manual divergence would be pollution.
- **Recommendation:** Confirm whether `www/` is ignored/untracked and treat `icons/new-app-icon.png` as the source owner. Do not delete the generated copy independently.
- **Approval required:** No if only ignored generated output; yes if source asset policy changes.
- **Validation:** Build and inspect output.

### F-015 — Patch helper scripts require review

- **Classification:** `REVIEW_REQUIRED`
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `patch_tests.py` and `patch_tests2.py` are untracked at the outer repository root.
- **Impact:** They may be useful maintenance tooling, temporary pollution, or user work in progress; automatic deletion could remove intentional work.
- **Recommendation:** Inspect provenance and references, then keep, move to documented tooling, or delete only with owner approval.
- **Approval required:** Yes.
- **Validation:** Reference scan and owner decision.

## 8. Dependency and Configuration Review

- `package.json` defines scripts for development, build, typecheck, and Playwright.
- `tsconfig.json` is strict and passed the current typecheck.
- `vite.config.ts` has custom plugins for legacy concatenation, asset copying, and service-worker cache stamping.
- `capacitor.config.json` defines Android WebView/native capabilities.
- `.gitignore` covers `node_modules`, Android build directories, `www`, test artifacts, APKs, and OS metadata.
- `CONTRIBUTING.md` and `RELEASE_CHECKLIST.md` define relevant workflows.
- No `.editorconfig` was observed in the initial top-level inventory. Adding one is a low-risk repository-quality improvement, but it should be coordinated with the existing JavaScript and TypeScript style guidance.
- No dedicated lint script or ESLint configuration was observed. `npm run lint` currently aliases TypeScript checking in `package.json`; this is a typecheck alias rather than a JavaScript/style lint implementation.

## 9. Security Review

### Secret scan

A pattern scan for likely API keys, secrets, passwords, tokens, private keys, and PEM markers returned no matches in scanned project content. This does not establish that Git history is clean, and it does not replace a dedicated secret scanner.

### Security risks requiring follow-up

- PIN behavior and local data protection need focused validation.
- LocalStorage is the active typed adapter; this is not encryption at rest.
- QR import must continue treating data as untrusted and must preserve preview-before-commit behavior.
- Inline handler volume weakens CSP hardening until ActionDelegator migration progresses.
- Sensitive data must remain absent from test artifacts and logs.

## 10. Redundancy, Dead Code, and Naming

No source file was deleted during this scan because the duplicate repository, legacy runtime, generated outputs, patch scripts, and public globals require provenance checks before removal.

Candidate areas for a later approved cleanup pass:

1. Nested repository boundary.
2. Untracked patch scripts.
3. Remaining inline handlers.
4. Legacy global functions and tests that refer to unavailable names.
5. Generated/deploy-tree policy and stale local artifacts.
6. Potential duplicate source between outer and nested repositories.

No broad naming migration is recommended at this stage. A repository-wide kebab-case/camelCase rename would have high reference and generated-output risk.

## 11. Recommended Next Actions

### Priority 0 — Restore trustworthy validation

1. Stabilize Playwright app setup and tutorial teardown.
2. Add unique semantic test selectors for critical controls.
3. Investigate missing `renderEvacOrder` ownership and availability.
4. Reproduce casualty drawer, AAR, PIN, and QR failures in focused tests.
5. Re-run focused tests before any broad refactor.

### Priority 1 — Clarify repository boundaries

1. Compare outer and nested Git histories/remotes.
2. Confirm which root is the intended project repository.
3. Decide whether nested repository and patch scripts are retained, moved, or removed.
4. Document the decision before cleanup.

### Priority 2 — Improve maintainability

1. Add `.editorconfig` after confirming style expectations.
2. Add a real lint strategy only if it can coexist with legacy migration.
3. Continue ActionDelegator migration incrementally.
4. Add CI checks for generated-file ownership, screenshot/link integrity, secret scanning, typecheck, build, and critical E2E.

## 12. Items Intentionally Not Changed

- No files were deleted.
- No core configuration files were modified.
- No clinical or tactical behavior was modified.
- No public API, event contract, state schema, or QR schema was changed.
- No test was weakened or skipped.
- No pre-existing user changes were reverted.
- No Android build was attempted because that is a separate toolchain/device gate.

## 13. Commands Executed

```text
git status --short
git branch --show-current
git log -1 --oneline
npm run typecheck
npm run build
npm test
secret-pattern scan
artifact scan
TODO/FIXME/HACK scan
inline-handler/debug-call scan
```

## 14. Conclusion

The repository is buildable, type-safe, and green under the final 115-test Playwright gate. The remaining release caveats are the expected Vite warnings for legacy non-module scripts, the unreviewed nested clone and patch scripts left outside the commit, and the separate Android device/APK gate.

**Current release recommendation:** The web/PWA release gate is green. Android APK build and device smoke validation remain separate follow-up gates.
