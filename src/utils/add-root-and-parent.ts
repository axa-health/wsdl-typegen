export default function addRootAndParent(
  child: any,
  root: any,
  parent: any,
): void {
  child.$$root = root; // eslint-disable-line no-param-reassign
  child.$$parent = parent; // eslint-disable-line no-param-reassign

  if (child.$children) {
    child.$children.forEach(subchild =>
      addRootAndParent(subchild, root, child),
    );
  }
}
