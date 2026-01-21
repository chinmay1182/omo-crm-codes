// API for managing MSG91 WhatsApp templates
import { NextRequest, NextResponse } from 'next/server';

// Hardcoded configuration
const WHATSAPP_NUMBER = '918810878185'; // Verified from MSG91 activation API
const MSG91_AUTH_KEY = '424608A3Z7MMnI0Q68751e0dP1';

// Get all templates
export async function GET(req: NextRequest) {
    try {
        // Get query parameters for filtering
        const { searchParams } = new URL(req.url);
        const templateName = searchParams.get('template_name') || '';
        const templateStatus = searchParams.get('template_status') || '';
        const templateLanguage = searchParams.get('template_language') || '';


        // Build query string
        const queryParams = new URLSearchParams({
            template_name: templateName,
            template_status: templateStatus,
            template_language: templateLanguage
        });

        const msg91Url = `https://control.msg91.com/api/v5/whatsapp/get-template-client/${WHATSAPP_NUMBER}?${queryParams}`;


        const response = await fetch(msg91Url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'authkey': MSG91_AUTH_KEY
            }
        });

        const result = await response.json();


        if (response.ok && result.status === 'success') {
            // Transform MSG91 template format to our expected format
            const transformedTemplates = result.data?.map((template: any) => {
                const language = template.languages?.[0]; // Get first language
                const bodyComponent = language?.code?.find((c: any) => c.type === 'BODY');
                const headerComponent = language?.code?.find((c: any) => c.type === 'HEADER');
                const footerComponent = language?.code?.find((c: any) => c.type === 'FOOTER');
                const buttonsComponent = language?.code?.find((c: any) => c.type === 'BUTTONS');

                return {
                    id: language?.id || template.name,
                    name: template.name,
                    status: language?.status || 'UNKNOWN',
                    category: template.category,
                    language: language?.language || 'en',
                    namespace: template.namespace,
                    variables: language?.variables || [],
                    components: [
                        ...(headerComponent ? [{
                            type: 'HEADER',
                            text: headerComponent.text,
                            format: headerComponent.format
                        }] : []),
                        ...(bodyComponent ? [{
                            type: 'BODY',
                            text: bodyComponent.text
                        }] : []),
                        ...(footerComponent ? [{
                            type: 'FOOTER',
                            text: footerComponent.text
                        }] : []),
                        ...(buttonsComponent ? [{
                            type: 'BUTTONS',
                            buttons: buttonsComponent.buttons
                        }] : [])
                    ]
                };
            }) || [];

            return NextResponse.json({
                success: true,
                templates: transformedTemplates,
                whatsappNumber: WHATSAPP_NUMBER,
                totalTemplates: transformedTemplates.length,
                rawData: result.data // Include raw data for debugging
            });
        } else {
            // Handle MSG91 API errors
            console.error('MSG91 API Error:', result);

            let errorMessage = 'Failed to fetch templates';
            let errorDetails = result;

            // Check for specific error messages
            if (result.errors && typeof result.errors === 'string') {
                if (result.errors.includes('invalid integrated number')) {
                    errorMessage = 'WhatsApp number not registered with MSG91';
                    errorDetails = `The number ${WHATSAPP_NUMBER} is not associated with your MSG91 account. Please verify the number in MSG91 dashboard.`;
                } else if (result.errors.includes('Not associated with your company')) {
                    errorMessage = 'WhatsApp number not linked to your account';
                    errorDetails = `The number ${WHATSAPP_NUMBER} is not linked to your MSG91 company account. Please check MSG91 settings.`;
                }
            }

            return NextResponse.json({
                error: errorMessage,
                details: errorDetails,
                whatsappNumber: WHATSAPP_NUMBER,
                suggestion: 'Please verify that this WhatsApp number is correctly configured in your MSG91 account'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Server error in whatsapp-templates API:', error);
        return NextResponse.json({
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Create new template
export async function POST(req: NextRequest) {
    try {
        const templateData = await req.json();

        const response = await fetch('https://control.msg91.com/api/v5/whatsapp/whatsapp-templates/', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'authkey': '424608A3Z7MMnI0Q68751e0dP1',
                'content-type': 'application/json'
            },
            body: JSON.stringify(templateData)
        });

        const result = await response.json();

        if (response.ok) {
            return NextResponse.json({ success: true, data: result });
        } else {
            return NextResponse.json({ error: 'Failed to create template', details: result }, { status: 400 });
        }

    } catch (error) {
        return NextResponse.json({
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}