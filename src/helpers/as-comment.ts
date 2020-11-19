import { Maybe } from '../utils/types';

export default function asComment(text: Maybe<string>): Maybe<string> {
  return text && `// ${text.split('\n').join('\n// ')}`;
}
