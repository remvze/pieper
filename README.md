<div align="center">
  <h2>Pieper 🥧</h2>
  <p>A tiny, typesafe, asynchronous pipeline for functional programming in TypeScript.</p>
  <a href="https://npmjs.com/package/pieper"><strong>npm</strong></a> | <a href="https://buymeacoffee.com/remvze">Buy Me a Coffee</a>
</div>

### What Does It Do?

**Pieper** allows you to build complex, sequential data flows with a fluent, chainable API. It's designed to be async-native from the ground up, so you can mix synchronous and asynchronous operations seamlessly without cluttering your code with `await` at every step.

```ts
import { Pieper, type SafeResult } from "pieper";

async function slugify(
  title: string | null | undefined
): Promise<SafeResult<string>> {
  const pipe = Pieper.from(() => {
    if (typeof title !== "string" || title.trim().length === 0) {
      throw new Error("Input title cannot be empty");
    }

    return title;
  })
    .log("1. Original:")
    .map((s) => s.toLowerCase())
    .map((s) => s.normalize("NFD"))
    .map((s) => s.replace(/[\u0300-\u036f]/g, ""))
    .log("2. Normalized/Lowercased:")
    .map((s) => s.replace(/[^a-z0-9]+/g, "-"))
    .log("3. Hyphenated:")
    .map((s) => s.replace(/^-+|-+$/g, ""))
    .log("4. Trimmed:")
    .ifElse(
      (s) => s.length > 0,
      (s) => s,
      () => "n-a"
    );

  return pipe.runSafe();
}
```

### Features

- **Fluent & Chainable:** A clean, easy-to-read API (`.map().tap().if()...`).
- **Fully Typesafe:** TypeScript tracks the data type as it changes through the pipe.
- **Async-Native:** The entire pipeline is built on Promises. Any step can be `async`.
- **Robust Error Handling:** Use `.catch()` for internal recovery or `.runSafe()` for external, throw-free error handling.
- **Zero Dependencies:** A single, lightweight class.

### Installation

```bash
npm install pieper
# or
yarn add pieper
```

### Basic Usage

Import `Pieper` and create a new pipeline using `Pieper.of()`:

```ts
import { Pieper } from "pieper";

async function main() {
  const result = await Pieper.of(5)
    .map((x) => x + 2)
    .tap((x) => console.log("Current value:", x))
    .if(
      (x) => x > 5,
      (x) => x * 10
    )
    .log("After .if:")
    .catch((err) => {
      console.error("Oops:", err.message);

      return 0; // Recover with a default value
    })
    .run();

  console.log("Final result:", result); // Final result: 70
}

main();
```

### API Reference

#### Constructors

`Pieper.of<T>(value: T | Promise<T>): Pieper<T>`

Creates a new pipeline from a value or a promise.

```ts
const p1 = Pieper.of(10);
const p2 = Pieper.of(Promise.resolve(10));
```

`Pieper.from<T>(fn: () => T | Promise<T>): Pieper<T>`

Creates a new pipeline by executing a function. This is useful for deferring the creation of the initial value.

```ts
const p = Pieper.from(() => heavyComputation());
const pAsync = Pieper.from(() => fs.promises.readFile("..."));
```

#### Transformation

`.map<R>(fn: (value: T) => R | Promise<R>): Pieper<R>`

Transforms the value in the pipe from `T` to `R`. The `fn` can be sync or async.

```ts
Pieper.of(5)
  .map((x) => x.toString()) // Pieper<string>
  .map(async (str) => `Value is ${str}`); // Pieper<string>
```

`.if<R>(condition: (value: T) => boolean, thenFn: (value: T) => R | Promise<R>): Pieper<T | R>`

Conditionally transforms the value _only if_ the `condition` is true. If false, the original value is passed through.

```ts
Pieper.of(5).if(
  (x) => x < 10,
  (x) => x * 100
); // -> 500

Pieper.of(20).if(
  (x) => x < 10,
  (x) => x * 100
); // -> 20 (passes through)
```

`.ifElse<R1, R2>(condition: (value: T) => boolean, thenFn: (value: T) => R1, elseFn: (value: T) => R2): Pieper<R1 | R2>`

Transforms the value into one of two different types based on a condition.

```ts
Pieper.of(10).ifElse(
  (x) => x > 5, // condition
  (x) => "is-large", // thenFn
  (x) => "is-small" // elseFn
); // Pieper<string> -> "is-large"
```

#### Side Effects

`.tap(fn: (value: T) => void | Promise<void>): Pieper<T>`

Performs a side effect (like logging) without changing the value.

```ts
Pieper.of(10)
  .tap((x) => console.log(x))
  .map((x) => x * 2);
```

`.log(message?: string): Pieper<T>`

A convenience helper for `.tap()` to quickly log the current value.

```ts
Pieper.of({ id: 1, name: "Test" }).log("User data:");
// Logs: "User data:" { id: 1, name: "Test" }
```

#### Validation

`.assert(predicate: (value: T) => boolean, errorMessage: string | Error): Pieper<T>`

Enforces a contract. If the `predicate` is false, the pipe fails (rejects) with the given error.

```ts
Pieper.of(email).assert((str) => str.includes("@"), "Invalid email");
```

#### Error Handling

`.catch<R>(fn: (error: any) => R | Promise<R>): Pieper<T | R>`

Recovers from a failed pipeline. The `fn` receives the error and must return a new "success" value.

```ts
Pieper.from(() => {
  throw new Error("Kaboom!");
})
  .map((x) => x * 2)
  .catch((err) => {
    console.error(err.message); // "Kaboom!"

    return 0; // Recover with 0
  }); // Pieper<number>
```

`.finally(fn: () => void | Promise<void>): Pieper<T>`

Runs a function when the pipe settles (either on success or failure).

```ts
Pieper.of(db.connect())
  .map((conn) => conn.query("..."))
  .finally(() => db.close());
```

#### Terminators (Getting the Value Out)

Each step in the `Pieper` chain adds a new operation to the underlying promise. The work begins executing immediately, leveraging JavaScript's native event loop.

You can only access the final resolved value (or error) by calling one of these terminal methods.

`.run(): Promise<T>`

Returns the final promise in the chain. You can await this to get the final value. This promise **will reject** if any step in the pipe fails.

```ts
try {
  const result = await Pieper.of(10).run();

  console.log(result); // 10
} catch (e) {
  console.error("Failed:", e);
}
```

`.runSafe(): Promise<SafeResult<T>>`

Returns a promise that **never throws**. It always resolves with a `SafeResult` object:

- `{ ok: true, value: T }` on success.
- `{ ok: false, error: any }` on failure.

This is the recommended way to handle results in a functional style.

```ts
import { Pieper, type SafeResult } from "pieper";

const result = await Pieper.of("not-an-email")
  .assert((x) => x.includes("@"), "Bad email")
  .runSafe();

if (result.ok) {
  // result.value is string
  console.log("Success:", result.value);
} else {
  // result.error is the Error("Bad email")
  console.error("Failure:", result.error.message);
}
```

`.runAndForget(): void`

Executes the pipeline and ignores the result. Any unhandled errors will be logged to the console. Use this for "fire-and-forget" operations.

```ts
Pieper.of("Data")
  .map((data) => analytics.track(data))
  .runAndForget();
```
