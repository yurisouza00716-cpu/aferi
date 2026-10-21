import { parse } from "tldts";
import type { NormalizedUrl } from "./normalize";

export interface DomainParts {
  /** Ex.: "banco.com.br". null para IPs, "localhost" e similares. */
  registrableDomain: string | null;
  /** Ex.: "com.br". */
  publicSuffix: string | null;
  /** Rótulo logo antes do sufixo. Ex.: "banco". */
  registrableLabel: string | null;
  /** Rótulos à esquerda do domínio registrável. Ex.: ["login", "area"]. */
  subdomainLabels: string[];
}

const EMPTY: DomainParts = {
  registrableDomain: null,
  publicSuffix: null,
  registrableLabel: null,
  subdomainLabels: [],
};

export function splitDomain(url: NormalizedUrl): DomainParts {
  if (url.isIp) return EMPTY;

  // allowPrivateDomains: em hospedagens como github.io, quem controla
  // "foo.github.io" é "foo", então ele é tratado como domínio registrável.
  const r = parse(url.hostname, { allowPrivateDomains: true });
  if (!r.domain) return EMPTY;

  return {
    registrableDomain: r.domain,
    publicSuffix: r.publicSuffix,
    registrableLabel: r.domainWithoutSuffix,
    subdomainLabels: r.subdomain ? r.subdomain.split(".") : [],
  };
}