import asComment from '../helpers/as-comment.js';
import type { TemplateHelpers } from '../utils/types.js';

const WSDL = 'http://schemas.xmlsoap.org/wsdl/';
const XS = 'http://www.w3.org/2001/XMLSchema';

/**
 * Generic helper to get ALL child elements (nodeType 1).
 */
export function getElements(parent: Node): Element[] {
  if (!parent.childNodes) return [];
  return Array.from(parent.childNodes).filter((node): node is Element => node.nodeType === 1);
}

/**
 * Utility to get child elements by Namespace and LocalName.
 */
export function getChildrenNS(parent: Node, ns: string, localName: string): Element[] {
  return getElements(parent).filter((el) => {
    return el.localName === localName && el.namespaceURI === ns;
  });
}

/** Join non-empty strings with newlines. */
function lines(items: (string | null | undefined | false)[]): string {
  return items.filter((s): s is string => typeof s === 'string').join('\n');
}

// ---- WSDL templates ----

export function wsdl(root: Element, h: TemplateHelpers): string {
  const bindings = getChildrenNS(root, WSDL, 'binding');
  const services = getChildrenNS(root, WSDL, 'service');
  const messages = getChildrenNS(root, WSDL, 'message');
  const types = getChildrenNS(root, WSDL, 'types');

  return lines([
    `import type { Client as SoapClient } from 'soap';`,
    '',
    wsdlDocumentation(root) || null,
    ...types.map((t) => h.inlineSchema(t)),
    'export interface Client extends SoapClient {',
    ...services.map((s) => `${s.getAttribute('name')}: ${s.getAttribute('name')},`),
    ...bindings.flatMap((b) =>
      getChildrenNS(b, WSDL, 'operation').flatMap((op) => {
        const opCtx = h.withInputOutputAndFaults(op);
        if (!opCtx) return [];
        return [wsdlDocumentation(op) || null, wsdlOperationSync(opCtx), wsdlOperationAsync(opCtx)];
      }),
    ),
    '};',
    '',
    ...services.flatMap((s) => [
      `export type ${s.getAttribute('name')} = {`,
      ...getChildrenNS(s, WSDL, 'port').map(
        (p) => `${p.getAttribute('name')}: ${h.localPart(p.getAttribute('binding') || '')},`,
      ),
      '};',
    ]),
    '',
    ...bindings.flatMap((b) => [
      `export type ${b.getAttribute('name')} = {`,
      ...getChildrenNS(b, WSDL, 'operation').flatMap((op) => {
        const opCtx = h.withInputOutputAndFaults(op);
        if (!opCtx) return [];
        return [wsdlDocumentation(op) || null, wsdlOperationSync(opCtx)];
      }),
      '};',
    ]),
    '',
    ...messages.flatMap((msg) =>
      getChildrenNS(msg, WSDL, 'part').map(
        (p) =>
          `export type ${msg.getAttribute('name')}__${p.getAttribute('name')} =\n${h.typeName(p.getAttribute('element') || '', p)}_element;`,
      ),
    ),
  ]);
}

function wsdlDocumentation(element: Element): string {
  return getChildrenNS(element, WSDL, 'documentation')
    .map((doc) => asComment(doc.textContent || ''))
    .filter((s): s is string => s != null)
    .join('\n');
}

function wsdlOperationSync(ctx: {
  operationName: string;
  inputType: string;
  outputType: string;
}): string {
  return `${ctx.operationName}: (
    input: ${ctx.inputType} | { _xml: string },
    cb: (
        err: unknown,
        result: ${ctx.outputType},
        rawResponse: string,
        soapHeader: Record<string, unknown>,
        rawRequest: string
    ) => void,
    options?: Record<string, unknown>,
    extraHeaders?: Record<string, unknown>,
) => void,`;
}

function wsdlOperationAsync(ctx: {
  operationName: string;
  inputType: string;
  outputType: string;
}): string {
  return `${ctx.operationName}Async: (
    input: ${ctx.inputType} | { _xml: string },
    options?: Record<string, unknown>,
    extraHeaders?: Record<string, unknown>,
) => Promise<[
    ${ctx.outputType},
    string,
    Record<string, unknown>,
    string
]>,`;
}

// ---- Schema templates ----

export function schemaContent(root: Element, h: TemplateHelpers): string {
  return lines([
    ...getChildrenNS(root, XS, 'import').flatMap((el) => {
      const info = h.registerImport(el);
      return info ? [`import type * as ${info.importName} from '${info.importPath}';`] : [];
    }),
    ...getChildrenNS(root, XS, 'element').map((el) => schemaElementType(el, h)),
    ...getChildrenNS(root, XS, 'complexType').map((ct) => {
      const comment = extractAnnotation(ct);
      const prefix = comment ? `${comment}\n` : '';
      return `${prefix}export type ${ct.getAttribute('name')} = ${schemaComplexType(ct, h)}`;
    }),
    ...getChildrenNS(root, XS, 'simpleType').map((st) => {
      const comment = extractAnnotation(st);
      const prefix = comment ? `${comment}\n` : '';
      return `${prefix}export type ${st.getAttribute('name')} = ${schemaSimpleType(st, h)}`;
    }),
  ]);
}

function schemaElementType(el: Element, h: TemplateHelpers): string {
  const comment = extractAnnotation(el);
  const prefix = comment ? `${comment}\n` : '';
  return `${prefix}export type ${el.getAttribute('name')}_element = ${schemaElementContent(el, h)};`;
}

function schemaElementContent(el: Element, h: TemplateHelpers): string {
  const minOccurs = el.getAttribute('minOccurs');
  const maxOccurs = el.getAttribute('maxOccurs');
  const isArr = maxOccurs === 'unbounded' || parseInt(maxOccurs || '1', 10) > 1;
  const isOpt = minOccurs === '0';

  let inner: string;
  const fixed = el.getAttribute('fixed');
  const type = el.getAttribute('type');

  if (fixed) {
    const isStr = type ? type.includes('string') : true;
    inner = isStr ? `'${fixed}'` : fixed;
  } else if (type) {
    inner = h.typeName(type, el);
  } else {
    const complex = getChildrenNS(el, XS, 'complexType')[0];
    const simple = getChildrenNS(el, XS, 'simpleType')[0];
    if (complex) inner = schemaComplexType(complex, h);
    else if (simple) inner = schemaSimpleType(simple, h);
    else inner = '{}';
  }

  const wrapped = isArr ? `ReadonlyArray<${inner}>` : inner;
  return isOpt ? `(${wrapped}) | null | undefined` : wrapped;
}

function schemaContentModel(el: Element, h: TemplateHelpers): string {
  return lines([
    ...getElements(el).map((child) => {
      if (child.namespaceURI !== XS) return null;
      switch (child.localName) {
        case 'sequence':
        case 'all':
          return schemaSequence(child, h);
        case 'choice':
          return schemaChoice(child, h);
        case 'group':
          return schemaGroupRef(child, h);
        default:
          return null;
      }
    }),
  ]);
}

function schemaGroupRef(el: Element, h: TemplateHelpers): string {
  const ref = el.getAttribute('ref');

  if (ref) {
    const groupLocalName = h.localPartNoValidation(ref);
    const root = el.ownerDocument.documentElement;

    const groupDef = getElements(root).find((node) => {
      return (
        node.namespaceURI === XS &&
        node.localName === 'group' &&
        node.getAttribute('name') === groupLocalName
      );
    });

    if (groupDef) return schemaContentModel(groupDef, h);
    return `/* group ref: ${groupLocalName} not found */ unknown`;
  }

  return schemaContentModel(el, h);
}

function schemaChoice(el: Element, h: TemplateHelpers): string {
  const minOccurs = el.getAttribute('minOccurs');
  const maxOccurs = el.getAttribute('maxOccurs');

  const isOpt = minOccurs === '0';
  const isArr = maxOccurs === 'unbounded' || parseInt(maxOccurs || '1', 10) > 1;

  const members: string[] = getElements(el).map((child) => {
    const ln = child.localName;
    const ns = child.namespaceURI;

    if (ns === XS) {
      if (ln === 'element') return `{ ${schemaElementAttribute(child, h)} }`;
      if (ln === 'sequence') return `{ ${schemaSequence(child, h)} }`;
      if (ln === 'group') return schemaGroupRef(child, h);
    }
    return 'unknown';
  });

  if (members.length === 0) return '{}';

  let type = members.join(' | ');
  if (isArr) type = `ReadonlyArray<${type}>`;
  if (isOpt) type = `(${type}) | null | undefined`;

  return type;
}

function schemaComplexType(el: Element, h: TemplateHelpers): string {
  const typeBody: string[] = [];

  const sequence = getChildrenNS(el, XS, 'sequence')[0];
  const choice = getChildrenNS(el, XS, 'choice')[0];
  const all = getChildrenNS(el, XS, 'all')[0];
  const simpleContent = getChildrenNS(el, XS, 'simpleContent')[0];
  const complexContent = getChildrenNS(el, XS, 'complexContent')[0];

  if (sequence) typeBody.push(`{\n${schemaSequence(sequence, h)}\n${schemaAttributes(el, h)}}`);
  else if (choice) typeBody.push(`${schemaChoice(choice, h)}${schemaAttributes(el, h)}`);
  else if (all) typeBody.push(`{\n${schemaSequence(all, h)}\n${schemaAttributes(el, h)}}`);
  else if (simpleContent || complexContent) {
    const content = (simpleContent || complexContent)!;
    const ext = getChildrenNS(content, XS, 'extension')[0];
    const rest = getChildrenNS(content, XS, 'restriction')[0];
    const base = (ext || rest)?.getAttribute('base');
    if (base) {
      typeBody.push(`${h.typeName(base, el)} & {${schemaAttributes((ext || rest)!, h)}}`);
    }
  }

  if (typeBody.length === 0 && el.hasAttributes()) {
    return `{\n${schemaAttributes(el, h)}}`;
  }

  return typeBody.join('') || '{}';
}

function schemaSequence(el: Element, h: TemplateHelpers): string {
  return lines([
    ...getChildrenNS(el, XS, 'element').map((child) => schemaElementAttribute(child, h)),
    ...getChildrenNS(el, XS, 'any').map(() => '[key: string]: unknown;'),
  ]);
}

function schemaElementAttribute(el: Element, h: TemplateHelpers): string {
  const comment = extractAnnotation(el);
  const name = el.getAttribute('name');
  const ref = el.getAttribute('ref');
  const isOpt = el.getAttribute('minOccurs') === '0';

  const prefix = comment ? `${comment}\n` : '';

  if (ref) {
    const refLocal = h.localPartNoValidation(ref);
    return `${prefix}${refLocal}${isOpt ? '?' : ''}: ${h.typeName(ref, el)}_element;`;
  }

  return `${prefix}${name}${isOpt ? '?' : ''}: ${schemaElementContent(el, h)};`;
}

function schemaAttributes(el: Element, h: TemplateHelpers): string {
  const attrs = getChildrenNS(el, XS, 'attribute');
  if (attrs.length === 0) return '';

  return lines([
    `attributes?: {`,
    ...attrs.map((a) => {
      const comment = extractAnnotation(a);
      const name = a.getAttribute('name');
      const type = a.getAttribute('type') || 'string';
      const isOpt = h.ifAttributeOptional(a);
      const prefix = comment ? `${comment}\n` : '';
      return `${prefix}${name}${isOpt ? '?' : ''}: ${h.typeName(type, a)};`;
    }),
    '},',
  ]);
}

function schemaSimpleType(el: Element, h: TemplateHelpers): string {
  const rest = getChildrenNS(el, XS, 'restriction')[0];
  if (rest) {
    const base = rest.getAttribute('base') || 'string';
    const enums = getChildrenNS(rest, XS, 'enumeration');
    if (enums.length > 0) {
      return enums.map((e) => `'${e.getAttribute('value')}'`).join(' | ');
    }
    return h.typeName(base, el);
  }
  return 'string';
}

function extractAnnotation(el: Element): string | undefined {
  const annotation = getChildrenNS(el, XS, 'annotation')[0];
  if (!annotation) return undefined;

  const documentation = getChildrenNS(annotation, XS, 'documentation')[0];
  return documentation ? asComment(documentation.textContent) : undefined;
}
