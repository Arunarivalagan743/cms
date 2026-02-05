const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send invite email to new user to set password
 */
const sendInviteEmail = async (user, inviteToken) => {
  const setPasswordUrl = `${process.env.FRONTEND_URL}/set-password/${inviteToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #f9fafb; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Contract Management System</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.name},</h2>
          <p>Your account has been created by the administrator.</p>
          <p><strong>Your Role:</strong> ${user.role.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p>Please click the button below to set your password and activate your account:</p>
          <p style="text-align: center;">
            <a href="${setPasswordUrl}" class="button">Set Your Password</a>
          </p>
          <p><small>This link will expire in 7 days.</small></p>
          <p>If you did not expect this email, please ignore it.</p>
        </div>
        <div class="footer">
          <p>Contract Management System &copy; 2026</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hi ${user.name},
    
    Your account has been created by the administrator.
    
    Your Role: ${user.role.replace('_', ' ').toUpperCase()}
    Email: ${user.email}
    
    Please visit the following link to set your password:
    ${setPasswordUrl}
    
    This link will expire in 7 days.
    
    If you did not expect this email, please ignore it.
    
    Contract Management System
  `;

  return sendEmail({
    to: user.email,
    subject: 'Welcome - Set Your Password | Contract Management System',
    html,
    text
  });
};

/**
 * Send password reset email
 */
const sendResetPasswordEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #f9fafb; }
        .button { display: inline-block; padding: 12px 30px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.name},</h2>
          <p>You requested to reset your password.</p>
          <p>Please click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p><small>This link will expire in 1 hour.</small></p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>Contract Management System &copy; 2026</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hi ${user.name},
    
    You requested to reset your password.
    
    Please visit the following link to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you did not request this, please ignore this email.
    
    Contract Management System
  `;

  return sendEmail({
    to: user.email,
    subject: 'Password Reset Request | Contract Management System',
    html,
    text
  });
};

/**
 * Send notification email for contract actions
 */
const sendContractNotificationEmail = async (user, { action, contractName, remarks }) => {
  let subject, message;

  switch (action) {
    case 'submitted':
      subject = 'New Contract Submitted for Review';
      message = `Contract "${contractName}" has been submitted and requires your review.`;
      break;
    case 'approved':
      subject = 'Contract Approved';
      message = `Contract "${contractName}" has been approved.`;
      break;
    case 'rejected':
      subject = 'Contract Rejected';
      message = `Contract "${contractName}" has been rejected. Remarks: ${remarks}`;
      break;
    case 'amended':
      subject = 'Contract Amendment Submitted';
      message = `An amendment for contract "${contractName}" has been submitted for review.`;
      break;
    default:
      subject = 'Contract Update';
      message = `There's an update on contract "${contractName}".`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: #f9fafb; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${subject}</h1>
        </div>
        <div class="content">
          <h2>Hi ${user.name},</h2>
          <p>${message}</p>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View Dashboard</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: `${subject} | Contract Management System`,
    html,
    text: `Hi ${user.name}, ${message}`
  });
};

module.exports = {
  sendEmail,
  sendInviteEmail,
  sendResetPasswordEmail,
  sendContractNotificationEmail
};
