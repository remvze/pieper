export type SafeResult<T, E = any> =
  | { ok: true; value: T }
  | { ok: false; error: E };

type MaybePromise<T> = T | Promise<T>;

export class Pieper<T> {
  private readonly value: Promise<T>;

  private constructor(value: Promise<T>) {
    this.value = value;
  }

  static of<T>(value: MaybePromise<T>) {
    return new Pieper(Promise.resolve(value));
  }

  static from<T>(fn: () => MaybePromise<T>) {
    const promise = new Promise<T>((resolve) => {
      resolve(fn());
    });

    return new Pieper(promise);
  }

  map<R>(fn: (value: T) => MaybePromise<R>) {
    return new Pieper(this.value.then(fn));
  }

  if<R>(
    condition: (value: T) => MaybePromise<boolean>,
    thenFn: (value: T) => MaybePromise<R>
  ) {
    return this.ifElse(condition, thenFn, (value) => value);
  }

  ifElse<R1, R2>(
    condition: (value: T) => MaybePromise<boolean>,
    thenFn: (value: T) => MaybePromise<R1>,
    elseFn: (value: T) => MaybePromise<R2>
  ) {
    const newValue = this.value.then(async (value) => {
      const conditionResult = await Promise.resolve(condition(value));

      if (conditionResult) return thenFn(value);
      else return elseFn(value);
    });

    return new Pieper(newValue);
  }

  tap(fn: (value: T) => MaybePromise<void>) {
    const newValue = this.value.then(async (value) => {
      await Promise.resolve(fn(value));

      return value; // Pass the original value through
    });

    return new Pieper(newValue);
  }

  log(message?: string) {
    return this.tap((value) => {
      if (message) console.log(message, value);
      else console.log(value);
    });
  }

  catch<R>(fn: (error: any) => MaybePromise<R>) {
    return new Pieper(this.value.catch(fn));
  }

  finally(fn: () => MaybePromise<void>) {
    return new Pieper(this.value.finally(fn));
  }

  assert(
    predicate: (value: T) => MaybePromise<boolean>,
    errorMessageOrError: string | Error
  ) {
    const newValue = this.value.then(async (value) => {
      const isValid = await Promise.resolve(predicate(value));

      if (!isValid) {
        const error =
          typeof errorMessageOrError === "string"
            ? new Error(errorMessageOrError)
            : errorMessageOrError;

        return error;
      }

      return value; // Pass value through if valid
    });

    return new Pieper(newValue);
  }

  run() {
    return this.value;
  }

  async runSafe(): Promise<SafeResult<T>> {
    try {
      const value = await this.value;

      return { ok: true, value };
    } catch (error) {
      return { ok: false, error };
    }
  }

  runAndForget() {
    this.value.catch((error) => {
      console.error("Pieper failed (runAndForget):", error);
    });
  }
}
