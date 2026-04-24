import type { EmailCatalog } from "../../types/catalog";

export const ptBREmailCatalog = {
  "email.auth.link.label": "Se o botão não funcionar, copie e cole este link:",
  "email.auth.password_reset.body": "Recebemos uma solicitação para redefinir sua senha do Zinero. Use este link seguro para criar uma nova.",
  "email.auth.password_reset.cta": "Redefinir senha",
  "email.auth.password_reset.heading": "Redefina sua senha",
  "email.auth.password_reset.preheader": "Use este link seguro para criar uma nova senha.",
  "email.auth.password_reset.subject": "Redefina sua senha do Zinero",
  "email.auth.password_reset.warning": "Se você não pediu a redefinição de senha, pode ignorar este e-mail.",
  "email.auth.verification.body": "Falta pouco. Confirme este endereço de e-mail para ativar sua conta Zinero.",
  "email.auth.verification.cta": "Verificar e-mail",
  "email.auth.verification.heading": "Verifique seu e-mail",
  "email.auth.verification.preheader": "Confirme seu e-mail para ativar sua conta Zinero.",
  "email.auth.verification.subject": "Verifique seu e-mail do Zinero",
  "email.auth.verification.warning": "Se você não criou uma conta no Zinero, pode ignorar este e-mail.",
  "email.feedback.intro": "Uma nova mensagem de feedback beta foi enviada.",
  "email.feedback.message_label": "Mensagem:",
  "email.feedback.subject": "Feedback da versao beta",
  "email.feedback.title_label": "Titulo:",
  "email.feedback.user_email_label": "Email do usuario:",
  "email.feedback.user_id_label": "ID do usuario:",
} as const satisfies EmailCatalog;

