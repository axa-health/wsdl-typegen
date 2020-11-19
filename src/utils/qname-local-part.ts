export default function qNameLocalPart(qname: string): string {
  const [, local] = qname.split(':'); // eslint-disable-line no-unused-vars

  return local;
}
