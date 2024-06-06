import { createEvent } from "effector";
import { test } from "vitest";

import { link, pipe } from "./link.js";

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

test("pipe should satisfy both from and target types", async () => {
  const from = createEvent<number>();
  const to = createEvent<boolean>();

  link(
    from,
    // @ts-expect-error
    pipe<string>().map(() => true),
    to,
  );

  link(
    from,
    pipe<number>().map(() => true),
    to,
  );
});
