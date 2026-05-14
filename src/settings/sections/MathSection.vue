<script setup lang="ts">
const OPERATORS = [
  { sym: "+ - * /", desc: "add, subtract, multiply, divide" },
  { sym: "^", desc: "power · 2^10 = 1024" },
  { sym: "%", desc: "modulo · 10 % 3 = 1" },
  { sym: "!", desc: "factorial · 6! = 720" },
  { sym: "== != < > <= >=", desc: "comparisons" },
  { sym: "and or not xor", desc: "logical" },
];

const FUNCTIONS = [
  { name: "abs sign", desc: "absolute value, sign" },
  { name: "sqrt cbrt", desc: "square / cube root" },
  { name: "exp log log2 log10", desc: "exponential / logarithms" },
  { name: "sin cos tan", desc: "trig (radians, or unit deg)" },
  { name: "asin acos atan atan2", desc: "inverse trig" },
  { name: "floor ceil round", desc: "rounding" },
  { name: "min max sum mean median", desc: "aggregates" },
  { name: "std variance", desc: "statistics" },
  { name: "gcd lcm mod", desc: "number theory" },
  { name: "factorial(n)", desc: "n!" },
  { name: "combinations(n, k)", desc: "binomial coefficient" },
  { name: "hypot(a, b)", desc: "√(a² + b²)" },
];

const CONSTANTS = ["pi", "e", "phi", "i", "Infinity", "NaN"];

const AGGREGATES = [
  { name: "sum / total", desc: "sum of all variables defined above" },
  { name: "avg / mean", desc: "arithmetic mean" },
  { name: "median", desc: "middle value (same as p50)" },
  { name: "min / max", desc: "smallest / largest value" },
  { name: "range", desc: "max − min" },
  { name: "count", desc: "number of numeric variables" },
  { name: "std / stddev", desc: "standard deviation" },
  { name: "variance", desc: "variance" },
  { name: "pNN", desc: "NNth percentile · p25 / p50 / p95 / p99 / …" },
];
</script>

<template>
  <div class="doc">
    <h1>Math</h1>
    <p class="lede">
      Type any expression and end the line with <code>=</code> to see the result.
      Variables defined with <code>name = value</code> persist downstream.
    </p>

    <h2>Operators</h2>
    <table>
      <tbody>
        <tr v-for="o in OPERATORS" :key="o.sym">
          <td><code>{{ o.sym }}</code></td>
          <td>{{ o.desc }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Functions</h2>
    <table>
      <tbody>
        <tr v-for="f in FUNCTIONS" :key="f.name">
          <td><code>{{ f.name }}</code></td>
          <td>{{ f.desc }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Constants</h2>
    <div>
      <span v-for="c in CONSTANTS" :key="c" class="pill">{{ c }}</span>
    </div>

    <h2>Define a function</h2>
    <pre>square(x) = x^2
square(5) =       <span class="c"># = 25</span></pre>

    <h2>Examples</h2>
    <pre>2 + 2 =                  <span class="c"># = 4</span>
sqrt(144) =              <span class="c"># = 12</span>
sin(45 deg) =            <span class="c"># = 0.7071068</span>
log(1000, 10) =          <span class="c"># = 3</span>
factorial(6) =           <span class="c"># = 720</span>
mean(1, 2, 3, 4, 5) =    <span class="c"># = 3</span>
2^10 =                   <span class="c"># = 1024</span></pre>

    <h2>Aggregates over all variables</h2>
    <p>
      These keywords stand in for a function over every numeric variable
      you've defined above. If you define a variable with the same name, your
      variable wins — no substitution.
    </p>
    <table>
      <tbody>
        <tr v-for="a in AGGREGATES" :key="a.name">
          <td><code>{{ a.name }}</code></td>
          <td>{{ a.desc }}</td>
        </tr>
      </tbody>
    </table>
    <pre>rent = 1200
food = 400
salary = 5000

sum =                <span class="r"># = 6600</span>
avg =                <span class="r"># = 2200</span>
median =             <span class="r"># = 1200</span>
p95 =                <span class="r"># = 4620</span>
range =              <span class="r"># = 4600</span>
count =              <span class="r"># = 3</span></pre>
    <p class="lede">
      Function-call forms (<code>sum(a, b)</code>, <code>mean([x, y])</code>,
      <code>avg(1, 2, 3)</code>) bypass the keyword substitution and behave
      exactly like normal mathjs. <code>avg</code>, <code>total</code>, and
      <code>stddev</code> are registered as aliases for
      <code>mean</code> / <code>sum</code> / <code>std</code>.
    </p>

    <h2>Glob filtering inside aggregates</h2>
    <p>
      Inside an aggregate function call you can use <code>*</code> (any run of
      letters/digits/underscores) and <code>?</code> (a single char) to pull in
      multiple variables by name pattern:
    </p>
    <pre>q1_revenue = 12000
q2_revenue = 14000
q3_revenue = 16000
fixed_cost = 5000

sum(*_revenue) =      <span class="r"># = 42000</span>
mean(*_revenue) =     <span class="r"># = 14000</span>
sum(*_revenue, -fixed_cost) =   <span class="r"># mix glob with literal vars</span>
sum(*) =              <span class="r"># every numeric variable</span></pre>

    <h2>Comments</h2>
    <p>
      Lines starting with <code>#</code> are ignored. Plain text is fine too —
      only lines that look like math or end with <code>=</code> get parsed.
    </p>
  </div>
</template>
