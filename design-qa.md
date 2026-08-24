# Design QA — ZenVis Calm Operations

- source visual truth path: `/home/lubinsun/.codex/generated_images/01a00e3b-65d2-7781-90b8-255a4cb4491b/exec-2b0b89ec-50cf-4669-9c3a-29b8c5b8b657.png`
- implementation URL: `http://127.0.0.1:11000/`
- implementation screenshot path: pending browser permission
- target viewport: 1600 × 900 CSS px
- source pixels: 1600 × 900
- implementation pixels: pending browser capture
- device scale factor: 1
- density normalization: source and implementation will be compared at 1:1 CSS pixels
- state: authenticated, Calm Operations active, OneSOC overview and Lubinsun task center

**Findings**

- [P0] Browser-rendered implementation evidence is pending.
  Location: OneSOC overview and Lubinsun task center.
  Evidence: source target is available and the deployed implementation returns HTTP 200, but Product Design policy requires explicit permission before using Playwright CLI for capture.
  Impact: typography, component spacing, responsive layout, console errors and visible interactions cannot yet be signed off.
  Fix: after permission, capture both routes at 1600 × 900, compose each capture with the source target, fix all P0/P1/P2 differences, and repeat.

**Required fidelity surfaces**

- Fonts and typography: pending browser comparison.
- Spacing and layout rhythm: pending browser comparison.
- Colors and visual tokens: code and runtime active API verified; visible comparison pending.
- Image quality and asset fidelity: the selected design has no new raster content to reproduce; existing ZenVis logo and icon library are retained. Browser sharpness check pending.
- Copy and content: real OneSOC/Lubinsun data and existing business copy are retained; visible truncation/wrapping check pending.

**Full-view comparison evidence**

- Source opened during ideation and selected by the user as option 3.
- Implementation capture pending Playwright permission.

**Focused region comparison evidence**

- Pending KPI, filter/table, navigation and chart-region captures.

**Comparison history**

- Iteration 0: implementation deployed; browser comparison blocked pending explicit Playwright CLI permission.

**Implementation checklist**

- Capture OneSOC overview and Lubinsun task center at 1600 × 900.
- Test main navigation, metric links, filter, refresh and primary create action.
- Check browser console errors.
- Compare source and implementation together, then fix all P0/P1/P2 issues.

final result: blocked
