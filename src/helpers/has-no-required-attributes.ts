export default function hasNoRequiredAttributes(el: any, options: any): string {
  function hasRequiredAttributes(element) {
    return (
      element.$children &&
      element.$children.some(
        (child) =>
          child.$ns.uri === 'http://www.w3.org/2001/XMLSchema' &&
          ((child.$ns.local === 'attribute' &&
            child.$.use &&
            child.$.use.value === 'required') ||
            (['anyAttribute', 'attributeGroup'].indexOf(child.$ns.local) !==
              -1 &&
              hasRequiredAttributes(child))),
      )
    );
  }

  if (hasRequiredAttributes(el)) {
    return '';
  }

  return options.fn(this);
}
