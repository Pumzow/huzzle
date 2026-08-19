export function brandMarkup(className = ""): string {
  const classes = ["brand", className].filter(Boolean).join(" ");
  return `<div class="${classes}">
    <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <strong class="brand-name">Huzzle</strong>
  </div>`;
}
