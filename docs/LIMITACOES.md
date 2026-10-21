# Limitações do Aferi

O Aferi reúne **sinais** e explica o que significam. Ele não dá vereditos
e **nenhuma análise garante segurança absoluta**.

## O que a versão atual faz

Analisa apenas o **texto do endereço**: normalização, domínio principal,
caracteres parecidos, nomes de marcas conhecidas e algumas características
estruturais (http, porta incomum, truque do @, número IP).

## O que a versão atual não faz

- Não abre a página: não vê redirecionamentos, formulários nem conteúdo.
- Não verifica o certificado do site.
- Não consulta fontes de reputação.
- Não expande links encurtados (bit.ly e similares): analisa o endereço curto, não o destino.
- Não detecta imitação que dependa do conteúdo da página ou do caminho
  (por exemplo, um site qualquer com /paypal no endereço).

## Como o resultado pode errar

- **Falsos negativos:** golpes que usam marcas fora da lista, nomes sem relação
  com a marca, ou técnicas que o Aferi ainda não reconhece, aparecem como
  "nenhum sinal encontrado". Isso **não** significa que o site seja seguro.
- **Falsos positivos:** organizações legítimas com nomes parecidos, domínios
  legítimos ainda ausentes da lista, ou ambientes de teste podem receber alertas.

## Dados e regras

- A lista de marcas é pequena, escrita à mão e **sem conferência periódica**.
- A tabela de caracteres parecidos é parcial e cobre cirílico e grego.
- Erros de digitação só são verificados para marcas com nomes de 6 letras ou mais.

## Sobre as métricas do projeto

O comando de avaliação usa um conjunto pequeno de endereços escritos pelo
próprio projeto, que também escreveu as regras. Os números são otimistas e servem
para detectar regressões, **não** para estimar o desempenho no mundo real. Uma
avaliação séria exigiria dados independentes e documentados.

## Uso responsável

O Aferi não substitui antivírus, o navegador, o banco ou outras ferramentas
de segurança. Os alertas são indicações, não provas, e não devem ser usados
para acusar ninguém publicamente.