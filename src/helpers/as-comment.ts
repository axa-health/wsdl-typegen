import type { Maybe } from '../utils/types.js';

export default function asComment(text: Maybe<string>): Maybe<string> {
  return text && `// ${text.split('\n').join('\n// ')}`;
}
