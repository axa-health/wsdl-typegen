import resolveNs from '../utils/resolve-ns';

export default function isStringType(
  qName: string,
  el: any,
  options: any,
): boolean {
  const [nsAlias, local] = qName.split(':');
  const nsUri = resolveNs(nsAlias, el);
  return nsUri === 'http://www.w3.org/2001/XMLSchema' && local === 'string'
    ? options.fn(this)
    : options.inverse(this);
}
