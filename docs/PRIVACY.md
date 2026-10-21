# Privacidade no Aferi

> Rascunho técnico escrito junto com o código. Não é aconselhamento jurídico:
> revise com um profissional antes de operar qualquer serviço que receba dados.

## Resumo (versão 0.1.0)

**Por padrão**, o Aferi:

- analisa o endereço **localmente**, na memória do seu computador;
- **não faz nenhuma requisição de rede**;
- **não grava** logs, histórico, cache nem arquivos;
- **não tem** telemetria, contas nem cookies;
- **não envia** nada a ninguém.

Com as opções `--network` e `--tls`, o Aferi faz consultas de rede que você
escolhe ativar. Elas estão descritas em [NETWORK.md](NETWORK.md), e o próprio
relatório lista o que foi feito na seção "Privacidade".

## O que o Aferi recebe

O texto do endereço que você informa. Esse texto pode conter dados pessoais
(por exemplo, e-mail, nome de usuário, senha ou código dentro do endereço).
O Aferi usa esse texto apenas para extrair o domínio e descarta o resto.

## O que aparece no relatório

Somente esquema, domínio e porta. Usuário, senha, caminho da página, parâmetros
(depois do ?) e fragmento (depois do #) **não** aparecem. O relatório informa
*quais categorias* foram omitidas, sem repetir o conteúdo. Testes automatizados
verificam isso.

## Com `--network` (DNS)

Sai do computador apenas o **nome do domínio**, para o resolvedor do seu sistema.
Quem opera esse resolvedor pode ver que você consultou aquele nome.

## Com `--tls` (certificado)

O Aferi conecta ao servidor do site analisado (porta 443) apenas para ler o
certificado. Nenhuma requisição HTTP é enviada e a página não é aberta, mas:

- o servidor do site pode ver o **seu endereço IP**;
- quem observa a sua rede vê o nome do domínio e o IP de destino.

## Fora do controle do Aferi

- O histórico do terminal pode guardar o comando digitado, **incluindo o endereço
  completo**. O PowerShell, por exemplo, mantém um arquivo de histórico.
- O histórico do navegador e a área de transferência também podem guardar o link.
- Evite colar links que contenham senhas, códigos ou tokens.

## Recursos futuros que mudariam este quadro

Nada disso existe hoje. Se for implementado, será documentado aqui antes:

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

## Contato

Mantenedor: Yuri Souza.

- **Dúvidas sobre privacidade:** abra uma issue no repositório do projeto no GitHub.
  Não inclua endereços completos, senhas, códigos nem dados pessoais na issue.
- **Falhas de segurança:** use o relatório privado descrito em [SECURITY.md](../SECURITY.md).