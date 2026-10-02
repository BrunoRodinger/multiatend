# Captura de leads

Página em `/captura` para o link enviado depois que alguém comenta a palavra-chave de um post. Cada publicação tem o próprio código em `ref`. A landing principal não usa esta página.

## URL

```
/captura?ref=POST-01&utm_source=instagram&utm_medium=organico&utm_campaign=processo&utm_term=PROCESSO&utm_content=reels
```

Exemplo completo:

```
https://multiatend.com.br/captura?ref=POST-01&utm_source=instagram&utm_medium=organico&utm_campaign=processo&utm_term=PROCESSO&utm_content=reels
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

- Nome
- WhatsApp, com máscara brasileira
- E-mail. Vale qualquer domínio, inclusive Gmail, Hotmail, Outlook e outros e-mails pessoais

Opcionais, com o rótulo "(opcional)". A pessoa pode deixar em branco. Empresa é texto livre: não existe campo de CNPJ nem validação de CNPJ.

- Cargo
- Empresa

Ao começar a preencher, o texto de apoio acima do formulário se recolhe. Cargo e empresa ficam num controle discreto e continuam acessíveis.

### LGPD

Dois checkboxes separados. Nenhum vem marcado.

1. Aceite dos termos e da política de privacidade. Sem ele o envio não segue. O link abre `/captura/privacidade` (`captura/privacidade.html`), um texto base para o Bruno editar.
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
  "page_url": "https://multiatend.com.br/captura?ref=POST-01&utm_source=instagram&utm_medium=organico&utm_campaign=processo&utm_term=PROCESSO&utm_content=reels",
  "referrer": "https://www.instagram.com/",
  "timestamp": "2026-10-02T13:40:00.000Z",
  "received_at": "2026-10-02T13:40:00.120Z"
}
```

`cargo` e `empresa` podem vir vazios (`""`). `whatsapp` é o número como a pessoa digitou. `whatsapp_e164` é o formato para CRM e WhatsApp. `timestamp` vem do aparelho. `received_at` e `consentimento_em` vêm do servidor. `ref` vazio vira `direto`. `aceite_comunicacoes: false` é um envio válido.

Resposta de sucesso: `{ "ok": true }`.

## Personalizar a página

Tudo está em `captura/index.html`.

- Cores, fonte e logo: bloco `:root` no CSS.
- Logo: `--logo-imagem: url("/captura/logo.svg");` e o arquivo em `captura/`. Enquanto isso, a página mostra a palavra Multiatend no espaço do logo.
- Textos: título, subtítulo, botão e mensagem de obrigado, no HTML.
- Política de privacidade: `captura/privacidade.html`.
- PDF ou WhatsApp depois do envio: atributo `data-proximo-link` no elemento `#config`. Vazio esconde o botão. Exemplo de WhatsApp: `https://wa.me/5581996178166`.

Para ver no computador: `python3 server.py` e abra `http://localhost:8080/captura`. O endpoint `/api/lead` roda na Vercel.
