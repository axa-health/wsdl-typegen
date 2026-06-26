import type { Element, Node } from '@xmldom/xmldom';

export function children(parent: Node): Element[] {
  return Array.from(parent.childNodes).filter((n): n is Element => n.nodeType === 1);
}

export function childrenNS(parent: Node, ns: string, local: string): Element[] {
  return children(parent).filter((el) => el.namespaceURI === ns && el.localName === local);
}
