# Manual Testing Plan (Phase 1)

Use this checklist to verify the app works end-to-end before release or merge. Run with the dev server and a fresh browser (or clear site data for a clean IndexedDB state).

---

## 1. Start and sign in

- [ ] **Start dev server:** `npm run dev` — app opens at `http://localhost:3000` (or configured port).
- [ ] **Redirect to login:** Not logged in → you are redirected to `/login`.
- [ ] **Local login:** Choose local login, enter **admin** / **ChangeMe**.
- [ ] **First-time password change (if shown):** If the “Change password” modal appears, set a new password and confirm. Modal closes and you land on the dashboard.
- [ ] **Dashboard loads:** You see the main dashboard (welcome, My Games, Storage, etc.).

---

## 2. Dashboard — games and navigation

- [ ] **My Games section:** List shows “No games yet” or your existing games.
- [ ] **Create game:** Click **Create game** → a new game is created, “Game saved.” appears, and the new game is selected (e.g. “My Game 1”).
- [ ] **Select game:** If you have multiple games, click one → it becomes the current game (e.g. highlighted).
- [ ] **Open Level Browser:** Click **Levels** (or “Open Level Browser”) → navigate to `/levels` and see “Levels for game: [current game title]”.

---

## 3. Level Browser — create and open a level

- [ ] **Level list:** “My levels” shows existing levels or is empty.
- [ ] **Create level:** Click **Create level** (or “New level”) → a new level is created and you are taken to the **Level Editor** at `/editor/[levelId]`.
- [ ] **Editor loads:** Level Editor header shows “Level Editor: New Level 1” (or similar), with Save, Back to Dashboard, and the main editor layout (tool palette, canvas, properties).

---

## 4. Level Editor — editing and save

- [ ] **Canvas and tools:** Canvas is visible; tool palette shows Layer (Background / Primary / Foreground), Tools (Select, Platform, Delete, etc.).
- [ ] **Place tiles:** Select **Primary** layer, choose a tile from the tile library (e.g. solid block), click on the canvas to place. Tiles appear on the grid.
- [ ] **Place platform (optional):** Switch to **Platform** tool, drag on the canvas to create a platform. It appears and can be selected.
- [ ] **Manual save:** Click **Save Level** → header shows “Saving…” then “✓ Saved”. No error toast/alert.
- [ ] **Keyboard save:** Press **Ctrl+S** (Windows/Linux) or **Cmd+S** (Mac) → save runs and “✓ Saved” appears.
- [ ] **Auto-save:** Change something (e.g. place or remove a tile), wait a few seconds → “Last saved” time in the header updates (or “✓ Saved” flashes). No “✗ Error”.
- [ ] **Back to Dashboard:** Click **Back to Dashboard** → you return to `/` with the same game selected.

---

## 5. Level Editor — validation and modals (optional)

- [ ] **Level validation:** In Properties Panel → Level Details, if the level has no spawn or no goal, a non-blocking warning appears (e.g. “Missing spawn” / “Missing win”). Save is still allowed.
- [ ] **Delete tile group (multi-tile):** Select multiple connected tiles (e.g. Select tool + drag or shift+click), switch to Delete tool, **Shift+click** on the group → “Delete tile group?” confirmation modal appears. Confirm → tiles removed; Cancel → no change.
- [ ] **Replace existing tiles:** Place a tile on top of existing same-layer tiles → overlapping area highlights; “Replace existing tiles?” modal appears. Confirm → replacement; Cancel → no change.

---

## 6. Dashboard — storage and cleanup

- [ ] **Storage section:** Dashboard shows a **Storage** area with usage (e.g. “X.XX MB / Y.YY MB” and/or percentage).
- [ ] **High usage (if applicable):** If usage is high (e.g. ≥ 80%), a warning or notice is shown.
- [ ] **Clear background images (optional):** If the button is present, click **Clear all background images** → confirm → list/count updates and usage may decrease.
- [ ] **Clear patterns (optional):** Same for **Clear all patterns** if available → confirm → storage breakdown updates.  
  **Note:** “Clear all patterns” removes only *user-created* fill patterns; system-provided patterns are preserved and remain available in the editor.

---

## 7. Return to level and persistence

- [ ] **Reopen level:** From Dashboard, go to **Levels** → click the level you edited. Level Editor opens with the same level and tiles/platforms you saved.
- [ ] **Change game and level list:** Select a different game in My Games → go to Levels → list shows levels for that game (or empty). Switch back to the first game → your level still appears.

---

## 8. Logout and build (optional)

- [ ] **Logout:** Click your username (or profile) → sign out / logout. You are redirected to `/login`. Log in again → dashboard and data (games, levels) still load from IndexedDB.
- [ ] **Production build:** Run `npm run build`. Build completes (after `tsc` and Vite). Console shows build log lines: “Build started” and “Build finished” with `durationMs`.
- [ ] **Preview (optional):** Run `npm run preview` and open the URL → app runs in production mode; sign in and open a level to confirm basic flow.

---

## Quick smoke (minimal path)

If time is short, run this minimal path:

1. `npm run dev` → open app.
2. Log in (admin / your password).
3. Create game → **Levels** → Create level → editor opens.
4. Place one tile → **Save Level** → see “✓ Saved”.
5. **Back to Dashboard** → **Levels** → open same level → tile is still there.

---

**Document version:** 1.1  
**Last updated:** 2026-01-31  
**Phase:** 1 (Core Foundation)
