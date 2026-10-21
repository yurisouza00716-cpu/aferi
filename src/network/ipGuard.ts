import { isIP } from "node:net";
import { normalizeUrl, type IpKind } from "../url/normalize";

/**
 * Classifica um endereço IP já resolvido. Devolve null quando não dá para
 * classificar; quem chama deve tratar null como NÃO seguro (falhar fechado).
 * Reaproveita as regras do normalizador, que já cobrem IPv4 mapeado em IPv6, NAT64 etc.
 */
export function classifyAddress(address: string): IpKind | null {
  const family = isIP(address);
  if (family === 0) return null;
  const host = family === 6 ? `[${address}]` : address;
  const parsed = normalizeUrl(`http://${host}`);
  return parsed.ok && parsed.isIp ? parsed.ipKind : null;
}