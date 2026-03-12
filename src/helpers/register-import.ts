import { getRegistry } from '../utils/state.js';

export default function createRegisterImport(onImport: (relativePath: string) => void) {
  return function registerImport(importEl: Element) {
    const ns = importEl.getAttribute('namespace');
    if (!ns) return null;

    // Get the registry tied to this specific document
    const registry = getRegistry(importEl.ownerDocument);

    if (!registry[ns]) {
      registry[ns] = `i${Object.keys(registry).length}`;
    } else {
      return null;
    }

    const schemaLocation = importEl.getAttribute('schemaLocation');
    if (!schemaLocation) return null;

    onImport(schemaLocation);

    const importPath =
      schemaLocation.startsWith('.') || schemaLocation.startsWith('/')
        ? schemaLocation
        : `./${schemaLocation}`;

    return {
      importName: registry[ns],
      importPath: `${importPath}.js`,
    };
  };
}
