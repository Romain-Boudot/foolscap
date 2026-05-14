import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const [, , inputArg, outputArg, sizeArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error("usage: bun run scripts/svg-to-png.ts <input.svg> <output.png> [size=1024]");
  process.exit(1);
}

const size = sizeArg ? Number.parseInt(sizeArg, 10) : 1024;
const input = resolve(inputArg);
const output = resolve(outputArg);

const svg = await fs.readFile(input);
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: size },
  background: "rgba(0,0,0,0)",
});
const png = resvg.render().asPng();

await fs.mkdir(dirname(output), { recursive: true });
await fs.writeFile(output, png);
console.log(`wrote ${output} (${png.length} bytes)`);
