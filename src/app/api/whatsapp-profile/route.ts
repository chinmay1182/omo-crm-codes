// API for fetching WhatsApp Business Profile information
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const API_KEY = process.env.MSG91_API_KEY;

    if (!API_KEY) {
      return NextResponse.json({
        error: 'MSG91 API key not configured'
      }, { status: 500 });
    }

    // Get WhatsApp number from query params or use default
    const { searchParams } = new URL(req.url);
    const whatsappNumber = searchParams.get('number') ||
      process.env.SENDER_NUMBER?.replace('+', '') ||
      '918810878185';


    // Fetch WhatsApp Business Profile from MSG91
    const profileResponse = await fetch(`https://control.msg91.com/api/v5/whatsapp/whatsapp-business-profile/${whatsappNumber}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authkey': API_KEY
      }
    });

    const profileData = await profileResponse.json();



    if (profileResponse.ok && profileData.status === 'success') {
      // Transform MSG91 response to a cleaner format
      const profile = profileData.data || {};

      return NextResponse.json({
        success: true,
        profile: {
          phoneNumber: whatsappNumber,
          displayName: profile.display_name || profile.name || 'Business Account',
          about: profile.about || profile.description || '',
          profilePictureUrl: profile.profile_picture_url || profile.avatar || null,
          businessHours: profile.business_hours || null,
          address: profile.address || null,
          email: profile.email || null,
          website: profile.website || null,
          category: profile.category || null,
          isVerified: profile.is_verified || false,
          status: profile.status || 'active',
          // Raw data for debugging
          rawData: profile
        },
        whatsappNumber,
        fetchedAt: new Date().toISOString()
      });
    } else {
      // Handle different error scenarios
      let errorMessage = 'Failed to fetch WhatsApp Business Profile';
      let errorCode = 'FETCH_ERROR';

      if (profileResponse.status === 401) {
        errorMessage = 'WhatsApp Business API not authorized for this account';
        errorCode = 'UNAUTHORIZED';
      } else if (profileResponse.status === 404) {
        errorMessage = 'WhatsApp Business Profile not found for this number';
        errorCode = 'NOT_FOUND';
      } else if (profileData.errors) {
        errorMessage = profileData.errors[0]?.message || 'API returned errors';
        errorCode = 'API_ERROR';
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        errorCode,
        whatsappNumber,
        details: profileData,
        recommendations: [
          'Verify WhatsApp Business account is set up in MSG91',
          'Check if the phone number is approved for WhatsApp Business API',
          'Ensure MSG91 account has WhatsApp Business access',
          'Contact MSG91 support if the issue persists'
        ]
      }, { status: profileResponse.status });
    }

  } catch (error) {
    console.error('WhatsApp Profile fetch error:', error);

    return NextResponse.json({
      success: false,
      error: 'Server error while fetching WhatsApp Business Profile',
      details: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [
        'Check network connectivity',
        'Verify MSG91 API credentials',
        'Check server logs for detailed errors'
      ]
    }, { status: 500 });
  }
}

// POST endpoint to update WhatsApp Business Profile
export async function POST(req: NextRequest) {
  try {
    const API_KEY = process.env.MSG91_API_KEY;

    if (!API_KEY) {
      return NextResponse.json({
        error: 'MSG91 API key not configured'
      }, { status: 500 });
    }

    const profileData = await req.json();
    const whatsappNumber = profileData.phoneNumber ||
      process.env.SENDER_NUMBER?.replace('+', '') ||
      '918810878185';


    // Update WhatsApp Business Profile via MSG91
    const updateResponse = await fetch(`https://control.msg91.com/api/v5/whatsapp/whatsapp-business-profile/${whatsappNumber}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authkey': API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        display_name: profileData.displayName,
        about: profileData.about,
        profile_picture_url: profileData.profilePictureUrl,
        business_hours: profileData.businessHours,
        address: profileData.address,
        email: profileData.email,
        website: profileData.website,
        category: profileData.category
      })
    });

    const updateResult = await updateResponse.json();

    if (updateResponse.ok && updateResult.status === 'success') {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp Business Profile updated successfully',
        data: updateResult.data,
        updatedAt: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update WhatsApp Business Profile',
        details: updateResult
      }, { status: updateResponse.status });
    }

  } catch (error) {
    console.error('WhatsApp Profile update error:', error);

    return NextResponse.json({
      success: false,
      error: 'Server error while updating WhatsApp Business Profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}