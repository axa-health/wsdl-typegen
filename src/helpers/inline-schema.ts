export default function createInlineSchemaHelper(
  templateChild: (child: any) => string,
) {
  return function inlineSchema(definitionsElement: any) {
    if (!definitionsElement.$children) {
      throw new Error('Expected one child in wsdl:definitions but got none');
    }

    return definitionsElement.$children.reduce((accum, child) => {
      if (
        child.$ns.local !== 'schema' ||
        child.$ns.uri !== 'http://www.w3.org/2001/XMLSchema'
      ) {
        const nsName = definitionsElement.$children[0].$ns;
        throw new Error(
          `Expected an xs:schema child in wsdl:definitions but got ${nsName.uri}:${nsName.local}`,
        );
      }

      return `${accum}\n\n${templateChild(child)}`;
    }, '');
  };
}
