const XS = 'http://www.w3.org/2001/XMLSchema';

/**
 * Updates the helper to handle DOM Elements instead of xml2js objects.
 * Replaces .$children with .childNodes and checks nodeType.
 */
export default function createInlineSchemaHelper(templateChild: (child: Element) => string) {
  return function inlineSchema(wsdlTypesElement: Element): string {
    // 1. Get only Element children (nodeType 1)
    const children = Array.from(wsdlTypesElement.childNodes).filter(
      (node): node is Element => node.nodeType === 1,
    );

    if (children.length === 0) {
      throw new Error('Expected xs:schema children in wsdl:types but got none');
    }

    return children.reduce((accum, child) => {
      // 2. Validate that every child of <wsdl:types> is an <xs:schema>
      if (child.localName !== 'schema' || child.namespaceURI !== XS) {
        throw new Error(
          `Expected an xs:schema child in wsdl:types but got ${child.namespaceURI}:${child.localName}`,
        );
      }

      // 3. Append the generated schema content
      const schemaContent = templateChild(child);
      return accum ? `${accum}\n\n${schemaContent}` : schemaContent;
    }, '');
  };
}
