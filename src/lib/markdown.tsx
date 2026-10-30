import type { ReactNode } from "react";

/**
 * Minimal, safe renderer for journal bodies: "## " headings, "### " subheadings, "- " lists and
 * paragraphs. Content is rendered as text nodes — never raw HTML — so stored content can't inject script.
 */
export function renderSimpleMarkdown(body: string): ReactNode[] {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    if (block.startsWith("### ")) return <h3 key={i}>{block.slice(4)}</h3>;
    if (block.startsWith("## ")) return <h2 key={i}>{block.slice(3)}</h2>;
    if (lines.every((l) => l.startsWith("- "))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
    return <p key={i}>{block}</p>;
  });
}
