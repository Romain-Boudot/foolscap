<script setup lang="ts">
const CATEGORIES = [
  { name: "Length", units: "m, km, cm, mm, in, ft, yd, mi, nmi" },
  { name: "Mass", units: "g, kg, mg, t, lb, oz" },
  { name: "Time", units: "s, ms, min, h, day, week, month, year" },
  { name: "Temperature", units: "K, degC, degF" },
  { name: "Volume", units: "l, ml, gallon, pint, cup, tbsp, tsp, m3" },
  { name: "Area", units: "m2, ft2, acre, hectare" },
  { name: "Speed", units: "m/s, km/h, mph, knot" },
  { name: "Energy", units: "J, kJ, cal, kWh, BTU, eV" },
  { name: "Power", units: "W, kW, hp" },
  { name: "Pressure", units: "Pa, kPa, bar, atm, psi, mmHg" },
  { name: "Frequency", units: "Hz, kHz, MHz, GHz" },
  { name: "Force", units: "N, lbf, kgf" },
  { name: "Angle", units: "rad, deg, grad" },
  { name: "Information", units: "bit, byte, kB, MB, GB, TB" },
  { name: "Electricity", units: "V, A, ohm, F, H, C" },
];
</script>

<template>
  <div class="doc">
    <h1>Units</h1>
    <p class="lede">
      Attach a unit to any number. mathjs handles the conversions and
      simplifications.
    </p>

    <table>
      <tbody>
        <tr v-for="c in CATEGORIES" :key="c.name">
          <td>{{ c.name }}</td>
          <td><code>{{ c.units }}</code></td>
        </tr>
      </tbody>
    </table>

    <h2>Examples</h2>
    <pre>5 km en mi =          <span class="r"># = 3.1068559 mi</span>
100 kg to lb =        <span class="r"># = 220.46226 lb</span>
20 degC to degF =     <span class="r"># = 68 degF</span>
1 GB en byte =        <span class="r"># = 1000000000 byte</span>
2 h + 30 min =        <span class="r"># = 2.5 h</span>
60 mph vers km/h =    <span class="r"># = 96.561 km/h</span></pre>

    <h2>Compound expressions</h2>
    <p>
      Units can be composed and arithmetic combines them:
    </p>
    <pre>10 m / 2 s =          <span class="r"># = 5 m / s</span>
9.81 m/s^2 * 5 s =    <span class="r"># = 49.05 m / s</span></pre>
  </div>
</template>
