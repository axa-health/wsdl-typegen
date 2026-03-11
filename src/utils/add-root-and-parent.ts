export default function addRootAndParent(child: any, root: any, parent: any): void {
  child.$$root = root;
  child.$$parent = parent;

  if (child.$children) {
    for (const subchild of child.$children) {
      addRootAndParent(subchild, root, child);
    }
  }
}
