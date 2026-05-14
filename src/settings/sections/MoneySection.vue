<script setup lang="ts">
import { computed } from "vue";
import { currencySymbol } from "../../lib/math/currencies";
import { currentRates } from "../../lib/math/rates";

const SYMBOLS = [
  { sym: "$", code: "USD" },
  { sym: "€", code: "EUR" },
  { sym: "£", code: "GBP" },
  { sym: "¥", code: "JPY" },
  { sym: "₹", code: "INR" },
  { sym: "₽", code: "RUB" },
  { sym: "₩", code: "KRW" },
  { sym: "₺", code: "TRY" },
];

type Row = { code: string; forward: string; inverse: string };

function fmtRate(value: number): string {
  if (value === 0) return "0";
  if (value >= 100) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (value < 0.01) return value.toFixed(5);
  return value.toFixed(4);
}

function inverseLabel(value: number, code: string): string {
  const sym = currencySymbol(code);
  const num = fmtRate(value);
  return sym ? `$1 = ${sym}${num}` : `$1 = ${num} ${code}`;
}

const rateRows = computed<Row[]>(() => {
  const rates = currentRates.value;
  const rows: Row[] = [];
  for (const code of Object.keys(rates).sort()) {
    if (code === "USD") continue;
    const rate = rates[code];
    if (typeof rate !== "number" || rate <= 0) continue;
    rows.push({
      code,
      forward: `1 ${code} = $${fmtRate(rate)}`,
      inverse: inverseLabel(1 / rate, code),
    });
  }
  return rows;
});
</script>

<template>
  <div class="doc">
    <h1>Money</h1>
    <p class="lede">
      21 currencies, symbol or ISO code, arithmetic across currencies with
      automatic conversion.
    </p>

    <h2>Symbols (input)</h2>
    <p>Place the symbol before <em>or</em> after the number — both parse:</p>
    <table>
      <tbody>
        <tr v-for="s in SYMBOLS" :key="s.sym">
          <td><code>{{ s.sym }}100</code> or <code>100{{ s.sym }}</code></td>
          <td>→ {{ s.code }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      Thousand separators are accepted in input (<code>$1,234.56</code>) and
      preserved in output.
    </p>

    <h2>Output format</h2>
    <p>Each currency uses its conventional layout:</p>
    <pre>$100.00      <span class="c"># USD — symbol before, 2 decimals</span>
€100.00      <span class="c"># EUR</span>
£100.00      <span class="c"># GBP</span>
¥1,000       <span class="c"># JPY — no decimals</span>
₩1,000       <span class="c"># KRW — no decimals</span>
100.00 ₽     <span class="c"># RUB — symbol after</span>
100.00 CHF   <span class="c"># fallback to code for unsymboled currencies</span></pre>

    <h2>Arithmetic across currencies</h2>
    <p>
      Mixed-currency expressions convert to the left-hand currency:
    </p>
    <pre>$100 + €50 =       <span class="r"># = $154.00</span>
100 jpy + 50 chf = <span class="r"># = ¥7,557</span>
salary - rent =    <span class="r"># = €3,800.00</span></pre>

    <h2>Conversions</h2>
    <pre>$100 to eur =      <span class="r"># = €92.59</span>
100 € en jpy =     <span class="r"># = ¥16,500</span>
1 GBP vers usd =   <span class="r"># = $1.25</span></pre>

    <h2>Rates</h2>
    <p>
      Live rates fetched from frankfurter.dev at launch (ECB data, free, no
      key), cached for 24h. Falls back to a bundled snapshot if offline.
      Manage from the <strong>Settings</strong> tab.
    </p>

    <h2>Current rates</h2>
    <div class="rates-list">
      <div v-for="r in rateRows" :key="r.code" class="rate-row">
        <div class="code">{{ r.code }}</div>
        <div class="forward">{{ r.forward }}</div>
        <div class="inverse">{{ r.inverse }}</div>
      </div>
    </div>
  </div>
</template>

<style>
.doc .rates-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}
.doc .rate-row {
  display: grid;
  grid-template-columns: 48px 1fr 1fr;
  align-items: center;
  padding: 6px 2px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  font-family:
    "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
}
.doc .rate-row .code {
  color: var(--accent);
  font-weight: 500;
}
.doc .rate-row .inverse {
  color: var(--fg-dim);
}
</style>
