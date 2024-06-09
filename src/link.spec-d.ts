import { Event, createEvent } from "effector";
import { expectTypeOf, test } from "vitest";

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

test("infer return type from fn", () => {
  const clock = createEvent<string>();

  const target = link(clock, (p) => p.map((v) => parseInt(v, 10)));

  expectTypeOf(target).toMatchTypeOf<Event<number>>();
});

test("pipe should satisfy both from and target types", async () => {
  const from = createEvent<number>();
  const to = createEvent<boolean>();

  link(
    from,
    // @ts-expect-error because pipe accepts string
    pipe<string>().map((v) => {
      expectTypeOf(v).toEqualTypeOf<string>();

      return true;
    }),
    to,
  );

  link(
    from,
    pipe<number>().map((v) => {
      expectTypeOf(v).toEqualTypeOf<number>();

      return 12;
    }),
    // @ts-expect-error because pipe returns number
    to,
  );

  link(
    from,
    pipe<number>().map((v) => {
      expectTypeOf(v).toEqualTypeOf<number>();

      return true;
    }),
    to,
  );

  link(
    from,
    pipe<number>()
      .filter((v) => {
        expectTypeOf(v).toEqualTypeOf<number>();

        return true;
      })
      .map((v) => {
        expectTypeOf(v).toEqualTypeOf<number>();

        return true;
      }),
    to,
  );
});
