export default function ifOptional(attributes: any, dflt: any, options: any) {
  if (attributes.nillable && attributes.nillable.value === true) {
    return true;
  }

  const minOccurs =
    attributes && attributes.minOccurs ? attributes.minOccurs.value : dflt;

  if (minOccurs === '0') {
    return options.fn(this);
  }

  return '';
}
