# Captura de leads

Página em `/lp-captura` para o link enviado depois que alguém comenta a palavra-chave de um post. Em produção: `https://www.multiatend.com.br/lp-captura`. Cada publicação tem o próprio código em `ref`. A landing principal não usa esta página.

`/captura` redireciona para `/lp-captura` e mantém a query string.

## URL

```
/lp-captura?ref=POST-01&utm_source=instagram&utm_medium=organico&utm_campaign=processo&utm_term=PROCESSO&utm_content=reels
```

Exemplo completo:

```
https://www.multiatend.com.br/lp-captura?ref=POST-01&utm_source=instagram&utm_medium=organico&utm_campaign=processo&utm_term=PROCESSO&utm_content=reels
```

Sem `ref`, o lead entra como `direto`.

## Código de um post novo

Use um código por publicação, em maiúsculas, com hífen:

| Post | ref |
| --- | --- |
| Primeiro post | `POST-01` |
| Segundo post | `POST-02` |
| Terceiro post | `POST-03` |

Não reutilize o código. O título do lead no Bitrix começa com esse `ref`.

## UTMs recomendados

| Parâmetro | Exemplo | Uso |
| --- | --- | --- |
| `utm_source` | `instagram` | Rede ou origem (`instagram`, `facebook`, `whatsapp`) |
| `utm_medium` | `organico` | Tipo (`organico`, `pago`, `stories`) |
| `utm_campaign` | `processo` | Tema da campanha ou do post |
| `utm_term` | `PROCESSO` | Palavra-chave que a pessoa comentou |
| `utm_content` | `reels` | Formato do criativo (`reels`, `carrossel`, `stories`) |

## Como o rastreio funciona

Na chegada, a página lê `ref`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` e `utm_content`. Guarda esses valores, mais a URL e o referrer, em `sessionStorage` (chave `multiatend_captura`).

Um refresh ou uma ida a outra página na mesma aba não apaga o código. Um link novo, com outro `ref` ou outro UTM, substitui o rastreio anterior. Cada envio manda tudo de novo, em campos ocultos, junto com o horário do clique em enviar.

## Formulário

Obrigatórios:

- Nome e sobrenome. Pelo menos duas palavras, só letras (acentos valem), espaço, hífen, apóstrofo e ponto. A primeira e a última palavra precisam ter 2 letras ou mais: "Maria da Silva" e "João P. Silva" passam; "Maria", "Maria S." e "Maria 123" não. A mesma regra roda no `/api/lead`.
- WhatsApp, com máscara brasileira
- E-mail. Vale qualquer domínio, inclusive Gmail, Hotmail, Outlook e outros e-mails pessoais

Opcionais, com o rótulo "(opcional)". A pessoa pode deixar em branco. Empresa é texto livre: não existe campo de CNPJ nem validação de CNPJ.

- Cargo
- Empresa

Ao começar a preencher, o texto de apoio acima do formulário se recolhe. Cargo e empresa ficam num controle discreto e continuam acessíveis.

### LGPD

Dois checkboxes separados. Nenhum vem marcado.

1. Aceite dos termos e da política de privacidade. Sem ele o envio não segue. O link abre `/lp-captura/privacidade` (`lp-captura/privacidade.html`), um texto base para o Bruno editar. Em produção: `https://www.multiatend.com.br/lp-captura/privacidade`.
2. Consentimento para receber informações e comunicações por WhatsApp e e-mail. Não bloqueia o envio.

O payload grava `aceite_termos` e `aceite_comunicacoes` como `true` ou `false`, e `consentimento_em` com o horário do servidor no momento em que a escolha foi registrada.

## Variáveis de ambiente

Na Vercel: **Project → Settings → Environment Variables**. Vale para Production e Preview. Não coloque essas URLs no código.

| Variável | Obrigatória | O que é |
| --- | --- | --- |
| `LEAD_WEBHOOK_URL` | Recomendada | Webhook HTTPS do n8n. Recebe o JSON abaixo. |
| `BITRIX24_WEBHOOK_URL` | Não | Webhook de entrada do Bitrix24. Pode ser a base `https://SEU.bitrix24.com.br/rest/1/CODIGO/` ou a URL já com `crm.lead.add.json`. |

Se nenhuma das duas estiver definida, `/api/lead` grava o lead no log da função e responde sucesso. Assim o preview da Vercel funciona antes de configurar o n8n.

O Bitrix é um caminho extra. Se o webhook do n8n responder bem e o Bitrix falhar, o visitante ainda vê a mensagem de obrigado e o erro fica no log. Se só o Bitrix estiver configurado, uma falha dele pede para tentar de novo.

### Lead no Bitrix24

`crm.lead.add` envia:

| Campo | Valor |
| --- | --- |
| `TITLE` | `POST-01 · Maria Silva` |
| `NAME` / `LAST_NAME` | Primeiro nome e o restante |
| `EMAIL` | E-mail, tipo `WORK` |
| `PHONE` | WhatsApp em `+55...`, tipo `MOBILE` |
| `COMPANY_TITLE` | Empresa, só quando vier preenchida |
| `POST` | Cargo, só quando vier preenchido |
| `UTM_SOURCE`, `UTM_MEDIUM`, `UTM_CAMPAIGN`, `UTM_TERM`, `UTM_CONTENT` | Os UTMs da URL |
| `SOURCE_DESCRIPTION` | O `ref` |
| `COMMENTS` | URL, referrer, horários, cargo, empresa e os dois consentimentos com `consentimento_em` |

## Payload

`POST /api/lead` com `Content-Type: application/json`.

```json
{
  "nome": "Maria Silva",
  "email": "maria@gmail.com",
  "whatsapp": "(81) 99999-8888",
  "whatsapp_e164": "+5581999998888",
  "cargo": "Gerente comercial",
  "empresa": "Padaria São José",
  "aceite_termos": true,
  "aceite_comunicacoes": false,
  "consentimento_em": "2026-10-02T13:40:00.120Z",
  "ref": "POST-01",
  "utm_source": "instagram",
  "utm_medium": "organico",
  "utm_campaign": "processo",
  "utm_term": "PROCESSO",
  "utm_content": "reels",
  "page_url": "https://www.multiatend.com.br/lp-captura?ref=POST-01&utm_source=instagram&utm_medium=organico&utm_campaign=processo&utm_term=PROCESSO&utm_content=reels",
  "referrer": "https://www.instagram.com/",
  "timestamp": "2026-10-02T13:40:00.000Z",
  "received_at": "2026-10-02T13:40:00.120Z"
}
```

`cargo` e `empresa` podem vir vazios (`""`). `whatsapp` é o número como a pessoa digitou. `whatsapp_e164` é o formato para CRM e WhatsApp. `timestamp` vem do aparelho. `received_at` e `consentimento_em` vêm do servidor. `ref` vazio vira `direto`. `aceite_comunicacoes: false` é um envio válido.

Resposta de sucesso: `{ "ok": true }`.

## Material entregue depois do envio

Quando `/api/lead` responde sucesso, a página troca o formulário pela tela de entrega: "Prontinho, {primeiro nome}! Seu material está aqui:", o título do material, o botão "Baixar o guia" e o botão "Quer ajuda para aplicar? Fala comigo no WhatsApp". Se o envio falhar, a página mostra o erro e o link do PDF nem é montado.

A tabela fica em `lp-captura/materiais.js`. Cada linha liga um `ref` a um título e a um PDF:

```js
"2026-10-bpmn": { titulo: "Mapeie seu processo de vendas com o Claude e BPMN", arquivo: "/materiais/guia-processo-vendas-claude-bpmn.pdf" },
```

- Post novo: inclua uma linha com o `ref` no padrão `AAAA-MM-tema`, em minúsculas.
- `default`: material para `ref` desconhecido ou sem `ref`.
- PDFs: pasta `materiais/` na raiz do projeto, servida em `/materiais/...`. Não use `public/`: este projeto não tem build, e uma pasta `public` faria a Vercel publicar só o que estiver nela.
- WhatsApp: `WHATSAPP_MATERIAL` no mesmo arquivo. A mensagem pré-preenchida é "Oi Bruno, baixei o guia {título} e quero conversar."

O PDF é um arquivo público: quem tiver a URL baixa sem preencher o formulário. A tela só controla quando o botão aparece.

## Personalizar a página

Tudo está em `lp-captura/index.html`. A página segue a identidade do site: fundo escuro `#08080F`, roxo `#7C3AED`, gradiente azul → roxo dos botões, fonte Inter e os mesmos componentes do `index.html` (tag com ponto, card com linha em gradiente, botão `btn-primary`).

- Cores e fonte: bloco `:root` no CSS. Os nomes das variáveis são os mesmos do `index.html` e do blog. Se a identidade do site mudar, atualize este bloco junto.
- Logo: a página usa o arquivo do próprio site, `/Disigner/LOGO/png/multiatend_horizontal_gradiente-preto.png` (versão com texto branco, para fundo escuro). Não há cópia em `lp-captura/`. Se o arquivo do site mudar de lugar, ajuste o `src` aqui e em `lp-captura/privacidade.html`.
- Textos: selo, título, texto de apoio, botão e mensagem de obrigado, no HTML. O texto de apoio e o selo se recolhem quando a pessoa começa a preencher.
- Política de privacidade: `lp-captura/privacidade.html`, no mesmo visual.

Para ver no computador: `python3 server.py` e abra `http://localhost:8080/lp-captura`. O endpoint `/api/lead` roda na Vercel.
