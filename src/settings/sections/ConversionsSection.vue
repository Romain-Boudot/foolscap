<script setup lang="ts">
const KEYWORDS = [
  { word: "to", lang: "English (native)" },
  { word: "in", lang: "English (native)" },
  { word: "into", lang: "English" },
  { word: "en", lang: "Français" },
  { word: "vers", lang: "Français" },
];
</script>

<template>
  <div class="doc">
    <h1>Conversions</h1>
    <p class="lede">
      All these keywords are interchangeable and case-insensitive.
    </p>

    <table>
      <tbody>
        <tr v-for="k in KEYWORDS" :key="k.word">
          <td><code>{{ k.word }}</code></td>
          <td>{{ k.lang }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Examples</h2>
    <pre>5 km to mi =          <span class="r"># = 3.1068559 mi</span>
5 km en mi =          <span class="r"># = 3.1068559 mi</span>
5 km vers mi =        <span class="r"># = 3.1068559 mi</span>
20 degC INTO degF =   <span class="r"># = 68 degF</span>
100 usd to eur =      <span class="r"># = €92.59</span></pre>

    <h2>Caveat</h2>
    <p>
      These words are reserved keywords inside math expressions — you can't
      use <code>en</code>, <code>vers</code>, <code>to</code>, <code>in</code>,
      or <code>into</code> as variable names. Same constraint mathjs already
      had with <code>to</code> and <code>in</code>.
    </p>
  </div>
</template>
