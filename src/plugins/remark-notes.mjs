// remark plugin: in a trip's notes.md, turns each "## Heading" into a level-3
// heading. On the trip page the notes sit under their own "Trip notes" <h2>,
// so your ## sections are one level below it. The file itself isn't changed.
// Other files are left alone.

import path from "node:path";

export default function remarkNotes() {
  return function transform(tree, file) {
    if (!file.path || path.basename(file.path) !== "notes.md") return;

    for (const node of tree.children) {
      if (node.type === "heading" && node.depth === 2) node.depth = 3;
    }
  };
}
