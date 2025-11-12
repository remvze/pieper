import { Pipe } from "../src";

async function one() {
  const pipeline = await Pipe.of(5)
    .map((x) => x + 2)
    .tap((x) => console.log("After addition:", x))
    .if(
      (x) => x > 5,
      (x) => x * 10
    )
    .log("After .if:")
    .assert((x) => x > 50, "Value is not big enought!")
    .catch((err) => {
      console.error("Error", err.message);
    })
    .run();

  console.log("Final result:", pipeline);
}

async function two() {
  const result = await Pipe.of(1)
    .map((x) => x * 10)
    .assert((x) => x > 20, "Value must be over 20")
    .map((x) => `Value is ${x}`)
    .runSafe();

  if (result.ok) {
    console.log("Success.", result.value);
  } else {
    console.error("Failed.", result.error.message);
  }
}

one()
  .then(() => console.log("==============="))
  .then(two);
