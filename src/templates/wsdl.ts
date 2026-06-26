import type { Element } from '@xmldom/xmldom';
import asComment from '../helpers/as-comment.js';
import { withComment } from '../helpers/with-comment.js';
import type { SchemaRegistry } from '../schema-registry.js';
import { childrenNS } from '../utils/dom.js';
import { SOAP, WSDL, XSD } from '../utils/namespaces.js';
import { renderSchema } from './schema.js';

type OperationContext = {
  operationName: string;
  inputType: string;
  outputType: string;
};

type ResolvedOp = {
  ctx: OperationContext | null;
  doc: string | undefined;
};

export function renderWsdl(root: Element, registry: SchemaRegistry): string {
  const targetNs = root.getAttribute('targetNamespace') ?? '';
  const targetNsAlias =
    Array.from(root.attributes).find(
      (attr) => attr.name.startsWith('xmlns:') && attr.value === targetNs,
    )?.localName ?? '';

  function localPart(qname: string): string {
    const colonIdx = qname.indexOf(':');
    if (colonIdx < 0) return qname;
    const prefix = qname.slice(0, colonIdx);
    if (prefix !== targetNsAlias)
      throw new Error(
        `Namespace mismatch for "${qname}": prefix "${prefix}" does not match target namespace alias "${targetNsAlias}"`,
      );
    return qname.slice(colonIdx + 1);
  }

  function resolveMessageType(
    operation: Element,
    bindingOperation: Element,
    ioType: 'input' | 'output',
  ): string {
    const operationIo = childrenNS(operation, WSDL, ioType)[0];
    if (!operationIo) return 'unknown';

    const messageQName = operationIo.getAttribute('message');
    if (!messageQName) throw new Error(`Missing message attribute on ${ioType}`);

    const messageLocalName = localPart(messageQName);
    const message = childrenNS(root, WSDL, 'message').find(
      (m) => m.getAttribute('name') === messageLocalName,
    );
    if (!message) throw new Error(`Could not find message: ${messageLocalName}`);

    const bindingIo = childrenNS(bindingOperation, WSDL, ioType)[0];
    if (!bindingIo) throw new Error(`Could not find binding ${ioType}`);

    const soapBody = childrenNS(bindingIo, SOAP, 'body')[0];
    if (!soapBody) throw new Error(`Could not find soap:body in ${ioType}`);
    if (soapBody.getAttribute('use') !== 'literal')
      throw new Error("Only soap:body#use='literal' is supported");

    const partsAttr = soapBody.getAttribute('parts');
    const messageParts = childrenNS(message, WSDL, 'part');
    const parts = partsAttr
      ? partsAttr
          .split(' ')
          .map((pName) => messageParts.find((p) => p.getAttribute('name') === pName))
          .filter((p): p is Element => p != null)
      : messageParts;

    if (parts.length !== 1) throw new Error(`Only one ${ioType} part is supported`);

    return `${message.getAttribute('name')}__${parts[0].getAttribute('name')}`;
  }

  function resolveOperation(bindingOperation: Element): OperationContext | null {
    const binding = bindingOperation.parentNode as Element | null;
    if (!binding || binding.nodeType !== 1) return null;

    const portTypeLocal = localPart(binding.getAttribute('type') ?? '');
    const portType = childrenNS(root, WSDL, 'portType').find(
      (pt) => pt.getAttribute('name') === portTypeLocal,
    );
    if (!portType) return null;

    const operation = childrenNS(portType, WSDL, 'operation').find(
      (op) => op.getAttribute('name') === bindingOperation.getAttribute('name'),
    );
    if (!operation) return null;

    return {
      operationName: bindingOperation.getAttribute('name') ?? '',
      inputType: resolveMessageType(operation, bindingOperation, 'input'),
      outputType: resolveMessageType(operation, bindingOperation, 'output'),
    };
  }

  const bindings = childrenNS(root, WSDL, 'binding');
  const services = childrenNS(root, WSDL, 'service');
  const messages = childrenNS(root, WSDL, 'message');
  const types = childrenNS(root, WSDL, 'types');

  const resolvedBindings = bindings.map((binding) => ({
    binding,
    ops: childrenNS(binding, WSDL, 'operation').map(
      (op): ResolvedOp => ({
        ctx: resolveOperation(op),
        doc: wsdlDoc(op),
      }),
    ),
  }));

  const inlineSchemas = types
    .flatMap((t) => childrenNS(t, XSD, 'schema'))
    .map((s) => renderSchema(s, registry));

  const clientBody = [
    ...services.map((s) => `  ${s.getAttribute('name')}: ${s.getAttribute('name')};`),
    ...resolvedBindings.flatMap(({ ops }) =>
      ops.flatMap(({ ctx, doc }) => {
        if (!ctx) return [];
        return [withComment(doc, operationSync(ctx)), operationAsync(ctx)];
      }),
    ),
  ].join('\n');

  const serviceTypes = services.map((s) => {
    const ports = childrenNS(s, WSDL, 'port')
      .map((p) => `  ${p.getAttribute('name')}: ${localPart(p.getAttribute('binding') ?? '')};`)
      .join('\n');
    return `export type ${s.getAttribute('name')} = {\n${ports}\n};`;
  });

  const bindingTypes = resolvedBindings.map(({ binding, ops }) => {
    const body = ops
      .flatMap(({ ctx, doc }) => {
        if (!ctx) return [];
        return [withComment(doc, operationSync(ctx))];
      })
      .join('\n');
    return `export type ${binding.getAttribute('name')} = {\n${body}\n};`;
  });

  const messageTypes = messages.flatMap((msg) =>
    childrenNS(msg, WSDL, 'part').map(
      (p) =>
        `export type ${msg.getAttribute('name')}__${p.getAttribute('name')} = ${registry.typeName(
          p.getAttribute('element') ?? '',
          p,
        )}_element;`,
    ),
  );

  return [
    `import type { Client as SoapClient } from 'soap';`,
    wsdlDoc(root),
    ...inlineSchemas,
    `export interface Client extends SoapClient {\n${clientBody}\n}`,
    ...serviceTypes,
    ...bindingTypes,
    ...messageTypes,
  ]
    .filter((s): s is string => s != null)
    .join('\n\n');
}

function wsdlDoc(el: Element): string | undefined {
  const text = childrenNS(el, WSDL, 'documentation')
    .map((doc) => doc.textContent)
    .filter((t): t is string => t !== null && t.trim() !== '')
    .join('\n');
  return text ? asComment(text) : undefined;
}

function operationSync(ctx: OperationContext): string {
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
  ) => void;`;
}

function operationAsync(ctx: OperationContext): string {
  return `${ctx.operationName}Async: (
    input: ${ctx.inputType} | { _xml: string },
    options?: Record<string, unknown>,
    extraHeaders?: Record<string, unknown>,
  ) => Promise<[
    ${ctx.outputType},
    string,
    Record<string, unknown>,
    string
  ]>;`;
}
