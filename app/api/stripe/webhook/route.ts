import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return new NextResponse('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amount = parseFloat(session.metadata?.amount || '0');
    const credits = parseFloat(session.metadata?.credits || amount.toString());
    const packageName = session.metadata?.packageName || 'Ad Credits';

    if (userId && amount > 0) {
      const supabase = await createClient();
      
      try {
        // Check if already processed
        const { data: existingTransaction } = await supabase
          .from('transactions')
          .select('id')
          .eq('stripe_session_id', session.id)
          .single();

        if (existingTransaction) {
          console.log(`Transaction already processed for session ${session.id}`);
          return NextResponse.json({ received: true, message: 'Already processed' });
        }

        // Get current credits
        const { data: profile } = await supabase
          .from('profiles')
          .select('ad_credits')
          .eq('id', userId)
          .single();

        const currentCredits = profile?.ad_credits || 0;
        const newCredits = currentCredits + credits;

        // Update user credits
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            ad_credits: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Failed to update user credits:', updateError);
          return new NextResponse('Database error', { status: 500 });
        }

        // Log transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            amount: amount,
            credits: credits,
            type: 'credit_purchase',
            status: 'completed',
            stripe_session_id: session.id,
            description: `Purchased ${packageName} (${credits} credits)`
          });

        if (transactionError) {
          console.error('Failed to log transaction:', transactionError);
        }

        console.log(`Added ${credits} credits (€${amount}) to user ${userId}`);

      } catch (error) {
        console.error('Error processing webhook:', error);
        return new NextResponse('Internal server error', { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}