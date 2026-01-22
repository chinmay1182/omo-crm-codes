// // Comprehensive MSG91 WhatsApp API verification
// import { NextRequest, NextResponse } from 'next/server';

// export async function GET(req: NextRequest) {
//   try {
//     const API_KEY = process.env.MSG91_API_KEY;

//     if (!API_KEY) {
//       return NextResponse.json({
//         error: 'MSG91_API_KEY not found in environment variables'
//       }, { status: 400 });
//     }

//     const results = {
//       apiKey: `${API_KEY.substring(0, 8)}...`,
//       tests: {} as any,
//       summary: {} as any
//     };

//     // Test 1: Basic SMS API (should work)
//     try {
//       const smsResponse = await fetch(`https://api.msg91.com/api/balance.php?authkey=${API_KEY}`);
//       const smsData = await smsResponse.text();

//       results.tests.sms = {
//         endpoint: 'SMS Balance API',
//         status: smsResponse.status,
//         success: smsResponse.ok && !smsData.includes('Please provide valid auth key'),
//         response: smsData,
//         meaning: smsResponse.ok ? 'SMS API access confirmed' : 'SMS API access denied'
//       };
//     } catch (error) {
//       results.tests.sms = {
//         endpoint: 'SMS Balance API',
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error'
//       };
//     }

//     // Test 2: WhatsApp Business Profile (will likely fail)
//     try {
//       const profileResponse = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-business-profile', {
//         method: 'GET',
//         headers: {
//           'accept': 'application/json',
//           'authkey': API_KEY
//         }
//       });

//       const profileData = await profileResponse.json();

//       results.tests.whatsapp_profile = {
//         endpoint: 'WhatsApp Business Profile',
//         status: profileResponse.status,
//         success: profileResponse.ok && !profileData.errors,
//         response: profileData,
//         meaning: profileResponse.status === 401 ? 'WhatsApp API not authorized for this account' :
//           profileResponse.ok ? 'WhatsApp API access confirmed' : 'WhatsApp API error'
//       };
//     } catch (error) {
//       results.tests.whatsapp_profile = {
//         endpoint: 'WhatsApp Business Profile',
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error'
//       };
//     }

//     // Test 3: WhatsApp Send Message (will likely fail)
//     try {
//       const sendResponse = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message', {
//         method: 'POST',
//         headers: {
//           'accept': 'application/json',
//           'content-type': 'application/json',
//           'authkey': API_KEY
//         },
//         body: JSON.stringify({
//           integrated_number: process.env.SENDER_NUMBER || '+915422982253',
//           recipient_number: '917977828994', // Test number
//           type: 'text',
//           message: 'API verification test - please ignore'
//         })
//       });

//       const sendData = await sendResponse.json();

//       results.tests.whatsapp_send = {
//         endpoint: 'WhatsApp Send Message',
//         status: sendResponse.status,
//         success: sendResponse.ok && !sendData.errors,
//         response: sendData,
//         meaning: sendResponse.status === 401 ? 'WhatsApp sending not authorized' :
//           sendResponse.ok ? 'WhatsApp sending works' : 'WhatsApp sending error'
//       };
//     } catch (error) {
//       results.tests.whatsapp_send = {
//         endpoint: 'WhatsApp Send Message',
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error'
//       };
//     }

//     // Test 4: Account Details
//     try {
//       const accountResponse = await fetch(`https://api.msg91.com/api/v5/user/getDetails?authkey=${API_KEY}`);
//       const accountData = await accountResponse.json();

//       results.tests.account = {
//         endpoint: 'Account Details',
//         status: accountResponse.status,
//         success: accountResponse.ok,
//         response: accountData,
//         meaning: accountResponse.ok ? 'Account details accessible' : 'Account details error'
//       };
//     } catch (error) {
//       results.tests.account = {
//         endpoint: 'Account Details',
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error'
//       };
//     }

//     // Generate summary
//     const smsWorks = results.tests.sms?.success || false;
//     const whatsappWorks = results.tests.whatsapp_profile?.success || false;
//     const accountWorks = results.tests.account?.success || false;

//     results.summary = {
//       sms_access: smsWorks,
//       whatsapp_access: whatsappWorks,
//       account_access: accountWorks,
//       diagnosis: whatsappWorks ?
//         'WhatsApp Business API is enabled and working' :
//         smsWorks ?
//           'Only SMS API is enabled. WhatsApp Business API needs to be activated by MSG91 support' :
//           'API key appears to be invalid or account has issues',
//       next_steps: whatsappWorks ? [
//         'Your WhatsApp API is working!',
//         'Configure webhook URL in MSG91 dashboard',
//         'Test sending and receiving messages'
//       ] : [
//         'Contact MSG91 support immediately',
//         'Request WhatsApp Business API activation',
//         'Provide your API key and phone number',
//         'Ask for WhatsApp-specific credentials if needed'
//       ]
//     };

//     return NextResponse.json(results);

//   } catch (error) {
//     console.error('Verification error:', error);
//     return NextResponse.json({
//       error: 'Verification failed',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     }, { status: 500 });
//   }
// }