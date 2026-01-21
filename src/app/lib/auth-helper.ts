import { getSession } from '@/app/lib/session';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function getSessionOrAgent(request: Request) {
    // First try regular session
    const session = await getSession();
    if (session?.user?.id) {
        return session;
    }

    // If no regular session, try agent authentication
    try {
        const cookies = request.headers.get('cookie');
        const token = cookies?.split('agent-token=')[1]?.split(';')[0];

        if (token) {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            if (payload.type === 'agent') {
                return {
                    user: {
                        id: payload.agentId,
                        username: payload.username,
                        email: payload.email,
                        full_name: payload.fullName,
                        type: 'agent',
                        permissions: payload.permissions
                    }
                };
            }
        }
    } catch (error) {
        console.error('Agent token verification failed:', error);
    }

    return { user: null };
}
