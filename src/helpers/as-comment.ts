export default function asComment(text: string | null | undefined): string | undefined {
  if (!text || !text.trim()) return undefined;

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => l || (i > 0 && i < arr.length - 1));

  if (lines.length === 0) return undefined;
  if (lines.length === 1) return `/** ${lines[0]} */`;
  return `/**\n${lines.map((l) => (l ? ` * ${l}` : ' *')).join('\n')}\n */`;
}
