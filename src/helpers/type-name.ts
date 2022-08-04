import resolveNs from '../utils/resolve-ns';

export default function typeName(qName: string, el: any) {
  const [nsAlias, local] = qName.split(':');

  const nsUri = resolveNs(nsAlias, el);

  if (nsUri === 'http://www.w3.org/2001/XMLSchema') {
    switch (local) {
      case 'string':
      case 'base64Binary':
      case 'token':
      case 'gYear':
        return 'string';
      case 'long':
      case 'int':
      case 'short':
      case 'decimal':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
      case 'dateTime':
      case 'time':
        return 'Date';
      default:
        throw new Error(`Unknown built-in ${local} ${nsAlias}`);
    }
  }

  // check for imported stuff
  // this must go before targetNs as this might overrule it
  if (el.$$root.$$imports[nsUri]) {
    return `${el.$$root.$$imports[nsUri]}.${local}`;
  }

  // check for targetNameSpace
  if (el.$$root.$.targetNamespace.value === nsUri) {
    return local;
  }

  throw new Error(`Can't build typename for ${qName} ${nsUri}`);
}
