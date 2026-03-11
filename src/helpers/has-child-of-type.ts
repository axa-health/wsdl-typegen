import byQName from '../utils/qname-comparator.js';

export default function hasChildOfType(children: any, nsUri: string, local: string, options: any) {
  if (children?.some(byQName(nsUri, local))) {
    return options.fn(this);
  }

  return '';
}
