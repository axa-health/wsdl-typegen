#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Biome } from '@biomejs/js-api/nodejs';
import { DOMParser } from '@xmldom/xmldom';
import { Command } from 'commander';
import { glob } from 'glob';
import { SchemaRegistry } from './schema-registry.js';
import { renderSchema } from './templates/schema.js';
import { renderWsdl } from './templates/wsdl.js';

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
      expand: 'always',
    },
  },
  assist: { actions: { source: { organizeImports: 'on' } } },
  linter: {
    enabled: true,
    rules: {
      recommended: false,
      correctness: { noUnusedImports: 'error' },
    },
  },
});

const program = new Command();

program
  .version('1.0.4')
  .command('generate <wsdl...>')
  .action(async (wsdls: ReadonlyArray<string>) => {
    const parser = new DOMParser();
    const processedFiles = new Set<string>();

    async function processFile(file: string, type: 'wsdl' | 'schema') {
      if (processedFiles.has(file)) return;
      processedFiles.add(file);

      try {
        const xml = await fs.readFile(file, 'utf8');
        const doc = parser.parseFromString(xml, 'text/xml');
        const root = doc.documentElement;
        if (!root) throw new Error(`No root element in ${file}`);

        const registry = new SchemaRegistry(root, (rel) =>
          processFile(path.resolve(file, '..', rel), 'schema'),
        );

        const result = type === 'wsdl' ? renderWsdl(root, registry) : renderSchema(root, registry);

        const { content: linted } = biome.lintContent(projectKey, result, {
          filePath: 'output.ts',
          fixFileMode: 'safeAndUnsafeFixes',
        });

        const { content: formatted } = biome.formatContent(projectKey, linted, {
          filePath: 'output.ts',
        });

        await fs.writeFile(`${file}.ts`, formatted);
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

program.parse(process.argv);
