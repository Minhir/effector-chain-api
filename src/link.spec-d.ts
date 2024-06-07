import { createEvent } from "effector";
import { expectTypeOf, test } from "vitest";

import { _, link, pipe } from "./link.js";

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
    // @ts-expect-error because pipe accepts string
    pipe<string>().map(() => true),
    to,
  );

  link(
    from,
    pipe().map(() => 12),
    // @ts-expect-error because pipe returns number
    to,
  );

  link(
    from,
    pipe().map(() => true),
    to,
  );

  link(
    from,
    pipe().map((v) => {
      expectTypeOf(v).toEqualTypeOf<number>();
      return true;
    }),
    to,
  );
});
