# Política de segurança

## Como relatar uma vulnerabilidade

Não abra uma issue pública para falhas de segurança.

Quando o repositório for publicado, use o recurso de **relatório privado de
vulnerabilidades** do GitHub (aba Security). Contato alternativo:
[a definir antes da publicação].

Inclua: o que foi observado, como reproduzir e qual o impacto que você imagina.
Não inclua dados pessoais de terceiros.

## O que consideramos relevante

- Vazamento de partes do endereço (usuário, senha, caminho, parâmetros) no relatório ou em logs.
- Entradas que travam ou sobrecarregam o analisador.
- Formas de fazer o Aferi dar um resultado enganoso de propósito, por exemplo
  contornar uma regra de forma que não esteja já descrita em `docs/THREAT_MODEL.md`.
- Dependências vulneráveis.

## Limites conhecidos

Falsos negativos e falsos positivos esperados estão em `docs/LIMITACOES.md` e não
são vulnerabilidades. Mesmo assim, exemplos concretos são bem-vindos como issues comuns.

## Resposta

Projeto mantido por voluntários, sem prazo garantido de resposta.