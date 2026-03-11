#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Biome } from '@biomejs/js-api/nodejs';
import chokidar from 'chokidar';
import { Command } from 'commander';
import { glob } from 'glob';
import { Parser } from 'xml2js';
import asComment from './helpers/as-comment.js';
import eachOfType from './helpers/each-of-type.js';
import hasAttributes from './helpers/has-attributes.js';
import hasChildOfType from './helpers/has-child-of-type.js';
import hasNoChild from './helpers/has-no-child.js';
import hasNoRequiredAttributes from './helpers/has-no-required-attributes.js';
import ifArray from './helpers/if-array.js';
import ifOptional from './helpers/if-optional.js';
import createInlineSchemaHelper from './helpers/inline-schema.js';
import isStringType from './helpers/is-string-type.js';
import createRegisterImport from './helpers/register-import.js';
import typeName from './helpers/type-name.js';
import addRootAndParent from './utils/add-root-and-parent.js';
import { loadTemplates } from './utils/load-templates.js';
import byQName from './utils/qname-comparator.js';
import localPartNoValidation from './utils/qname-local-part.js';

const biome = new Biome();

const { projectKey } = biome.openProject();

biome.applyConfiguration(projectKey, {
  formatter: {
    enabled: true,
    useEditorconfig: true,
    formatWithErrors: false,
    indentStyle: 'space',
    indentWidth: 2,
    lineEnding: 'lf',
    lineWidth: 100,
    attributePosition: 'auto',
    bracketSpacing: true,
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
});

const programm = new Command();

const extractOperationMessages = ({
  operation,
  type,
  bindingOperation,
  localPart,
}: {
  operation: any;
  type: 'output' | 'input';
  bindingOperation: any;
  localPart: (qname: string) => string;
}): string | unknown => {
  const operationByType = operation.$children.find(
    byQName('http://schemas.xmlsoap.org/wsdl/', type),
  );
  if (!operationByType) {
    return 'unknown';
  }
  const operationMessage = bindingOperation.$$root.$children
    .filter(byQName('http://schemas.xmlsoap.org/wsdl/', 'message'))
    .find((message) => message.$.name.value === localPart(operationByType.$.message.value));

  const binding = bindingOperation.$children.find(
    byQName('http://schemas.xmlsoap.org/wsdl/', type),
  );
  const soapBody = binding.$children.find(byQName('http://schemas.xmlsoap.org/wsdl/soap/', 'body'));
  if (soapBody.$.use.value !== 'literal') {
    throw new Error("Only soap:body#use='literal' is supported");
  }
  const parts = soapBody.$.parts
    ? soapBody.$.parts.value
        .split(' ')
        .map((partName) =>
          operationMessage.$children
            .filter(byQName('http://schemas.xmlsoap.org/wsdl/', 'part'))
            .find((part) => part.$.name.value === partName),
        )
    : operationMessage.$children.filter(byQName('http://schemas.xmlsoap.org/wsdl/', 'part'));
  if (parts.length !== 1) {
    throw new Error(`Only one ${type} part is supported`);
  }
  return `${operationMessage.$.name.value}__${parts[0].$.name.value}`;
};

const templates = await loadTemplates(new URL('./templates/', import.meta.url));

programm
  .version('1.0.4')
  .command('generate <wsdl...>')
  .option('-w, --watch', 'Watch for changes')
  .action(async (wsdls: ReadonlyArray<string>, command) => {
    const ext = '.ts';

    const wsdlTpl = templates.wsdl;
    const schemaTpl = templates.schema;
    const inlineSchemaTpl = templates['schema-content'];

    const parser = new Parser({
      explicitChildren: true,
      childkey: '$children',
      explicitCharkey: true,
      preserveChildrenOrder: true,
      xmlns: true,
      explicitRoot: false,
    });

    const processedFiles: Set<string> = new Set();
    const watchedFiles = new Set();

    function addWatch(file: string, type: 'wsdl' | 'schema') {
      if (!command.watch) {
        return;
      }

      if (watchedFiles.has(file)) {
        return;
      }

      watchedFiles.add(file);

      chokidar
        .watch(file)
        .on('change', async () => {
          await processFile(file, type, true);
        })
        .on('error', (e) => {
          throw new Error(`Watcher threw error ${e}`);
        });
    }

    async function processFile(file: string, type: 'wsdl' | 'schema', force = false) {
      if (!force && processedFiles.has(file)) {
        return;
      }

      processedFiles.add(file);

      addWatch(file, type);

      parser.parseString(await fs.readFile(file, { encoding: 'utf8' }), async (_, rn) => {
        try {
          for (const child of rn.$children) {
            addRootAndParent(child, rn, rn);
          }
          rn.$$imports = {};
          let templateFn;
          let targetNamespaceAlias;

          function localPart(qname) {
            const [nsAlias, local] = qname.split(':');

            if (nsAlias !== targetNamespaceAlias) {
              throw new Error(
                `Tried to use local part of QName that is not inside targetNs (${targetNamespaceAlias}): ${qname}`,
              );
            }

            return local;
          }

          if (type === 'wsdl') {
            if (
              rn.$ns.local !== 'definitions' ||
              rn.$ns.uri !== 'http://schemas.xmlsoap.org/wsdl/'
            ) {
              throw new Error(
                `Expected schema as root node but got ${rn.$ns.uri}:${rn.$ns.local} in ${file}`,
              );
            }

            templateFn = wsdlTpl;

            const targetNsDefinition = Object.keys(rn.$).find(
              (nsDefinition) =>
                nsDefinition.startsWith('xmlns:') &&
                rn.$[nsDefinition].value === rn.$.targetNamespace.value,
            );

            if (!targetNsDefinition) {
              throw new Error(
                `Could not find xmlns definition for nsUri ${rn.$.targetNamespace.value}`,
              );
            }

            targetNamespaceAlias = targetNsDefinition.split(':')[1];
          } else if (type === 'schema') {
            if (rn.$ns.local !== 'schema' || rn.$ns.uri !== 'http://www.w3.org/2001/XMLSchema') {
              throw new Error(
                `Expected schema as root node but got ${rn.$ns.uri}:${rn.$ns.local} in ${file}`,
              );
            }

            templateFn = schemaTpl;
          } else {
            throw new Error(`Unknown file type ${type}`);
          }

          const helpers = {
            localPart,
            localPartNoValidation,
            inlineSchema: createInlineSchemaHelper((child) => inlineSchemaTpl(child, { helpers })),
            ifAttributeOptional(attribute, options) {
              if (
                attribute &&
                (!attribute.$ || !attribute.$.use || attribute.$.use.value !== 'required')
              ) {
                return options.fn(this);
              }

              return '';
            },
            is(arg1, arg2, options) {
              if (arg1 === arg2) {
                return options.fn(this);
              }

              return '';
            },
            withInputOutputAndFaults(bindingOperation, options) {
              const binding = bindingOperation.$$parent;
              const portType = bindingOperation.$$root.$children
                .filter(byQName('http://schemas.xmlsoap.org/wsdl/', 'portType'))
                .find((child) => child.$.name.value === localPart(binding.$.type.value));

              const operation = portType.$children
                .filter(byQName('http://schemas.xmlsoap.org/wsdl/', 'operation'))
                .find((child) => child.$.name.value === bindingOperation.$.name.value);
              const inputType = extractOperationMessages({
                operation,
                type: 'input',
                bindingOperation,
                localPart,
              });
              const outputType = extractOperationMessages({
                operation,
                type: 'output',
                bindingOperation,
                localPart,
              });

              return options.fn({
                operationName: bindingOperation.$.name.value,
                inputType,
                outputType,
              });
            },
            withPortType(port, options) {
              const [bindingNameNsAlias, bindingNameLocal] = port.$.binding.value.split(':');

              if (bindingNameNsAlias !== targetNamespaceAlias) {
                throw new Error('referring to bindings of imported WSDLs is not supported yet!');
              }

              const binding = port.$$root.$children.find(
                (child) =>
                  child.$ns.local === 'binding' &&
                  child.$ns.uri === 'http://schemas.xmlsoap.org/wsdl/' &&
                  child.$.name.value === bindingNameLocal,
              );

              const [portTypeNameNsAlias, portTypeNameLocal] = binding.$.type.value.split(':');

              if (portTypeNameNsAlias !== targetNamespaceAlias) {
                throw new Error('referring to port types of imported WSDLs is not supported yet!');
              }

              const portType = port.$$root.$children.find(
                (child) =>
                  child.$ns.local === 'portType' &&
                  child.$ns.uri === 'http://schemas.xmlsoap.org/wsdl/' &&
                  child.$.name.value === portTypeNameLocal,
              );

              return options.fn({ portType });
            },
            isStringType,
            ifArray,
            hasChildOfType,
            hasNoChild,
            eachOfType,
            asComment,
            ifOptional,
            registerImport: createRegisterImport((relativePath) => {
              processFile(path.resolve(file, '..', relativePath), 'schema');
            }),
            hasAttributes,
            hasNoRequiredAttributes,
            typeName,
          };

          const result = templateFn(rn, { helpers });
          await fs.writeFile(
            `${file}${ext}`,
            biome.formatContent(projectKey, result, { filePath: 'example.ts' }).content,
          );
        } catch (e) {
          // TODO: introduce proper logging
          console.error(`${file}.js`);
          console.error(e);
          process.exit(-1);
        }
      });
    }

    await Promise.all(
      wsdls.map(async (wsdl: string) => {
        const matched = await glob(wsdl);

        await Promise.all(
          matched.map(async (matchedFile) => {
            const absPath = path.resolve(matchedFile);
            await processFile(absPath, 'wsdl');
          }),
        );

        if (command.watch) {
          chokidar
            .watch(wsdl)
            .on('add', async (file) => {
              await processFile(file, 'wsdl', true);
            })
            .on('error', (e) => {
              throw new Error(`Watcher threw error ${e}`);
            });
        }
      }),
    );
  });

// error on unknown commands
programm.on('command:*', () => {
  programm.outputHelp();
  process.exit(1);
});

programm.parse(process.argv);

if (programm.args.length === 0) {
  programm.outputHelp();
  process.exit(1);
}
