const API_KEY = process.env.MSG91_API_KEY || '424608A3Z7MMnI0Q68751e0dP1';
const SENDER_NUMBER = process.env.SENDER_NUMBER || '918810878185';

const WHATSAPP_NUMBERS = {
  primary: process.env.MSG91_PRIMARY_NUMBER || '918810878185',
  secondary: process.env.MSG91_SECONDARY_NUMBER || '915422982253'
};

// ---------- Utility Functions ----------
export function getAvailableWhatsAppNumbers() {
  return {
    numbers: WHATSAPP_NUMBERS,
    formatted: {
      primary: `+${WHATSAPP_NUMBERS.primary}`,
      secondary: `+${WHATSAPP_NUMBERS.secondary}`
    },
    list: Object.values(WHATSAPP_NUMBERS)
  };
}

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  else if (cleaned.startsWith('0')) cleaned = '91' + cleaned.substring(1);
  else if (!cleaned.startsWith('91') && cleaned.length === 12) cleaned = '91' + cleaned;
  return cleaned;
}

function formatPhoneForDisplay(phone: string): string {
  return `+${normalizePhoneNumber(phone)}`;
}

// ---------- Send WhatsApp Message ----------
interface MediaOptions {
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  filename?: string; // required for document
  caption?: string;
}

export async function sendWhatsappMessage(
  to: string,
  message?: string,
  senderNumber?: string,
  options: MediaOptions = {}
) {
  let selectedSender = senderNumber || WHATSAPP_NUMBERS.primary;
  if (!Object.values(WHATSAPP_NUMBERS).includes(selectedSender)) {
    selectedSender = WHATSAPP_NUMBERS.primary;
  }

  const cleanTo = normalizePhoneNumber(to);
  const cleanSender = normalizePhoneNumber(selectedSender);

  const payload: any = {
    integrated_number: cleanSender,
    recipient_number: cleanTo,
    content_type: 'text', // default
  };

  // -------- Media support --------
  if (options.mediaUrl) {
    switch (options.mediaType) {
      case 'image':
        payload.content_type = 'image';
        payload.image = { link: options.mediaUrl, caption: options.caption || '' };
        break;
      case 'video':
        payload.content_type = 'video';
        payload.video = { link: options.mediaUrl, caption: options.caption || '' };
        break;
      case 'document':
        if (!options.filename) throw new Error('filename required for document');
        payload.content_type = 'document';
        payload.document = { link: options.mediaUrl, caption: options.caption || '', filename: options.filename };
        break;
      case 'audio':
        payload.content_type = 'audio';
        payload.audio = { link: options.mediaUrl };
        break;
      default:
        throw new Error('Unsupported media type');
    }
  } else if (message) {
    payload.text = message;
  } else {
    throw new Error('Message or mediaUrl must be provided');
  }

  try {
    const res = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'authkey': API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data && (!data.error || data.type === 'success')) {
      return {
        success: true,
        endpoint: 'MSG91 WhatsApp POST',
        data,
        messageId: data.message_uuid || data.request_id || `wa_${Date.now()}`
      };
    } else {
      return {
        success: false,
        endpoint: 'MSG91 WhatsApp POST',
        data,
      };
    }

  } catch (error) {
    console.error('❌ MSG91 Send Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ---------- Quick send from primary/secondary ----------
export async function sendWhatsappFromPrimary(to: string, message: string, options?: MediaOptions) {
  return sendWhatsappMessage(to, message, WHATSAPP_NUMBERS.primary, options);
}

export async function sendWhatsappFromSecondary(to: string, message: string, options?: MediaOptions) {
  return sendWhatsappMessage(to, message, WHATSAPP_NUMBERS.secondary, options);
}

// ---------- Status & Balance ----------
export async function checkMsg91Status() {
  try {
    const res = await fetch(`https://api.msg91.com/api/v2/balance.php?authkey=${API_KEY}`);
    const data = await res.json();
    return { success: res.ok, balance: data, timestamp: new Date().toISOString() };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function checkWhatsAppNumberStatus(whatsappNumber: string) {
  try {
    const cleanNumber = normalizePhoneNumber(whatsappNumber);
    const res = await fetch(`https://control.msg91.com/api/v5/whatsapp/number-status/?authkey=${API_KEY}&number=${cleanNumber}`, {
      method: 'GET',
      headers: { accept: 'application/json' }
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, data, timestamp: new Date().toISOString() };
    }
    return { success: false, error: 'Cannot check number status', timestamp: new Date().toISOString() };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() };
  }
}

export { normalizePhoneNumber, formatPhoneForDisplay };
