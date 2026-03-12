#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Biome } from '@biomejs/js-api/nodejs';
import { DOMParser } from '@xmldom/xmldom';
import { Command } from 'commander';
import { glob } from 'glob';
import createInlineSchemaHelper from './helpers/inline-schema.js';
import createRegisterImport from './helpers/register-import.js';
import typeName from './helpers/type-name.js';
import { getChildrenNS, schemaContent, wsdl } from './templates/templates.js';
import localPartNoValidation from './utils/qname-local-part.js';
import type { TemplateHelpers } from './utils/types.js';

const WSDL = 'http://schemas.xmlsoap.org/wsdl/';

const biome = new Biome();
const { projectKey } = biome.openProject();

biome.applyConfiguration(projectKey, {
  formatter: {
    enabled: true,
    useEditorconfig: true,
    indentStyle: 'space',
    indentWidth: 2,
    lineEnding: 'lf',
    lineWidth: 100,
  },
  javascript: {
    formatter: {
      jsxQuoteStyle: 'double',
      quoteProperties: 'asNeeded',
      trailingCommas: 'all',
      semicolons: 'always',
      arrowParentheses: 'always',
      bracketSameLine: false,
      quoteStyle: 'single',
      attributePosition: 'auto',
      bracketSpacing: true,
    },
  },
  assist: { actions: { source: { organizeImports: 'on' } } },
});

function extractOperationMessages({
  operation,
  type,
  bindingOperation,
  localPart,
}: {
  operation: Element;
  type: 'output' | 'input';
  bindingOperation: Element;
  localPart: (qname: string) => string;
}): string {
  // Find <wsdl:input> or <wsdl:output> inside <wsdl:portType><wsdl:operation>
  const operationByType = getChildrenNS(operation, WSDL, type)[0];
  if (!operationByType) return 'unknown';

  const messageQName = operationByType.getAttribute('message');
  if (!messageQName) throw new Error(`Missing message attribute on ${type}`);

  const messageLocalName = localPart(messageQName);

  // Find the message definition at the root level
  const definitions = bindingOperation.ownerDocument.documentElement;
  const operationMessage = Array.from(definitions.getElementsByTagNameNS(WSDL, 'message')).find(
    (msg) => msg.getAttribute('name') === messageLocalName,
  );

  if (!operationMessage) throw new Error(`Could not find message: ${messageLocalName}`);

  // Find <wsdl:input> or <wsdl:output> inside <wsdl:binding><wsdl:operation>
  const bindingIo = getChildrenNS(bindingOperation, WSDL, type)[0];
  if (!bindingIo) throw new Error(`Could not find binding ${type}`);

  // Find <soap:body>
  const SOAP_NS = 'http://schemas.xmlsoap.org/wsdl/soap/';
  const soapBody = getChildrenNS(bindingIo, SOAP_NS, 'body')[0];

  if (!soapBody) throw new Error(`Could not find soap:body in ${type}`);
  if (soapBody.getAttribute('use') !== 'literal') {
    throw new Error("Only soap:body#use='literal' is supported");
  }

  const partsAttr = soapBody.getAttribute('parts');
  const messageParts = getChildrenNS(operationMessage, WSDL, 'part');

  const parts = partsAttr
    ? partsAttr
        .split(' ')
        .map((pName) => messageParts.find((p) => p.getAttribute('name') === pName))
        .filter((p): p is Element => !!p)
    : messageParts;

  if (parts.length !== 1) {
    throw new Error(`Only one ${type} part is supported`);
  }

  return `${operationMessage.getAttribute('name')}__${parts[0].getAttribute('name')}`;
}

const programm = new Command();

programm
  .version('1.0.4')
  .command('generate <wsdl...>')
  .option('-w, --watch', 'Watch for changes')
  .action(async (wsdls: ReadonlyArray<string>) => {
    const ext = '.ts';
    const parser = new DOMParser();

    const processedFiles = new Set<string>();

    async function processFile(file: string, type: 'wsdl' | 'schema', force = false) {
      if (!force && processedFiles.has(file)) return;
      processedFiles.add(file);

      try {
        const content = await fs.readFile(file, 'utf8');
        const doc = parser.parseFromString(content, 'text/xml');
        const root = doc.documentElement;

        let targetNamespaceAlias = '';
        const targetNs = root.getAttribute('targetNamespace');

        for (let i = 0; i < root.attributes.length; i++) {
          const attr = root.attributes[i];
          if (attr.name.startsWith('xmlns:') && attr.value === targetNs) {
            targetNamespaceAlias = attr.localName;
            break;
          }
        }

        const localPart = (qname: string) => {
          const [prefix, local] = qname.includes(':') ? qname.split(':') : ['', qname];
          if (prefix !== targetNamespaceAlias) throw new Error(`Namespace mismatch for ${qname}`);
          return local;
        };

        const registerImport = createRegisterImport((rel) =>
          processFile(path.resolve(file, '..', rel), 'schema'),
        );

        const helpers: TemplateHelpers = {
          localPart,
          localPartNoValidation,
          inlineSchema: createInlineSchemaHelper((child) => schemaContent(child as any, helpers)),
          ifAttributeOptional: (attr: any) => attr.getAttribute('use') !== 'required',
          withInputOutputAndFaults: (bindingOperation: any) => {
            const binding = bindingOperation.parentNode as Element;
            const portTypeLocal = localPart(binding.getAttribute('type') || '');

            const portType = Array.from(root.getElementsByTagNameNS(WSDL, 'portType')).find(
              (pt) => pt.getAttribute('name') === portTypeLocal,
            );

            if (!portType) return null;

            const operation = Array.from(portType.getElementsByTagNameNS(WSDL, 'operation')).find(
              (op) => op.getAttribute('name') === bindingOperation.getAttribute('name'),
            );

            if (!operation) return null;

            return {
              operationName: bindingOperation.getAttribute('name')!,
              inputType: extractOperationMessages({
                operation,
                type: 'input',
                bindingOperation,
                localPart,
              }),
              outputType: extractOperationMessages({
                operation,
                type: 'output',
                bindingOperation,
                localPart,
              }),
            };
          },
          registerImport,
          typeName,
        };

        const templateFn = type === 'wsdl' ? wsdl : schemaContent;
        const result = templateFn(root as any, helpers);

        const { content: formatted } = biome.formatContent(projectKey, result, {
          filePath: 'output.ts',
        });
        await fs.writeFile(`${file}${ext}`, formatted);
      } catch (e) {
        console.error(`Error in ${file}:`, e);
        process.exit(-1);
      }
    }

    for (const wsdlGlob of wsdls) {
      const matches = await glob(wsdlGlob);
      await Promise.all(matches.map((f) => processFile(path.resolve(f), 'wsdl')));
    }
  });

programm.parse(process.argv);
