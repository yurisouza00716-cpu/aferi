/** Nomes reservados para uso local ou interno: não identificam um site público. */
const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".test", ".invalid", ".example"];

export function isLocalName(hostname: string): boolean {
  return hostname === "localhost" || LOCAL_SUFFIXES.some((s) => hostname.endsWith(s));
}