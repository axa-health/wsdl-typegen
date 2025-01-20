#!/usr/bin/env node
import path from 'path';
import { promises as fs } from 'fs';
import { Parser } from 'xml2js';
import camelcase from 'camelcase';
import { Command } from 'commander';
import { glob } from 'glob';
import chokidar from 'chokidar';
import prettier from 'prettier';
import Handlebars from 'handlebars/runtime';
import hasNoRequiredAttributes from './helpers/has-no-required-attributes';
import createInlineSchemaHelper from './helpers/inline-schema';
import typeName from './helpers/type-name';
import ifArray from './helpers/if-array';
import byQName from './utils/qname-comparator';
import localPartNoValidation from './utils/qname-local-part';
import addRootAndParent from './utils/add-root-and-parent';
import hasAttributes from './helpers/has-attributes';
import createRegisterImport from './helpers/register-import';
import hasChildOfType from './helpers/has-child-of-type';
import hasNoChild from './helpers/has-no-child';
import eachOfType from './helpers/each-of-type';
import asComment from './helpers/as-comment';
import ifOptional from './helpers/if-optional';
import isStringType from './helpers/is-string-type';

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
    .find(
      (message) =>
        message.$.name.value === localPart(operationByType.$.message.value),
    );

  const binding = bindingOperation.$children.find(
    byQName('http://schemas.xmlsoap.org/wsdl/', type),
  );
  const soapBody = binding.$children.find(
    byQName('http://schemas.xmlsoap.org/wsdl/soap/', 'body'),
  );
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
    : operationMessage.$children.filter(
        byQName('http://schemas.xmlsoap.org/wsdl/', 'part'),
      );
  if (parts.length !== 1) {
    throw new Error(`Only one ${type} part is supported`);
  }
  return `${operationMessage.$.name.value}__${parts[0].$.name.value}`;
};
programm
  .version('1.0.4')
  .command('generate <wsdl...>')
  .option('-w, --watch', 'Watch for changes')
  .option('-t, --typescript', 'Use Typescript instead of flow')
  .action(async (wsdls: ReadonlyArray<string>, command) => {
    const ext = command.typescript ? '.ts' : '.js';
    if (command.typescript) {
      // eslint-disable-next-line global-require,@typescript-eslint/no-require-imports
      require('./templates/typescript');
    } else {
      // eslint-disable-next-line global-require,@typescript-eslint/no-require-imports
      require('./templates/flow');
    }
    const wsdlTpl = Handlebars.templates.wsdl;
    const schemaTpl = Handlebars.templates.schema;
    const inlineSchemaTpl = Handlebars.templates['schema-content'];
    Object.keys(Handlebars.templates).forEach((key) => {
      Handlebars.registerPartial(camelcase(key), Handlebars.templates[key]);
    });

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
          await processFile(file, type, true); // eslint-disable-line no-use-before-define
        })
        .on('error', (e) => {
          throw new Error(`Watcher threw error ${e}`);
        });
    }

    async function processFile(
      file: string,
      type: 'wsdl' | 'schema',
      force = false,
    ) {
      if (!force && processedFiles.has(file)) {
        return;
      }

      processedFiles.add(file);

      addWatch(file, type);

      parser.parseString(
        await fs.readFile(file, { encoding: 'utf8' }),
        async (_, rn) => {
          try {
            rn.$children.forEach((child) => addRootAndParent(child, rn, rn));
            rn.$$imports = {}; // eslint-disable-line no-param-reassign
            let templateFn;
            let targetNamespaceAlias;

            // eslint-disable-next-line no-inner-declarations
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

              targetNamespaceAlias = targetNsDefinition.split(':')[1]; // eslint-disable-line prefer-destructuring
            } else if (type === 'schema') {
              if (
                rn.$ns.local !== 'schema' ||
                rn.$ns.uri !== 'http://www.w3.org/2001/XMLSchema'
              ) {
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
              inlineSchema: createInlineSchemaHelper((child) =>
                inlineSchemaTpl(child, { helpers }),
              ),
              ifAttributeOptional(attribute, options) {
                if (
                  attribute &&
                  (!attribute.$ ||
                    !attribute.$.use ||
                    attribute.$.use.value !== 'required')
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
                  .filter(
                    byQName('http://schemas.xmlsoap.org/wsdl/', 'portType'),
                  )
                  .find(
                    (child) =>
                      child.$.name.value === localPart(binding.$.type.value),
                  );

                const operation = portType.$children
                  .filter(
                    byQName('http://schemas.xmlsoap.org/wsdl/', 'operation'),
                  )
                  .find(
                    (child) =>
                      child.$.name.value === bindingOperation.$.name.value,
                  );
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
                const [bindingNameNsAlias, bindingNameLocal] =
                  port.$.binding.value.split(':');

                if (bindingNameNsAlias !== targetNamespaceAlias) {
                  throw new Error(
                    'referring to bindings of imported WSDLs is not supported yet!',
                  );
                }

                const binding = port.$$root.$children.find(
                  (child) =>
                    child.$ns.local === 'binding' &&
                    child.$ns.uri === 'http://schemas.xmlsoap.org/wsdl/' &&
                    child.$.name.value === bindingNameLocal,
                );

                const [portTypeNameNsAlias, portTypeNameLocal] =
                  binding.$.type.value.split(':');

                if (portTypeNameNsAlias !== targetNamespaceAlias) {
                  throw new Error(
                    'referring to port types of imported WSDLs is not supported yet!',
                  );
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
              await prettier.format(result, {
                ...(await prettier.resolveConfig(`${file}${ext}`)),
                parser: command.typescript ? 'typescript' : 'babel',
              }),
              {
                encoding: 'utf8',
              },
            );
          } catch (e) {
            // TODO: introduce proper logging
            console.error(`${file}.js`); // eslint-disable-line no-console
            console.error(e); // eslint-disable-line no-console
            process.exit(-1);
          }
        },
      );
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
