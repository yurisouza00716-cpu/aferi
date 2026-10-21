# Modo de rede (opcional)

> Rascunho técnico, não é aconselhamento jurídico.

## Como ativar

Só com a opção `--network`. Sem ela, o Aferi não faz nenhuma requisição de rede.

## O que a versão atual faz

Uma única consulta: o **DNS do nome do site**, feita ao resolvedor configurado
no seu sistema operacional.

- Sai do computador **apenas o nome do domínio** (em punycode quando internacional).
- Nunca saem usuário, senha, caminho, parâmetros ou fragmento (há testes para isso).
- **Nenhuma conexão ao site** é feita.
- Endereços IP e nomes de uso local não geram consulta.

## Quem enxerga a consulta

O provedor de internet ou o serviço de DNS configurado no seu sistema pode ver
que o seu computador consultou aquele nome. Se o domínio é sensível para você,
não use `--network`.

## Proteção contra SSRF e DNS rebinding

- Cada endereço devolvido é classificado (público, rede privada, loopback,
  link-local etc.). Se o nome de um site apontar para um endereço interno, o
  Aferi sinaliza e **não se conecta**.
- Endereço que não pode ser classificado é tratado como não público (falha fechada).
- Quando a verificação de certificado existir, o Aferi deverá conectar ao **IP já
  validado**, e não resolver o nome de novo, porque uma segunda resolução
  poderia devolver outro endereço.

## Limites

- O DNS é uma fotografia do momento e pode mudar. Ele só mostra que o nome existe;
  não diz quem controla o site nem se é legítimo.
- A consulta usa o resolvedor do sistema, que também consulta o arquivo `hosts`
  e pode devolver respostas diferentes em redes corporativas.
- "Nome não encontrado" pode ser erro de digitação, site removido ou falha da consulta.
- A consulta é interrompida após 5 segundos; o resultado, nesse caso, é inconclusivo.