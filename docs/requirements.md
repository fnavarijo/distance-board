# Distance Board: Requirements

This is the brief for the orchestrator agent building v1. It is a prototype: a mobile-first web app where two people keep a shared list of things they want to do together.

Rules for the orchestrator:

- Build only what is listed here. Section 9 lists what is out of scope. Don't add those features, even if they seem small.
- Section 2 (cost limits) is binding. If a task can't be done within it, stop and ask the user.
- Don't start a task marked **Needs setup** until the user confirms the checklist in section 8 is complete.
- Before writing code, read the relevant guides in `node_modules/next/dist/docs/`. This Next.js version differs from older ones (see `AGENTS.md`).

## 1. Stack

Already in the repo: Next.js 16, React 19, Tailwind 4, TypeScript, pnpm.

To add:

| Need | Choice |
| --- | --- |
| Components | shadcn, restyled through theme tokens |
| Data and realtime | Firestore with `onSnapshot` |
| Auth | Firebase Authentication, Google provider, `signInWithPopup` |
| Drag and drop | `dnd-kit` |
| Ordering keys | `fractional-indexing` |
| End-to-end tests | Playwright |
| Hosting | Vercel, deploying from `main` |

## 2. Cost limits (binding)

The app must stay free.

- **COST-1:** Firebase stays on the Spark plan, with no billing account attached.
- **COST-2:** Nothing may require the Blaze plan, including Cloud Functions and Firebase Storage.
- **COST-3:** Vercel stays on the Hobby plan.
- **COST-4:** Google avatars use a plain `<img>`, not `next/image`, so they don't use Vercel's image transformation quota.
- **COST-5:** Before adding any paid or usage-billed service, or anything that asks for a credit card, stop and ask the user.
- **COST-6:** Listen only to the board currently on screen, and detach listeners when leaving it. Don't poll.

Spark limits for reference: 1 GiB stored, 50K reads, 20K writes and 20K deletes per day.

## 3. Functional requirements

### Auth

- **AUTH-1:** Google is the only sign-in method offered in the UI.
- **AUTH-2:** Signed-out users see a small landing page with a "Continue with Google" button.
- **AUTH-3:** Use `signInWithPopup`. Firebase's redirect flow is unreliable for apps hosted outside Firebase Hosting on browsers that block third-party storage. `authDomain` stays at its default. If the popup is blocked or closed, show a friendly message and let the user retry.

### Navigation

- **NAV-1:** A signed-in user with no boards sees an empty state offering to create one.
- **NAV-2:** A user with one board goes straight to it.
- **NAV-3:** A user with several boards sees a list of them.
- **NAV-4:** An invite link survives sign-in: the user returns to the invite afterwards.
- **NAV-5:** Each row on the board list shows who the board is shared with: the other member's avatar and name, "Waiting for someone to join", or "Shared with someone" on an older board whose other member's details aren't known yet. See `docs/spec-board-list-labels.md`.
- **NAV-6:** The board screen has an "All boards" link above the board name, which always goes to the board list.

### Boards

- **BOARD-1:** Any signed-in user can create a named board, starting as its only member.
- **BOARD-2:** A user can belong to several boards. Each board has at most two members.
- **BOARD-3:** Either member can leave. The remaining member keeps the board and can invite someone new.
- **BOARD-4:** When the last member leaves, the board, its items and its current invite are deleted (see DATA-6).

### Invites

- **INV-1:** A member of a board with one member can generate an invite link.
- **INV-2:** Links are single-use and expire after 7 days.
- **INV-3:** Regenerating a link immediately invalidates the previous one.
- **INV-4:** The invite page shows the board name and inviter name before the user joins.
- **INV-5:** Each of these gets a friendly page and never a crash or a raw permission error:
  - Used link, or board already full: "this board is full"
  - Expired link
  - Replaced link, or the board or invite no longer exists
- **INV-6:** A current member opening their own board's link goes to the board.

### Items

- **ITEM-1:** An item has a title, plus who added it and when. The creator's avatar is shown on the item.
- **ITEM-2:** Both members can add, edit the title of, complete, restore, reorder and delete any item. Deleting asks for confirmation.
- **ITEM-3:** New items go to the top of the active list.
- **ITEM-4:** Reordering works by touch, by mouse and by keyboard, and moves only the active list.
- **ITEM-5:** A reorder shows immediately on the device that made it. If both people reorder at once, the last write wins and both screens end up matching.
- **ITEM-6:** Sort active items by `order`, breaking ties by document ID, so both screens show the same order even if two items get the same key.

### Done

- **DONE-1:** Completing an item moves it to a collapsible "Done" section and records who completed it and when.
- **DONE-2:** Done items are sorted newest-completed first and can't be reordered.
- **DONE-3:** A restored item returns to the top of the active list.

### Notes

Notes are short remarks such as "I like it" or "we can't miss this one", not a conversation.

- **NOTE-1:** A note is plain text, 1 to 140 characters, showing the author's avatar and a timestamp.
- **NOTE-2:** Tapping an item expands it in place to show its notes and a one-line input.
- **NOTE-3:** A collapsed item shows a small note count when it has notes.
- **NOTE-4:** Authors can delete their own notes. Nobody can edit a note or delete someone else's.
- **NOTE-5:** There are no replies, threads or reactions.

### Realtime

- **SYNC-1:** Every change to items and notes appears on the other member's open screen without a reload.
- **SYNC-2:** Board changes, such as a new member joining, also appear live.

## 4. Look and feel

Minimalist but cute.

- **UI-1:** Warm cream background, one or two soft pastel accents, and a rounded, friendly typeface such as Nunito or Quicksand.
- **UI-2:** Large corner radii and soft shadows, on a sparse layout.
- **UI-3:** Small moments of delight: a springy checkbox, a small celebration on completing an item, and hand-drawn-style illustrations on empty states.
- **UI-4:** Warm copy, for example "Nothing here yet, what should you two do first?"
- **UI-5:** Restyle shadcn through theme tokens so it doesn't look like default shadcn.
- **UI-6:** Mobile-first and responsive, with touch-friendly drag handles and tap targets.
- **UI-7:** Light mode only, in English only.
- **UI-8:** All animation respects `prefers-reduced-motion`.

## 5. Architecture

- **ARCH-1:** Client-side data and auth only: no session cookies, server-side data fetching, Admin SDK or server secrets. Next.js is a thin shell.
- **ARCH-2:** Firestore security rules are the only security layer, so anything that matters must be enforced there as well as in the UI.
- **ARCH-3:** Use one Firebase project for both development and production, and one Firestore database.

## 6. Data model and security rules

### Collections

```
boards/{boardId}
  name: string
  members: string[]            // uids, at most 2
  currentInviteId: string | null
  createdBy: string
  createdAt: timestamp
  memberProfiles?: map<uid, { name, photoURL }>   // absent on older boards

boards/{boardId}/items/{itemId}
  title: string
  order: string                // fractional index
  createdBy: { uid, name, photoURL }
  createdAt: timestamp
  completedBy: { uid, name, photoURL } | null
  completedAt: timestamp | null
  notes: map<noteId, { text, author: { uid, name, photoURL }, createdAt }>

invites/{inviteId}             // the ID is the unguessable token in the link
  boardId: string
  boardName: string
  inviterName: string
  createdBy: string
  expiresAt: timestamp
  usedBy: string | null
```

Names and photos are copied onto items and notes because there is no `users` collection. They keep displaying correctly after someone leaves the board.

### Rules

- **DATA-1 (allowed accounts):** Every rule requires `request.auth.token.firebase.sign_in_provider == 'google.com'`, or a uid in a hard-coded list of the three test accounts. Otherwise anyone could create an email/password account directly through the Firebase API and use up the shared quota.
- **DATA-2 (board access):** Only members can read a board or its items. The board list query is `where('members', 'array-contains', uid)`, and the list rule must permit exactly that query.
- **DATA-3 (joining):** Joining is one atomic batch that sets `invites/{id}.usedBy` to the caller and appends the caller to `boards/{id}.members`. The caller isn't a member yet, so the board update rule needs a separate branch that uses `getAfter()` and checks all of the following:
  - `members` gains exactly the caller's uid, and no other board field changes.
  - The board ends with exactly two members.
  - The invite's ID equals `currentInviteId`, so replaced links fail.
  - After the batch, the invite's `usedBy` is the caller.

  The invite update rule allows only `usedBy` to change, only from `null` to the caller, and only before `expiresAt`.
- **DATA-4 (invites):** Any allowed account can `get` an invite by exact ID. `list` is always denied. Only a board member can create an invite, and only when the board has one member. Regenerating is one batch that creates the new invite, updates `currentInviteId` and deletes the old invite.
- **DATA-5 (item writes):** Rules can't loop over a map, so each write type has a fixed set of allowed fields, checked with `diff().affectedKeys()`:

  | Write | Fields that may change | Extra checks |
  | --- | --- | --- |
  | Create item | New document | `createdBy.uid` is the caller, `notes` is empty, not completed |
  | Delete item | Whole document | Caller is a board member |
  | Edit title | `title` | Length limit |
  | Reorder | `order` | |
  | Complete or restore | `completedBy`, `completedAt`, and `order` on restore | `completedBy.uid` is the caller when completing |
  | Add a note | `notes`, exactly one new key | `author.uid` is the caller, text is 1 to 140 characters |
  | Delete a note | `notes`, exactly one removed key | The removed note's `author.uid` is the caller |

  All of these writes require the caller to be a board member. Title, order and completion writes can't touch `notes`. Existing notes can't be changed. Add notes using a field-path update on `notes.{id}`, so concurrent writes don't overwrite each other.
- **DATA-6 (leaving and deleting):** A member can remove only themselves from `members`. Deleting a board doesn't delete its subcollections, and there are no Cloud Functions, so when the last member leaves, the client deletes the items and current invite first and the board document last. Rules allow deleting the board only when the caller is its sole member.
- **DATA-7 (member profiles):** A member can only add, change or remove their own `memberProfiles` entry. Entries have exactly `name` (at most 200 characters) and `photoURL` (string or null). Creating, joining and leaving may each include the caller's entry, and writes without one stay valid permanently. See `docs/spec-board-list-labels.md`.

## 7. Definition of done

Tests run from local `pnpm` scripts against the real Firebase project. There is no emulator, Java or CI.

- **TEST-1 (rule tests):** Use the normal client SDK, signed in as the test accounts, and try real allowed and forbidden actions. The emulator-based `@firebase/rules-unit-testing` is not used. Rules must be deployed before each run. Cover at least:
  - A non-member can't read or write a board or its items.
  - Invites can't be listed.
  - Joining fails with an expired, used or replaced invite.
  - A third member is rejected, and nobody can add another user to a board.
  - Each row of the DATA-5 table: its allowed write succeeds and a write touching other fields fails.
  - A user can't delete someone else's note, or edit an existing note.
  - A member can't remove the other member, and a board with two members can't be deleted.

  Use three test accounts: two as board members and the third as the outsider for the non-member and third-member cases.
- **TEST-2 (unit tests):** Ordering logic, including insert at top, moves between neighbours, and the ITEM-6 tie-break.
- **TEST-3 (end-to-end):** A Playwright test with two browser sessions signed in as two of the test accounts. An item and a note added in one session appear live in the other.
- **TEST-4 (test sign-in):** Playwright can't complete a Google sign-in, so an email sign-in path exists only when a test-only environment variable is set. A check must prove it's absent from production builds.
- **TEST-5 (test data):** Each run creates its own boards and deletes them afterwards. Real users can't see test data.
- **TEST-6 (build):** `pnpm lint` and `pnpm build` both pass.

Manual check before calling v1 finished: the user signs in with Google on the deployed site, since automated tests can't cover it.

## 8. Setup checklist (user)

These steps need the user's own accounts. The orchestrator must ask for them and wait.

1. Create a Firebase project on the Spark plan, without attaching a billing account.
2. Enable Firestore and Authentication with the Google and email/password providers.
3. Create the three test accounts in the Firebase console, and turn off public sign-up if the console allows it. DATA-1 protects the database either way.
4. Run `firebase login`.
5. Give the orchestrator the web app config values and the three test account UIDs.
6. Put the test account emails and passwords in a local `.env.test.local`. They must never be committed.
7. Connect the repo to Vercel on the Hobby plan and add the config values as environment variables. The test sign-in variable must not be set there.
8. In Firebase's authorized domains (Authentication > Settings), add `localhost` and the production Vercel domain, such as `distance-board.vercel.app`. Projects created after April 28, 2025 don't include `localhost` by default.

Known limitation: Google sign-in works only on the domains added in step 8. Vercel preview URLs aren't on that list, so sign-in failing there isn't a bug.

## 9. Not in v1

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

## 10. Task breakdown

Tasks run in order, except where marked as parallel. Each one is done when its acceptance line passes.

| # | Task | Depends on | Needs setup | Acceptance |
| --- | --- | --- | --- | --- |
| 0 | Read the relevant Next.js docs and note anything affecting the plan | None | No | Findings recorded in the task output |
| 1 | Add shadcn, theme tokens, font, base layout, `.env.example`, and a `!.env.example` line in `.gitignore` (the current `.env*` rule would ignore it) | 0 | No | `pnpm build` passes; the themed sample renders as in section 4 |
| 2 | Firebase client setup and Google sign-in, with landing page and auth state handling | 1 | Yes | Manual Google sign-in works on `localhost`; AUTH-1 to AUTH-3 met |
| 3 | `firestore.rules` for section 6, with the deploy script | 2 | Yes | Rules deploy; TEST-1 passes |
| 4 | Test sign-in path and Playwright setup | 2 | Yes | A Playwright session signs in; TEST-4 check passes |
| 5 | Board create, list and navigation | 3 | Yes | NAV-1 to NAV-3 and BOARD-1 met |
| 6 | Invites and joining | 5 | Yes | INV-1 to INV-6 and NAV-4 met; TEST-1 invite cases pass |
| 7 | Ordering module | 1 | No | TEST-2 passes. Can run in parallel with 2 to 6 |
| 8 | Item list with live updates: add, edit, delete | 5 | Yes | ITEM-1 to ITEM-3 and SYNC-1 met |
| 9 | Drag-and-drop reordering | 7, 8 | Yes | ITEM-4 to ITEM-6 met, tested on touch and keyboard |
| 10 | Done section | 8 | Yes | DONE-1 to DONE-3 met. Can run in parallel with 9 and 11 |
| 11 | Notes | 8 | Yes | NOTE-1 to NOTE-5 met; TEST-1 note cases pass. Can run in parallel with 9 and 10 |
| 12 | Leaving a board and board deletion | 6, 8 | Yes | BOARD-3, BOARD-4 and DATA-6 met |
| 13 | Two-browser live sync test | 4, 8, 11 | Yes | TEST-3 passes |
| 14 | Visual polish: illustrations, celebration, copy, reduced motion | 9, 10, 11, 12 | Yes | UI-1 to UI-8 met |
| 15 | Deploy and final check | 13, 14 | Yes | TEST-5 and TEST-6 pass; the user signs in on the live site |
