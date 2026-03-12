export interface TemplateHelpers {
  /** Extracts the local part of a QName if it matches the targetNamespace alias */
  localPart: (qname: string) => string;

  /** Extracts the local part of a QName without namespace validation */
  localPartNoValidation: (qname: string) => string;

  /** Recursively processes a <types> or <schema> element */
  inlineSchema: (el: Element) => string;

  /** Returns true if the attribute 'use' is not 'required' */
  ifAttributeOptional: (attribute: Element) => boolean;

  /** Cross-references a binding operation with its portType definition */
  withInputOutputAndFaults: (bindingOperation: Element) => {
    operationName: string;
    inputType: string;
    outputType: string;
  } | null;

  /** Resolves a QName to a TypeScript type name */
  typeName: (qname: string, el: Element) => string;

  /** Registers an <xs:import> and returns the generated import details */
  registerImport: (importEl: Element) => { importName: string; importPath: string } | null;
}

export type Maybe<T> = T | null | undefined;
