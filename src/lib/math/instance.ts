import { all, create } from "mathjs";
import { registerCurrencies } from "./currencies";

export const math = create(all, { number: "number" });
registerCurrencies(math);

// Aliases so that function-call forms like avg(1, 2) work just like the
// keyword forms (avg =) we expand at preprocess time.
math.import(
  {
    avg: math.mean,
    total: math.sum,
    stddev: math.std,
  },
  { override: true },
);
