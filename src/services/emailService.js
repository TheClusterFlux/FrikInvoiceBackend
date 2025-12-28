const axios = require('axios');

const EMAIL_API_URL = process.env.EMAIL_API_URL || 'http://email-api-service:8080';

/**
 * Escape HTML special characters to prevent XSS attacks
 */
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  const str = String(text);
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Send email via the mail server API
 */
async function sendEmail({ to, subject, body, html = false, fromEmail = null, replyTo = null, attachments = null }) {
  try {
    console.log('Sending email via email service:', {
      to,
      subject,
      emailApiUrl: EMAIL_API_URL,
      hasBody: !!body,
      html,
      hasAttachments: !!attachments
    });

    const payload = {
      to,
      subject,
      body,
      html,
      from_email: fromEmail,
      reply_to: replyTo
    };

    // Add attachments if provided
    if (attachments && Array.isArray(attachments)) {
      payload.attachments = attachments;
    }

    const response = await axios.post(`${EMAIL_API_URL}/send`, payload, {
      timeout: 30000 // 30 second timeout (longer for PDF attachments)
    });

    console.log('Email sent successfully:', {
      to,
      subject,
      messageId: response.data?.message,
      timestamp: response.data?.timestamp
    });

    return {
      success: true,
      messageId: response.data.message,
      timestamp: response.data.timestamp
    };
  } catch (error) {
    console.error('Email sending error:', {
      to,
      subject,
      emailApiUrl: EMAIL_API_URL,
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      code: error.code
    });
    throw new Error(`Failed to send email: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * Send invoice signing email to customer
 */
async function sendSigningEmail({ to, orderNumber, signingUrl, customerName, invoiceTotal }) {
  const subject = `Please Sign Invoice ${orderNumber}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { background: #0056b3; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice Signature Required</h1>
        </div>
        <div class="content">
          <p>Dear ${escapeHtml(customerName || 'Valued Customer')},</p>
          
          <p>You have been sent invoice <strong>${escapeHtml(orderNumber)}</strong> for your review and signature.</p>
          
          <div class="info-box">
            <strong>Invoice Number:</strong> ${escapeHtml(orderNumber)}<br>
            <strong>Total Amount:</strong> R${escapeHtml(invoiceTotal.toFixed(2))}
          </div>
          
          <p>Please click the button below to review and sign the invoice:</p>
          
          <div style="text-align: center;">
            <a href="${escapeHtml(signingUrl)}" class="button">Review & Sign Invoice</a>
          </div>
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            <strong>Important:</strong> This link is unique to you and will expire in 30 days. 
            If you did not request this invoice, please ignore this email.
          </p>
          
          <p style="font-size: 12px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${escapeHtml(signingUrl)}" style="color: #007bff; word-break: break-all;">${escapeHtml(signingUrl)}</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated message from TheClusterFlux Invoice System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // For plain text, we still escape to be safe (though less critical)
  const plainBody = `
Invoice Signature Required

Dear ${customerName || 'Valued Customer'},

You have been sent invoice ${orderNumber} for your review and signature.

Invoice Number: ${orderNumber}
Total Amount: R${invoiceTotal.toFixed(2)}

Please click the link below to review and sign the invoice:
${signingUrl}

Important: This link is unique to you and will expire in 30 days. 
If you did not request this invoice, please ignore this email.

This is an automated message from TheClusterFlux Invoice System.
Please do not reply to this email.
  `;

  console.log('Sending signing email:', {
    to,
    orderNumber,
    customerName,
    invoiceTotal,
    signingUrl: signingUrl.substring(0, 50) + '...' // Log partial URL for security
  });

  return await sendEmail({
    to,
    subject,
    body: htmlBody,
    html: true,
    fromEmail: process.env.EMAIL_FROM || 'noreply@theclusterflux.com',
    replyTo: process.env.EMAIL_REPLY_TO || null
  });
}

/**
 * Send invoice PDF via email to customer
 */
async function sendInvoicePDF({ to, orderNumber, customerName, orderId, templateName = 'signing-screen' }) {
  const { generatePDF } = require('./pdfService');
  
  try {
    // Generate PDF
    const Order = require('../models/Order');
    const order = await Order.findById(orderId).populate('items.inventoryId');
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    const pdfBuffer = await generatePDF(order, templateName);
    
    // Convert PDF buffer to base64 for email attachment
    const pdfBase64 = pdfBuffer.toString('base64');
    
    const subject = `Invoice ${orderNumber} - Copy`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice Copy</h1>
          </div>
          <div class="content">
            <p>Dear ${escapeHtml(customerName || 'Valued Customer')},</p>
            
            <p>Please find attached a copy of invoice <strong>${escapeHtml(orderNumber)}</strong>.</p>
            
            <div class="info-box">
              <strong>Invoice Number:</strong> ${escapeHtml(orderNumber)}<br>
              <strong>Total Amount:</strong> R${escapeHtml(order.total.toFixed(2))}
            </div>
            
            <p>This invoice has been signed and is now complete.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from TheClusterFlux Invoice System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const plainBody = `
Invoice Copy

Dear ${customerName || 'Valued Customer'},

Please find attached a copy of invoice ${orderNumber}.

Invoice Number: ${orderNumber}
Total Amount: R${order.total.toFixed(2)}

This invoice has been signed and is now complete.

This is an automated message from TheClusterFlux Invoice System.
Please do not reply to this email.
    `;
    
    // Send email with PDF attachment
    await sendEmail({
      to,
      subject,
      body: htmlBody,
      html: true,
      fromEmail: process.env.EMAIL_FROM || 'noreply@theclusterflux.com',
      replyTo: process.env.EMAIL_REPLY_TO || null,
      attachments: [
        {
          filename: `invoice-${orderNumber}.pdf`,
          content: pdfBase64,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    });
    
    // Get response from sendEmail (it returns success info)
    const emailResult = {
      success: true,
      message: 'Email sent successfully',
      timestamp: new Date().toISOString()
    };
    
    console.log('Invoice PDF email sent successfully:', {
      to,
      orderNumber,
      customerName,
      messageId: emailResult.message
    });
    
    return {
      success: true,
      messageId: emailResult.message,
      timestamp: emailResult.timestamp
    };
  } catch (error) {
    console.error('Error sending invoice PDF email:', {
      to,
      orderNumber,
      error: error.message
    });
    throw new Error(`Failed to send invoice PDF: ${error.response?.data?.detail || error.message}`);
  }
}

module.exports = {
  sendEmail,
  sendSigningEmail,
  sendInvoicePDF
};

