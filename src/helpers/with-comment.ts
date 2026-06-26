export function withComment(comment: string | undefined, body: string): string {
  return comment ? `${comment}\n${body}` : body;
}
