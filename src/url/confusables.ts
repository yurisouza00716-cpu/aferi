/**
 * Letras de outros alfabetos que se parecem com letras latinas.
 * Lista parcial e conservadora, escrita à mão (não é a lista completa do Unicode).
 * Os caracteres estão escritos como \uXXXX para evitar problemas de codificação.
 */
const CONFUSABLE_MAP: Readonly<Record<string, string>> = {
  // Cirílico
  "\u0430": "a",
  "\u0435": "e",
  "\u043e": "o",
  "\u0440": "p",
  "\u0441": "c",
  "\u0443": "y",
  "\u0445": "x",
  "\u0456": "i",
  "\u0458": "j",
  "\u0455": "s",
  "\u04bb": "h",
  "\u0501": "d",
  "\u051b": "q",
  "\u051d": "w",
  "\u04cf": "l",
  // Grego
  "\u03bf": "o",
  "\u03b1": "a",
  "\u03bd": "v",
  "\u03c1": "p",
  "\u03b9": "i",
  "\u03ba": "k",
  "\u03c5": "u",
  // Latinas incomuns
  "\u0131": "i",
  "\u0251": "a",
  "\u0261": "g",
};

/** Troca letras de outros alfabetos pelas letras latinas parecidas. */
export function foldConfusables(text: string): string {
  let out = "";
  for (const ch of text.toLowerCase()) {
    out += CONFUSABLE_MAP[ch] ?? ch;
  }
  return out;
}

/**
 * Versões "simplificadas" de um texto para comparar com nomes de marcas:
 * letras parecidas trocadas, rn->m, vv->w e números por letras (0->o, 3->e, 4->a, 5->s).
 * O número 1 pode ser "l" ou "i", então devolve as duas versões.
 */
export function asciiSkeletons(text: string): string[] {
  const base = foldConfusables(text)
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/0/g, "o")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s");
  return Array.from(new Set([base.replace(/1/g, "l"), base.replace(/1/g, "i")]));
}

/** Distância de edição com troca de letras vizinhas (ex.: "googel" -> "google" = 1). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}