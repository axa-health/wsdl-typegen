export default function hasNoChild(children: any, options: any) {
  if (!children || children.length === 0) {
    return options.fn(this);
  }

  return options.inverse(this);
}
