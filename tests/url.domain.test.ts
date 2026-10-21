import { describe, it, expect } from "vitest";
import { normalizeUrl, type NormalizedUrl } from "../src/url/normalize";
import { splitDomain } from "../src/url/domain";

function ok(input: string): NormalizedUrl {
  const r = normalizeUrl(input);
  if (!r.ok) throw new Error(`falha ao normalizar: ${r.reason}`);
  return r;
}

describe("splitDomain", () => {
  it("separa um domínio simples", () => {
    const d = splitDomain(ok("https://example.com"));
    expect(d.registrableDomain).toBe("example.com");
    expect(d.publicSuffix).toBe("com");
    expect(d.registrableLabel).toBe("example");
    expect(d.subdomainLabels).toEqual([]);
  });

  it("entende sufixos compostos como com.br", () => {
    const d = splitDomain(ok("https://login.area.banco.com.br"));
    expect(d.registrableDomain).toBe("banco.com.br");
    expect(d.publicSuffix).toBe("com.br");
    expect(d.subdomainLabels).toEqual(["login", "area"]);
  });

  it("trata hospedagem compartilhada como domínio de quem a usa", () => {
    expect(splitDomain(ok("https://foo.github.io")).registrableDomain).toBe("foo.github.io");
  });

  it("não define domínio registrável para IPs", () => {
    const d = splitDomain(ok("http://8.8.8.8"));
    expect(d.registrableDomain).toBeNull();
    expect(d.subdomainLabels).toEqual([]);
  });

  it("não define domínio registrável para nomes sem sufixo público", () => {
    expect(splitDomain(ok("http://localhost")).registrableDomain).toBeNull();
  });

  it("funciona com domínios em punycode", () => {
    const d = splitDomain(ok("https://\u0430pple.com"));
    expect(d.registrableDomain?.startsWith("xn--")).toBe(true);
  });
});