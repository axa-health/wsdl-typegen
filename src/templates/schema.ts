import asComment from '../helpers/as-comment.js';
import type { SchemaRegistry } from '../schema-registry.js';
import { children, childrenNS, lines } from '../utils/dom.js';
import { XSD } from '../utils/namespaces.js';

/** Extracts the local name from a QName without namespace validation. */
function localName(qname: string): string {
  const colonIdx = qname.indexOf(':');
  return colonIdx >= 0 ? qname.slice(colonIdx + 1) : qname;
}

function isRepeated(maxOccurs: string | null): boolean {
  return maxOccurs === 'unbounded' || parseInt(maxOccurs ?? '1', 10) > 1;
}

function isOptional(minOccurs: string | null): boolean {
  return minOccurs === '0';
}

/** Prepends a JSDoc comment line to a body string, or returns body as-is. */
function withComment(comment: string | undefined, body: string): string {
  return comment ? `${comment}\n${body}` : body;
}

// ---- Public entry point ----

export function renderSchema(root: Element, registry: SchemaRegistry): string {
  return lines([
    ...childrenNS(root, XSD, 'import').flatMap((el) => {
      const info = registry.registerImport(el);
      return info ? [`import type * as ${info.importName} from '${info.importPath}';`] : [];
    }),
    ...childrenNS(root, XSD, 'element').map((el) => elementTypeDecl(el, registry)),
    ...childrenNS(root, XSD, 'complexType').map((ct) =>
      withComment(
        extractAnnotation(ct),
        `export type ${ct.getAttribute('name')} = ${complexType(ct, registry)}`,
      ),
    ),
    ...childrenNS(root, XSD, 'simpleType').map((st) =>
      withComment(
        extractAnnotation(st),
        `export type ${st.getAttribute('name')} = ${simpleType(st, registry)}`,
      ),
    ),
  ]);
}

// ---- Element declarations ----

function elementTypeDecl(el: Element, registry: SchemaRegistry): string {
  return withComment(
    extractAnnotation(el),
    `export type ${el.getAttribute('name')}_element = ${elementContent(el, registry)};`,
  );
}

function elementContent(el: Element, registry: SchemaRegistry): string {
  const arr = isRepeated(el.getAttribute('maxOccurs'));
  const opt = isOptional(el.getAttribute('minOccurs'));

  let inner: string;
  const fixed = el.getAttribute('fixed');
  const type = el.getAttribute('type');

  if (fixed) {
    const isStr = type ? type.includes('string') : true;
    inner = isStr ? `'${fixed}'` : fixed;
  } else if (type) {
    inner = registry.typeName(type, el);
  } else {
    const complex = childrenNS(el, XSD, 'complexType')[0];
    const simple = childrenNS(el, XSD, 'simpleType')[0];
    if (complex) inner = complexType(complex, registry);
    else if (simple) inner = simpleType(simple, registry);
    else inner = '{}';
  }

  const wrapped = arr ? `ReadonlyArray<${inner}>` : inner;
  return opt ? `(${wrapped}) | null | undefined` : wrapped;
}

// ---- Element as a property inside a sequence/choice ----

function elementProp(el: Element, registry: SchemaRegistry): string {
  const name = el.getAttribute('name');
  const ref = el.getAttribute('ref');
  const opt = isOptional(el.getAttribute('minOccurs'));

  if (ref) {
    const refLocal = localName(ref);
    return withComment(
      extractAnnotation(el),
      `${refLocal}${opt ? '?' : ''}: ${registry.typeName(ref, el)}_element;`,
    );
  }

  return withComment(
    extractAnnotation(el),
    `${name}${opt ? '?' : ''}: ${elementContent(el, registry)};`,
  );
}

// ---- Complex types ----

function complexType(el: Element, registry: SchemaRegistry): string {
  const seq = childrenNS(el, XSD, 'sequence')[0];
  const ch = childrenNS(el, XSD, 'choice')[0];
  const all = childrenNS(el, XSD, 'all')[0];
  const simpleContent = childrenNS(el, XSD, 'simpleContent')[0];
  const complexContent = childrenNS(el, XSD, 'complexContent')[0];
  const attrs = attributes(el, registry);

  if (seq) return `{\n${sequence(seq, registry)}\n${attrs}}`;
  if (ch) return `${choice(ch, registry)}${attrs}`;
  if (all) return `{\n${sequence(all, registry)}\n${attrs}}`;

  const content = simpleContent ?? complexContent;
  if (content) {
    const ext = childrenNS(content, XSD, 'extension')[0];
    const rest = childrenNS(content, XSD, 'restriction')[0];
    const container = ext ?? rest;
    if (container) {
      const base = container.getAttribute('base');
      if (base) return `${registry.typeName(base, el)} & {${attributes(container, registry)}}`;
    }
  }

  return attrs ? `{\n${attrs}}` : '{}';
}

function sequence(el: Element, registry: SchemaRegistry): string {
  return lines([
    ...childrenNS(el, XSD, 'element').map((child) => elementProp(child, registry)),
    ...childrenNS(el, XSD, 'any').map(() => '[key: string]: unknown;'),
  ]);
}

function choice(el: Element, registry: SchemaRegistry): string {
  const arr = isRepeated(el.getAttribute('maxOccurs'));
  const opt = isOptional(el.getAttribute('minOccurs'));

  const members = children(el).map((child) => {
    if (child.namespaceURI === XSD) {
      if (child.localName === 'element') return `{ ${elementProp(child, registry)} }`;
      if (child.localName === 'sequence') return `{ ${sequence(child, registry)} }`;
      if (child.localName === 'group') return groupRef(child, registry);
    }
    return 'unknown';
  });

  if (members.length === 0) return '{}';
  let type = members.join(' | ');
  if (arr) type = `ReadonlyArray<${type}>`;
  if (opt) type = `(${type}) | null | undefined`;
  return type;
}

function contentModel(el: Element, registry: SchemaRegistry): string {
  return lines(
    children(el).map((child) => {
      if (child.namespaceURI !== XSD) return null;
      switch (child.localName) {
        case 'sequence':
        case 'all':
          return sequence(child, registry);
        case 'choice':
          return choice(child, registry);
        case 'group':
          return groupRef(child, registry);
        default:
          return null;
      }
    }),
  );
}

function groupRef(el: Element, registry: SchemaRegistry): string {
  const ref = el.getAttribute('ref');
  if (ref) {
    const refLocal = localName(ref);
    const root = el.ownerDocument.documentElement;
    const groupDef = children(root).find(
      (n) => n.namespaceURI === XSD && n.localName === 'group' && n.getAttribute('name') === refLocal,
    );
    return groupDef
      ? contentModel(groupDef, registry)
      : `/* group ref: ${refLocal} not found */ unknown`;
  }
  return contentModel(el, registry);
}

// ---- Attributes ----

function attributes(el: Element, registry: SchemaRegistry): string {
  const attrs = childrenNS(el, XSD, 'attribute');
  if (attrs.length === 0) return '';

  return lines([
    'attributes?: {',
    ...attrs.map((a) => {
      const name = a.getAttribute('name');
      const type = a.getAttribute('type') ?? 'string';
      const opt = a.getAttribute('use') !== 'required';
      return withComment(
        extractAnnotation(a),
        `${name}${opt ? '?' : ''}: ${registry.typeName(type, a)};`,
      );
    }),
    '},',
  ]);
}

// ---- Simple types ----

function simpleType(el: Element, registry: SchemaRegistry): string {
  const rest = childrenNS(el, XSD, 'restriction')[0];
  if (rest) {
    const base = rest.getAttribute('base') ?? 'string';
    const enums = childrenNS(rest, XSD, 'enumeration');
    if (enums.length > 0) return enums.map((e) => `'${e.getAttribute('value')}'`).join(' | ');
    return registry.typeName(base, el);
  }
  return 'string';
}

// ---- Annotation / documentation ----

function extractAnnotation(el: Element): string | undefined {
  const annotation = childrenNS(el, XSD, 'annotation')[0];
  if (!annotation) return undefined;
  const doc = childrenNS(annotation, XSD, 'documentation')[0];
  return doc ? asComment(doc.textContent) : undefined;
}
