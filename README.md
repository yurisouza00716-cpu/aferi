# Aferi

> Não confie cegamente no link. Aferi as evidências.

Aferi é uma ferramenta open source, com foco em privacidade, que ajuda pessoas
a avaliar sinais de autenticidade e fraude em endereços de sites. Em vez de um
"seguro" ou "perigoso", ela mostra **o que foi observado, o que isso pode
indicar e o que continua incerto**.

## Status

Versão **0.1.0**, em estágio inicial. Ainda não há extensão de navegador, API
nem consulta a fontes externas.

## O que faz hoje

Analisa **apenas o texto do endereço**, localmente, sem nenhuma requisição de rede:

- separa o domínio principal (com suporte a sufixos como `com.br`);
- detecta nomes de marcas conhecidas em subdomínios e domínios enganosos;
- detecta letras parecidas de outros alfabetos, trocas de caracteres e erros de digitação;
- sinaliza http sem criptografia, porta incomum, número IP e o truque do `@`;
- gera um relatório que separa **conexão, identidade, comportamento e reputação**,
  com recomendação e limitações.

## O que não faz

Não abre a página, não verifica certificado, não consulta reputação e não
expande links encurtados. Veja [docs/LIMITACOES.md](docs/LIMITACOES.md).

## Aviso importante

O Aferi **não garante segurança**. "Nenhum sinal encontrado" não significa que o
site seja seguro nem que a identidade esteja confirmada, e HTTPS válido não prova
que um site seja legítimo. O Aferi não substitui antivírus, o navegador ou as
ferramentas do seu banco.

## Uso

Requer [Node.js](https://nodejs.org) (versão LTS).

```bash
npm install
npm run aferi -- "https://exemplo.com.br"
npm run aferi -- --json "https://exemplo.com.br"
```

Coloque sempre o endereço **entre aspas**.

## Privacidade

Nada sai do seu computador e nada é gravado. O relatório mostra só esquema,
domínio e porta (nunca usuário, senha, caminho, parâmetros ou fragmento).
Detalhes e pontos fora do controle do Aferi em [docs/PRIVACY.md](docs/PRIVACY.md).

## Testes e avaliação

```bash
npm test
npm run typecheck
npm run eval
```

O comando `eval` mede acertos e erros num conjunto pequeno de endereços escritos
pelo próprio projeto. Os números servem para detectar regressões, **não**
representam o desempenho no mundo real.

## Documentação

- [Privacidade](docs/PRIVACY.md)
- [Limitações](docs/LIMITACOES.md)
- [Modelo de ameaças](docs/THREAT_MODEL.md)

## Nome

"Aferi" vem de "aferir": medir e verificar. O nome de trabalho inicial era
TrustLens.

## Licença

[MIT](LICENSE)