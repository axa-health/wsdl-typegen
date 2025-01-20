export default function hasAttributes(el: any, options: any) {
  if (
    (el.$children &&
      el.$children.some(
        (child) =>
          child.$ns.uri === 'http://www.w3.org/2001/XMLSchema' &&
          ['attribute', 'anyAttribute', 'attributeGroup'].indexOf(
            child.$ns.local,
          ) !== -1,
      )) ||
    (el.$$parent.$children &&
      el.$$parent.$children.some(
        (child) =>
          child.$ns.uri === 'http://www.w3.org/2001/XMLSchema' &&
          ['attribute', 'anyAttribute', 'attributeGroup'].indexOf(
            child.$ns.local,
          ) !== -1,
      ))
  ) {
    return options.fn(this);
  }

  return '';
}
