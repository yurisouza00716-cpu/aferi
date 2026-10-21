# Política de segurança

## Como relatar uma vulnerabilidade

Não abra uma issue pública para falhas de segurança.

Use o **relatório privado de vulnerabilidades do GitHub**: no repositório do
projeto, abra a aba **Security** e clique em **Report a vulnerability**. Só o
mantenedor, Yuri Souza, e quem ele convidar têm acesso ao relatório.

Inclua: o que foi observado, como reproduzir e qual o impacto que você imagina.
Não inclua dados pessoais de terceiros.

## O que consideramos relevante

- Vazamento de partes do endereço (usuário, senha, caminho, parâmetros) no relatório ou em logs.
- Entradas que travam ou sobrecarregam o analisador.
- Formas de contornar a proteção contra SSRF (por exemplo, fazer o Aferi se
  conectar a um endereço interno ou reservado).
- Formas de fazer o Aferi dar um resultado enganoso de propósito, por exemplo
  contornar uma regra de forma que não esteja já descrita em `docs/THREAT_MODEL.md`.
- Texto hostil (por exemplo, vindo de certificados) que chegue ao terminal sem limpeza.
- Dependências vulneráveis.

## Limites conhecidos

Falsos negativos e falsos positivos esperados estão em `docs/LIMITACOES.md` e não
são vulnerabilidades. Mesmo assim, exemplos concretos são bem-vindos como issues comuns.

## Resposta

Projeto mantido por voluntários, sem prazo garantido de resposta.