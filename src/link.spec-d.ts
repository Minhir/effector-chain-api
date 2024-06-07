import { Event, createEvent } from "effector";
import { expectTypeOf, test } from "vitest";

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

test("infer return type from fn", () => {
  const clock = createEvent<string>();

  const target = link(clock, (p) => p.map((v) => parseInt(v, 10)));

  expectTypeOf(target).toMatchTypeOf<Event<number>>();
});
