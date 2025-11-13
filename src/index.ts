export type SafeResult<T, E = any> =
  | { ok: true; value: T }
  | { ok: false; error: E };

type MaybePromise<T> = T | Promise<T>;

export class Pieper<T> {
  private readonly thunk: () => Promise<T>;

  private constructor(thunk: () => Promise<T>) {
    this.thunk = thunk;
  }

  static of<T>(value: MaybePromise<T>): Pieper<T> {
    return new Pieper(() => Promise.resolve(value));
  }

  static from<T>(fn: () => MaybePromise<T>): Pieper<T> {
    return new Pieper(() => Promise.resolve(fn()));
  }

  map<R>(fn: (value: T) => MaybePromise<R>): Pieper<R> {
    return new Pieper(() => this.thunk().then(fn));
  }

  flatMap<R>(fn: (value: T) => Pieper<R>): Pieper<R> {
    return new Pieper(() => this.thunk().then((value) => fn(value).run()));
  }

  if<R>(
    condition: (value: T) => MaybePromise<boolean>,
    thenFn: (value: T) => MaybePromise<R>
  ): Pieper<R | T> {
    return this.ifElse(condition, thenFn, (value) => value);
  }

  ifElse<R1, R2>(
    condition: (value: T) => MaybePromise<boolean>,
    thenFn: (value: T) => MaybePromise<R1>,
    elseFn: (value: T) => MaybePromise<R2>
  ): Pieper<R1 | R2> {
    return new Pieper(() =>
      this.thunk().then(async (value) => {
        const cond = await condition(value);
        return cond ? thenFn(value) : elseFn(value);
      })
    );
  }

  tap(fn: (value: T) => MaybePromise<void>): Pieper<T> {
    return new Pieper(() =>
      this.thunk().then(async (value) => {
        await fn(value);
        return value;
      })
    );
  }

  log(message?: string): Pieper<T> {
    return this.tap((value) => {
      if (message) console.log(message, value);
      else console.log(value);
    });
  }

  catch<R>(fn: (error: any) => MaybePromise<R>): Pieper<T | R> {
    return new Pieper(() => this.thunk().catch(fn));
  }

  finally(fn: () => MaybePromise<void>): Pieper<T> {
    return new Pieper(() => this.thunk().finally(fn));
  }

  assert<R extends T>(
    predicate: (value: T) => value is R,
    errorMessageOrError: string | Error
  ): Pieper<R>;

  assert(
    predicate: (value: T) => boolean | Promise<boolean>,
    errorMessageOrError: string | Error
  ): Pieper<T>;

  assert<R extends T>(
    predicate:
      | ((value: T) => value is R)
      | ((value: T) => boolean | Promise<boolean>),
    errorMessageOrError: string | Error
  ): Pieper<R | T> {
    return new Pieper(() =>
      this.thunk().then(async (value) => {
        const isValid = await predicate(value);
        if (!isValid) {
          const error =
            typeof errorMessageOrError === "string"
              ? new Error(errorMessageOrError)
              : errorMessageOrError;
          throw error;
        }
        return value;
      })
    );
  }

  run(): Promise<T> {
    return this.thunk();
  }

  async runSafe(): Promise<SafeResult<T>> {
    try {
      const value = await this.thunk();

      return { ok: true, value };
    } catch (error) {
      return { ok: false, error };
    }
  }

  runAndForget(): void {
    this.thunk().catch((error) =>
      console.error("Pieper failed (runAndForget):", error)
    );
  }
}
