# Quick Setup Guide for Subscription System

## Step 1: Add Razorpay API Keys to .env.local

Add these lines to your `.env.local` file:

```env
# Razorpay Configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
```

**To get your Razorpay keys:**
1. Go to https://dashboard.razorpay.com/
2. Sign up or log in
3. Navigate to Settings → API Keys
4. Generate keys (use Test mode for development)
5. Copy the Key ID and Key Secret

## Step 2: Run Database Migration

The migration file has been created at:
`supabase/migrations/20260122_create_subscriptions_tables.sql`

**Option A: Using Supabase CLI**
```bash
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20260122_create_subscriptions_tables.sql`
4. Paste and run the SQL

## Step 3: Enable Realtime for Subscriptions Table

1. Go to your Supabase Dashboard
2. Navigate to Database → Replication
3. Find the `subscriptions` table
4. Toggle "Enable Realtime" to ON

## Step 4: Test the System

1. **Start the development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to Subscriptions page**:
   - Go to http://localhost:3000/dashboard/subscriptions

3. **Test trial flow**:
   - Click "Start Free Trial" on any plan
   - Verify trial starts and notification bar shows days remaining
   - Check that the plan badge (pill2) updates next to your profile

4. **Test payment flow** (using Razorpay test mode):
   - Click "Upgrade Now" or "Buy Subscription"
   - Use test card: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date
   - Complete payment
   - Verify subscription activates

5. **Test payment history**:
   - Click your profile icon (top right)
   - Click "Payment History"
   - Verify your payment appears

## What's Implemented

✅ **14-day free trial** - Starts automatically when user selects a plan
✅ **Real-time trial countdown** - Shows in notification bar at top
✅ **Dynamic plan badge** - Shows current plan next to profile (pill2)
✅ **Razorpay payment integration** - Secure payment processing
✅ **Payment history** - View all payments and refunds from profile dropdown
✅ **Real-time updates** - Subscription changes update across all tabs
✅ **Three pricing plans** - Starter, Professional, Enterprise
✅ **Yearly billing discount** - 20% off for yearly subscriptions

## Notification Bar Updates

The notification bar (top of dashboard) will show:
- **No subscription**: "Start your free trial today!" + "View Plans" button
- **Trial active**: "Your trial is remaining for X days" + "Buy Subscription" button
- **Paid subscription**: "Active Plan: [Plan Name]"

## Plan Badge (pill2) Updates

The badge next to your profile shows:
- **No subscription**: "Free Trial"
- **Active subscription**: Current plan name (e.g., "Starter", "Professional", "Enterprise")

## Important Notes

1. **Test Mode**: Always use Razorpay test keys during development
2. **Production**: Switch to live keys only when ready for production
3. **Security**: Never commit `.env.local` to version control
4. **Database**: Ensure all migrations run successfully before testing

## Troubleshooting

**Issue**: Trial not starting
- **Solution**: Check browser console for errors, verify API endpoint is working

**Issue**: Payment not processing
- **Solution**: Verify Razorpay keys are correct in `.env.local`

**Issue**: Real-time updates not working
- **Solution**: Ensure Supabase realtime is enabled for `subscriptions` table

**Issue**: Payment history not showing
- **Solution**: Check that payments are being saved to database correctly

## Next Steps

After basic testing works:
1. Customize pricing plans in `src/app/dashboard/subscriptions/page.tsx`
2. Adjust trial period duration (currently 14 days)
3. Add email notifications for trial expiry
4. Implement automatic renewal logic
5. Set up Razorpay webhooks for payment status updates

## Support

For detailed documentation, see: `SUBSCRIPTION_SYSTEM.md`
