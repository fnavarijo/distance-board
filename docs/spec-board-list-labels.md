# Distance Board: Who Each Board Is Shared With

**Status:** ready-for-agent. This label is recorded here, as with the v1 spec, because this spec hasn't been published to an issue tracker.

**Source:** a design interview with the project owner. The v1 requirements and spec still govern everything not covered here, including the cost limits. IDs such as COST-6 refer to the requirements document.

## Problem Statement

People can already create several boards, and each board is shared with at most one other person. But the board list shows only board names. To find out who a board is shared with, or whether anyone has joined yet, a person has to open each board. Even then, the board only says "The two of you", without naming anyone.

Someone with several boards can't tell at a glance which one is with whom. They also can't see which boards are still waiting for someone to accept an invite.

The board screen also has no obvious way back to the list. The only route is the logo in the header, which is easy to miss.

## Solution

Each row on the board list gets a short label under the board name, showing who the board is shared with:

```
Weekend trips
(A) with Ana

Movies to watch
Waiting for someone to join

Old list
Shared with someone
```

`(A)` is the other person's avatar, or their initial if they have no photo. "Shared with someone" appears only on an older board whose other member hasn't yet opened the app since this feature shipped.

The board screen gets a small "← All boards" link above the board name. Nothing else on that screen changes.

## User Stories

### Scanning the list

1. As a user with several boards, I want each row to show who the board is shared with, so that I can find the right board at a glance.
2. As a user, I want to see the other person's name on the row, so that I know who the board is with.
3. As a user, I want to see the other person's avatar on the row, so that I can recognise them quickly.
4. As a user whose partner has no photo, or whose photo fails to load, I want to see their initial instead, so that the row never looks broken.
5. As a user who created a board and sent an invite, I want the row to say "Waiting for someone to join", so that I know nobody has accepted yet.
6. As a user who has just created a board, I want it to show the same waiting label, so that I'm reminded to invite someone.
7. As a user who joined someone else's board, I want to see that person on the row, so that the list works the same way for me as it does for them.
8. As a user with both created and joined boards, I want them all in one list, so that I have one place to look.
9. As a user with a long board name or a partner with a long name, I want the row to stay tidy, so that I can still scan the list on a phone.
10. As a screen reader user, I want each row to read as the board name and who it's with, without the person being announced twice, so that the list is easy to follow.

### Keeping the label correct

11. As a user whose partner has left, I want the row to go back to "Waiting for someone to join", so that the list shows the current state.
12. As a user whose partner left and who invited someone new, I want the row to show the new person, so that the list never shows someone who's gone.
13. As a user who is looking at the list when someone joins, I want to see them when I next return to the list or reload, so that the list stays current without using up the free quota.
14. As a user with an older board, I want my existing board and everything on it to keep working, so that this feature costs me nothing.
15. As a user with an older board whose partner hasn't opened the app yet, I want the row to say "Shared with someone", so that it's accurate even before their name is known.
16. As a user with an older board, I want my details to reach my partner's label without doing anything, so that their list fills in on its own.
17. As a user who has changed their Google name or photo, I want my boards to pick up the change the next time my board list loads, so that my partner doesn't keep seeing the old one.
18. As a user with one board, I want my details kept up to date even though I skip the list, so that my partner's label is correct.
19. As a user with a poor connection, I want a failed update of my details to go unnoticed and be retried later, so that a background job never interrupts me.

### Navigating

20. As a user on a board, I want a visible "All boards" link above the board name, so that I can easily get back to the list.
21. As a user who arrived through an invite or a direct link, I want that link to go to the list and not to the previous page, so that it behaves the same every time.
22. As a user with exactly one board, I want `/` to keep taking me straight to it, so that I don't have an extra tap.
23. As a user with one board, I want to be able to reach the list from it, so that I can see the label and create another board.

### Protecting people's data

24. As a member, I want nobody else to be able to change my entry on a board, so that my partner can't rewrite how I appear.
25. As a member, I want to be unable to change my partner's entry, so that a bug in my app can't corrupt theirs.
26. As an outsider, I want to be refused when I try to add an entry to someone else's board, so that a board's data stays with its members.
27. As a member, I want my entry removed when I leave a board using the new app, so that the board stops holding my name and photo.

### Operating the project

28. As the project owner, I want the board list to need no extra reads per row, so that it stays well within the free quota.
29. As the project owner, I want nothing to be written when a member's details are already correct, so that ordinary visits cost no writes.
30. As the project owner, I want the current live app to keep working when the new rules are deployed, so that running the rule tests never breaks the live site.
31. As a user with an old tab left open, I want creating, joining and leaving to keep working, so that I'm not caught out by a release.
32. As a developer, I want the new rules proven against the real deployed rules, so that the client and the rules can't drift apart unnoticed.

## Implementation Decisions

### Data model

Boards gain one optional field. Items, notes and invites don't change.

```
boards/{boardId}
  memberProfiles?: map<uid, { name: string, photoURL: string | null }>
```

- This follows the existing pattern of copying names and photos onto documents, since there is no `users` collection. A `users` collection was considered and rejected, because it needs an extra read per row, syncing at sign-in and a new read rule.
- The field is optional permanently. Boards without it are a normal state, not a temporary one.
- The map is read only for current members. An entry for someone no longer in `members` is ignored. This can happen when someone leaves using an old tab of the current app.

### Board data module

This is still the only module that talks to Firestore.

- **`Board` type:** gains `memberProfiles`, which is an empty map when the field is absent.
- **`createBoard`:** includes the creator's entry.
- **`joinBoard`:** adds the caller's entry in the same batch as the `members` change, using a field-path write. This also works on a board with no map, and it replaces any old entry the caller left behind.
- **`leaveBoard`:** on a two-member board, removes the caller's entry in the same write as the `members` change. The deletion path for a last member doesn't change.
- **New, working out the other member:** a pure function that takes a board and the current uid, and returns one of:
  - `waiting`: the board has one member
  - `partner`, with their details: the board has two members and the other has an entry
  - `unknown`: the board has two members and the other has no entry
- **New, syncing your details:** takes the actor and their boards, and writes the actor's entry only on boards where it's missing or differs in name or photo.
  - Each board is written independently, so one failure doesn't stop the others.
  - Failures are swallowed, and the next list load tries again.

### When syncing runs

- It runs after each successful load of the board list. That load also runs on `/`, so a one-board user is covered even though they're redirected past the list.
- `/` redirects a one-board user as soon as the list loads, so syncing must start before that redirect and must not be cancelled when the page navigates away.
- It doesn't run on the board screen. Someone who only ever arrives through direct board links won't sync until they next load `/` or the list. That's accepted, to keep a single place to get right.
- The list doesn't need to reload after a sync, because your own entry never appears on your own rows.

### Board list

- It's still one list of all the user's boards, sorted by name as it is today.
- Labels:

  | Other member | Label |
  | --- | --- |
  | `waiting` | "Waiting for someone to join" |
  | `partner` | Avatar plus "with {name}" |
  | `unknown` | "Shared with someone" |

- Avatars use the existing avatar component, which already handles missing photos and failed loads (COST-4).
- A missing Google display name is stored as "Someone", the same as on items and notes.
- Long board names and partner names are truncated so that a row can't overflow on a phone.
- The row's accessible name should read as the board name and the label, without saying the person's name twice. The avatar's text alternative will need attention here.
- Invite details such as "link sent" or "link expired" aren't shown, because each would need an extra read per board.
- The list keeps its one-shot query and refreshes when the route becomes visible (COST-6). It doesn't update live.

### Board screen

- A plain text link, "← All boards", sits above the board name and always goes to `/boards`. It doesn't use browser history.
- The logo link stays as it is.
- "Just you so far", "The two of you", and the rest of the screen don't change.

### Navigation

Going straight to a single board from `/` (NAV-2) doesn't change.

### Security rules

These are the only security layer (ARCH-2), and each change is limited to the caller's own entry.

Rules must read the map with `get('memberProfiles', {})`, on both the before and after state. Reading the field directly on a board with no map raises an error, which denies the write and would silently break old boards.

**A valid entry** has exactly `name` and `photoURL`. `name` is a string of at most 200 characters, and `photoURL` is a string or null. These match the limits on `Person` on items and notes.

| Write | Change to the rule |
| --- | --- |
| Create a board | `memberProfiles` may be absent. If present, it has exactly one key, the caller's uid, with a valid entry. |
| Join | May change `memberProfiles` as well as `members`. If the map changes, the only affected key is the caller's, with a valid entry. All existing join checks stay. |
| Leave | May change `memberProfiles` as well as `members`. If the map changes, the only affected key is the caller's, and that entry must be gone afterwards. All existing leave checks stay. |
| Update own entry (new) | The caller is a member, only `memberProfiles` changes, the only affected key is the caller's, and the entry is valid afterwards. This works on boards with one or two members, and it can't be used to delete an entry. |

Writes that the current app makes keep passing, so the old shapes stay valid: creating a board with no map, joining without an entry, and leaving without removing an entry.

Other decisions:

- **Accepted risk:** the rules check only that an entry belongs to the caller, not that its name and photo match their Google account. So a member could give themselves a false name by calling Firestore directly, and their partner's label would show it. Items and notes already accept this risk, and only someone you invited could do it. Test accounts also have no name or photo to compare against.
- **Keeping the old shapes:** accepting both shapes is permanent, because it does no harm. A member can only ever affect their own entry, and a board made the old way fills itself in through syncing.
- **Untested assumption:** a leave that removes a field-path entry on a board with no map should be harmless, but this hasn't been run yet. The rule tests must prove it.

### Rollout

There's one shared Firebase project, and the rule test script deploys rules to it before each run. So the new rules reach the live site the first time they're tested, while the live site is still running the old app. That's why the rules accept both shapes.

The order is:

1. Deploy and test the new rules.
2. Wait until they have propagated.
3. Release the app.

Releasing the app first would break creating, joining and leaving for new-app users until the rules arrive, because the current rules reject the new field.

## Testing Decisions

A good test exercises external behaviour through a public seam and would still pass after an internal refactor. Tests don't mock Firestore, because the real rules are the thing under test. No new seam is needed: this feature uses the two the project already has.

**1. Board data module, against the deployed rules.** Allowed actions call the real module functions. Forbidden actions and old-app writes use raw client-SDK calls. The existing board and invite rule tests are the prior art, and their harness already provides solo and paired boards and a denied-write helper.

New-app behaviour:
- Creating a board stores the creator's entry.
- Joining adds the joiner's entry and keeps the creator's.
- Leaving removes the leaver's entry and keeps the other person's.
- Rejoining replaces an old entry.
- Working out the other member returns `waiting`, `partner` and `unknown` in the right cases, and ignores an entry for someone who has left.
- Syncing fills in a missing entry and updates a changed name or photo.
- Syncing writes nothing when the entry is already correct.

Old-app writes and old boards stay valid:
- Creating a board with no map works.
- Joining without adding an entry works.
- Leaving without removing an entry works.
- Joining, leaving and syncing all work on a board with no map.

Forbidden writes:
- Creating a board with someone else's entry, or with more than one entry.
- A member adding, changing or removing their partner's entry.
- An outsider adding an entry to a board.
- Joining with someone else's entry.
- Leaving while also changing the partner's entry.
- Using the new update branch to change any other board field.
- Removing your own entry while staying on the board.
- An entry with extra fields, a missing field, the wrong types or an overlong name.

**2. The whole app through Playwright.** The two-browser test is the prior art. Locators must match visible elements only, because hidden routes stay in the DOM. One new test should cover:
- A new board's row shows "Waiting for someone to join".
- After someone joins, both people see each other on their rows. Test accounts may have no display name or photo, so the assertions must allow for the "Someone" and initial fallbacks.
- After the partner leaves, the row goes back to waiting.
- "All boards" on the board screen leads to the list.

**Not automated:** seeing a real Google avatar and name on the deployed site, checked by hand as part of the usual Google sign-in check.

**Build:** lint and build pass, with no Firebase config in the environment for the build.

**Quota:** rule test runs and real users draw on the same daily Firebase quota.

## Out of Scope

- Showing the other person's name on the board screen, which keeps "The two of you"
- Choosing a person directly instead of sending an invite link
- Boards with more than two members, or owner and admin roles
- Separating "Created by me" from "Shared with me"
- A record of past partners
- Live updates on the board list (COST-6)
- Showing invite status on the list
- Email addresses, which the app doesn't store
- A limit on boards per user, because rules can't enforce one without a per-user counter document
- Syncing details from the board screen
- Verifying names and photos against the Google account
- A `users` collection
- Removing the rules' support for old writes
- Cleaning up an old entry left behind by someone who left through an old tab

## Further Notes

**Documents to update when this is built:**
- The requirements document needs the new field in its data model, the rule changes in its security section, and the label and the link in its navigation section.
- The v1 spec's statement that no schema changes are made should point to this spec.

**Stale details:** a changed Google name or photo reaches a board only when its owner's board list loads. Until then, their partner sees the old one.

**Delay on the label:** because the list loads once per visit, someone looking at it when their partner joins keeps seeing the waiting label until they return or reload. The board screen does update live.

**Stale entries from old tabs:** someone leaving through an old tab leaves their entry on the board. It's never displayed, and it's replaced if they rejoin, but their name and photo stay in that board's data.
