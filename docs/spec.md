# Distance Board v1: Implementation Spec

**Status:** ready-for-agent. This label is recorded here because the repo has no issue tracker yet.

**Source:** `docs/requirements.md`. IDs such as INV-3 refer to that document, which still governs anything not covered here. Its cost limits (section 2), setup gate (section 8), exclusions (section 9) and task order (section 10) all still apply.

## Problem Statement

Two people who live apart want a simple, shared place for the things they'd like to do together. Chat threads bury these ideas, and general-purpose to-do apps feel impersonal and have more features than the couple needs. They want a small, warm list that both can change from their phones, where each sees the other's changes as they happen.

The app must also cost nothing to run. No server of ours sits between the client and the database, so anyone holding the app's public config can call Firestore directly. The security rules therefore have to enforce everything that matters.

## Solution

Distance Board is a mobile-first web app. A person signs in with Google, creates a named board, and sends the one other person a single-use invite link. Together they keep a list of ideas. Either can add, edit, reorder, complete, restore and delete items, and leave short notes on them. Changes appear live on the other person's open screen.

Next.js is a thin shell. All data and auth run in the browser against Firebase's free Spark plan, and Firestore security rules are the only security layer.

## User Stories

### Signing in

1. As a new visitor, I want a small landing page that explains the app, so that I know what I'm signing up for.
2. As a new visitor, I want a single "Continue with Google" button, so that I don't have to create a password or choose between methods.
3. As a user whose browser blocks the sign-in popup, I want a friendly explanation and a way to retry, so that I'm not stuck.
4. As a user who closes the popup by accident, I want to be able to try again without any alarming error, so that the mistake costs me nothing.
5. As a returning user, I want to stay signed in between visits, so that I can open my board straight away.
6. As a signed-in user, I want to be able to sign out, so that I can use a shared device safely.
7. As the project owner, I want accounts created outside Google to be rejected by the rules, so that strangers can't use up the shared free quota.

### Navigating

8. As a signed-in user with no boards, I want a warm empty state that offers to create one, so that I know what to do first.
9. As a user with one board, I want to go straight to it, so that I skip an unnecessary screen.
10. As a user with several boards, I want to see a list of them, so that I can choose one.
11. As a user with one board, I want a way to reach the board list from that board, so that I can still create another board.
12. As a person opening an invite link while signed out, I want to return to that invite after signing in, so that I don't lose it.
13. As a user opening a board I don't belong to, or one that no longer exists, I want a friendly page with a way home, so that I never see a raw error.

### Boards

14. As a signed-in user, I want to create a named board and start as its only member, so that I can begin before my partner joins.
15. As a user, I want to belong to several boards, so that I can keep separate lists.
16. As a member, I want to leave a board, so that I can stop participating.
17. As the remaining member, I want to keep the board and its items after the other person leaves, so that our list isn't lost.
18. As the remaining member, I want to be able to invite someone new, so that the board can have a second member again.
19. As the last member, I want leaving to delete the board, its items and its invite, so that no orphaned data is left behind.
20. As the last member, I want to be warned before leaving deletes everything, so that I don't destroy the board by accident.
21. As a member, I want to see a new member appear without reloading, so that I know my invite worked.

### Invites

22. As a member of a one-person board, I want to generate an invite link, so that I can bring in my partner.
23. As an inviter, I want to copy or share the link easily, so that I can send it through any chat app.
24. As an inviter, I want links to be single-use and to expire after 7 days, so that an old or forwarded link can't be used to join later.
25. As an inviter, I want regenerating a link to kill the previous one immediately, so that I can recover from sending it to the wrong person.
26. As an invitee, I want to see the board name and inviter's name before I join, so that I know what I'm accepting.
27. As an invitee with a used link or a full board, I want a friendly "this board is full" page, so that I understand why I can't join.
28. As an invitee with an expired link, I want a page that says so, so that I know to ask for a new one.
29. As an invitee with a replaced link, or a link to a deleted board, I want a friendly page that says the invite no longer exists, so that I'm not shown an error.
30. As a current member opening my own board's link, I want to go to the board, so that an old link in chat still takes me somewhere useful.
31. As someone who has left a board, I want my old link to stop working, so that the remaining member controls who comes back.

### Items

32. As a member, I want to add an item with a title, so that we can capture an idea quickly.
33. As a member, I want new items to appear at the top, so that the latest idea is easy to see.
34. As a member, I want to see the avatar of whoever added an item, so that I know whose idea it was.
35. As a member, I want an item to keep showing its creator after they leave, so that history still reads correctly.
36. As a member, I want to edit the title of any item, so that we can fix or refine each other's wording.
37. As a member, I want to delete any item after confirming, so that we can remove things without accidents.
38. As a touch user, I want to drag items by a comfortable handle, so that reordering doesn't conflict with scrolling.
39. As a mouse user, I want to drag items, so that reordering works on a laptop.
40. As a keyboard user, I want to reorder items with the keyboard, so that I can use the app without a pointer.
41. As a person reordering, I want the move to show immediately, so that the app feels responsive.
42. As one of two people reordering at once, I want both screens to end up matching, so that we never see different lists.
43. As a viewer, I want items with identical order keys to appear in the same order on both screens, so that the list is consistent.

### Done

44. As a member, I want to complete an item with a satisfying animation and a small celebration, so that finishing something feels good.
45. As a member, I want completed items moved to a collapsible "Done" section, so that the active list stays focused.
46. As a member, I want to see who completed an item and when, so that we can look back on what we did.
47. As a member, I want Done items sorted newest first, so that recent memories are easy to find.
48. As a member, I want to restore a Done item to the top of the active list, so that a mistake or a repeat idea is easy to handle.

### Notes

49. As a member, I want to tap an item to expand it in place, so that I can see its notes without leaving the list.
50. As a member, I want to add a short one-line note, so that I can say "I like it" without starting a conversation.
51. As a member, I want a note to be limited to 140 characters, so that notes stay short.
52. As a member, I want each note to show its author's avatar and a timestamp, so that I know who said what and when.
53. As a member, I want collapsed items to show a small note count, so that I can tell which ones have remarks.
54. As an author, I want to delete my own notes, so that I can take back a remark.
55. As an author, I want my notes protected from being changed or deleted by the other person, so that my words stay mine.

### Realtime

56. As a member with the board open, I want items and notes to change without a reload, so that it feels like we're doing this together.
57. As a member adding a note at the same moment as my partner, I want both notes to survive, so that neither is lost.

### Look and feel

58. As a user, I want a warm cream, softly rounded design with pastel accents, so that the app feels personal and not like default shadcn.
59. As a user, I want warm copy and hand-drawn-style illustrations on empty states, so that empty screens feel inviting.
60. As a phone user, I want touch-friendly tap targets and a responsive layout, so that the app is comfortable with one hand.
61. As a person who prefers reduced motion, I want animation to respect that setting, so that the app doesn't cause discomfort.

### Operating the project

62. As the project owner, I want the app to stay on free plans, so that it never costs money.
63. As the project owner, I want only the board on screen to hold a live listener, so that I stay within the daily read quota.
64. As a developer, I want the rule tests to run the app's real writes against the deployed rules, so that the client and rules can't drift apart unnoticed.
65. As a developer, I want the test-only sign-in proven absent from production builds, so that it can't become a way in.
66. As a real user, I never want to see test data, so that automated runs don't affect my boards.

## Implementation Decisions

### Modules

The data model is the one in requirements section 6. No schema changes are made.

- **Auth module:** owns lazy Firebase initialisation, auth state, Google sign-in and sign-out, and mapping popup errors to friendly messages. It also holds the test-only email path, behind a guard.
- **Board data module:** the only module that talks to Firestore. Every operation takes the Firestore instance and the acting user as inputs, so the UI and the rule tests can call the same code. Its interface covers:
  - Boards: `createBoard`, `listMyBoards`, `subscribeToBoard`, `leaveBoard`
  - Invites: `generateInvite` (also handles regeneration), `resolveInvite`, `joinBoard`
  - Items: `subscribeToItems`, `addItem`, `editItemTitle`, `moveItem`, `completeItem`, `restoreItem`, `deleteItem`
  - Notes: `addNote`, `deleteNote`
- **Ordering module:** pure functions with no Firestore or React dependency. Its interface covers:
  - `sortActive`, which orders by `order` and then document ID
  - `sortDone`, which orders newest-completed first and then by document ID
  - `keyForTop`, given the active items
  - `planMove`, given the active items and a source and destination, which returns the list of `{id, order}` writes needed
- **Security rules:** the rule set for section 6, with a deploy script.
- **UI:** a route shell, theme tokens over restyled shadcn components, an item list with `dnd-kit`, and presentational components with no direct Firestore access.

### Routes and navigation

- The routes are:
  - `/`: resolves a signed-in user's destination, following NAV-1 and NAV-2
  - `/boards`: always lists the user's boards and offers creation
  - `/boards/[boardId]`: a single board
  - `/invite/[inviteId]`: an invite
- `/boards` isn't named in the requirements. Without it, a one-board user could never reach board creation, which BOARD-2 needs.
- `signInWithPopup` never navigates away, so the sign-in gate renders in place on whichever route was opened. NAV-4 follows from this without any stored return URL.
- A signed-out visitor to an invite link sees a generic "You've been invited" sign-in page. They can't see the board or inviter name until signed in, because DATA-1 applies to every rule. INV-4 is met once they have signed in.

### Next.js constraints

These come from the Next.js 16.4.4 docs bundled in the repo. `cacheComponents` and `partialPrefetching` are already on in the Next.js config and stay on.

- Client pages that read dynamic params need a Suspense boundary or a loading file. Without one, `next build` fails.
- Firebase initialises only in the browser, so prerendering and `pnpm build` succeed with no Firebase config present.
- Routes are hidden with React's `<Activity>` on navigation instead of being unmounted, and their effects are cleaned up while hidden.
  - All `onSnapshot` subscriptions live in effects inside the board route, never in a provider above it. This is how COST-6 is met.
  - Delete confirmations and similar transient state must reset when a route is hidden, or they reappear when the user navigates back.
  - The invite page re-resolves its state whenever it becomes visible again.
- No cross-origin isolation headers are added, because `Cross-Origin-Opener-Policy: same-origin` would break the sign-in popup.
- Starter content is removed, including `next/image` usage, Geist fonts, dark-mode classes and default metadata.

### Auth errors

- `auth/popup-blocked` explains the block and offers a retry.
- `auth/popup-closed-by-user` and `auth/cancelled-popup-request` return quietly to the button.
- `auth/unauthorized-domain` explains that sign-in isn't available on this address, which is expected on Vercel previews.
- Anything else gets a generic retry message.

### Data access

- **Board list (COST-6):** the board list uses a one-shot query, not a listener, and it runs again when the route becomes visible.
- **Board screen:** holds one listener on the board document and one on the whole items subcollection.
- **Sorting:** all sorting happens on the client, so no composite index is needed. The subcollection listener is what provides the active list, the Done list and note counts together.
- **Permission denied:** the board listener treats permission-denied as "no access or no longer exists" and shows the friendly page. The items listener starts only after the board has loaded.
- **Optimistic updates (ITEM-5):** Firestore's latency compensation is the only optimistic layer, so there is no parallel local copy of the list. Failed writes roll back through the SDK and show a gentle message.
- **Timestamps:** pending server timestamps are read using the `estimate` option, so new items and completions sort correctly before the server acknowledges them.
- **During a drag:** the rendered order is frozen, and incoming snapshots apply on drop so the list doesn't jump under the user's finger.
- **Display names and avatars:**
  - Avatars use a plain `<img>` with `referrerPolicy="no-referrer"`, because Google avatar URLs can fail when a referrer is sent.
  - Avatars fall back to an initial, because test accounts have no photo.
  - Missing display names fall back to "Someone".

### Ordering

- `generateKeyBetween` throws when its two bounds are equal, and ITEM-6 accepts that equal keys can occur, for example when both people add to the top at once. `planMove` must not throw in this case.
- A normal move returns one write. When the destination's neighbours share a key, `planMove` also re-keys the tied run and returns several writes, committed in one batch. Each is an ordinary `order`-only write, so it passes the reorder rule. Batches hold at most 10 writes, for the same document-access limit described under "Leaving and deleting". Tied runs are normally about two items, so a longer run spilling into a second batch should be rare.
- "Top of the active list" considers active items only, so a Done item's retained key never affects `keyForTop`. This also applies to restores (DONE-3).

### Security rules

Where the two differ, this section makes requirements section 6 stricter and never looser.

**Common**
- Every rule starts with the DATA-1 check.
- Writes that create a document use an exact field allowlist. Every `createdAt`, `completedAt` and note `createdAt` must equal `request.time`.
- The client limits and the rules agree on these lengths. The requirements leave the first two open, so these are defaults:
  - Board name: 1 to 60 characters
  - Item title: 1 to 200 characters
  - Order key: 1 to 256 characters
  - Note: 1 to 140 characters

**Boards**
- `create`: `members` is exactly the caller, `createdBy` is the caller, and `currentInviteId` is null.
- `list`: permits exactly the `array-contains` query on the caller's uid.
- Self-removal requires the board to have exactly two members before the write and one after. A sole member must take the deletion path, so a board can never be left with no members.

**Joining (DATA-3 plus one fix)**
- The join branch finds the invite through the existing `currentInviteId`, which doesn't change during a join.
- It checks the invite's state before the batch (`usedBy` is null) as well as after it (`usedBy` is the caller).
- **Why the extra check is needed:** with only the after-state check in DATA-3, someone who joined and then left could rejoin alone, even after expiry. The invite would still show their uid and still be current until the remaining member regenerated it, which breaks INV-2. TEST-1 has a case for this.
- The invite update rule also uses `getAfter()` to require that the caller is on the board's `members` after the batch. Otherwise, anyone holding a link could use it up without joining.

**Invites**
- The `get` rule never references `resource.data`, so a missing invite returns "not found" and not permission-denied. INV-5 depends on that.
- `create` checks that:
  - the caller is a member of a one-member board named by `boardId`
  - `createdBy` is the caller, and `usedBy` is null
  - `boardName` matches the board's name
  - after the batch, the board's `currentInviteId` is this invite (`getAfter()`), so creation can't happen outside its batch
- `expiresAt` has an upper limit only: no later than 7 days from `request.time`, plus 5 minutes to allow for clock differences. There is deliberately no lower limit. An already-expired invite harms nobody, and TEST-1 has no other way to create one without the Admin SDK.
- `delete` checks membership of the board, not `createdBy`. A remaining member must be able to replace an invite created by someone who has since left.
- A member may change `currentInviteId` alone only on a one-member board, and only to an invite that exists after the batch.

**Items (DATA-5)**
- Each row of the DATA-5 table is its own branch, limited with `diff().affectedKeys().hasOnly(...)`.
- Completing requires the item to be active. Restoring requires it to be completed and clears both completion fields.
- Reordering is rejected on completed items (DONE-2, ITEM-4).
- Titles of Done items can be edited and notes can be added to them, because ITEM-2 says "any item" and notes aren't restricted by state.

**Notes**
- A `rules.Set` has no way to retrieve an element, so `affectedKeys()` can't produce the note's key. The rule uses list operations, which the Firebase rules reference confirms exist:
  - Adding: `request.resource.data.notes.keys().removeAll(resource.data.notes.keys())`, requiring size 1, then read that entry with `[0]`.
  - Deleting: the same expression with the two sides swapped.
- Both branches also require `notes.diff(resource.data.notes).affectedKeys().size() == 1`. The `removeAll` lookup alone isn't enough: a single write could add a note of mine and remove my partner's, and the add branch would see only the one new key. Requiring one affected key also means no existing note can change.
- Notes are added by a field-path set on `notes.{id}` and removed with `deleteField()`, using a client-generated ID.

### Invite resolution

`resolveInvite` returns one of the states below. The page renders from this result and treats permission-denied as an ordinary outcome, never as an error.

| Check, in order | Result |
| --- | --- |
| Invite document is missing | `gone`: replaced, or board deleted |
| Caller can read the board and is a member | `member`: redirect to the board |
| `usedBy` is set | `full` |
| `expiresAt` has passed | `expired` |
| Otherwise | `joinable`, with board and inviter names |

- A non-member's board read fails with permission-denied, which simply means "not a member" here.
- If `joinBoard` is denied, for example because someone else joined first, the page re-resolves and shows the resulting state.
- A member opening their own board's *replaced* link gets `gone`, because the deleted invite no longer records which board it belonged to.
- After a member leaves, the other member's current invite may already be used. The invite panel treats a used invite as absent and offers to generate a new one.

### Leaving and deleting

- `leaveBoard` chooses the path from the current member count. Two members means a self-removal update. One member means the deletion sequence.
- The deletion sequence (DATA-6):
  1. Read the items once.
  2. Delete them in batches of at most 10.
  3. Delete the current invite.
  4. Delete the board document last.
- Batches stay small because each write's rule does a `get()` on the board. Firestore allows 20 document-access calls per batch, and it says only that some calls "may be cached".
- If the sequence is interrupted, the board still exists and the user can leave again to finish.
- Leaving asks for confirmation, and the wording warns the last member that everything will be deleted. BOARD-4 is irreversible, so this is treated as part of that requirement and not as a new feature.

### Test sign-in (TEST-4)

- The email path sits behind a static reference to `process.env.NEXT_PUBLIC_TEST_SIGN_IN`, because dynamic lookups aren't inlined and wouldn't be removed from the build. The path is loaded through a dynamic import inside the guard, and it contains a unique marker string.
- `next dev` doesn't load `.env.test.local`. The Playwright config loads that file itself and passes the flag to its web server's environment.

### Additions to the stack

All of these are free dev tooling, consistent with section 2.

- **Vitest:** the runner for TEST-1 and TEST-2. The requirements name no unit runner.
- **`firebase-tools`, plus Firebase project config:** for deploying rules. No hosting or Functions are configured.

## Testing Decisions

A good test exercises external behaviour through a public seam and would still pass after an internal refactor. Tests don't mock Firestore, because the real rules are the thing under test. There is no existing test code in the repo, so these tests set the pattern.

The agreed seams are:

**1. Board data module, against the deployed rules (TEST-1)**
- Allowed actions call the real module functions, so the batches the app actually sends are the ones proven to pass. Forbidden actions use raw client-SDK calls, so that a test can attempt writes the app would never build.
- Three named Firebase app instances run in Node, one per test account.
- The script deploys rules before each run. Rule releases take "several minutes" to propagate, so it waits a settling period when the rules changed since the last deploy, and skips the wait when they didn't.
- Cases include everything listed under TEST-1 and each DATA-5 row, plus:
  - Someone who joined and left can't rejoin alone through the old link.
  - An invite can't be marked used without joining, or created outside its batch.
  - An invite expiring more than 7 days out is rejected.
  - A sole member can't remove themselves without deleting the board.
  - A completed item can't be reordered.
  - A single write that adds my note and removes my partner's is rejected.
  - `resolveInvite` returns each state, including `gone` for a missing invite.
  - Deleting a board with several items works, using enough items to span more than one batch.
  - A remaining member can replace an invite created by a member who has left.
- The rule expressions in this spec come from the documentation and haven't been run yet. These tests are the first real proof, especially for `get()` showing the state before a batch and for `keys().removeAll()`.

**2. Ordering module (TEST-2)**
- Pure unit tests, with no Firebase involved.
- Cases: insert at top, insert into an empty list, moves between neighbours and to both ends, and the ITEM-6 tie-break.
- Also: `planMove` between tied keys doesn't throw and produces the requested order, and `keyForTop` ignores Done items.

**3. The whole app through Playwright (TEST-3, TEST-4)**
- Two browser contexts, signed in as two test accounts. An item and a note added in one appear live in the other.
- Locators must match visible elements only, because hidden `<Activity>` routes stay in the DOM.
- The TEST-4 check builds without the flag, then searches `.next/static` for the marker string, and fails if it's found. It also builds once *with* the flag and requires the marker to be present, so the check can't pass just because the marker is wrong.

**Test data (TEST-5)**
- Each run creates its own boards and deletes them through the normal `leaveBoard` path.
- Each run starts with a sweep that removes any boards left behind by a crashed run, using each test account's own board list query.
- Test credentials are read only from `.env.test.local`.

**Manual checks (not automated)**
- Google sign-in on the deployed site.
- Reordering on a real touch device (ITEM-4).

**Build (TEST-6):** `pnpm lint` and `pnpm build` pass, with no Firebase config in the environment for the build.

## Out of Scope

Everything in requirements section 9:

- Due dates, reminders and notifications
- Unread badges and online status
- Boards with more than two members, and owner or admin roles
- Item descriptions, links, categories or emoji fields
- Note editing, replies and reactions
- PWA install and offline-first work beyond Firestore's defaults
- Dark mode
- Translations
- CI
- A separate production database or the Firebase emulator

Also not included:

- Renaming a board, which the requirements don't list. `boardName` on an invite therefore can't go stale.
- Checking that the name and photo on a note or item match the caller's token. DATA-5 checks only the uid, so the other member could write a false display name. The only person who could do that is someone already on the two-person board.
- Google sign-in on Vercel preview URLs, a known limitation from section 8.

## Further Notes

**Order and gating:** build in the task order from requirements section 10. Tasks marked **Needs setup** wait until the user confirms the section 8 checklist.

**Decisions to review.** These go beyond, or fill gaps in, the requirements, and all are easy to change:

| Decision | Reason |
| --- | --- |
| Join and invite-update rules are stricter than DATA-3 | Closes the rejoin hole and stops invites being used up without joining |
| Invite expiry has no lower limit | The expired-invite test needs it, since there's no Admin SDK |
| Self-removal is denied for a sole member | Prevents boards with no members |
| A `/boards` route is added | One-board users could otherwise never create a second board |
| Signed-out invite page is generic | DATA-1 blocks reading the invite before sign-in |
| Leaving asks for confirmation | Deleting a board can't be undone |
| A sign-out control is added | The requirements don't list one, but without it a shared device stays signed in |
| Board name limit of 60 and title limit of 200 | The requirements leave these open |
| Vitest and `firebase-tools` added | TEST-1, TEST-2 and rule deploys need them |

**Quota:** every `get()` inside a rule counts as a billed read. At this scale that's well inside the free 50K reads per day, but rule test runs against the real project draw on the same daily quota as real users.
