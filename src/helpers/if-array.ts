export default function ifArray(
  attributes: any,
  dflt: string,
  options: any,
): string {
  const maxOccurs =
    attributes && attributes.maxOccurs ? attributes.maxOccurs.value : dflt;

  if (maxOccurs === 'unbounded' || parseInt(maxOccurs, 10) > 1) {
    return options.fn(this);
  }

  return '';
}
