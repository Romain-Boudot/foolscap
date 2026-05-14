import { EditorView } from "@codemirror/view";

export const editorTheme = EditorView.theme(
  {
    "&": {
      color: "var(--fg)",
      backgroundColor: "transparent",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-content": {
      caretColor: "var(--accent)",
      // Top/bottom padding clears the floating title + footer bars so the
      // first/last visible lines aren't tucked under them. With a 28px
      // title bar we sit ~12px below it; same on the bottom.
      padding: "40px 22px 42px",
      letterSpacing: "-0.005em",
      // Grid overlay is painted here (not on .app) so it scrolls with
      // the content. The CSS variables are set on .app.grid-{size}.
      backgroundImage: "var(--grid-bg-image)",
      backgroundSize: "var(--grid-bg-size)",
    },

    // --- Caret: smooth ease-in-out blink overrides CodeMirror's default
    //     step function. Same keyframes name (`cm-cursor-blink`) so this
    //     just replaces the built-in animation shape, keeping the timing.
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent)",
      borderLeftWidth: "1.5px",
    },
    "@keyframes cm-cursor-blink": {
      "0%, 100%": { opacity: "1" },
      "50%": { opacity: "0.25" },
    },
    "@keyframes cm-cursor-blink-primary": {
      "0%, 100%": { opacity: "1" },
      "50%": { opacity: "0.25" },
    },
    "&.cm-focused .cm-cursor, &.cm-focused .cm-cursor-primary": {
      animationTimingFunction: "ease-in-out",
      animationDuration: "1.05s",
    },

    "&.cm-focused .cm-selectionBackground, ::selection, .cm-selectionBackground":
      {
        backgroundColor: "var(--selection)",
      },
    ".cm-line": { padding: "0 2px" },
    ".cm-scroller": { overflow: "auto" },

    // --- Custom scrollbar: thin, accent-dimmed, brightens on hover.
    ".cm-scroller::-webkit-scrollbar": {
      width: "5px",
      height: "5px",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      background: "transparent",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "rgba(255, 255, 255, 0.08)",
      borderRadius: "3px",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
      background: "rgba(255, 255, 255, 0.2)",
    },

    // --- Result + timer widgets: fade in on first mount. CodeMirror
    //     preserves the DOM via eq(), so the animation only plays for
    //     freshly-created widgets (line change / result change).
    ".cm-math-result": {
      color: "var(--accent)",
      opacity: "0.72",
      userSelect: "none",
      marginLeft: "6px",
      fontVariantNumeric: "tabular-nums",
      animation: "result-fade-in 140ms ease-out",
    },
    "@keyframes result-fade-in": {
      "0%": { opacity: "0" },
      "100%": { opacity: "0.72" },
    },
    ".cm-math-result.cm-math-error": {
      color: "#ff9a9a",
      opacity: "0.6",
    },
    ".cm-math-error-mark": {
      textDecoration: "underline wavy #ff9a9a",
      textDecorationThickness: "1px",
      textUnderlineOffset: "3px",
    },
    ".cm-math-var": {
      color: "var(--math-var)",
    },

    ".cm-timer-widget": {
      marginLeft: "8px",
      fontSize: "12px",
      fontFamily: "inherit",
      userSelect: "none",
      opacity: "0.85",
      letterSpacing: "0.01em",
      animation: "timer-fade-in 140ms ease-out",
    },
    "@keyframes timer-fade-in": {
      "0%": { opacity: "0" },
      "100%": { opacity: "0.85" },
    },
    ".cm-timer-countdown": { color: "#ffc857" },
    ".cm-timer-recurring": { color: "#5eead4" },
    ".cm-timer-at-time": { color: "#c084fc" },
    ".cm-timer-pomodoro": { color: "#ff7e6b" },
    ".cm-timer-widget.cm-timer-done": {
      opacity: "0.4",
      textDecoration: "line-through",
    },

    ".cm-task-marker": {
      color: "var(--accent)",
      fontWeight: "500",
    },
    ".cm-task-done": {
      color: "var(--fg-dim)",
      opacity: "0.55",
      textDecoration: "line-through",
      textDecorationColor: "var(--fg-dim)",
    },
    ".cm-task-marker-done": {
      color: "var(--fg-dim)",
      fontWeight: "400",
    },
    ".cm-heading": {
      fontWeight: "600",
    },
    ".cm-heading-1": { color: "var(--heading-1)" },
    ".cm-heading-2": { color: "var(--heading-2)" },
    ".cm-heading-3": { color: "var(--heading-3)" },
    ".cm-heading-4": { color: "var(--heading-4)" },
    ".cm-heading-5": { color: "var(--heading-5)" },
    ".cm-heading-6": { color: "var(--heading-6)" },
    ".cm-md-bold": {
      fontWeight: "700",
    },
    ".cm-md-italic": {
      fontStyle: "italic",
    },
    ".cm-md-code": {
      color: "#a7e870",
      background: "rgba(167, 232, 112, 0.07)",
      padding: "0 3px",
      borderRadius: "3px",
    },
    ".cm-md-marker": {
      color: "var(--fg-dim)",
      opacity: "0.55",
    },

    // ---------- Autocomplete popup ----------
    ".cm-tooltip.cm-tooltip-autocomplete": {
      background: "var(--surface)",
      backdropFilter: "blur(24px) saturate(150%)",
      WebkitBackdropFilter: "blur(24px) saturate(150%)",
      border: "1px solid var(--surface-border)",
      borderRadius: "10px",
      boxShadow: "0 18px 48px rgba(0, 0, 0, 0.4)",
      padding: "4px",
      overflow: "hidden",
      fontFamily: "inherit",
    },
    ".cm-tooltip-autocomplete > ul": {
      fontFamily: "inherit",
      fontSize: "12.5px",
      lineHeight: "1.5",
      maxHeight: "300px",
      margin: "0",
      padding: "0",
    },
    ".cm-tooltip-autocomplete > ul > li": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "5px 9px",
      borderRadius: "5px",
      cursor: "pointer",
      color: "var(--fg)",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      background: "rgba(122, 167, 255, 0.18)",
      color: "var(--accent)",
    },
    ".cm-completionLabel": {
      flex: "1",
      color: "inherit",
      minWidth: "0",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    ".cm-completionMatchedText": {
      textDecoration: "none",
      fontWeight: "600",
      color: "var(--accent)",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionMatchedText":
      {
        color: "var(--accent)",
        textShadow: "0 0 6px rgba(122, 167, 255, 0.4)",
      },
    ".cm-completionDetail": {
      color: "var(--fg-dim)",
      fontSize: "11px",
      fontStyle: "normal",
      marginLeft: "8px",
    },
    ".cm-completionIcon": {
      width: "14px",
      fontSize: "11px",
      opacity: "0.85",
      textAlign: "center",
      paddingRight: "0",
      flex: "0 0 auto",
    },
    ".cm-completionIcon-variable": { color: "var(--math-var)" },
    ".cm-completionIcon-function": { color: "#ff9e64" },
    ".cm-completionIcon-constant": { color: "#5eead4" },
    ".cm-completionIcon-keyword": { color: "#c084fc" },

    ".cm-completionSection-header, completion-section": {
      display: "block",
      padding: "8px 9px 3px",
      fontSize: "9px",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      fontWeight: "600",
      color: "var(--fg-dim)",
      opacity: "0.7",
      pointerEvents: "none",
    },

    // Info side-panel for completions with `info` text.
    ".cm-tooltip.cm-completionInfo": {
      background: "var(--surface)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid var(--surface-border)",
      borderRadius: "8px",
      padding: "8px 10px",
      fontSize: "11px",
      color: "var(--fg-dim)",
      maxWidth: "240px",
      marginLeft: "6px",
      lineHeight: "1.45",
      boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
    },
  },
  { dark: true },
);
