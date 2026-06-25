---
"@axah/wsdl-typegen": major
---

Rewrite the code generator.

The Handlebars-template generator is replaced with direct, programmatic
TypeScript rendering: input is parsed with a real DOM and walked through typed
helpers (`SchemaRegistry`, `src/utils/dom.ts`, `src/templates/*.ts`) instead of
`.hbs` templates and stringly-typed QName utilities. Generated output is the
same TypeScript shape as before, now formatted with Biome.

**Breaking changes:**

- **Flow output removed.** Only TypeScript output is generated; the `flow/`
  target is gone.
- **Malformed input now fails loudly.** Invalid or rootless WSDL/XSD aborts
  generation with an error instead of producing partial output.