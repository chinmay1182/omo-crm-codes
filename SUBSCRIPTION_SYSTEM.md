# Subscription & Payment System Documentation

## Overview
This CRM includes a comprehensive subscription and payment management system with:
- 14-day free trial for all new users
- Razorpay payment integration
- Real-time subscription tracking
- Payment history and refunds management

## Features Implemented

### 1. **14-Day Free Trial**
- Automatically starts when a user selects a plan for the first time
- Trial period countdown displayed in the notification bar
- Real-time updates using Supabase realtime subscriptions

### 2. **Pricing Plans**
- **Starter Plan**: ₹29/month - For small teams
- **Professional Plan**: ₹79/month - For growing businesses (Most Popular)
- **Enterprise Plan**: ₹199/month - For large organizations

### 3. **Razorpay Integration**
- Secure payment processing
- Support for all major payment methods
- Automatic payment verification
- Order creation and signature validation

### 4. **Real-time Updates**
- Trial days remaining shown in notification bar (top)
- Current plan badge next to profile (pill2)
- Subscription status updates in real-time
- Payment history accessible from profile dropdown

### 5. **Payment History**
- View all past payments
- Track refunds
- Payment status indicators (Success, Pending, Failed)
- Detailed transaction information

## Setup Instructions

### 1. Database Setup
Run the migration file to create necessary tables:
```bash
# The migration file is located at:
# supabase/migrations/20260122_create_subscriptions_tables.sql
```

This creates:
- `subscriptions` table - Stores user subscription data
- `payments` table - Stores payment transactions
- `refunds` table - Stores refund information

### 2. Razorpay Configuration

1. **Get Razorpay API Keys**:
   - Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Navigate to Settings → API Keys
   - Generate API keys (Test mode for development, Live mode for production)

2. **Add Environment Variables**:
   Add these to your `.env.local` file:
   ```env
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret_key_here
   ```

3. **Install Razorpay Package**:
   ```bash
   npm install razorpay
   ```

### 3. Enable Realtime for Subscriptions
In your Supabase dashboard:
1. Go to Database → Replication
2. Enable realtime for the `subscriptions` table

## API Endpoints

### Subscriptions
- `GET /api/subscriptions?userId={id}` - Get user's subscription
- `POST /api/subscriptions` - Create/update subscription
- `PUT /api/subscriptions` - Activate subscription after payment

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment signature
- `GET /api/payments/history?userId={id}` - Get payment history

## User Flow

### New User Registration
1. User registers and logs in
2. User navigates to Subscriptions page
3. User selects a plan
4. 14-day free trial starts automatically
5. Trial countdown appears in notification bar

### Trial to Paid Conversion
1. During or after trial, user clicks "Buy Subscription" or "Upgrade Now"
2. Razorpay checkout opens
3. User completes payment
4. Payment is verified
5. Subscription status changes from 'trial' to 'active'
6. Notification bar updates to show "Active Plan"

### Payment History
1. User clicks profile icon in top bar
2. Clicks "Payment History" in dropdown
3. Modal opens showing all payments and refunds
4. Each transaction shows:
   - Plan name
   - Date
   - Amount
   - Status
   - Transaction ID

## Database Schema

### subscriptions
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER)
- plan_id (VARCHAR) - 'starter', 'professional', 'enterprise'
- plan_name (VARCHAR)
- status (VARCHAR) - 'trial', 'active', 'cancelled', 'expired'
- trial_start_date (TIMESTAMP)
- trial_end_date (TIMESTAMP)
- subscription_start_date (TIMESTAMP)
- subscription_end_date (TIMESTAMP)
- billing_cycle (VARCHAR) - 'monthly', 'yearly'
- amount (DECIMAL)
- currency (VARCHAR)
- auto_renew (BOOLEAN)
```

### payments
```sql
- id (SERIAL PRIMARY KEY)
- subscription_id (INTEGER)
- user_id (INTEGER)
- razorpay_order_id (VARCHAR)
- razorpay_payment_id (VARCHAR)
- razorpay_signature (VARCHAR)
- amount (DECIMAL)
- currency (VARCHAR)
- status (VARCHAR) - 'pending', 'success', 'failed', 'refunded'
- payment_method (VARCHAR)
- payment_date (TIMESTAMP)
```

### refunds
```sql
- id (SERIAL PRIMARY KEY)
- payment_id (INTEGER)
- user_id (INTEGER)
- razorpay_refund_id (VARCHAR)
- amount (DECIMAL)
- currency (VARCHAR)
- status (VARCHAR) - 'pending', 'processed', 'failed'
- reason (TEXT)
- refund_date (TIMESTAMP)
```

## UI Components

### Notification Bar (Top)
- Shows trial days remaining: "Your trial is remaining for X days"
- Shows active plan: "Active Plan: Professional"
- Links to subscription page

### Plan Badge (pill2)
- Located next to user profile in top bar
- Displays current plan name
- Updates in real-time

### Subscription Page
- Displays all pricing plans
- Shows current subscription status
- Billing cycle toggle (Monthly/Yearly with 20% discount)
- "Most Popular" badge on Professional plan
- Trial status banner
- Razorpay payment integration

### Payment History Modal
- Accessible from profile dropdown
- Lists all payments with details
- Shows refunds separately
- Status indicators with color coding

## Testing

### Test Mode
1. Use Razorpay test keys
2. Test card numbers: [Razorpay Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)
3. Common test card: `4111 1111 1111 1111`

### Test Scenarios
1. **New user trial**: Select a plan and verify trial starts
2. **Payment success**: Complete payment and verify activation
3. **Payment failure**: Use invalid card and verify error handling
4. **Real-time updates**: Open app in two tabs, make changes in one, verify updates in other

## Security Considerations

1. **API Keys**: Never expose `RAZORPAY_KEY_SECRET` in client-side code
2. **Signature Verification**: Always verify Razorpay signatures on server-side
3. **User Validation**: Verify user owns the subscription before allowing changes
4. **SQL Injection**: Use parameterized queries (handled by Supabase client)

## Troubleshooting

### Payment not verifying
- Check Razorpay signature verification
- Ensure `RAZORPAY_KEY_SECRET` is correct
- Check server logs for errors

### Trial not starting
- Verify database migration ran successfully
- Check API endpoint `/api/subscriptions` is working
- Ensure user ID is being passed correctly

### Real-time updates not working
- Verify Supabase realtime is enabled for `subscriptions` table
- Check browser console for WebSocket errors
- Ensure Supabase anon key has correct permissions

## Future Enhancements

1. **Auto-renewal**: Implement automatic subscription renewal
2. **Webhooks**: Add Razorpay webhooks for payment status updates
3. **Invoices**: Generate and email invoices
4. **Plan upgrades/downgrades**: Allow mid-cycle plan changes
5. **Proration**: Calculate prorated amounts for plan changes
6. **Email notifications**: Send emails for trial expiry, payment success/failure
7. **Analytics**: Track subscription metrics and revenue

## Support

For Razorpay integration issues:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Support](https://razorpay.com/support/)

For Supabase realtime issues:
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
