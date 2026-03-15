import type { EmailCatalog } from "../../types/catalog";

export const esESEmailCatalog = {
  "email.auth.link.label": "Enlace:",
  "email.auth.password_reset.body": "Usa el enlace de abajo para restablecer tu contrasena.",
  "email.auth.password_reset.subject": "Restablece tu contrasena",
  "email.auth.password_reset.warning": "Si no solicitaste esto, ignora este correo.",
  "email.auth.verification.body": "Usa el enlace de abajo para verificar tu correo electronico.",
  "email.auth.verification.subject": "Verifica tu correo electronico",
  "email.feedback.intro": "Se envio un nuevo mensaje de comentarios beta.",
  "email.feedback.message_label": "Mensaje:",
  "email.feedback.subject": "Comentarios de la version beta",
  "email.feedback.title_label": "Titulo:",
  "email.feedback.user_email_label": "Email de usuario:",
  "email.feedback.user_id_label": "ID de usuario:",
} as const satisfies EmailCatalog;

