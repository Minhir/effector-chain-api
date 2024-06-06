import { createEvent } from "effector";
import { test } from "vitest";

import { link } from "./link.js";

test("allow any source for void target, no fn", () => {
  const evNumber = createEvent<number>();
  const evVoid = createEvent();

  link(evNumber, evVoid);
});

test("allow any source for void target, fn", () => {
  const evNumber = createEvent<number>();
  const evVoid = createEvent();

  link(evNumber, (b) => b.filter((val) => val > 0), evVoid);
});
