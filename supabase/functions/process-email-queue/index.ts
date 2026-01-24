import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const INTERNAL_FUNCTION_SECRET = Deno.env.get('INTERNAL_FUNCTION_SECRET');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables:', {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_SERVICE_ROLE_KEY
      });
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get pending emails (max 10 at a time)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching email queue:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending emails', processed: 0 }));
    }

    console.log(`Processing ${pendingEmails.length} emails...`);

    let successCount = 0;
    let failCount = 0;

    for (const email of pendingEmails) {
      try {
        // Call send-email function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'X-Internal-Token': INTERNAL_FUNCTION_SECRET || '',
          },
          body: JSON.stringify({
            to: email.to_email,
            template: email.template,
            subject: email.subject,
            data: email.data,
          }),
        });

        const result = await response.json();

        if (response.ok && (result.success || result.id)) {
          // Mark as sent
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', email.id);

          successCount++;
          console.log(`✅ Email sent to ${email.to_email} (${email.template})`);
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (error) {
        // Increment attempts and log error
        await supabase
          .from('email_queue')
          .update({
            attempts: email.attempts + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: email.attempts + 1 >= 3 ? 'failed' : 'pending',
          })
          .eq('id', email.id);

        failCount++;
        console.error(`❌ Failed to send email to ${email.to_email}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Email queue processed',
        processed: pendingEmails.length,
        success: successCount,
        failed: failCount,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Process email queue error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500 }
    );
  }
});
