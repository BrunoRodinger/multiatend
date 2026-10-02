/**
 * POST /api/lead
 *
 * Recebe o formulário de /lp-captura, valida e encaminha o lead.
 * Segredos ficam só em variáveis de ambiente, nunca neste arquivo.
 *
 *   LEAD_WEBHOOK_URL     Webhook HTTPS (n8n). Recebe o JSON do lead.
 *   BITRIX24_WEBHOOK_URL Opcional. Webhook de entrada do Bitrix24.
 *                        Pode ser a base (.../rest/1/CODIGO/) ou a URL
 *                        completa de crm.lead.add.json.
 *
 * Se nenhuma variável estiver definida, o lead é registrado no log
 * da função e a resposta continua sendo sucesso, para o preview funcionar.
 */

var LIMITE_CORPO = 20000;
var TIMEOUT_MS = 8000;

var DDDS = {
  "11": 1, "12": 1, "13": 1, "14": 1, "15": 1, "16": 1, "17": 1, "18": 1, "19": 1,
  "21": 1, "22": 1, "24": 1, "27": 1, "28": 1,
  "31": 1, "32": 1, "33": 1, "34": 1, "35": 1, "37": 1, "38": 1,
  "41": 1, "42": 1, "43": 1, "44": 1, "45": 1, "46": 1, "47": 1, "48": 1, "49": 1,
  "51": 1, "53": 1, "54": 1, "55": 1,
  "61": 1, "62": 1, "63": 1, "64": 1, "65": 1, "66": 1, "67": 1, "68": 1, "69": 1,
  "71": 1, "73": 1, "74": 1, "75": 1, "77": 1, "79": 1,
  "81": 1, "82": 1, "83": 1, "84": 1, "85": 1, "86": 1, "87": 1, "88": 1, "89": 1,
  "91": 1, "92": 1, "93": 1, "94": 1, "95": 1, "96": 1, "97": 1, "98": 1, "99": 1
};

var MENSAGENS = {
  nome: "Informe seu nome.",
  email: "Informe um e-mail válido.",
  whatsapp: "Informe um WhatsApp válido com DDD.",
  aceite_termos: "Aceite a política de privacidade para enviar."
};

function responder(res, status, corpo) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(corpo));
}

function limparTexto(valor, max) {
  return String(valor == null ? "" : valor)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function limparRef(valor) {
  var ref = limparTexto(valor, 80).replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "");
  return ref || "direto";
}

function limparUtm(valor) {
  return limparTexto(valor, 200);
}

function urlHttp(valor) {
  var texto = limparTexto(valor, 2000);
  if (!texto) return "";
  try {
    var url = new URL(texto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.href.slice(0, 2000);
  } catch (erro) {
    return "";
  }
}

function limparTimestamp(valor) {
  var data = new Date(valor);
  if (Number.isNaN(data.getTime())) return new Date().toISOString();
  return data.toISOString();
}

function digitosTelefone(valor) {
  var digitos = String(valor == null ? "" : valor).replace(/\D/g, "");
  if ((digitos.length === 12 || digitos.length === 13) && digitos.indexOf("55") === 0) {
    digitos = digitos.slice(2);
  }
  return digitos.slice(0, 11);
}

function formatarTelefone(digitos) {
  if (digitos.length === 11) {
    return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, 7) + "-" + digitos.slice(7);
  }
  if (digitos.length === 10) {
    return "(" + digitos.slice(0, 2) + ") " + digitos.slice(2, 6) + "-" + digitos.slice(6);
  }
  return digitos;
}

function telefoneValido(digitos) {
  if (digitos.length !== 10 && digitos.length !== 11) return false;
  if (!DDDS[digitos.slice(0, 2)]) return false;
  if (digitos.length === 11 && digitos.charAt(2) !== "9") return false;
  return true;
}

function emailValido(valor) {
  if (!valor || valor.length > 254) return false;
  // Qualquer domínio serve, inclusive Gmail, Hotmail e outros pessoais.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
}

function nomeValido(valor) {
  return valor.length >= 2 && valor.length <= 120 && /\p{L}/u.test(valor);
}

function normalizarLead(entrada) {
  var body = entrada || {};
  var nome = limparTexto(body.nome, 120);
  var email = limparTexto(body.email, 254).toLowerCase();
  var cargo = limparTexto(body.cargo, 80);
  var empresa = limparTexto(body.empresa, 160);
  var digitos = digitosTelefone(body.whatsapp);
  var campos = {};
  var agora = new Date().toISOString();

  if (!nomeValido(nome)) campos.nome = MENSAGENS.nome;
  if (!emailValido(email)) campos.email = MENSAGENS.email;
  if (!telefoneValido(digitos)) campos.whatsapp = MENSAGENS.whatsapp;
  if (body.aceite_termos !== true) campos.aceite_termos = MENSAGENS.aceite_termos;

  if (Object.keys(campos).length) {
    return { ok: false, campos: campos };
  }

  return {
    ok: true,
    lead: {
      nome: nome,
      email: email,
      whatsapp: formatarTelefone(digitos),
      whatsapp_e164: "+55" + digitos,
      cargo: cargo,
      empresa: empresa,
      aceite_termos: true,
      aceite_comunicacoes: body.aceite_comunicacoes === true,
      consentimento_em: agora,
      ref: limparRef(body.ref),
      utm_source: limparUtm(body.utm_source),
      utm_medium: limparUtm(body.utm_medium),
      utm_campaign: limparUtm(body.utm_campaign),
      utm_term: limparUtm(body.utm_term),
      utm_content: limparUtm(body.utm_content),
      page_url: urlHttp(body.page_url),
      referrer: urlHttp(body.referrer),
      timestamp: limparTimestamp(body.timestamp),
      received_at: agora
    }
  };
}

function lerHttps(nome) {
  var bruto = String(process.env[nome] || "").trim();
  if (!bruto) return { configurada: false };
  try {
    var url = new URL(bruto);
    if (url.protocol !== "https:") return { configurada: true, invalida: true };
    return { configurada: true, href: url.href };
  } catch (erro) {
    return { configurada: true, invalida: true };
  }
}

function urlBitrix(href) {
  var url = new URL(href);
  if (/crm\.lead\.add(\.json)?$/i.test(url.pathname)) {
    if (!/\.json$/i.test(url.pathname)) url.pathname += ".json";
    return url.href;
  }
  if (url.pathname.charAt(url.pathname.length - 1) !== "/") url.pathname += "/";
  url.pathname += "crm.lead.add.json";
  return url.href;
}

function camposBitrix(lead) {
  var partes = lead.nome.split(" ");
  var primeiro = partes.shift();
  var restante = partes.join(" ");
  var campos = {
    TITLE: lead.ref + " · " + lead.nome,
    NAME: primeiro,
    EMAIL: [{ VALUE: lead.email, VALUE_TYPE: "WORK" }],
    PHONE: [{ VALUE: lead.whatsapp_e164, VALUE_TYPE: "MOBILE" }],
    SOURCE_DESCRIPTION: lead.ref,
    UTM_SOURCE: lead.utm_source,
    UTM_MEDIUM: lead.utm_medium,
    UTM_CAMPAIGN: lead.utm_campaign,
    UTM_TERM: lead.utm_term,
    UTM_CONTENT: lead.utm_content,
    COMMENTS: [
      "Ref: " + lead.ref,
      "Cargo: " + (lead.cargo || "—"),
      "Empresa: " + (lead.empresa || "—"),
      "Página: " + (lead.page_url || "—"),
      "Referrer: " + (lead.referrer || "—"),
      "Enviado em: " + lead.timestamp,
      "Recebido em: " + lead.received_at,
      "Aceite dos termos e da política: " + (lead.aceite_termos ? "sim" : "não"),
      "Consentimento para comunicações: " + (lead.aceite_comunicacoes ? "sim" : "não"),
      "Consentimento em: " + lead.consentimento_em
    ].join("\n")
  };
  if (restante) campos.LAST_NAME = restante;
  if (lead.empresa) campos.COMPANY_TITLE = lead.empresa;
  if (lead.cargo) campos.POST = lead.cargo;
  return campos;
}

function postJson(url, corpo) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(corpo),
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS)
  }).then(function (resposta) {
    return resposta.text().then(function (texto) {
      var json = null;
      try {
        json = texto ? JSON.parse(texto) : null;
      } catch (erro) {
        json = null;
      }
      return { ok: resposta.ok, status: resposta.status, json: json };
    });
  });
}

function encaminhar(lead) {
  var webhook = lerHttps("LEAD_WEBHOOK_URL");
  var bitrix = lerHttps("BITRIX24_WEBHOOK_URL");

  if (webhook.invalida || bitrix.invalida) {
    console.error(JSON.stringify({
      evento: "lead_config_invalida",
      ref: lead.ref,
      webhook: Boolean(webhook.invalida),
      bitrix: Boolean(bitrix.invalida)
    }));
    return Promise.resolve({ ok: false, status: 502 });
  }

  if (!webhook.configurada && !bitrix.configurada) {
    console.log(JSON.stringify({ evento: "lead_preview", lead: lead }));
    return Promise.resolve({ ok: true });
  }

  var tarefas = [];

  if (webhook.configurada) {
    tarefas.push(
      postJson(webhook.href, lead).then(function (resultado) {
        if (!resultado.ok) {
          console.error(JSON.stringify({
            evento: "lead_falhou",
            destino: "webhook",
            ref: lead.ref,
            status: resultado.status
          }));
          throw new Error("webhook");
        }
        return "webhook";
      })
    );
  }

  if (bitrix.configurada) {
    tarefas.push(
      postJson(urlBitrix(bitrix.href), {
        fields: camposBitrix(lead),
        params: { REGISTER_SONET_EVENT: "Y" }
      }).then(function (resultado) {
        if (!resultado.ok || (resultado.json && resultado.json.error)) {
          console.error(JSON.stringify({
            evento: "lead_falhou",
            destino: "bitrix",
            ref: lead.ref,
            status: resultado.status,
            codigo: resultado.json && resultado.json.error ? resultado.json.error : ""
          }));
          if (!webhook.configurada) throw new Error("bitrix");
          return "bitrix_ignorado";
        }
        return "bitrix";
      })
    );
  }

  return Promise.all(tarefas).then(function (destinos) {
    console.log(JSON.stringify({
      evento: "lead_recebido",
      ref: lead.ref,
      destinos: destinos
    }));
    return { ok: true };
  }).catch(function () {
    return { ok: false, status: 502 };
  });
}

function lerCorpo(req) {
  if (req.body != null && req.body !== "") {
    if (typeof req.body === "string") {
      if (req.body.length > LIMITE_CORPO) {
        return Promise.reject(Object.assign(new Error("grande"), { status: 413 }));
      }
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch (erro) {
        return Promise.reject(Object.assign(new Error("json"), { status: 400 }));
      }
    }
    if (typeof req.body === "object") return Promise.resolve(req.body);
  }

  return new Promise(function (resolve, reject) {
    var pedacos = [];
    var tamanho = 0;
    req.on("data", function (pedaco) {
      tamanho += pedaco.length;
      if (tamanho > LIMITE_CORPO) {
        reject(Object.assign(new Error("grande"), { status: 413 }));
        req.destroy();
        return;
      }
      pedacos.push(pedaco);
    });
    req.on("end", function () {
      if (!pedacos.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(pedacos).toString("utf8")));
      } catch (erro) {
        reject(Object.assign(new Error("json"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return responder(res, 405, { ok: false, error: "Método não permitido." });
  }

  var body;
  try {
    body = await lerCorpo(req);
  } catch (erro) {
    var status = erro.status || 400;
    var mensagem = status === 413
      ? "Os dados enviados são grandes demais."
      : "Não foi possível ler os dados.";
    return responder(res, status, { ok: false, error: mensagem });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return responder(res, 400, { ok: false, error: "Não foi possível ler os dados." });
  }

  if (limparTexto(body.hp_field, 200)) {
    console.log(JSON.stringify({ evento: "lead_ignorado" }));
    return responder(res, 200, { ok: true });
  }

  var normalizado = normalizarLead(body);
  if (!normalizado.ok) {
    return responder(res, 400, {
      ok: false,
      error: "Confira os campos e tente de novo.",
      campos: normalizado.campos
    });
  }

  var envio = await encaminhar(normalizado.lead);
  if (!envio.ok) {
    return responder(res, envio.status || 502, {
      ok: false,
      error: "Não foi possível enviar agora. Tente de novo em instantes."
    });
  }

  return responder(res, 200, { ok: true });
}

module.exports = handler;
module.exports.normalizarLead = normalizarLead;
module.exports.camposBitrix = camposBitrix;
module.exports.urlBitrix = urlBitrix;
module.exports.encaminhar = encaminhar;
module.exports.lerHttps = lerHttps;
