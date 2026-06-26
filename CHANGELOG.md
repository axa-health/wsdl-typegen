# @axah/wsdl-typegen

## 3.0.0

### Major Changes

- 160552d: Rewrite the code generator.

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

## 2.1.2

### Patch Changes

- 2e221db: add back .js extension

## 2.1.1

### Patch Changes

- 0144306: fix imports

## 2.1.0

### Minor Changes

- 58901ce: correct type import/export

## 2.0.1

### Patch Changes

- 5b3b733: fix revert camelcase to 6.3.0 since its esm only

## 2.0.0

### Major Changes

- ba4daaf: Upgrade to use soap instead of @axah/soap

## 1.0.4

### Patch Changes

- 5cf4f9c: Exchange soap dep

## 1.0.3

### Patch Changes

- 3e15823: Bugfix/enable typegen if output is not defined in wsdl

## 1.0.2

### Patch Changes

- 3a94c8e: fix: add release script to package.json

## 1.0.1

### Patch Changes

- 674875e: feat: add basic support for simpleType and support for short type
