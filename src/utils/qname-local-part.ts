export default function qNameLocalPart(qname: string): string {
  const [, local] = qname.split(':');

  return local;
}
