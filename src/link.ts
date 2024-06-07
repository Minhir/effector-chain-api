import {
  Unit,
  UnitTargetable,
  UnitValue,
  Event,
  combine,
  createEvent,
  is,
  sample,
} from "effector";

type Sources = { [key: string]: Unit<any> };
type SourceVals = { [key: string]: any };

const None = Symbol("none");
type None = typeof None;
type MapUnits<
  T extends
    | Unit<any>
    | ReadonlyArray<Unit<any>>
    | Readonly<Record<string, Unit<any>>>,
> =
  T extends ReadonlyArray<any>
    ? { [K in keyof T]: UnitValue<T[K]> }
    : T extends Unit<any>
      ? UnitValue<T>
      : { [K in keyof T]: UnitValue<T[K]> };

class Option<T> {
  _sources: Sources;
  _fn: (sourceData: SourceVals, value: any) => T | None;

  constructor(
    sources: Sources,
    fn: (sourceData: SourceVals, value: any) => T | None,
  ) {
    this._sources = sources;
    this._fn = fn;
  }

  map<R>(fn: (value: T) => R): Option<R> {
    return new Option<R>(
      this._sources,

      (sourceData, value) => {
        const prev = this._fn(sourceData, value);
        return prev === None ? None : fn(prev);
      },
    );
  }

  mapWith<
    const U extends
      | Unit<any>
      | ReadonlyArray<Unit<any>>
      | Readonly<Record<string, Unit<any>>>,
    R,
  >(units: U, fn: (units: MapUnits<U>, value: T) => R): Option<R> {
    const unitNormalized: Unit<unknown> = is.unit(units)
      ? units
      : combine(units);

    const id = unitId(unitNormalized);

    return new Option<R>(
      { ...this._sources, [id]: unitNormalized },
      (sourceData, value) => {
        const prev = this._fn(sourceData, value);

        return prev === None ? None : fn(sourceData[id], prev);
      },
    );
  }

  filter<R extends T>(fn: (value: T) => value is R): Option<R>;
  filter(fn: (value: T) => boolean): Option<T>;
  filter(fn: (value: T) => boolean) {
    return new Option(this._sources, (sourceData, value) => {
      const prev = this._fn(sourceData, value);

      return prev === None || !fn(prev) ? None : prev;
    });
  }

  filterWith<
    const U extends
      | Unit<any>
      | ReadonlyArray<Unit<any>>
      | Readonly<Record<string, Unit<any>>>,
  >(unit: U, fn: (unit: MapUnits<U>, value: T) => boolean): Option<T>;
  filterWith<
    const U extends
      | Unit<any>
      | ReadonlyArray<Unit<any>>
      | Readonly<Record<string, Unit<any>>>,
    R extends T,
  >(unit: U, fn: (unit: MapUnits<U>, value: T) => value is R): Option<R> {
    const unitNormalized: Unit<unknown> = is.unit(unit) ? unit : combine(unit);

    const id = unitId(unitNormalized);

    return new Option(
      { ...this._sources, [id]: unitNormalized },
      (sourceData, value) => {
        const prev = this._fn(sourceData, value);

        return prev === None || !fn(sourceData[id], prev) ? None : prev;
      },
    );
  }

  and<U>(unit: Unit<U>): Option<U> {
    const id = unitId(unit);

    return new Option({ ...this._sources, [id]: unit }, (sourceData, value) => {
      const prev = this._fn(sourceData, value);

      return prev === None ? None : sourceData[id];
    });
  }
}

type From<T> = Unit<T> | Unit<T>[];
type Target<T> = UnitTargetable<T> | UnitTargetable<T>[];

export function link<T>(units: From<T>, target: Target<T>): void;
export function link<T>(units: From<any>, target: Target<void>): void;
export function link<T, R>(
  units: From<T>,
  fn: (option: Option<NoInfer<T>>) => Option<NoInfer<R>>,
  target: Target<R>,
): void;
export function link<T, R>(
  units: From<T>,
  fn: (option: Option<NoInfer<T>>) => Option<NoInfer<any>>,
  target: Target<void>,
): void;
export function link<T, R>(
  units: From<T>,
  fn: (option: Option<NoInfer<T>>) => Option<R>,
): Event<R>;

export function link(units: any, fnOrTarget: any, optionalTarget?: any): any {
  const fn = typeof fnOrTarget === "function" ? fnOrTarget : (v: any) => v;

  const rawTarget =
    typeof fnOrTarget === "function" ? optionalTarget : fnOrTarget;
  const noTarget = !rawTarget;

  const target = noTarget ? createEvent() : rawTarget;

  const option = fn(new Option({}, (sourceData, value) => value));

  const ev = createEvent();

  sample({
    // @ts-expect-error
    clock: units,
    source: option._sources,
    fn: (sourceData: any, clockData: any) => option._fn(sourceData, clockData),
    target: ev,
  });

  sample({
    source: ev,
    filter: (v: any) => v !== None,
    target,
  });

  if (noTarget) {
    return target;
  }
}

function unitId(unit: Unit<unknown>): string {
  // @ts-expect-error This is not public API 😇
  return unit.graphite.id;
}
