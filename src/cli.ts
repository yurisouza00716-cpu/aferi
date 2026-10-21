import { analyze } from "./analyze";
import { analyzeWithNetwork } from "./analyzeNetwork";
import { renderText } from "./report/render";

const USAGE = `Aferi - análise explicável de endereços

Uso:
  npm run aferi -- "<endereço>"
  npm run aferi -- --json "<endereço>"
  npm run aferi -- --network "<endereço>"
  npm run aferi -- --tls "<endereço>"

Por padrão, nenhuma requisição de rede é feita.

--network  consulta o DNS do domínio (só o nome do site é enviado ao
           resolvedor do seu sistema).
--tls      inclui o DNS e lê o certificado do site: conecta à porta 443 do
           servidor, sem enviar requisição HTTP nem abrir a página. O
           servidor do site passa a ver o seu endereço IP.

Coloque sempre o endereço entre aspas.`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const known = new Set(["--json", "--network", "--tls", "--help", "-h"]);
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

  const useTls = flags.includes("--tls");
  const useNetwork = useTls || flags.includes("--network");

  const result = useNetwork
    ? await analyzeWithNetwork(inputs[0], { tls: useTls })
    : analyze(inputs[0]);

  console.log(flags.includes("--json") ? JSON.stringify(result, null, 2) : renderText(result));
  process.exitCode = result.ok ? 0 : 2;
}

main().catch(() => {
  console.error("Erro inesperado ao executar o Aferi.");
  process.exitCode = 3;
});