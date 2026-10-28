export function brandMarkup(className = "", tag: "div" | "span" = "div"): string {
  const classes = ["brand", className].filter(Boolean).join(" ");
  return `<${tag} class="${classes}">
    <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <strong class="brand-name">Huzzle</strong>
  </${tag}>`;
}
