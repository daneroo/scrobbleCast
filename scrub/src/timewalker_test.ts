import { assertEquals } from "./deps.ts";

import {
  addDaysUTC,
  addMonthsUTC,
  startOfDayUTC,
  startOfMonthUTC,
  trimMillis,
  walkDaysUTC,
  walkMonthsUTC,
} from "./timewalker.ts";

Deno.test("trimMillis", () => {
  assertEquals(
    trimMillis("2006-01-02T15:04:05.999Z"),
    "2006-01-02T15:04:05Z",
  );
  assertEquals(
    trimMillis("2006-01-02T15:04:05.1Z"),
    "2006-01-02T15:04:05Z",
  );
  assertEquals(
    trimMillis("2006-01-02T15:04:05.123456Z"),
    "2006-01-02T15:04:05Z",
  );
  assertEquals(
    trimMillis("2006-01-02T15:04:05Z"),
    "2006-01-02T15:04:05Z",
  );
});

Deno.test("addDaysUTC", () => {
  assertEquals(
    addDaysUTC("2006-01-02T15:04:05.999Z", 1),
    "2006-01-03T15:04:05Z",
  );
  assertEquals(
    addDaysUTC("2006-01-02T15:04:05.999Z", 0),
    "2006-01-02T15:04:05Z",
  );
  assertEquals(
    addDaysUTC("2006-01-02T15:04:05.999Z", -5),
    "2005-12-28T15:04:05Z",
  );
});
Deno.test("addMonthsUTC", () => {
  assertEquals(
    addMonthsUTC("2006-01-02T15:04:05.999Z", 1),
    "2006-02-02T15:04:05Z",
  );
  assertEquals(
    addMonthsUTC("2006-01-02T15:04:05.999Z", 0),
    "2006-01-02T15:04:05Z",
  );
  assertEquals(
    addMonthsUTC("2006-01-02T15:04:05.999Z", -5),
    "2005-08-02T15:04:05Z",
  );
  // Failing test!
  assertEquals(
    addMonthsUTC("2014-11-01T00:00:00Z", 1),
    "2014-12-01T00:00:00Z",
  );
});

Deno.test("startOfDayUTC", () => {
  assertEquals(
    startOfDayUTC("2006-01-01T00:00:00Z"),
    "2006-01-01T00:00:00Z",
  );
  assertEquals(
    startOfDayUTC("2006-01-02T15:04:05.999Z"),
    "2006-01-02T00:00:00Z",
  );
});

Deno.test("startOfMonthUTC", () => {
  assertEquals(
    startOfMonthUTC("2006-01-02T15:04:05.999Z"),
    "2006-01-01T00:00:00Z",
  );
});

Deno.test("walkDaysUTC - 1 day interval (empty)", () => {
  const actual = Array.from(
    walkDaysUTC("2021-01-01T00:00:00Z", "2021-01-02T00:00:00Z"),
  );
  assertEquals(actual, []);
});

Deno.test("walkDaysUTC - 1 day + 0.1s interval (1 interval)", () => {
  const actual = Array.from(
    walkDaysUTC("2021-01-01T00:00:00Z", "2021-01-02T00:00:01.1Z"),
  );
  assertEquals(actual, [{
    since: "2021-01-01T00:00:00Z",
    before: "2021-01-02T00:00:00Z",
  }]);
});

Deno.test("walkDaysUTC - 1 day + 1s interval (1 interval)", () => {
  const actual = Array.from(
    walkDaysUTC("2021-01-01T00:00:00Z", "2021-01-02T00:00:01Z"),
  );
  assertEquals(actual, [{
    since: "2021-01-01T00:00:00Z",
    before: "2021-01-02T00:00:00Z",
  }]);
});

Deno.test("walkDaysUTC - since > before (empty)", () => {
  const actual = Array.from(
    walkDaysUTC("2021-01-02T00:00:00Z", "2021-01-01T00:00:00Z"),
  );
  assertEquals(actual, []);
});

Deno.test("walkDaysUTC - 2 days interval", () => {
  const actual = Array.from(
    walkDaysUTC("2021-01-01T00:00:00Z", "2021-01-03T00:00:00Z"),
  );
  const expected = [{
    since: "2021-01-01T00:00:00Z",
    before: "2021-01-02T00:00:00Z",
  }];
  assertEquals(actual, expected);
});

Deno.test("walkDaysUTC - 2 days+1s interval shifted", () => {
  const actual = Array.from(
    walkDaysUTC("2021-01-01T09:00:00Z", "2021-01-03T00:00:01Z"),
  );
  const expected = [{
    since: "2021-01-01T00:00:00Z",
    before: "2021-01-02T00:00:00Z",
  }, {
    since: "2021-01-02T00:00:00Z",
    before: "2021-01-03T00:00:00Z",
  }];
  assertEquals(actual, expected);
});

Deno.test("walkMonthsUTC - 1 month interval (empty)", () => {
  const actual = Array.from(
    walkMonthsUTC("2021-01-01T00:00:00Z", "2021-02-01T00:00:00Z"),
  );
  assertEquals(actual, []);
});

Deno.test("walkMonthsUTC - 1 month + 0.1s interval (1 interval)", () => {
  const actual = Array.from(
    walkMonthsUTC("2021-01-01T00:00:00Z", "2021-02-01T00:00:01.1Z"),
  );
  assertEquals(actual, [{
    before: "2021-02-01T00:00:00Z",
    since: "2021-01-01T00:00:00Z",
  }]);
});

Deno.test("walkMonthsUTC - 1 month + 1s interval (1 interval)", () => {
  const actual = Array.from(
    walkMonthsUTC("2021-01-01T00:00:00Z", "2021-02-01T00:00:01Z"),
  );
  assertEquals(actual, [{
    before: "2021-02-01T00:00:00Z",
    since: "2021-01-01T00:00:00Z",
  }]);
});

Deno.test("walkMonthsUTC - since > before (empty)", () => {
  const actual = Array.from(
    walkMonthsUTC("2021-01-02T00:00:00Z", "2021-01-01T00:00:00Z"),
  );
  assertEquals(actual, []);
});

Deno.test("walkMonthsUTC example 2 month interval", () => {
  const actual = Array.from(
    walkMonthsUTC("2021-01-01T00:00:00Z", "2021-03-01T00:00:00Z"),
  );
  const expected = [{
    since: "2021-01-01T00:00:00Z",
    before: "2021-02-01T00:00:00Z",
  }];
  assertEquals(actual, expected);
});
Deno.test("walkMonthsUTC example 2 month+1s interval shifted", () => {
  const actual = Array.from(
    walkMonthsUTC("2021-01-03T00:00:00Z", "2021-03-01T00:00:01Z"),
  );
  const expected = [{
    since: "2021-01-01T00:00:00Z",
    before: "2021-02-01T00:00:00Z",
  }, {
    before: "2021-03-01T00:00:00Z",
    since: "2021-02-01T00:00:00Z",
  }];
  assertEquals(actual, expected);
});
