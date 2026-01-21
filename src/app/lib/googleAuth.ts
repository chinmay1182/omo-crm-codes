import { google } from 'googleapis';

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || '748305760307-j2eu9ks5kauci3uv09ob3rmik8ffcvme.apps.googleusercontent.com',
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_MEET_REDIRECT_URI || 'https://crm.consolegal.com/api/google/callback'
);

export const getAuthUrl = (pendingMeetingId: string) => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state: pendingMeetingId,   // <-- yahan pendingMeetingId state ke through bhej rahe hain

  });
};

export const getOAuthClient = (code: string) => {
  return new Promise<typeof oauth2Client>((resolve, reject) => {
    oauth2Client.getToken(code, (err, tokens) => {
      if (err) return reject(err);
      oauth2Client.setCredentials(tokens!);
      resolve(oauth2Client);
    });
  });
};

export const createGoogleMeet = async (
  auth: any,
  meetingDetails: {
    title: string;
    startTime: string;
    endTime: string;
    description?: string;
    attendees?: string[];
  }
) => {
  const calendar = google.calendar({ version: 'v3', auth });

  const event: any = {
    summary: meetingDetails.title,
    description: meetingDetails.description || '',
    start: {
      dateTime: meetingDetails.startTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: meetingDetails.endTime,
      timeZone: 'UTC',
    },
    conferenceData: {
      createRequest: {
        requestId: Math.random().toString(36).substring(2, 15),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    attendees: meetingDetails.attendees
      ? meetingDetails.attendees.map(email => ({ email }))
      : [],
    guestsCanModify: false,
    guestsCanInviteOthers: false,
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
  });

  return {
    meetLink: response.data.hangoutLink,
    eventId: response.data.id,
  };
};
