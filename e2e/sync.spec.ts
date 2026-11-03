import { type Browser, expect, type Page, test } from "@playwright/test";
import sweep from "./sweep";

// Each test expects an empty account, even if the one before it failed partway.
test.beforeEach(() => sweep());

async function signedInPage(browser: Browser, index: number, path = "/") {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(path);
  await page.getByLabel("Test email").fill(process.env[`TEST_USER_${index}_EMAIL`]!);
  await page.getByLabel("Test password").fill(process.env[`TEST_USER_${index}_PASSWORD`]!);
  await page.getByRole("button", { name: "Test sign-in" }).click();
  return page;
}

async function leave(page: Page, confirmLabel: string) {
  await page.getByRole("button", { name: "Leave", exact: true }).click();
  await page.getByRole("button", { name: confirmLabel }).click();
  await expect(page.getByRole("heading", { name: "Start your first board" })).toBeVisible();
}

test("changes in one browser appear live in the other", async ({ browser }) => {
  const alice = await signedInPage(browser, 1);

  // An empty account is offered a board, and a new board opens straight away.
  await alice.getByLabel("Board name").fill("Our trips");
  await alice.getByRole("button", { name: "Create" }).click();
  await expect(alice.getByRole("heading", { name: "Our trips" })).toBeVisible();
  await expect(alice.getByText("Just you so far")).toBeVisible();

  await alice.getByRole("button", { name: "Create invite link" }).click();
  const inviteLink = await alice.getByLabel("Invite link").inputValue();
  const invitePath = new URL(inviteLink).pathname;

  // The invite survives sign-in: the second person lands back on it afterwards.
  const bob = await signedInPage(browser, 2, invitePath);
  await expect(bob.getByRole("heading", { name: /invited you to Our trips/ })).toBeVisible();
  await bob.getByRole("button", { name: "Join board" }).click();
  await expect(bob.getByRole("heading", { name: "Our trips" })).toBeVisible();

  // A new member appears live, and the invite panel goes away.
  await expect(alice.getByText("The two of you")).toBeVisible();
  await expect(alice.getByRole("button", { name: "Make a new link" })).toBeHidden();

  // An item added in one session appears in the other.
  await alice.getByLabel("New idea").fill("Watch the sunrise");
  await alice.getByRole("button", { name: "Add", exact: true }).click();
  const details = (page: Page) =>
    page.getByRole("button", { name: "Watch the sunrise, show details" });
  await expect(details(bob)).toBeVisible();

  // A note added there appears back in the first session, without reloading.
  await details(bob).click();
  await bob.getByLabel("Add a note to Watch the sunrise").fill("I like it");
  await bob.getByRole("button", { name: "Add note" }).click();
  await expect(alice.getByTestId("note-count").filter({ visible: true })).toHaveText("1note");
  await details(alice).click();
  await expect(alice.getByText("I like it").filter({ visible: true })).toBeVisible();

  // Completing an item moves it to Done on the other screen.
  await alice.getByRole("checkbox", { name: "Complete Watch the sunrise" }).click();
  await expect(bob.getByRole("button", { name: "Done (1)" })).toBeVisible();

  await leave(bob, "Leave board");
  await expect(alice.getByText("Just you so far")).toBeVisible();
  await leave(alice, "Delete board");
});

async function boardWithThreeItems(page: Page, name: string) {
  await page.getByLabel("Board name").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  for (const title of ["Third", "Second", "First"]) {
    await page.getByLabel("New idea").fill(title);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("button", { name: `Reorder ${title}` })).toBeVisible();
  }
  await expect.poll(() => order(page)).toEqual(["First", "Second", "Third"]);
}

function order(page: Page) {
  return page
    .getByRole("button", { name: /^Reorder / })
    .evaluateAll((handles) =>
      handles.map((handle) => handle.getAttribute("aria-label")!.replace("Reorder ", "")),
    );
}

async function centerOf(page: Page, title: string) {
  const box = (await page.getByRole("button", { name: `Reorder ${title}` }).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test("reordering by keyboard saves the new order", async ({ browser }) => {
  const alice = await signedInPage(browser, 1);
  await boardWithThreeItems(alice, "Keyboard order");

  await alice.getByRole("button", { name: "Reorder First" }).focus();
  const announcer = alice.locator('[id^="DndLiveRegion"]');
  await alice.keyboard.press("Space");
  await expect(announcer).toContainText("First is over First");
  // The sensor starts listening for keys just after pick-up, too quickly for a person to notice.
  await alice.waitForTimeout(500);
  await alice.keyboard.press("ArrowDown");
  await expect(announcer).toContainText("First is over Second");
  await alice.keyboard.press("Space");
  await expect.poll(() => order(alice)).toEqual(["Second", "First", "Third"]);

  // A reload reads the order back from the server, so the write really happened.
  await alice.reload();
  await expect.poll(() => order(alice)).toEqual(["Second", "First", "Third"]);

  await leave(alice, "Delete board");
});

test("reordering by mouse shows on the other member's screen", async ({ browser }) => {
  const alice = await signedInPage(browser, 1);
  await boardWithThreeItems(alice, "Mouse order");
  await alice.getByRole("button", { name: "Create invite link" }).click();
  const invitePath = new URL(await alice.getByLabel("Invite link").inputValue()).pathname;
  const bob = await signedInPage(browser, 2, invitePath);
  await bob.getByRole("button", { name: "Join board" }).click();
  await expect.poll(() => order(bob)).toEqual(["First", "Second", "Third"]);

  const from = await centerOf(alice, "First");
  const to = await centerOf(alice, "Third");
  await alice.mouse.move(from.x, from.y);
  await alice.mouse.down();
  await alice.mouse.move(from.x, from.y + 10, { steps: 3 });
  await alice.mouse.move(to.x, to.y + 10, { steps: 10 });
  await alice.mouse.up();

  await expect.poll(() => order(alice)).toEqual(["Second", "Third", "First"]);
  await expect.poll(() => order(bob)).toEqual(["Second", "Third", "First"]);

  await leave(bob, "Leave board");
  await leave(alice, "Delete board");
});

test("reordering by touch works on the drag handle", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByLabel("Test email").fill(process.env.TEST_USER_1_EMAIL!);
  await page.getByLabel("Test password").fill(process.env.TEST_USER_1_PASSWORD!);
  await page.getByRole("button", { name: "Test sign-in" }).click();
  await boardWithThreeItems(page, "Touch order");

  const from = await centerOf(page, "First");
  const to = await centerOf(page, "Second");
  const cdp = await context.newCDPSession(page);
  const touch = (type: string, x: number, y: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type: type as "touchStart",
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });
  await touch("touchStart", from.x, from.y);
  for (let step = 1; step <= 10; step++) {
    await touch("touchMove", from.x, from.y + ((to.y - from.y + 8) * step) / 10);
  }
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText("First is over Second");
  await touch("touchEnd", 0, 0);

  await expect.poll(() => order(page)).toEqual(["Second", "First", "Third"]);
  // dnd-kit swallows the click right after a drop, so that a drop can't also count as a tap.
  await page.waitForTimeout(300);
  await leave(page, "Delete board");
});

test("items can be edited, restored to the top and deleted after confirming", async ({ browser }) => {
  const alice = await signedInPage(browser, 1);
  await boardWithThreeItems(alice, "Item life");

  await alice.getByRole("button", { name: "Third, show details" }).click();
  await alice.getByRole("button", { name: "Edit title" }).click();
  await alice.getByLabel("Item title").fill("Last");
  await alice.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => order(alice)).toEqual(["First", "Second", "Last"]);

  await alice.getByRole("checkbox", { name: "Complete Last" }).click();
  await expect.poll(() => order(alice)).toEqual(["First", "Second"]);
  await alice.getByRole("button", { name: "Done (1)" }).click();
  await alice.getByRole("checkbox", { name: "Restore Last" }).click();
  await expect.poll(() => order(alice)).toEqual(["Last", "First", "Second"]);

  await alice.getByRole("button", { name: "First, show details" }).click();
  await alice.getByRole("button", { name: "Delete", exact: true }).click();
  await alice.getByRole("button", { name: "Keep it" }).click();
  await expect(alice.getByRole("alertdialog")).toBeHidden();
  await expect.poll(() => order(alice)).toEqual(["Last", "First", "Second"]);
  await alice.getByRole("button", { name: "Delete", exact: true }).click();
  await alice.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect.poll(() => order(alice)).toEqual(["Last", "Second"]);

  await leave(alice, "Delete board");
});

test("a dead invite and someone else's board get friendly pages", async ({ browser }) => {
  const alice = await signedInPage(browser, 1);
  await expect(alice.getByRole("heading", { name: "Start your first board" })).toBeVisible();

  await alice.goto("/invite/no-such-invite");
  await expect(alice.getByRole("heading", { name: "This invite no longer works" })).toBeVisible();

  await alice.goto("/boards/no-such-board");
  await expect(alice.getByRole("heading", { name: "We can't find this board" })).toBeVisible();
});

test("going back to a board you left shows a friendly page, not endless loading", async ({ browser }) => {
  const alice = await signedInPage(browser, 1);
  await alice.getByLabel("Board name").fill("Left behind");
  await alice.getByRole("button", { name: "Create" }).click();
  await expect(alice.getByRole("heading", { name: "Left behind" })).toBeVisible();

  // Client-side navigation only, so the board route stays mounted but hidden.
  await alice.getByRole("link", { name: "Your boards" }).click();
  await alice.getByRole("link", { name: "Left behind" }).click();
  await expect(alice.getByRole("heading", { name: "Left behind" })).toBeVisible();
  await leave(alice, "Delete board");

  await alice.goBack();
  await alice.goBack();
  await expect(alice.getByRole("heading", { name: "We can't find this board" })).toBeVisible();
});

test("the old invite link is dead as soon as a new link is shown", async ({ browser }) => {
  const alice = await signedInPage(browser, 1);
  await alice.getByLabel("Board name").fill("New link");
  await alice.getByRole("button", { name: "Create" }).click();
  await alice.getByRole("button", { name: "Create invite link" }).click();

  const link = alice.getByLabel("Invite link");
  await expect(link).toBeVisible();
  const oldLink = await link.inputValue();

  await alice.getByRole("button", { name: "Make a new link" }).click();
  // The link is hidden while it saves, so wait until a different one is on screen.
  await expect
    .poll(async () => ((await link.count()) ? link.inputValue() : oldLink), { timeout: 10_000 })
    .not.toBe(oldLink);

  // Leaves at once, so a link shown before its write is saved would lose that write.
  const boardUrl = alice.url();
  await alice.goto(oldLink);
  await expect(alice.getByRole("heading", { name: "This invite no longer works" })).toBeVisible();

  await alice.goto(boardUrl);
  await leave(alice, "Delete board");
});
