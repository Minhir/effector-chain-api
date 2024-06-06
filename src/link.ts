import { Unit, UnitTargetable, UnitValue, createEvent, sample } from "effector";
import { nanoid } from "nanoid";

type Sources = { [key: string]: Unit<any> };
type SourceVals = { [key: string]: any };

const None = Symbol("none");
type None = typeof None;
type MapUnits<T extends Unit<any> | ReadonlyArray<Unit<any>>> =
  T extends ReadonlyArray<any>
    ? { [K in keyof T]: UnitValue<T[K]> }
    : UnitValue<T>;

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

  mapWith<const U extends Unit<any> | ReadonlyArray<Unit<any>>, R>(
    units: U,
    fn: (units: MapUnits<U>, value: T) => R,
  ): Option<R> {
    const newUnits = { ...this._sources };

    const isArray = Array.isArray(units);

    const unitsArr: ReadonlyArray<Unit<any>> = isArray ? units : [units];

    const ids: string[] = [];

    for (const unit of unitsArr) {
      const id = nanoid();

      ids.push(id);

      newUnits[id] = unit;
    }

    return new Option<R>(newUnits, (sourceData, value) => {
      const prev = this._fn(sourceData, value);

      return prev === None
        ? None
        : fn(
            isArray ? ids.map((id) => sourceData[id]) : sourceData[ids[0]],
            prev,
          );
    });
  }

  filter<R extends T>(fn: (value: T) => value is R): Option<R>;
  filter(fn: (value: T) => boolean): Option<T>;
  filter(fn: (value: T) => boolean) {
    return new Option(this._sources, (sourceData, value) => {
      const prev = this._fn(sourceData, value);

      return prev === None || !fn(prev) ? None : prev;
    });
  }

  filterWith<U>(unit: Unit<U>, fn: (unit: U, value: T) => boolean): Option<T>;
  filterWith<U, R extends T>(
    unit: Unit<U>,
    fn: (unit: U, value: T) => value is R,
  ): Option<R> {
    const uid = nanoid();

    return new Option(
      { ...this._sources, [uid]: unit },
      (sourceData, value) => {
        const prev = this._fn(sourceData, value);

        return prev === None || !fn(sourceData[uid], prev) ? None : prev;
      },
    );
  }

  and<U>(unit: Unit<U>): Option<U> {
    const uid = nanoid();

    return new Option(
      { ...this._sources, [uid]: unit },
      (sourceData, value) => {
        const prev = this._fn(sourceData, value);

        return prev === None ? None : sourceData[uid];
      },
    );
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

export function link(units: any, fnOrTarget: any, optionalTarget?: any): void {
  const fn = typeof fnOrTarget === "function" ? fnOrTarget : (v: any) => v;
  const target = typeof fnOrTarget === "function" ? optionalTarget : fnOrTarget;

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
}
