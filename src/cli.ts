import { analyze } from "./analyze";
import { renderText } from "./report/render";

const USAGE = `Aferi - análise explicável de endereços (sem requisições de rede)

Uso:
  npm run aferi -- "<endereço>"
  npm run aferi -- --json "<endereço>"

Coloque sempre o endereço entre aspas.`;

const args = process.argv.slice(2);
const known = new Set(["--json", "--help", "-h"]);
const flags = args.filter((a) => a.startsWith("-"));
const inputs = args.filter((a) => !a.startsWith("-"));
const unknown = flags.filter((f) => !known.has(f));

if (flags.includes("--help") || flags.includes("-h")) {
  console.log(USAGE);
} else if (unknown.length > 0) {
  console.error(`Opção desconhecida: ${unknown.join(" ")}\n`);
  console.error(USAGE);
  process.exitCode = 1;
} else if (inputs.length !== 1) {
  console.error("Informe exatamente um endereço, entre aspas.\n");
  console.error(USAGE);
  process.exitCode = 1;
} else {
  const result = analyze(inputs[0]);
  console.log(flags.includes("--json") ? JSON.stringify(result, null, 2) : renderText(result));
  process.exitCode = result.ok ? 0 : 2;
}