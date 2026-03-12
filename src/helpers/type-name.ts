import { getRegistry } from '../utils/state.js';

const XSD_NS = 'http://www.w3.org/2001/XMLSchema';

export default function typeName(qName: string, el: Element): string {
  const [prefix, local] = qName.includes(':') ? qName.split(':') : [null, qName];

  // 1. Resolve the Namespace URI
  // If no prefix, look up the default namespace (null)
  const nsUri = prefix ? el.lookupNamespaceURI(prefix) : el.lookupNamespaceURI(null);

  // 2. Handle built-in XSD types
  if (nsUri === XSD_NS) {
    switch (local) {
      case 'string':
      case 'base64Binary':
      case 'token':
      case 'gYear':
      case 'anyURI':
      case 'QName':
        return 'string';
      case 'long':
      case 'int':
      case 'short':
      case 'decimal':
      case 'integer':
      case 'double':
      case 'float':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
      case 'dateTime':
      case 'time':
        return 'Date';
      case 'anyType':
        return 'any';
      default:
        return 'any';
    }
  }

  // 3. Handle Imported Namespaces
  // The importRegistry should map NS URIs to aliases (e.g., "http://schema.com" -> "i1")
  const registry = getRegistry(el.ownerDocument);
  if (nsUri && registry[nsUri]) {
    return `${registry[nsUri]}.${local}`;
  }

  // 4. Handle Local/Target Namespace
  // Jump directly to the document root via ownerDocument
  const root = el.ownerDocument.documentElement;
  const targetNamespace = root.getAttribute('targetNamespace');

  // If the namespace matches the file's targetNamespace, it's a local reference
  if (nsUri === targetNamespace || !nsUri) {
    return local;
  }

  throw new Error(`Can't build typename for "${qName}". Resolved Namespace: "${nsUri || 'none'}". 
  Make sure the namespace is imported or defined in targetNamespace.`);
}
