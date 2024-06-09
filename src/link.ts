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

class Pipe<In, Out> {
  __in!: In;
  __out!: Out;

  _sources: Sources;
  _fn: (sourceData: SourceVals, value: any) => Out | None;

  constructor(
    sources: Sources,
    fn: (sourceData: SourceVals, value: any) => Out | None,
  ) {
    this._sources = sources;
    this._fn = fn;
  }

  map<R>(fn: (value: Out) => R): Pipe<In, R> {
    return new Pipe<In, R>(
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
  >(units: U, fn: (units: MapUnits<U>, value: Out) => R): Pipe<In, R> {
    const unitNormalized: Unit<unknown> = is.unit(units)
      ? units
      : combine(units);

    const id = unitId(unitNormalized);

    return new Pipe<In, R>(
      { ...this._sources, [id]: unitNormalized },
      (sourceData, value) => {
        const prev = this._fn(sourceData, value);

        return prev === None ? None : fn(sourceData[id], prev);
      },
    );
  }

  filter<R extends Out>(fn: (value: Out) => value is R): Pipe<In, R>;
  filter(fn: (value: Out) => boolean): Pipe<In, Out>;
  filter(fn: (value: Out) => boolean) {
    return new Pipe(this._sources, (sourceData, value) => {
      const prev = this._fn(sourceData, value);

      return prev === None || !fn(prev) ? None : prev;
    });
  }

  filterWith<
    const U extends
      | Unit<any>
      | ReadonlyArray<Unit<any>>
      | Readonly<Record<string, Unit<any>>>,
  >(unit: U, fn: (unit: MapUnits<U>, value: Out) => boolean): Pipe<In, Out>;
  filterWith<
    const U extends
      | Unit<any>
      | ReadonlyArray<Unit<any>>
      | Readonly<Record<string, Unit<any>>>,
    R extends Out,
  >(unit: U, fn: (unit: MapUnits<U>, value: Out) => value is R): Pipe<In, R> {
    const unitNormalized: Unit<unknown> = is.unit(unit) ? unit : combine(unit);

    const id = unitId(unitNormalized);

    return new Pipe(
      { ...this._sources, [id]: unitNormalized },
      (sourceData, value) => {
        const prev = this._fn(sourceData, value);

        return prev === None || !fn(sourceData[id], prev) ? None : prev;
      },
    );
  }

  and<U>(unit: Unit<U>): Pipe<In, U> {
    const id = unitId(unit);

    return new Pipe({ ...this._sources, [id]: unit }, (sourceData, value) => {
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
  fn: Pipe<T, R> | ((pipe: Pipe<T, T>) => Pipe<T, NoInfer<R>>),
  target: Target<R>,
): void;
export function link<T, R>(
  units: From<T>,
  fn: ((pipe: Pipe<T, T>) => Pipe<NoInfer<T>, any>) | Pipe<NoInfer<T>, any>,
  target: Target<void>,
): void;
export function link<T, R>(
  units: From<T>,
  fn: ((pipe: Pipe<T, NoInfer<T>>) => Pipe<T, R>) | Pipe<T, R>,
): Event<R>;
export function link(
  units: From<any>,
  fnOrPipeOrTarget:
    | ((pipe: Pipe<any, any>) => Pipe<any, any>)
    | Pipe<any, any>
    | Target<any>,
  optionalTarget?: Target<any>,
): any {
  const fn =
    typeof fnOrPipeOrTarget === "function" ? fnOrPipeOrTarget : (v: any) => v;

  const providedTarget = optionalTarget
    ? optionalTarget
    : is.unit(fnOrPipeOrTarget)
      ? fnOrPipeOrTarget
      : null;

  const target = providedTarget ?? createEvent();
  const ev = createEvent<any>();

  const pipe =
    fnOrPipeOrTarget instanceof Pipe
      ? fnOrPipeOrTarget
      : fn(new Pipe({}, (sourceData, value) => value));

  // @ts-expect-error
  sample({
    clock: units,
    source: pipe._sources,
    fn: (sourceData: any, clockData: any) => pipe._fn(sourceData, clockData),
    target: ev,
  });

  // @ts-expect-error
  sample({
    source: ev,
    filter: (v: any) => v !== None,
    target,
  });

  if (!providedTarget) {
    return target;
  }
}

function unitId(unit: Unit<unknown>): string {
  // @ts-expect-error This is not public API 😇
  return unit.graphite.id;
}

export function pipe<In>(): Pipe<In, In> {
  return new Pipe({}, (_, value) => value);
}
