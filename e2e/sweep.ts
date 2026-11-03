import { setUp, tearDown } from "../tests/accounts";

// Removes any boards the test accounts still have, including after a crashed run (TEST-5).
export default async function sweep() {
  await tearDown(await setUp());
}
