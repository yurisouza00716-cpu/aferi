# Como contribuir

Obrigado pelo interesse! O Aferi é um projeto pequeno e cuidadoso com privacidade
e com a honestidade dos resultados.

## Antes de começar

1. Leia o [README](README.md) e [docs/LIMITACOES.md](docs/LIMITACOES.md).
2. Para mudanças grandes, abra uma issue antes para conversarmos.

## Ambiente

```bash
npm install
npm test
npm run typecheck
npm run eval
```

## Regras do projeto

- **Privacidade primeiro:** nenhuma requisição de rede nem gravação de dados sem
  discussão prévia e atualização do `docs/PRIVACY.md`.
- **Sem vereditos:** nunca escreva "100% seguro", "é golpe", "site falso" e similares.
  Use observação, inferência e incerteza.
- **Não confunda HTTPS com identidade:** o cadeado não prova legitimidade.
- **Todo sinal novo precisa de testes**, inclusive casos legítimos que não devem
  ser marcados, para controlar falsos positivos.
- **Dados de marcas:** mudanças na lista de domínios oficiais precisam de fonte
  e data de conferência.
- **Exemplos de teste são apenas texto.** Nunca inclua endereços para serem
  visitados, nem dados pessoais reais.
- Atualize a documentação quando o comportamento mudar.

## Pull requests

- Um assunto por pull request.
- Descreva o que mudou e por quê.
- Os testes e o `typecheck` devem passar.