import type { EmailCatalog } from "../../types/catalog";

export const esESEmailCatalog = {
  "email.auth.link.label": "Si el botón no funciona, copia y pega este enlace:",
  "email.auth.password_reset.body": "Recibimos una solicitud para restablecer tu contraseña de Zinero. Usa este enlace seguro para crear una nueva.",
  "email.auth.password_reset.cta": "Restablecer contraseña",
  "email.auth.password_reset.heading": "Restablece tu contraseña",
  "email.auth.password_reset.preheader": "Usa este enlace seguro para crear una nueva contraseña.",
  "email.auth.password_reset.subject": "Restablece tu contraseña de Zinero",
  "email.auth.password_reset.warning": "Si no pediste restablecer tu contraseña, puedes ignorar este correo.",
  "email.auth.verification.body": "Ya casi estás. Confirma esta dirección de correo para activar tu cuenta de Zinero.",
  "email.auth.verification.cta": "Verificar correo",
  "email.auth.verification.heading": "Verifica tu correo",
  "email.auth.verification.preheader": "Confirma tu correo para activar tu cuenta de Zinero.",
  "email.auth.verification.subject": "Verifica tu correo de Zinero",
  "email.auth.verification.warning": "Si no creaste una cuenta en Zinero, puedes ignorar este correo.",
  "email.feedback.intro": "Se envio un nuevo mensaje de comentarios beta.",
  "email.feedback.message_label": "Mensaje:",
  "email.feedback.subject": "Comentarios de la version beta",
  "email.feedback.title_label": "Titulo:",
  "email.feedback.user_email_label": "Email de usuario:",
  "email.feedback.user_id_label": "ID de usuario:",
} as const satisfies EmailCatalog;

