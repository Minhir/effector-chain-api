import { allSettled, createEvent, createStore, fork } from "effector";
import { expect, test } from "vitest";

import { link } from "./link.js";

test("accept shape of stores in mapWith", async () => {
  const event = createEvent<number>();
  const $store = createStore<number>(12);
  const $target = createStore<number>(0);

  link(
    event,
    (o) => o.mapWith({ store: $store }, ({ store }, v) => store + v),
    $target,
  );

  const scope = fork();

  await allSettled(event, { scope, params: 5 });

  expect(scope.getState($target)).toEqual(12 + 5);
});

test("accept shape of stores in filterWith", async () => {
  const event = createEvent<number>();
  const $store = createStore<number>(0);
  const $target = createStore<number>(0);

  link(
    event,
    (o) => o.filterWith({ store: $store }, ({ store }, v) => store > 0),
    $target,
  );

  const scope = fork();

  // Skip because of the filter
  await allSettled(event, { scope, params: 5 });
  expect(scope.getState($target)).toEqual(0);

  // Works because of the filter
  await allSettled($store, { scope, params: 1 });
  await allSettled(event, { scope, params: 5 });
  expect(scope.getState($target)).toEqual(5);
});

test("pass clock data to target", async () => {
  const event = createEvent<number>();
  const $store = createStore<number | null>(null);

  link(event, $store);

  const scope = fork();

  await allSettled(event, { scope, params: 5 });

  expect(scope.getState($store)).toEqual(5);
});

test("works with map", async () => {
  const event = createEvent<number>();
  const $target = createStore<string>("");

  link(event, (o) => o.map((v) => `${v}`), $target);

  const scope = fork();

  await allSettled(event, { scope, params: 12 });

  expect(scope.getState($target)).toEqual("12");
});

test("works with mapWith", async () => {
  const event = createEvent<number>();
  const $store = createStore<string>("a");
  const $target = createStore<string>("");

  link(event, (o) => o.mapWith($store, (s, v) => s.repeat(v)), $target);

  const scope = fork();

  await allSettled(event, { scope, params: 3 });

  expect(scope.getState($target)).toEqual("aaa");
});

test("works with mapWith with multiple units", async () => {
  const userAddressChanged = createEvent<string>();
  const $userName = createStore<string>("Bob");
  const $UserLastName = createStore<string>("Doe");
  const $userInfo = createStore<string>("");

  link(
    userAddressChanged,
    (o) =>
      o.mapWith(
        [$userName, $UserLastName],
        ([name, lastName], address) => `${name} ${lastName}, ${address}`,
      ),
    $userInfo,
  );

  const scope = fork();

  await allSettled(userAddressChanged, { scope, params: "world" });

  expect(scope.getState($userInfo)).toEqual("Bob Doe, world");
});

test("works with filter", async () => {
  const event = createEvent<number>();
  const $target = createStore<number>(0);

  link(event, (o) => o.filter((v) => v < 5), $target);

  const scope = fork();

  await allSettled(event, { scope, params: 2 });

  expect(scope.getState($target)).toEqual(2);

  await allSettled(event, { scope, params: 7 });

  expect(scope.getState($target)).toEqual(2);

  await allSettled(event, { scope, params: 3 });

  expect(scope.getState($target)).toEqual(3);
});

test("works with filterWith", async () => {
  const updateStore = createEvent<number>();
  const event = createEvent<number>();
  const $store = createStore<number>(5);
  const $target = createStore<number>(0);

  link(event, (o) => o.filterWith($store, (s, v) => v < s), $target);
  link(updateStore, (o) => o.map((v) => v), $store);

  const scope = fork();

  await allSettled(event, { scope, params: 2 });

  expect(scope.getState($target)).toEqual(2);

  await allSettled(event, { scope, params: 7 });

  expect(scope.getState($target)).toEqual(2);

  await allSettled(updateStore, { scope, params: 12 });
  await allSettled(event, { scope, params: 7 });

  expect(scope.getState($target)).toEqual(7);
});

test("works with and", async () => {
  const returnStatusCode = createEvent<number>();
  const $content = createStore<string>("Hello");
  const $target = createStore<string>("");

  link(
    returnStatusCode,
    (o) => o.filter((v) => v === 200).and($content),
    $target,
  );

  const scope = fork();

  await allSettled(returnStatusCode, { scope, params: 404 });

  expect(scope.getState($target)).toEqual("");

  await allSettled(returnStatusCode, { scope, params: 200 });

  expect(scope.getState($target)).toEqual("Hello");
});

test("works with multiple clocks", async () => {
  const event1 = createEvent<number>();
  const event2 = createEvent<number>();
  const $target = createStore<number | string>(0);

  link([event1, event2], (o) => o.map((v) => 2 * v), $target);

  const scope = fork();

  await allSettled(event1, { scope, params: 2 });

  expect(scope.getState($target)).toEqual(4);

  await allSettled(event2, { scope, params: 3 });

  expect(scope.getState($target)).toEqual(6);
});

test("works with multiple targets", async () => {
  const event = createEvent<number>();
  const $target1 = createStore<number>(0);
  const $target2 = createStore<number>(0);

  link(event, (o) => o.map((v) => 2 * v), [$target1, $target2]);

  const scope = fork();

  await allSettled(event, { scope, params: 2 });

  expect(scope.getState($target1)).toEqual(4);
  expect(scope.getState($target2)).toEqual(4);
});

test("works in chain", async () => {
  type User = { id: string; name: string; address: string };

  const $users = createStore<User[]>([
    { id: "bob", name: "Bob", address: "NY" },
  ]);
  const $isAdmin = createStore(false);
  const userAddressRequested = createEvent<string>();
  const setIsAdmin = createEvent<boolean>();

  const $target = createStore<string>("");

  link(
    userAddressRequested,
    (o) =>
      o
        .filterWith($isAdmin, (isAdmin) => isAdmin)
        .mapWith($users, (users, userId) =>
          users.find((user) => user.id === userId),
        )
        .filter((user): user is User => !!user)
        .map((user) => user.address),
    $target,
  );

  link(setIsAdmin, (o) => o.map((v) => v), $isAdmin);

  const scope = fork();

  await allSettled(userAddressRequested, { scope, params: "bob" });

  expect(scope.getState($target)).toEqual("");

  await allSettled(setIsAdmin, { scope, params: true });

  expect(scope.getState($isAdmin)).toBe(true);

  await allSettled(userAddressRequested, { scope, params: "bob" });

  expect(scope.getState($target)).toEqual("NY");

  await allSettled($target.reinit, { scope });

  expect(scope.getState($target)).toEqual("");

  await allSettled(userAddressRequested, { scope, params: "alice" });

  expect(scope.getState($target)).toEqual("");
});
