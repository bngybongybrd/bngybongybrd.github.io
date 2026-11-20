// rehype plugin: wraps runs of Chinese characters in <span lang="zh-Hans">.
// It runs on the HTML syntax tree ("hast"). Marking the language lets the
// browser pick proper Simplified Chinese glyphs, and lets our CSS use the
// system CJK fonts (see :lang(zh) in base.css) without a large web font.
//
//   "Erhai Lake (洱海)."  →  "Erhai Lake (" <span lang="zh-Hans">洱海</span> ")."

// Han characters, plus CJK punctuation (、。「」) and full-width forms (，！？).
const CHINESE = /[\p{Script=Han}　-〿＀-￯]+/gu;

// Don't touch code or anything already marked with a language.
const SKIP_TAGS = new Set(["code", "pre", "script", "style", "svg"]);

export default function rehypeZhHans() {
  return function transform(tree) {
    walk(tree);
  };
}

function walk(node) {
  if (!node.children) return;
  const next = [];
  for (const child of node.children) {
    if (child.type === "text") {
      next.push(...splitText(child.value));
    } else {
      const skip =
        child.type === "element" && (SKIP_TAGS.has(child.tagName) || child.properties?.lang != null);
      if (!skip) walk(child);
      next.push(child);
    }
  }
  node.children = next;
}

// Splits one text node into plain text and <span lang="zh-Hans"> pieces.
function splitText(value) {
  const pieces = [];
  let last = 0;
  for (const match of value.matchAll(CHINESE)) {
    if (match.index > last) pieces.push({ type: "text", value: value.slice(last, match.index) });
    pieces.push({
      type: "element",
      tagName: "span",
      properties: { lang: "zh-Hans" },
      children: [{ type: "text", value: match[0] }],
    });
    last = match.index + match[0].length;
  }
  if (last === 0) return [{ type: "text", value }];
  if (last < value.length) pieces.push({ type: "text", value: value.slice(last) });
  return pieces;
}
