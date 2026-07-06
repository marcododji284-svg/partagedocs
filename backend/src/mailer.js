const nodemailer = require('nodemailer');

// GMAIL_USER : l'adresse Gmail dédiée créée pour l'envoi.
// GMAIL_APP_PASSWORD : un "mot de passe d'application" (PAS le mot de passe normal du compte).
// Pour le créer : compte Google > Sécurité > Validation en deux étapes (à activer si besoin)
// > Mots de passe des applications > en générer un pour "Mail".
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendMail({ to, subject, text }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('GMAIL_USER / GMAIL_APP_PASSWORD non configurés : e-mail non envoyé (voir .env).');
    return { sent: false, reason: 'not-configured' };
  }

  try {
    await transporter.sendMail({
      from: `PartageDocs <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text
    });
    return { sent: true };
  } catch (err) {
    console.error('Erreur envoi e-mail :', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendMail };
