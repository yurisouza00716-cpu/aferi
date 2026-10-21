# Modelo de ameaças (rascunho)

Escopo: versão 0.1.0, uma biblioteca e CLI que analisam o texto de um endereço
localmente. Estados: **mitigado**, **parcial**, **não tratado** ou **futuro**.

## Quem ataca e o quê

- **Quem cria páginas falsas** tenta fazer o endereço parecer legítimo ou escapar das regras.
- **Quem fornece entradas hostis** tenta travar ou enganar o analisador.
- **A cadeia de dependências** pode trazer código malicioso.
- **Quem usa a ferramenta** pode confiar demais no resultado.

## Ameaças

| Ameaça | Estado | Observação |
|---|---|---|
| Domínio oficial dentro dos subdomínios | mitigado | Sinal alto |
| Truque do @ (usuário que parece domínio) | mitigado | Sinal alto |
| Homógrafos (cirílico, grego) | parcial | Tabela parcial; outros alfabetos não cobertos |
| Troca de caracteres (0/o, 1/l, rn/m) | parcial | Regras simples |
| Erros de digitação de marcas | parcial | Só marcas com 6 letras ou mais |
| Marcas fora da lista | não tratado | Gera falso negativo; a lista é pequena |
| Links encurtados | não tratado | O destino não é expandido |
| Imitação pelo caminho (exemplo.com/paypal) | não tratado | O caminho é descartado por privacidade |
| Evasão deliberada das regras | não tratado | Quem conhece as regras pode contorná-las |
| Falsos positivos | parcial | Medidos no conjunto de teste; severidade moderada e linguagem de incerteza |
| Entrada gigante ou com caracteres de controle | mitigado | Limite de 2048 caracteres; rejeita caracteres de controle |
| Vazamento de dados do endereço no relatório | mitigado | Só esquema, domínio e porta; testes automatizados |
| Histórico do terminal guarda o endereço | não tratado | Fora do controle do Aferi; documentado |
| SSRF (acesso a redes internas) | futuro | Hoje não há rede; ao adicionar, resolver DNS e revalidar o IP |
| Abuso de API | futuro | Não existe API |
| Envenenamento de denúncias | futuro | Não existem denúncias |
| Dependência maliciosa | parcial | Poucas dependências, lockfile; revisar com npm audit |
| Confiança excessiva no resultado | parcial | Sem nota única; texto declara incerteza e limites |