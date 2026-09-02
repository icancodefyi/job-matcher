import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] font-mono text-violet-700 dark:bg-zinc-800 dark:text-violet-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function renderLines(text: string): ReactNode[] {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let tableBuffer: string[][] = [];
  let listBuffer: string[] = [];
  let inCode = false;
  let codeBuffer: string[] = [];

  const flushTable = (key: number) => {
    if (tableBuffer.length < 2) return;
    const [head, , ...rows] = tableBuffer;
    nodes.push(
      <div key={`t${key}`} className="my-2 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
              {head.map((c, i) => (
                <th key={i} className="px-2 py-1 font-semibold text-zinc-800 dark:text-zinc-200">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-zinc-100 dark:border-zinc-800/60">
                {row.map((c, i) => (
                  <td key={i} className="px-2 py-1 text-zinc-600 dark:text-zinc-400">
                    {inline(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableBuffer = [];
  };

  const flushList = (key: number) => {
    if (!listBuffer.length) return;
    nodes.push(
      <ul key={`l${key}`} className="my-1.5 space-y-1 pl-5">
        {listBuffer.map((item, i) => (
          <li key={i} className="list-disc text-zinc-600 dark:text-zinc-400">
            {inline(item)}
          </li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      if (inCode) {
        inCode = false;
        nodes.push(
          <pre
            key={`c${i}`}
            className="my-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100 dark:bg-black"
          >
            {codeBuffer.join("\n")}
          </pre>,
        );
        codeBuffer = [];
      } else {
        flushTable(nodes.length);
        flushList(nodes.length);
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (line.startsWith("|")) {
      flushList(nodes.length);
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      tableBuffer.push(cells);
      return;
    }
    flushTable(nodes.length);

    if (/^\s*[-*•]\s+/.test(line)) {
      listBuffer.push(line.replace(/^\s*[-*•]\s+/, ""));
      return;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      listBuffer.push(line.replace(/^\s*\d+[.)]\s+/, ""));
      return;
    }
    flushList(nodes.length);

    if (line.startsWith("###")) {
      nodes.push(
        <h4 key={i} className="mt-3 mb-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">
          {inline(line.replace(/^###\s*/, ""))}
        </h4>,
      );
      return;
    }
    if (line.startsWith("##")) {
      nodes.push(
        <h3 key={i} className="mt-4 mb-1.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
          {inline(line.replace(/^##\s*/, ""))}
        </h3>,
      );
      return;
    }
    if (line.startsWith("#")) {
      nodes.push(
        <h2 key={i} className="mt-4 mb-1.5 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {inline(line.replace(/^#\s*/, ""))}
        </h2>,
      );
      return;
    }
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-2" />);
      return;
    }
    nodes.push(
      <p key={i} className="my-1 text-zinc-600 dark:text-zinc-400">
        {inline(line)}
      </p>,
    );
  });

  flushTable(nodes.length);
  flushList(nodes.length);
  return nodes;
}

export default function Markdown({ text }: { text: string }) {
  if (!text) return <p className="text-sm text-zinc-500">No output yet.</p>;
  return (
    <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
      {renderLines(text)}
    </div>
  );
}