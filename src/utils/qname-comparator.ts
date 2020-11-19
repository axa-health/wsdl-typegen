export default function createQNameComparator(ns: string, local: string) {
  return function qNameComparator(el: any) {
    return el.$ns.uri === ns && el.$ns.local === local;
  };
}
