# Desktop AI Widget Design

## Goal

Add a desktop-only Electron AI chat widget that stays available as a lightweight floating companion window for fast conversation.

The desired behavior is:

- the widget is a real independent desktop window, not just a shortcut into the main app
- the widget can dock to the left or right screen edge and hide partially off-screen
- the widget supports quick chat only: message list, input, send, stop, retry
- the widget reuses the existing AI chat session and assistant-turn pipeline instead of creating a second AI implementation
- the widget remains usable even when the main desktop window is hidden to the tray

This design is for the Windows desktop Electron build, not Android and not the in-app full AI panel.

## Scope

### In scope

- a dedicated Electron `desktop-ai` widget window
- a compact desktop AI chat React view
- edge-docking plus partial-hide behavior
- reuse of the existing AI session persistence and foreground turn flow
- shared conversation state between the main app AI chat and the desktop widget
- a settings entry to enable or disable the desktop AI widget
- unread indication in the hidden handle state

### Out of scope for v1

- full AI chat feature parity with the main modal
- persona switching, session history browsing, Dream, Memory, or diagnostics panels
- week/month review template chat flows in the desktop widget shell
- global system hotkeys to summon the widget
- native Windows widgets-panel integration

## Recommended Approach

Add a new Electron `BrowserWindow` type for `desktop-ai`, then split the current AI chat into:

- a shared chat controller layer
- the existing full-screen modal shell
- a new compact desktop widget shell

Why this approach:

- it fits the current Electron window model already used by the desktop todo, month, quick, timer, and editor widgets
- it reuses the current assistant services, session storage, and message model
- it avoids IPC-forwarding the entire AI workflow through the main window
- it keeps the desktop widget lightweight without forcing the full modal UI into a small window

## Architecture

### Main process

Extend [electron/main.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/electron/main.ts:1) with:

- a new renderer query value such as `desktop-ai`
- a dedicated `aiWidgetWindow`
- a persisted bounds file for the AI widget
- open and close IPC handlers
- edge-hide helpers that can move the window partially off-screen while keeping a visible handle area

Recommended window defaults:

- frameless
- transparent
- hidden from the taskbar
- always on top
- resizable within a bounded compact range
- draggable by a dedicated header region

### Preload

Extend [electron/preload.ts](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/electron/preload.ts:1) with desktop AI widget bridge methods instead of using raw `ipcRenderer` directly in the widget shell.

Recommended preload surface:

- `desktopWidget.openAI()`
- `desktopWidget.closeAI()`
- `desktopWidget.hideAIToEdge()`
- `desktopWidget.restoreAIFromEdge()`
- `desktopWidget.getAIBounds()`
- `desktopWidget.setAIBounds(bounds)`
- `desktopWidget.onAIWindowState(listener)`

The exact API can stay under the existing `desktopWidget` namespace to match the current desktop-window convention.

### Renderer boot

Extend [src/index.tsx](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/src/index.tsx:1) to recognize `desktop-ai` and render a dedicated desktop AI view, similar to the existing desktop widget routing split.

Recommended new view:

- `src/views/desktop/DesktopAIWidgetView.tsx`

## Shared Chat Core

### Reuse target

The existing AI chat in [src/components/AIBackfillChatModal.tsx](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/src/components/AIBackfillChatModal.tsx:1) already owns:

- session persistence
- active session selection
- foreground turn submission
- assistant reply handling
- retry handling
- unread counting
- background reply hydration
- local tool-application result rendering

That logic should not be duplicated in the desktop widget.

### Recommended extraction

Refactor the current modal into:

1. a shared controller or hook for chat state and chat actions
2. the existing full modal shell for the main app
3. a compact desktop shell for quick chat

The shared controller should expose only the minimum needed by both shells:

- resolved active session
- active session messages
- input state
- loading or pending state
- send
- stop
- retry
- mark read
- unread count updates
- default session resolution

### Shared session model

Both the main app modal and the desktop AI widget should read and write the same locally persisted sessions.

Expected result:

- sending from the desktop widget updates the same conversation visible in the full app
- replies generated while the full app is open become visible in the widget
- replies generated while only the widget is open still persist and later appear in the full app

## Desktop Widget UI

### Supported capability set

The desktop AI widget should intentionally stay narrow in scope.

Supported in v1:

- show the current conversation
- send a text message
- receive AI replies
- stop a running foreground response
- retry a failed assistant turn
- show simple applied-action cards when the assistant changes local data
- close the widget
- dock and hide to the screen edge

Not supported in v1:

- browsing session history
- switching persona
- opening AI settings overlays
- Memory or Dream editing
- diagnostics viewers
- multi-step template workflows

### Layout

Recommended structure:

1. compact draggable top bar
2. scrollable message list
3. fixed bottom input area

Top bar should contain only:

- widget title
- unread or sync hint when useful
- dock or hide action
- close action

The message list can reuse the conversation rendering direction from [src/components/ai-chat/AIBackfillChatConversationPane.tsx](/c:/Users/xiangpu/OneDrive%20-%20St%20Paulinus%20Catholic%20Primary%20School/26ai_project/lumostime/src/components/ai-chat/AIBackfillChatConversationPane.tsx:1), but the surrounding shell should be simpler and denser.

### Visual direction

The widget should feel like an editorial tool strip rather than a mini full app:

- narrow
- calm
- high-density
- minimal chrome
- few controls
- fast to reopen from the edge

## Interaction Design

### Window states

The desktop AI widget should support two main states:

- expanded
- edge-hidden

Expanded state:

- compact chat window
- roughly `360-420px` wide and `520-640px` high by default
- remembers last expanded bounds

Edge-hidden state:

- the window moves partially off-screen to the left or right edge
- a `16-24px` visible handle remains on-screen
- the handle can show a subtle unread indicator if new assistant messages arrive while hidden

### Docking behavior

Recommended rule:

- when the user drags the widget within a threshold from the left or right work-area edge, mark it as docked
- on explicit hide, shift the window mostly off-screen while keeping the visible handle
- on hover or click of the handle, restore the full window to its previous expanded x-position on that edge

This edge behavior should be implemented in Electron window positioning, not only with CSS transforms, so hit-testing and persistence remain reliable.

### Focus behavior

- the widget should stay `alwaysOnTop`
- it should not steal focus when merely updating messages in the background
- it should focus the input only when the user explicitly opens or restores it
- when hidden, new replies should not force the widget to expand automatically

## Data Flow

### Source of truth

The source of truth remains the existing AI chat persistence layer, not the Electron main process and not a separate widget cache format.

The desktop widget should read the shared sessions directly through the current service layer and trigger the same foreground assistant flow already used by the main app.

### Default session selection

Recommended default:

- resolve the most recently active ordinary conversation session
- if none exists, create one default quick-chat session

The desktop widget should stay attached to that resolved ordinary session for v1 rather than exposing a session switcher.

### Cross-window refresh

When either shell changes sessions or messages:

1. persist the updated AI chat state
2. notify sibling renderers through the same lightweight cross-window sync strategy already used for desktop widget or repository refresh patterns
3. rehydrate the active session in the other window without rebuilding the whole app shell

The exact transport can be `BroadcastChannel`, storage events, or the same repository refresh event style already used elsewhere, but it should stay lightweight and renderer-local.

## Failure Handling

### Main window absent

The desktop AI widget must continue to work when the main app window is hidden to the tray.

This is a core reason to reuse the shared local assistant services directly in the widget renderer instead of forwarding every message through the main app renderer.

### Failed assistant turn

If sending fails:

- keep the failed assistant message bubble
- surface the error text
- allow retry from the widget
- do not collapse or clear the input unexpectedly

### Missing or invalid session

If the stored active session is missing or corrupt:

- fall back to the latest ordinary session
- if none exists, create a fresh default session

### Off-screen bounds

If the saved bounds or hidden position no longer fit the current display arrangement, clamp the expanded window back into a visible work area and recompute the hidden edge position from that safe state.

## Testing Strategy

### Automated

Add focused tests around the extracted shared AI chat controller, especially:

- default ordinary-session resolution
- desktop quick-chat input hydration
- unread counting when hidden or not focused
- retry and stop behavior
- cross-window session update propagation

### Manual smoke tests

Desktop verification should cover:

1. enable the desktop AI widget from settings
2. open the widget and send one message
3. receive an AI reply in the widget
4. hide the main app to the tray and continue chatting from the widget
5. drag the widget to the left edge, hide it, and restore it
6. repeat on the right edge
7. confirm new replies while hidden do not force expansion
8. open the full AI modal and confirm the same conversation is visible there
9. close and reopen the desktop AI widget and confirm bounds persistence

### Build verification

- run `npm run build`

## Risks

- the current `AIBackfillChatModal` is large, so extracting a shared controller cleanly will be the main refactor risk
- if the shared controller boundary is too narrow, the desktop shell may accidentally reintroduce duplicated orchestration logic
- if the desktop widget shell reuses too much modal UI directly, the compact experience may become cramped and unstable
- edge-hide behavior can feel fragile on multi-monitor setups if bounds persistence is not clamped carefully

## Implementation Notes

Recommended decomposition:

1. add Electron `desktop-ai` window lifecycle, persisted bounds, and IPC
2. add `desktop-ai` route boot handling in `src/index.tsx`
3. extract a shared AI chat controller from `AIBackfillChatModal`
4. build `DesktopAIWidgetView` with compact conversation and composer UI
5. add settings toggle and startup restore support for the desktop AI widget
6. add edge-hide persistence and unread-handle behavior
7. verify main-window-hidden usage plus multi-monitor recovery

## Recommendation Summary

Ship v1 as a dedicated Electron desktop AI widget window with a compact quick-chat shell backed by the existing shared AI chat engine.

This gives the best balance of:

- architectural fit
- reuse of proven AI chat logic
- true desktop availability
- low product-surface bloat

while keeping the full AI modal and the desktop quick-chat widget clearly separated by purpose.
