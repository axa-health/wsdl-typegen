import byQName from '../utils/qname-comparator';

export default function hasChildOfType(
  children: any,
  nsUri: string,
  local: string,
  options: any,
) {
  if (children && children.some(byQName(nsUri, local))) {
    return options.fn(this);
  }

  return '';
}
