// remark plugin: in a trip's notes.md, turns each "## Heading" section into a
// collapsible card built from native HTML (<details> + <summary>), so it opens
// and closes without any JavaScript. Other files are left alone.
//
//   ## Budget            →   <details class="note-card">
//   text...                     <summary>Budget</summary>
//                               <div class="note-card-body">text...</div>
//                             </details>

import path from "node:path";

export default function remarkNotesCards() {
  return function transform(tree, file) {
    if (!file.path || path.basename(file.path) !== "notes.md") return;

    const output = [];
    let card = null;

    for (const node of tree.children) {
      if (node.type === "heading" && node.depth === 2) {
        card = {
          type: "noteCard",
          data: { hName: "details", hProperties: { className: ["note-card"] } },
          children: [
            { type: "noteSummary", data: { hName: "summary" }, children: node.children },
            { type: "noteBody", data: { hName: "div", hProperties: { className: ["note-card-body"] } }, children: [] },
          ],
        };
        output.push(card);
      } else if (card) {
        card.children[1].children.push(node);
      } else {
        output.push(node); // anything before the first ## stays as normal text
      }
    }

    tree.children = output;
  };
}
