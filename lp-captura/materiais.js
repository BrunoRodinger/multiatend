/*
  MATERIAIS DA CAPTURA
  Cada linha liga um ref (o ?ref= da URL) a um material.
  Para um post novo, inclua uma linha:
    "2026-11-tema": { titulo: "Título do guia", arquivo: "/materiais/nome-do-arquivo.pdf" },
  O ref é comparado em minúsculas. "default" vale para ref desconhecido ou sem ref.
  Os PDFs ficam na pasta /materiais, na raiz do projeto.
*/
window.MATERIAIS = {
  "2026-10-bpmn": {
    titulo: "Mapeie seu processo de vendas com o Claude e BPMN",
    arquivo: "/materiais/guia-processo-vendas-claude-bpmn.pdf"
  },
  "default": {
    titulo: "Mapeie seu processo de vendas com o Claude e BPMN",
    arquivo: "/materiais/guia-processo-vendas-claude-bpmn.pdf"
  }
};

// Número do botão "Fala comigo no WhatsApp" (DDI + DDD + número, só dígitos).
window.WHATSAPP_MATERIAL = "558196178166";
