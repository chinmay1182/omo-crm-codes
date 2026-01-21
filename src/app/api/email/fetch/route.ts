// src/app/api/email/fetch/route.ts (Next.js API route)

import { NextRequest, NextResponse } from 'next/server';
import Imap from 'imap-simple';
import { simpleParser } from 'mailparser';

export async function POST(req: NextRequest) {
  try {
    const { email, password, imapHost, imapPort, folder = 'INBOX', limit = 50 } = await req.json();

    if (!email || !password || !imapHost || !imapPort) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const config = {
      imap: {
        user: email,
        password,
        host: imapHost,
        port: imapPort,
        tls: true,
        authTimeout: 30000, // Increased timeout
        tlsOptions: { rejectUnauthorized: false }
      },
    };

    const connection = await Imap.connect(config);

    // Resolve folder name
    // Default to INBOX
    let targetBox = 'INBOX';

    // If user requested a specific folder, try to find the best match on the server
    if (folder !== 'INBOX') {
      const boxes = await connection.getBoxes();

      // Define common mappings for standard folders
      const searchTerms: Record<string, string[]> = {
        'sent': ['sent', 'sent items', 'sent mail'],
        'trash': ['trash', 'bin', 'deleted items', 'deleted'],
        'spam': ['spam', 'junk', 'bulk'],
        'drafts': ['drafts']
      };

      const terms = searchTerms[folder.toLowerCase()] || [folder.toLowerCase()];

      // Recursive helper to find matching box name
      const findBoxPath = (boxList: any, prefix = ''): string | null => {
        for (const key in boxList) {
          const boxName = key;
          const fullPath = prefix ? prefix + (boxList[key].delimiter || '/') + key : key;

          // check current box name against terms
          if (terms.some(t => boxName.toLowerCase().includes(t))) {
            return fullPath;
          }

          // check children
          if (boxList[key].children) {
            const childMatch = findBoxPath(boxList[key].children, fullPath);
            if (childMatch) return childMatch;
          }
        }
        return null;
      };

      const match = findBoxPath(boxes);
      if (match) {
        targetBox = match;
      } else {
        console.warn(`Folder '${folder}' not found via fuzzy search, defaulting to original name or INBOX.`);
        targetBox = folder;
      }
    }


    try {
      await connection.openBox(targetBox);
    } catch (openErr) {
      console.warn(`Failed to open '${targetBox}', falling back to INBOX.`, openErr);
      await connection.openBox('INBOX');
    }

    // Search for all emails
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID REFERENCES)', ''], // Added MESSAGE-ID and REFERENCES
      struct: true,
      markSeen: false
    };

    const messages = await connection.search(['ALL'], fetchOptions);

    // Sort by date descending (newest first) and take top 50 (or limit)
    const recentMessages = messages.reverse().slice(0, Number(limit));


    interface ImapPart {
      which: string;
      body: any;
    }

    interface ImapMessage {
      parts: ImapPart[];
      attributes: {
        uid: number;
        date?: Date;
      };
    }

    // Parse emails
    const emails = await Promise.all(
      recentMessages.map(async (item: any) => {
        const messageItem = item as ImapMessage;
        // Adjusted which string to match fetchOptions
        const headerPart = messageItem.parts.find((part: ImapPart) => String(part.which).indexOf('HEADER') !== -1);
        const rawBody = messageItem.parts.find((part: ImapPart) => part.which === '');

        let parsedHeader = headerPart?.body || {};
        let parsedBody = rawBody?.body || '';

        // simpleParser works best on the raw full source, but here we are fetching headers and body separately for efficiency?
        // Actually, simpleParser takes a stream or string. If we pass the body, we get body content.
        // Headers we often get raw. 
        // Note: 'imap-simple' extracts headers into `item.parts[].body` if we ask for HEADER.FIELDS.
        // The previous code was using simpleParser on the BODY to get snippet etc.

        let parsed;
        try {
          parsed = await simpleParser(parsedBody);
        } catch (e) {
          console.error('Mail parse error', e);
          parsed = { text: '', html: '' } as any;
        }

        return {
          id: messageItem.attributes.uid.toString(),
          from: parsedHeader.from ? parsedHeader.from[0] : (parsed.from?.text || 'Unknown'),
          subject: parsedHeader.subject ? parsedHeader.subject[0] : (parsed.subject || '(No Subject)'),
          snippet: parsed.text ? parsed.text.slice(0, 100) : '',
          body: parsed.html || parsed.textAsHtml || parsed.text || '',
          date: parsedHeader.date ? new Date(parsedHeader.date[0]).toISOString() : (parsed.date ? parsed.date.toISOString() : new Date().toISOString()),
          messageId: parsed.messageId, // simpleParser extracts this well from the full body usually, or we can use header
          references: parsed.references // simpleParser extracts this
        };
      })
    );

    await connection.end();

    return NextResponse.json(emails);
  } catch (error: any) {
    console.error('IMAP Fetch Error:', error);
    return NextResponse.json(
      { error: `IMAP Error: ${error.message}` },
      { status: 500 }
    );
  }
}
