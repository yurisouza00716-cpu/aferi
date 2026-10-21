# Privacidade no Aferi

> Rascunho técnico escrito junto com o código. Não é aconselhamento jurídico:
> revise com um profissional antes de publicar o projeto ou de operar qualquer serviço.

## Resumo (versão 0.1.0)

O Aferi:

- analisa o endereço **localmente**, na memória do seu computador;
- **não faz nenhuma requisição de rede**;
- **não grava** logs, histórico, cache nem arquivos;
- **não tem** telemetria, contas nem cookies;
- **não envia** nada a ninguém.

## O que o Aferi recebe

O texto do endereço que você informa. Esse texto pode conter dados pessoais
(por exemplo, e-mail, nome de usuário, senha ou código dentro do endereço).
O Aferi usa esse texto apenas para extrair o domínio e descarta o resto.

## O que aparece no relatório

Somente esquema, domínio e porta. Usuário, senha, caminho da página, parâmetros
(depois do ?) e fragmento (depois do #) **não** aparecem. O relatório informa
*quais categorias* foram omitidas, sem repetir o conteúdo. Testes automatizados
verificam isso.

## Fora do controle do Aferi

- O histórico do terminal pode guardar o comando digitado, **incluindo o endereço
  completo**. O PowerShell, por exemplo, mantém um arquivo de histórico.
- O histórico do navegador e a área de transferência também podem guardar o link.
- Evite colar links que contenham senhas, códigos ou tokens.

## Recursos futuros que mudariam este quadro

Nada disso existe hoje. Se for implementado, será documentado aqui antes:

- **Verificação de certificado TLS:** conecta ao servidor do site analisado, que
  poderá ver o endereço IP de quem consulta.
- **Fontes de reputação externas:** enviariam o domínio a terceiros. Devem ficar
  **desligadas por padrão**, exigir consentimento explícito, informar exatamente
  quais dados saem e enviar apenas o domínio (nunca caminho, parâmetros ou credenciais).
- **API pública e denúncias comunitárias:** um serviço que recebe dados passa a ter
  obrigações previstas na LGPD (finalidade, base legal, retenção, canal de
  atendimento ao titular, encarregado, entre outras). Isso exige avaliação jurídica
  antes de existir.

## Compromissos do projeto

- Coletar o mínimo possível e, por padrão, nada.
- Documentar toda mudança no tratamento de dados antes de lançá-la.
- Nunca colocar dados pessoais ou endereços completos em registros públicos.
## Modo de rede opcional

Com `--network`, o Aferi consulta o DNS do domínio ao resolvedor do seu sistema.
Veja [NETWORK.md](NETWORK.md). Sem essa opção, tudo o que está neste documento
continua valendo.
## Contato

[a definir antes da publicação]