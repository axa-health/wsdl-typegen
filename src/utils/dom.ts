/** Returns all direct child Elements (nodeType 1). */
export function children(parent: Node): Element[] {
  return Array.from(parent.childNodes).filter((n): n is Element => n.nodeType === 1);
}

/** Returns direct child elements matching the given namespace URI and local name. */
export function childrenNS(parent: Node, ns: string, local: string): Element[] {
  return children(parent).filter((el) => el.namespaceURI === ns && el.localName === local);
}

/** Joins non-empty strings with newlines, discarding nullish values. */
export function lines(items: (string | null | undefined)[]): string {
  return items.filter((s): s is string => typeof s === 'string').join('\n');
}
