import { XSD } from './utils/namespaces.js';

const XSD_TYPES: Record<string, string> = {
  string: 'string',
  base64Binary: 'string',
  token: 'string',
  gYear: 'string',
  anyURI: 'string',
  QName: 'string',
  long: 'number',
  int: 'number',
  short: 'number',
  decimal: 'number',
  integer: 'number',
  double: 'number',
  float: 'number',
  boolean: 'boolean',
  date: 'Date',
  dateTime: 'Date',
  time: 'Date',
  anyType: 'unknown',
};

export class SchemaRegistry {
  private readonly imports = new Map<string, string>();
  readonly targetNs: string;

  constructor(
    root: Element,
    private readonly onImport: (relativePath: string) => void,
  ) {
    this.targetNs = root.getAttribute('targetNamespace') ?? '';
  }

  registerImport(el: Element): { importName: string; importPath: string } | null {
    const ns = el.getAttribute('namespace');
    if (!ns) return null;

    if (this.imports.has(ns)) return null;
    this.imports.set(ns, `i${this.imports.size}`);

    const schemaLocation = el.getAttribute('schemaLocation');
    if (!schemaLocation) return null;

    this.onImport(schemaLocation);

    const importPath =
      schemaLocation.startsWith('.') || schemaLocation.startsWith('/')
        ? schemaLocation
        : `./${schemaLocation}`;

    return {
      importName: this.imports.get(ns)!,
      importPath: `${importPath}.js`,
    };
  }

  typeName(qname: string, el: Element): string {
    const colonIdx = qname.indexOf(':');
    const prefix = colonIdx >= 0 ? qname.slice(0, colonIdx) : null;
    const local = colonIdx >= 0 ? qname.slice(colonIdx + 1) : qname;

    const nsUri = el.lookupNamespaceURI(prefix);

    if (nsUri === XSD) {
      return XSD_TYPES[local] ?? 'unknown';
    }

    const importAlias = nsUri ? this.imports.get(nsUri) : undefined;
    if (importAlias) return `${importAlias}.${local}`;

    if (!nsUri || nsUri === this.targetNs) return local;

    throw new Error(`Unresolved type: "${qname}" (namespace: "${nsUri ?? 'none'}")`);
  }
}
