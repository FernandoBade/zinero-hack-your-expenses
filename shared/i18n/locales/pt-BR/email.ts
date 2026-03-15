import type { EmailCatalog } from "../../types/catalog";

export const ptBREmailCatalog = {
  "email.auth.link.label": "Link:",
  "email.auth.password_reset.body": "Use o link abaixo para redefinir sua senha.",
  "email.auth.password_reset.subject": "Redefina sua senha",
  "email.auth.password_reset.warning": "Se voce nao solicitou isso, ignore este email.",
  "email.auth.verification.body": "Use o link abaixo para verificar seu email.",
  "email.auth.verification.subject": "Verifique seu email",
  "email.feedback.intro": "Uma nova mensagem de feedback beta foi enviada.",
  "email.feedback.message_label": "Mensagem:",
  "email.feedback.subject": "Feedback da versao beta",
  "email.feedback.title_label": "Titulo:",
  "email.feedback.user_email_label": "Email do usuario:",
  "email.feedback.user_id_label": "ID do usuario:",
} as const satisfies EmailCatalog;

