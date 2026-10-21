import { analyze } from "../src/analyze";
import { DATASET, type Sample } from "./fixtures/dataset";
import { computeMetrics, type Counts } from "./evaluation/metrics";

/** Um endereço conta como "marcado" quando a conclusão é moderada ou forte. */
const FLAGGED = new Set(["moderate_signals", "strong_signals"]);

function show(url: string): string {
  return url.replace(
    /[^\x00-\x7f]/g,
    (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

function levelOf(sample: Sample): string {
  const r = analyze(sample.url);
  if (!r.ok) throw new Error(`Entrada inválida no conjunto: ${show(sample.url)} (${r.reason})`);
  return r.conclusion.level;
}

function pct(value: number | null): string {
  return value === null ? "n/d" : `${(value * 100).toFixed(1)}%`;
}

const counts: Counts = { tp: 0, fp: 0, fn: 0, tn: 0 };
const errors: string[] = [];
const ambiguous: string[] = [];
const byLevel: Record<string, number> = {};

for (const sample of DATASET) {
  const level = levelOf(sample);
  byLevel[level] = (byLevel[level] ?? 0) + 1;
  const flagged = FLAGGED.has(level);

  if (sample.label === "ambiguous") {
    ambiguous.push(`  ${show(sample.url)}\n    resultado: ${level}\n    nota: ${sample.note}`);
  } else if (sample.label === "suspicious") {
    if (flagged) counts.tp++;
    else {
      counts.fn++;
      errors.push(`  [falso negativo] ${show(sample.url)} -> ${level}`);
    }
  } else if (flagged) {
    counts.fp++;
    errors.push(`  [falso positivo] ${show(sample.url)} -> ${level}`);
  } else {
    counts.tn++;
  }
}

const m = computeMetrics(counts);
const legit = counts.fp + counts.tn;
const susp = counts.tp + counts.fn;

console.log("AFERI - avaliação no conjunto de teste");
console.log("");
console.log(`Legítimos: ${legit} | Suspeitos: ${susp} | Ambíguos: ${ambiguous.length}`);
console.log(`Marcado = conclusão moderada ou forte.`);
console.log("");
console.log(`Acertos em suspeitos (VP): ${counts.tp}    Falsos negativos (FN): ${counts.fn}`);
console.log(`Falsos positivos (FP):     ${counts.fp}    Acertos em legítimos (VN): ${counts.tn}`);
console.log("");
console.log(`Precisão:                 ${pct(m.precision)}`);
console.log(`Recall:                   ${pct(m.recall)}`);
console.log(`Taxa de falso positivo:   ${pct(m.falsePositiveRate)}`);
console.log(`Taxa de falso negativo:   ${pct(m.falseNegativeRate)}`);
console.log("");
console.log("Distribuição das conclusões (todos os endereços):");
for (const [level, n] of Object.entries(byLevel)) console.log(`  ${level}: ${n}`);
console.log("");
console.log(errors.length === 0 ? "Nenhum erro neste conjunto." : "Erros:");
for (const e of errors) console.log(e);
console.log("");
console.log("Casos ambíguos (não entram nas métricas):");
for (const a of ambiguous) console.log(a);
console.log("");
console.log(
  "AVISO: estes números valem só para este conjunto pequeno, escrito pelo próprio projeto. " +
    "Não representam o desempenho no mundo real.",
);