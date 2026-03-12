// This map links a Document instance to its specific import registry
// { Document => { "http://ns": "i1" } }
export const documentRegistry = new WeakMap<Document, Record<string, string>>();

/**
 * Gets or creates the registry for a specific document.
 */
export function getRegistry(doc: Document): Record<string, string> {
  let registry = documentRegistry.get(doc);
  if (!registry) {
    registry = {};
    documentRegistry.set(doc, registry);
  }
  return registry;
}
