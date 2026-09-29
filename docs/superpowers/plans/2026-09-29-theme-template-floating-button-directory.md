# Theme Template Floating Button Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the theme-package template contain the documented folder for floating-button background assets.

**Architecture:** A tracked `.gitkeep` materializes the otherwise empty `assets/floating-button-backgrounds/` directory. The existing README remains the source of configuration instructions.

**Tech Stack:** Git, Markdown theme-package template
**Spec:** `docs/plans/2026-09-29-theme-template-floating-button-directory-design.md`

## Global Constraints

- Keep files UTF-8 encoded.
- Do not include a sample image in the template.

## Review Focus

- A clean template checkout must retain `assets/floating-button-backgrounds/`.
- The placeholder must not be interpreted as an image resource by the package importer.

---

### Task 1: Materialize the asset directory

**Files:**
- Create: `docs/plans/theme-package-template/assets/floating-button-backgrounds/.gitkeep`

**Interfaces:**
- Consumes: The resource path documented in the theme-package template README.
- Produces: A version-controlled empty folder for user-provided button background files.

- [ ] **Step 1: Create the placeholder file**

Add an empty `.gitkeep` at the documented asset path.

- [ ] **Step 2: Verify template structure**

Run: `Get-Item docs/plans/theme-package-template/assets/floating-button-backgrounds/.gitkeep`
Expected: the placeholder file exists.

- [ ] **Step 3: Commit**

```bash
git add docs/plans/theme-package-template/assets/floating-button-backgrounds/.gitkeep
git commit -m "补齐主题包悬浮按钮资源目录"
```
