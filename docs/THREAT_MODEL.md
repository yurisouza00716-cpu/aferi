# Modelo de ameaças (rascunho)

Escopo: versão 0.1.0, uma biblioteca e CLI. Por padrão, analisa o texto de um
endereço localmente; com `--network` e `--tls`, faz consultas de DNS e lê o
certificado do site. Estados: **mitigado**, **parcial**, **não tratado** ou **futuro**.

## Quem ataca e o quê

- **Quem cria páginas falsas** tenta fazer o endereço parecer legítimo ou escapar das regras.
- **Quem fornece entradas hostis** tenta travar ou enganar o analisador.
- **Quem controla um servidor analisado** pode devolver DNS, certificados e texto hostis.
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
| SSRF por DNS apontando para rede interna | mitigado | Todos os endereços são classificados; qualquer endereço não público impede a conexão; falha fechada |
| DNS rebinding | mitigado | A conexão usa o IP validado, sem nova resolução |
| Uso do Aferi para testar portas arbitrárias | mitigado | O certificado só é lido na porta 443 |
| Texto hostil em certificados (sequências de escape no terminal) | mitigado | Caracteres de controle removidos e tamanho limitado |
| Servidor lento ou que nunca responde | mitigado | Tempo limite de 5 segundos; resultado inconclusivo |
| Inspeção de tráfego (TLS interceptado) | não tratado | Pode gerar alertas ou ocultá-los; o texto declara a incerteza |
| Revogação de certificados | não tratado | Não verificada; declarado no relatório |
| Servidor mostra certificados diferentes conforme a origem | não tratado | O resultado é uma fotografia do momento |
| O site analisado vê o IP de quem consulta | parcial | Só com `--tls`; avisado no relatório e na documentação |
| Abuso de API | futuro | Não existe API |
| Envenenamento de denúncias | futuro | Não existem denúncias |
| Dependência maliciosa | parcial | Poucas dependências, lockfile; revisar com npm audit |
| Confiança excessiva no resultado | parcial | Sem nota única; texto declara incerteza e limites |