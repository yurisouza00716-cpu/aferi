import { describe, it, expect } from "vitest";
import { normalizeUrl, type NormalizedUrl, type IpKind } from "../src/url/normalize";

function ok(input: string): NormalizedUrl {
  const r = normalizeUrl(input);
  if (!r.ok) throw new Error(`esperava sucesso, recebeu falha: ${r.reason}`);
  return r;
}

describe("esquema e domínio", () => {
  it("assume https quando o usuário não digita o esquema", () => {
    const r = ok("example.com/caminho");
    expect(r.scheme).toBe("https");
    expect(r.hostname).toBe("example.com");
    expect(r.hadScheme).toBe(false);
  });

  it("mantém http e converte o domínio para minúsculas", () => {
    const r = ok("HTTP://EXAMPLE.COM");
    expect(r.scheme).toBe("http");
    expect(r.hostname).toBe("example.com");
    expect(r.hadScheme).toBe(true);
  });

  it("remove o ponto final do domínio", () => {
    expect(ok("https://example.com.").hostname).toBe("example.com");
  });

  it("trata entradas equivalentes de forma idêntica", () => {
    expect(ok("EXAMPLE.com").origin).toBe(ok("https://example.com/").origin);
  });

  it("separa os rótulos do domínio", () => {
    expect(ok("https://login.banco.example.com").labels).toEqual([
      "login",
      "banco",
      "example",
      "com",
    ]);
  });

  it("registra porta não padrão e ignora a padrão", () => {
    expect(ok("https://example.com:8443").port).toBe("8443");
    expect(ok("https://example.com:8443").origin).toBe("https://example.com:8443");
    expect(ok("https://example.com:443").port).toBeNull();
  });
});

describe("privacidade", () => {
  it("não guarda credenciais, query nem fragmento", () => {
    const r = ok("https://user:segredo@example.com/a?token=abc123#parte");
    expect(r.origin).toBe("https://example.com");
    expect(r.hasCredentials).toBe(true);
    expect(r.hasPath).toBe(true);
    expect(r.hasQuery).toBe(true);
    expect(r.hasFragment).toBe(true);

    const serializado = JSON.stringify(r);
    expect(serializado).not.toContain("segredo");
    expect(serializado).not.toContain("abc123");
    expect(serializado).not.toContain("user");
  });

  it("sinaliza usuário que parece domínio (truque do @)", () => {
    const r = ok("https://paypal.com@site-falso.example");
    expect(r.hostname).toBe("site-falso.example");
    expect(r.hasCredentials).toBe(true);
    expect(r.credentialsLookLikeDomain).toBe(true);
  });

  it("não marca credenciais quando não existem", () => {
    const r = ok("https://example.com");
    expect(r.hasCredentials).toBe(false);
    expect(r.credentialsLookLikeDomain).toBe(false);
  });
});

describe("domínios internacionais (homógrafos)", () => {
  it("converte para punycode e preserva a versão Unicode", () => {
    const r = ok("https://\u0430pple.com"); // \u0430 = 'а' cirílico
    expect(r.hasPunycode).toBe(true);
    expect(r.hostname.startsWith("xn--")).toBe(true);
    expect(r.hostnameUnicode).toBe("\u0430pple.com");
  });

  it("não marca punycode em domínio ASCII comum", () => {
    expect(ok("https://apple.com").hasPunycode).toBe(false);
  });
});

describe("endereços IP", () => {
  const casos: Array<[string, IpKind]> = [
    ["http://127.0.0.1", "loopback"],
    ["http://2130706433", "loopback"], // 127.0.0.1 em decimal
    ["http://0x7f.1", "loopback"], // 127.0.0.1 em hexadecimal
    ["http://10.0.0.5", "private"],
    ["http://172.16.0.1", "private"],
    ["http://192.168.1.1", "private"],
    ["http://100.64.0.1", "private"],
    ["http://169.254.169.254", "link-local"],
    ["http://0.0.0.0", "unspecified"],
    ["http://224.0.0.1", "multicast"],
    ["http://8.8.8.8", "public"],
    ["http://172.32.0.1", "public"], // logo fora da faixa privada
    ["http://[::1]", "loopback"],
    ["http://[::ffff:127.0.0.1]", "loopback"],
    ["http://[::ffff:10.0.0.1]", "private"],
    ["http://[fe80::1]", "link-local"],
    ["http://[fd00::1]", "private"],
    ["http://[2606:4700:4700::1111]", "public"],
  ];

  it.each(casos)("classifica %s como %s", (entrada, esperado) => {
    const r = ok(entrada);
    expect(r.isIp).toBe(true);
    expect(r.ipKind).toBe(esperado);
  });

  it("não classifica nome de domínio como IP", () => {
    const r = ok("https://example.com");
    expect(r.isIp).toBe(false);
    expect(r.ipKind).toBeNull();
  });
});

describe("entradas rejeitadas", () => {
  const falhas: Array<[string, string]> = [
    ["", "empty"],
    ["   ", "empty"],
    ["javascript:alert(1)", "unsupported_scheme"],
    ["data:text/html,<h1>oi</h1>", "unsupported_scheme"],
    ["file:///etc/passwd", "unsupported_scheme"],
    ["ftp://example.com", "unsupported_scheme"],
    ["https://exa mple.com", "invalid_url"],
    ["https://", "invalid_url"],
    ["https://exam\u0000ple.com", "control_characters"],
    ["https://exam\nple.com", "control_characters"],
    [`https://${"a".repeat(3000)}.com`, "too_long"],
  ];

  it.each(falhas)("rejeita %j com motivo %s", (entrada, motivo) => {
    const r = normalizeUrl(entrada);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(motivo);
  });
});