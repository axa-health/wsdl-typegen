import byQName from '../utils/qname-comparator';

export default function eachOfType(
  children: any,
  nsUri: string,
  local: string,
  options: any,
) {
  if (!children) {
    return '';
  }

  if (!Array.isArray(children)) {
    throw new Error('children not an array...');
  }

  let returnValue = '';

  const filtered = children.filter(byQName(nsUri, local));

  filtered.forEach((child, index) => {
    returnValue += options.fn(child, {
      data: { last: index === filtered.length - 1 },
    });
  });

  return returnValue;
}
