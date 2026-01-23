
import nodemailer from 'nodemailer';
import { getPlatformLogo } from '@/app/lib/branding/logo';

// Helper function to create transporter with user's credentials
function createUserTransporter(userEmail: string, userPassword: string, smtpHost?: string, smtpPort?: number) {
    return nodemailer.createTransport({
        host: smtpHost || 'smtp.gmail.com',
        port: smtpPort || 587,
        secure: false, // Use STARTTLS
        auth: {
            user: userEmail,
            pass: userPassword,
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}

// Email configuration - Google Workspace SMTP
const DEFAULT_EMAIL_USER = 'cso@consolegal.com';
const DEFAULT_EMAIL_PASSWORD = 'kcnwmlxptfrrcbuo'; // Google App Password (spaces removed)

// Try multiple SMTP configurations for Google Workspace
const createGmailTransporter = () => {
    // Configuration 1: Standard Gmail SMTP with STARTTLS
    const config1 = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: DEFAULT_EMAIL_USER,
            pass: DEFAULT_EMAIL_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false
        },
        debug: true,
        logger: true,
    };

    // Configuration 2: Gmail SMTP with SSL (port 465)
    const config2 = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: DEFAULT_EMAIL_USER,
            pass: DEFAULT_EMAIL_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false
        },
        debug: true,
        logger: true,
    };

    // Try config1 first (port 587), fallback to config2 if needed
    return nodemailer.createTransport(config1);
};

// Fallback transporter using Gmail SMTP
const defaultTransporter = createGmailTransporter();

export async function sendGenericEmail(to: string, subject: string, html: string) {
    try {
        const info = await defaultTransporter.sendMail({
            from: `"Consolegal" <${DEFAULT_EMAIL_USER}>`,
            to,
            subject,
            html
        });
        return true;
    } catch (error: any) {


        // Provide helpful debugging information
        if (error.code === 'EAUTH' || error.responseCode === 535) {

        }

        throw error;
    }
}

export async function sendMeetingInvite(
    meeting: any,
    userCredentials?: { email: string; password: string; smtpHost?: string; smtpPort?: number }
) {
    if (!meeting.client_email) return;

    const meetingDate = new Date(meeting.meeting_date);
    const formattedDate = meetingDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = meetingDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const subject = `Meeting Schedule Confirmation - "${meeting.title}"`;
    const platformLogo = await getPlatformLogo();
    // Ensure full URL for email clients
    const logoUrl = platformLogo.startsWith('http') ? platformLogo : `${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.consolegal.com'}${platformLogo}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header with Logo -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #15426d 0%, #1a5280 100%); padding: 30px; text-align: center;">
                                ${logoUrl ? `
                                <img src="${logoUrl}" 
                                     alt="Consolegal Logo" 
                                     style="height: 60px; margin-bottom: 15px;">
                                ` : ''}
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                                    Meeting Schedule Confirmation
                                </h1>
                            </td>
                        </tr>
                        
                        <!-- Body Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Hi <strong>${meeting.client_name || 'there'}</strong>,
                                </p>
                                
                                <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                                    The Meeting Scheduled on <strong>${formattedDate}</strong> and <strong>${formattedTime}</strong> has been Confirmed.
                                </p>
                                
                                <!-- Meeting Details Card -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-left: 4px solid #15426d; border-radius: 4px; margin: 25px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h2 style="color: #15426d; margin: 0 0 15px 0; font-size: 18px;">
                                                📅 ${meeting.title}
                                            </h2>
                                            
                                            <p style="margin: 8px 0; color: #555; font-size: 14px;">
                                                <strong>📆 Date:</strong> ${formattedDate}
                                            </p>
                                            
                                            <p style="margin: 8px 0; color: #555; font-size: 14px;">
                                                <strong>🕐 Time:</strong> ${formattedTime}
                                            </p>
                                            
                                            <p style="margin: 8px 0; color: #555; font-size: 14px;">
                                                <strong>⏱️ Duration:</strong> ${meeting.duration || 60} minutes
                                            </p>
                                            
                                            <p style="margin: 8px 0; color: #555; font-size: 14px;">
                                                <strong>📍 Type:</strong> ${meeting.type === 'online' ? 'Online (Video Call)' : 'Offline (In-Person)'}
                                            </p>
                                            
                                            ${meeting.type === 'online' && meeting.meeting_link ? `
                                                <p style="margin: 15px 0 8px 0; color: #555; font-size: 14px;">
                                                    <strong>🔗 Meeting Link:</strong>
                                                </p>
                                                <a href="${meeting.meeting_link}" 
                                                   style="display: inline-block; background-color: #15426d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 500; margin-top: 5px;">
                                                    Join Meeting
                                                </a>
                                            ` : ''}
                                            
                                            ${meeting.type === 'offline' && meeting.location ? `
                                                <p style="margin: 8px 0; color: #555; font-size: 14px;">
                                                    <strong>📍 Location:</strong> ${meeting.location}
                                                </p>
                                            ` : ''}
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 25px 0 0 0;">
                                    Happy to Connect! 😊
                                </p>

                                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0;">
                                    Regards,<br>
                                    <strong style="color: #15426d;">ConsoLegal Team</strong>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    // Use user's transporter if credentials provided, otherwise use default
    const transporter = userCredentials
        ? createUserTransporter(userCredentials.email, userCredentials.password, userCredentials.smtpHost, userCredentials.smtpPort)
        : defaultTransporter;

    const fromEmail = userCredentials?.email || process.env.EMAIL_USER;

    try {
        await transporter.sendMail({
            from: `"Consolegal CRM" <${fromEmail}>`,
            to: meeting.client_email,
            subject,
            html,
        });
    } catch (error) {
    }
}

export async function sendAdminNotification(meeting: any) {
    // Notify admin about new public booking request
    // Default to cso@consolegal.com if valid env var is not present
    const adminEmail = process.env.ADMIN_EMAIL || 'cso@consolegal.com';

    if (!adminEmail) return;

    const subject = `New Meeting Request: ${meeting.client_name}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>New Meeting Request</h2>
        <p><strong>Client:</strong> ${meeting.client_name} (${meeting.client_email})</p>
        <p><strong>Proposed Date:</strong> ${new Date(meeting.meeting_date).toLocaleString()}</p>
        <p><strong>Topic:</strong> ${meeting.title}</p>
        <p><strong>Description:</strong> ${meeting.description || 'N/A'}</p>
        
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/meetings">View in Dashboard</a></p>
      </div>
    `;

    try {
        await defaultTransporter.sendMail({
            from: `"Consolegal CRM" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject,
            html,
        });
    } catch (error) {
        console.error('Failed to send admin notification:', error);
    }
}

export async function sendBookingConfirmation(
    booking: any,
    eventType: any,
    userCredentials?: { email: string; password: string; smtpHost?: string; smtpPort?: number }
) {
    if (!booking.client_email) return;

    const bookingDate = new Date(booking.meeting_date);
    const formattedDate = bookingDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = bookingDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const subject = `Booking Schedule Intimation - "${eventType?.title || booking.title}"`;
    const platformLogo = await getPlatformLogo();
    const logoUrl = platformLogo.startsWith('http') ? platformLogo : `${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.consolegal.com'}${platformLogo}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <!-- Header with Logo -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #15426d 0%, #1a5280 100%); padding: 30px; text-align: center;">
                                ${logoUrl ? `
                                <img src="${logoUrl}" 
                                     alt="Consolegal Logo" 
                                     style="height: 60px; margin-bottom: 15px;">
                                ` : ''}
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                                    Booking Schedule Intimation
                                </h1>
                            </td>
                        </tr>
                        
                        <!-- Body Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Hi <strong>${booking.client_name || 'there'}</strong>,
                                </p>
                                
                                <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                                    The Meeting schedule on <strong>${formattedDate}</strong> and <strong>${formattedTime}</strong> has been created by you.
                                </p>
                                
                                <!-- Booking Details Card -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-left: 4px solid #15426d; border-radius: 4px; margin: 25px 0;">
                                    <tr>
                                        <td style="padding: 20px;">
                                            <h2 style="color: #15426d; margin: 0 0 15px 0; font-size: 18px;">
                                                📅 ${eventType?.title || booking.title}
                                            </h2>
                                            
                                            <p style="margin: 8px 0; color: #555; font-size: 14px;">
                                                <strong>📆 Date:</strong> ${formattedDate}
                                            </p>
                                            
                                            <p style="margin: 8px 0; color: #555; font-size: 14px;">
                                                <strong>🕐 Time:</strong> ${formattedTime}
                                            </p>
                                            
                                            <p style="margin: 8px 0; color: #555; font-size: 14px;">
                                                <strong>⏱️ Duration:</strong> ${eventType?.duration || booking.duration || 30} minutes
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 25px 0 0 0;">
                                    Once confirmed, you'll receive a final confirmation email with required details.
                                </p>

                                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 10px 0;">
                                    Regards,<br>
                                    <strong style="color: #15426d;">ConsoLegal Team</strong>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    // Use user's transporter if credentials provided, otherwise use default
    const transporter = userCredentials
        ? createUserTransporter(userCredentials.email, userCredentials.password, userCredentials.smtpHost, userCredentials.smtpPort)
        : defaultTransporter;

    const fromEmail = userCredentials?.email || process.env.EMAIL_USER;

    try {
        await transporter.sendMail({
            from: `"Consolegal CRM" <${fromEmail}>`,
            to: booking.client_email,
            subject,
            html,
        });
    } catch (error) {
    }
}
