import { analyze } from "./analyze";
import { analyzeWithNetwork } from "./analyzeNetwork";
import { renderText } from "./report/render";

const USAGE = `Aferi - análise explicável de endereços

Uso:
  npm run aferi -- "<endereço>"
  npm run aferi -- --json "<endereço>"
  npm run aferi -- --network "<endereço>"

Por padrão, nenhuma requisição de rede é feita.
Com --network, o Aferi consulta o DNS do domínio (só o nome do site é enviado
ao resolvedor do seu sistema). Não há conexão ao site nesta versão.

Coloque sempre o endereço entre aspas.`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const known = new Set(["--json", "--network", "--help", "-h"]);
  const flags = args.filter((a) => a.startsWith("-"));
  const inputs = args.filter((a) => !a.startsWith("-"));
  const unknown = flags.filter((f) => !known.has(f));

  if (flags.includes("--help") || flags.includes("-h")) {
    console.log(USAGE);
    return;
  }
  if (unknown.length > 0) {
    console.error(`Opção desconhecida: ${unknown.join(" ")}\n`);
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  if (inputs.length !== 1) {
    console.error("Informe exatamente um endereço, entre aspas.\n");
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const result = flags.includes("--network")
    ? await analyzeWithNetwork(inputs[0])
    : analyze(inputs[0]);

  console.log(flags.includes("--json") ? JSON.stringify(result, null, 2) : renderText(result));
  process.exitCode = result.ok ? 0 : 2;
}

main().catch(() => {
  console.error("Erro inesperado ao executar o Aferi.");
  process.exitCode = 3;
});