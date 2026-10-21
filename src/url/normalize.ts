import { domainToUnicode } from "node:url";

export type IpKind =
  | "public"
  | "private"
  | "loopback"
  | "link-local"
  | "unspecified"
  | "multicast"
  | "reserved";

export type NormalizeError =
  | "empty"
  | "too_long"
  | "control_characters"
  | "unsupported_scheme"
  | "invalid_url";

export interface NormalizedUrl {
  ok: true;
  scheme: "http" | "https";
  /** Domínio em ASCII (punycode), minúsculo, sem ponto final. IPv6 sem colchetes. */
  hostname: string;
  /** Domínio como o usuário o veria (Unicode). */
  hostnameUnicode: string;
  labels: string[];
  isIp: boolean;
  ipKind: IpKind | null;
  /** null quando é a porta padrão do esquema. */
  port: string | null;
  /** esquema + host + porta. Nunca contém credenciais, caminho, query ou fragmento. */
  origin: string;
  hasPunycode: boolean;
  /** false se o usuário digitou sem http(s):// */
  hadScheme: boolean;
  hasCredentials: boolean;
  /** Ex.: https://paypal.com@site-falso.com (usuário parece um domínio). */
  credentialsLookLikeDomain: boolean;
  hasPath: boolean;
  hasQuery: boolean;
  hasFragment: boolean;
}

export interface NormalizeFailure {
  ok: false;
  reason: NormalizeError;
}

export type NormalizeResult = NormalizedUrl | NormalizeFailure;

const MAX_LENGTH = 2048;
const EXPLICIT_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const OPAQUE_SCHEME = /^(javascript|data|file|vbscript|mailto|tel|blob|about):/i;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function fail(reason: NormalizeError): NormalizeFailure {
  return { ok: false, reason };
}

export function normalizeUrl(input: string): NormalizeResult {
  const trimmed = input.trim();
  if (trimmed === "") return fail("empty");
  if (trimmed.length > MAX_LENGTH) return fail("too_long");
  if (CONTROL_CHARS.test(trimmed)) return fail("control_characters");

  const hadScheme = EXPLICIT_SCHEME.test(trimmed);
  if (!hadScheme && OPAQUE_SCHEME.test(trimmed)) return fail("unsupported_scheme");

  const candidate = hadScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return fail("invalid_url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("unsupported_scheme");
  }
  const scheme = url.protocol === "https:" ? "https" : "http";

  let host = url.hostname;
  const isIpv6 = host.startsWith("[");
  if (host.endsWith(".")) host = host.slice(0, -1);
  const hostname = isIpv6 ? host.slice(1, -1) : host;
  if (hostname === "") return fail("invalid_url");

  const isIpv4 = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  const isIp = isIpv6 || isIpv4;

  let ipKind: IpKind | null = null;
  if (isIpv6) ipKind = classifyIpv6(hostname) ?? "reserved";
  else if (isIpv4) ipKind = classifyIpv4(hostname);

  const labels = isIp ? [] : hostname.split(".");
  const unicode = isIp ? hostname : domainToUnicode(hostname) || hostname;
  const port = url.port === "" ? null : url.port;
  const originHost = isIpv6 ? `[${hostname}]` : hostname;
  const origin = `${scheme}://${originHost}${port ? `:${port}` : ""}`;

  return {
    ok: true,
    scheme,
    hostname,
    hostnameUnicode: unicode,
    labels,
    isIp,
    ipKind,
    port,
    origin,
    hasPunycode: labels.some((l) => l.startsWith("xn--")),
    hadScheme,
    hasCredentials: url.username !== "" || url.password !== "",
    credentialsLookLikeDomain: /\.|%2e/i.test(url.username),
    hasPath: url.pathname !== "/",
    hasQuery: url.search !== "",
    hasFragment: url.hash !== "",
  };
}

function classifyIpv4(ip: string): IpKind {
  const [a, b, c] = ip.split(".").map(Number);
  if (a === 0) return "unspecified";
  if (a === 127) return "loopback";
  if (a === 10) return "private";
  if (a === 172 && b >= 16 && b <= 31) return "private";
  if (a === 192 && b === 168) return "private";
  if (a === 100 && b >= 64 && b <= 127) return "private";
  if (a === 169 && b === 254) return "link-local";
  if (a >= 224 && a <= 239) return "multicast";
  if (a >= 240) return "reserved";
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return "reserved";
  if (a === 198 && (b === 18 || b === 19)) return "reserved";
  if (a === 198 && b === 51 && c === 100) return "reserved";
  if (a === 203 && b === 0 && c === 113) return "reserved";
  return "public";
}

function parseIpv6(addr: string): number[] | null {
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];

  let groups: string[];
  if (halves.length === 2) {
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null;
    groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  } else {
    groups = head;
  }

  if (groups.length !== 8) return null;
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

function embeddedIpv4(hi: number, lo: number): string {
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

function classifyIpv6(addr: string): IpKind | null {
  const g = parseIpv6(addr);
  if (!g) return null;

  if (g.every((x) => x === 0)) return "unspecified";
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return "loopback";

  // IPv4 mapeado (::ffff:a.b.c.d): vale o que o IPv4 embutido for.
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
    return classifyIpv4(embeddedIpv4(g[6], g[7]));
  }
  // NAT64 (64:ff9b::/96): idem.
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return classifyIpv4(embeddedIpv4(g[6], g[7]));
  }
  // IPv4-compatível (obsoleto): por segurança, nunca público.
  if (g.slice(0, 6).every((x) => x === 0)) return "reserved";

  if ((g[0] & 0xfe00) === 0xfc00) return "private";
  if ((g[0] & 0xffc0) === 0xfe80) return "link-local";
  if ((g[0] & 0xff00) === 0xff00) return "multicast";
  if (g[0] === 0x2001 && g[1] === 0x0db8) return "reserved";
  return "public";
}