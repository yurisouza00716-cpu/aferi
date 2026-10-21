import { describe, it, expect } from "vitest";
import { normalizeUrl } from "../src/url/normalize";
import { detectLookalikeSignals } from "../src/signals/lookalike";
import { asciiSkeletons, editDistance, foldConfusables } from "../src/url/confusables";

function sinais(entrada: string) {
  const r = normalizeUrl(entrada);
  if (!r.ok) throw new Error(`falha ao normalizar: ${r.reason}`);
  return detectLookalikeSignals(r);
}

function ids(entrada: string): string[] {
  return sinais(entrada).map((s) => s.id);
}

describe("editDistance", () => {
  it("calcula distâncias conhecidas", () => {
    expect(editDistance("paypal", "paypal")).toBe(0);
    expect(editDistance("paypal", "paypall")).toBe(1);
    expect(editDistance("googel", "google")).toBe(1); // letras vizinhas trocadas
    expect(editDistance("kitten", "sitting")).toBe(3);
  });
});

describe("asciiSkeletons e foldConfusables", () => {
  it("troca letras de outros alfabetos", () => {
    expect(foldConfusables("\u0430pple")).toBe("apple");
  });

  it("reconhece trocas comuns", () => {
    expect(asciiSkeletons("g00gle")).toContain("google");
    expect(asciiSkeletons("rnicrosoft")).toContain("microsoft");
    expect(asciiSkeletons("paypa1")).toEqual(expect.arrayContaining(["paypal", "paypai"]));
  });
});

describe("endereços que não devem gerar sinal", () => {
  const legitimos = [
    "https://www.paypal.com",
    "https://www.itau.com.br",
    "https://google.com",
    "https://exemplo.com.br",
    "https://pineapple.com",
    "https://apply.com", // "apple" tem só 5 letras: sem regra de digitação
    "https://goal.com",
    "https://paypal.xyz", // nome exato: assunto da etapa 2
    "https://a\u00e7\u00e3o.com.br", // "ação": acentos do português são normais
    "http://8.8.8.8",
  ];

  it.each(legitimos)("%s", (url) => {
    expect(ids(url)).toEqual([]);
  });
});

describe("letras de outros alfabetos", () => {
  it("cirílico no lugar do 'a' em apple", () => {
    const s = sinais("https://\u0430pple.com");
    expect(s.map((x) => x.id)).toEqual(
      expect.arrayContaining(["identity.mixed_scripts", "identity.homograph_brand"]),
    );
    const h = s.find((x) => x.id === "identity.homograph_brand");
    expect(h?.brandId).toBe("apple");
    expect(h?.severity).toBe("high");
  });

  it("cirílico no lugar do 'a' em paypal", () => {
    const h = sinais("https://p\u0430ypal.com").find(
      (x) => x.id === "identity.homograph_brand",
    );
    expect(h?.brandId).toBe("paypal");
  });

  it("grego no lugar dos 'o' em google", () => {
    const s = sinais("https://g\u03bf\u03bfgle.com");
    expect(s.map((x) => x.id)).toEqual(
      expect.arrayContaining(["identity.mixed_scripts", "identity.homograph_brand"]),
    );
    expect(s.find((x) => x.id === "identity.homograph_brand")?.brandId).toBe("google");
  });

  it("nome inteiro em cirílico, sem marca, gera só aviso leve", () => {
    const s = sinais("https://\u043f\u0440\u0438\u043c\u0435\u0440.com"); // "пример"
    expect(s.map((x) => x.id)).toEqual(["identity.non_latin_script"]);
    expect(s[0].severity).toBe("low");
  });
});

describe("troca de caracteres no alfabeto latino", () => {
  const casos: Array<[string, string]> = [
    ["https://paypa1.com", "paypal"],
    ["https://g00gle.com", "google"],
    ["https://rnicrosoft.com", "microsoft"],
    ["https://1tau.com.br", "itau"],
    ["https://paypa1.example.com", "paypal"], // no subdomínio
  ];

  it.each(casos)("%s imita %s", (url, marca) => {
    const s = sinais(url);
    expect(s).toHaveLength(1);
    expect(s[0].id).toBe("identity.lookalike_brand");
    expect(s[0].brandId).toBe(marca);
  });
});

describe("erro de digitação", () => {
  it("um caractere a mais", () => {
    const s = sinais("https://paypall.com");
    expect(s).toHaveLength(1);
    expect(s[0].id).toBe("identity.typosquat_brand");
    expect(s[0].severity).toBe("medium");
  });

  it("letras vizinhas trocadas", () => {
    expect(ids("https://googel.com")).toEqual(["identity.typosquat_brand"]);
    expect(ids("https://nubnak.com.br")).toEqual(["identity.typosquat_brand"]);
  });

  it("um caractere a menos em nome longo", () => {
    expect(ids("https://mercadolivr.com.br")).toEqual(["identity.typosquat_brand"]);
  });

  it("dois caracteres de diferença em nome longo gera aviso leve", () => {
    const s = sinais("https://mercadolvr.com.br");
    expect(s).toHaveLength(1);
    expect(s[0].severity).toBe("low");
  });
});

describe("privacidade e linguagem", () => {
  it("não vaza query string nem credenciais", () => {
    const s = sinais("https://joao:senha999@paypa1.com/entrar?token=abc999");
    expect(s.length).toBeGreaterThan(0);
    const texto = JSON.stringify(s);
    expect(texto).not.toContain("joao");
    expect(texto).not.toContain("senha999");
    expect(texto).not.toContain("abc999");
  });

  it("nunca usa linguagem de veredito e sempre declara incerteza", () => {
    const todos = [
      ...sinais("https://\u0430pple.com"),
      ...sinais("https://paypa1.com"),
      ...sinais("https://googel.com"),
      ...sinais("https://mercadolvr.com.br"),
      ...sinais("https://\u043f\u0440\u0438\u043c\u0435\u0440.com"),
    ];
    expect(todos.length).toBeGreaterThan(0);
    for (const s of todos) {
      const texto = `${s.observation} ${s.inference} ${s.uncertainty}`;
      expect(texto).not.toMatch(/100%|definitiv|é golpe|é fraude|site falso/i);
      expect(s.uncertainty.length).toBeGreaterThan(0);
    }
  });
});