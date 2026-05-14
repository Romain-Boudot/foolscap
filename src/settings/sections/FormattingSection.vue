<script setup lang="ts">
// Just static doc; no logic needed.
</script>

<template>
  <div class="doc">
    <h1>Formatting</h1>
    <p class="lede">
      Markdown-light: type the syntax, see a colored hint. The source text
      always stays editable as plain characters.
    </p>

    <h2>Headings</h2>
    <p>
      One to six <code>#</code> followed by a space. Each level gets its own
      color, no size change.
    </p>
    <pre><span class="r"># Heading 1</span>
<span class="r">## Heading 2</span>
<span class="r">### Heading 3</span>
<span class="r">#### Heading 4</span>
<span class="r">##### Heading 5</span>
<span class="r">###### Heading 6</span></pre>
    <p class="lede">
      Note: a line starting with <code>#</code> is also a comment for the math
      engine, so titles never accidentally evaluate.
    </p>

    <h2>Tasks</h2>
    <p>
      Standard checkbox syntax. Toggle the current line — or create a new task
      from any line — with <kbd>Mod+Enter</kbd>.
    </p>
    <pre><span class="c">[ ]</span> buy milk
<span class="c">[x]</span> call mom
  <span class="c">[ ]</span> nested task</pre>
    <p>
      Done lines are muted and struck through. A counter <code>n/m</code>
      appears in the footer when the note has tasks.
    </p>

    <h2>Inline emphasis</h2>
    <table>
      <tbody>
        <tr>
          <td><code>**bold**</code></td>
          <td>renders bold</td>
        </tr>
        <tr>
          <td><code>*italic*</code> or <code>_italic_</code></td>
          <td>renders italic</td>
        </tr>
        <tr>
          <td><code>`code`</code></td>
          <td>colored monospace highlight</td>
        </tr>
      </tbody>
    </table>
    <p>
      Markers stay visible but dim — the source is always readable. Code wins
      over bold/italic on overlap; bold wins over italic.
    </p>

    <h2>What's not (intentionally)</h2>
    <ul>
      <li>No links — paste them as plain text</li>
      <li>No images — this is a scratchpad, not a doc editor</li>
      <li>No tables, no blockquotes, no horizontal rules</li>
      <li>No font-size changes on headings — full text feel</li>
    </ul>
  </div>
</template>
