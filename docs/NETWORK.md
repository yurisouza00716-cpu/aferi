# Modo de rede (opcional)

> Rascunho técnico, não é aconselhamento jurídico.

## Como ativar

- `--network`: consulta o DNS do nome do site.
- `--tls`: faz o DNS e também lê o certificado TLS do site (já inclui `--network`).

Sem nenhuma das duas opções, o Aferi não faz nenhuma requisição de rede.

## DNS (`--network`)

- Sai do computador **apenas o nome do domínio** (em punycode quando internacional),
  para o resolvedor configurado no seu sistema operacional.
- Nunca saem usuário, senha, caminho, parâmetros ou fragmento (há testes para isso).
- Endereços IP e nomes de uso local não geram consulta.
- O provedor de internet ou o serviço de DNS pode ver que o seu computador
  consultou aquele nome.

## Certificado TLS (`--tls`)

Passo a passo:

1. O Aferi resolve o nome no DNS.
2. Só continua se **todos** os endereços devolvidos forem públicos.
3. Conecta à **porta 443** do **IP já validado**, sem resolver o nome de novo.
   O nome do domínio é enviado no início da conexão (SNI).
4. Lê o certificado e fecha a conexão.

**Nenhuma requisição HTTP é enviada e a página não é aberta.**

Quem enxerga a conexão:

- O servidor do site analisado vê o seu endereço IP. Se você investiga um site
  suspeito e isso é um problema, não use `--tls`.
- Quem observa a sua rede vê o nome do domínio e o IP de destino.

Quando o Aferi não conecta:

- endereços http, números IP, nomes de uso local;
- portas diferentes da 443 (por precaução);
- nome que não resolve, ou que aponta, mesmo que em parte, para endereço interno ou reservado.

## Proteção contra SSRF e DNS rebinding

- Cada endereço devolvido pelo DNS é classificado (público, rede privada,
  loopback, link-local etc.). Endereço não classificável conta como não público.
- A conexão usa o IP validado, não o nome.
- A sonda real recusa, por conta própria, qualquer IP não público, mesmo que
  quem a chamou tenha falhado em validar.
- Nenhum redirecionamento é seguido, porque nenhuma requisição HTTP é feita.

## Texto de certificados é hostil por definição

Nome do emissor e outros campos são controlados por quem opera o site. O Aferi
remove caracteres de controle e de direção de texto e limita o tamanho antes de
mostrar qualquer coisa no terminal.

## Limites

- A verificação usa a lista de autoridades certificadoras do Node.js, que pode
  diferir da do seu navegador ou sistema.
- Redes com inspeção de tráfego (comuns em empresas) alteram certificados e
  podem gerar alertas.
- A **revogação** do certificado não é verificada.
- Um certificado válido **não prova** que o site é legítimo.
- O resultado é uma fotografia do momento; o site pode apresentar certificados
  diferentes conforme a origem da conexão.
- DNS: "nome não encontrado" pode ser erro de digitação, site removido ou falha da consulta.
- Tempo limite de 5 segundos por etapa; nesse caso o resultado é inconclusivo.