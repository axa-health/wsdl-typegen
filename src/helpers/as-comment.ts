// If you are removing custom types, you can use a simple Utility type or string | undefined

import type { Maybe } from '../utils/types.js';

export default function asComment(text: Maybe<string>): string | undefined {
  if (!text || !text.trim()) return undefined;

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    // Drop leading/trailing blank lines, but keep intentional middle ones
    .filter((l, i, arr) => l || (i > 0 && i < arr.length - 1));

  if (lines.length === 0) return undefined;

  // Single line: Render as a standard double-slash comment
  if (lines.length === 1) return `// ${lines[0]}`;

  // Multi-line: Render as a JSDoc-style block comment
  return `/**\n${lines.map((l) => (l ? ` * ${l}` : ' *')).join('\n')}\n */`;
}
