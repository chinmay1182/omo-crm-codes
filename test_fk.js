const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tuftfxfuleznzrzgxjhj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZnRmeGZ1bGV6bnpyemd4amhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU1ODA4NiwiZXhwIjoyMDg3MTM0MDg2fQ.H4lvW3v7c0Pc1c3evisn4HtLM_8S8ShmVt2OMEWGqrw');

async function checkFK() {
    // try setting created_by to 999999 (invalid agent/user)
    const { error } = await supabase.from('agents').update({ created_by: 999999 }).eq('id', 1).select();
    console.log(error);
}
checkFK();
