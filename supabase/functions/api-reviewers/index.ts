import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()
    
    // GET: Retrieve reviewers
    if (req.method === 'GET') {
      console.log('GET request received for reviewers')
      
      const { data, error } = await supabase
        .from('reviewers')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching reviewers:', error)
        throw error
      }
      
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // POST: Create new reviewer or batch insert
    if (req.method === 'POST') {
      console.log('POST request received for reviewers')
      const body = await req.json()
      
      // Check if it's a batch insert
      const dataToInsert = Array.isArray(body) ? body : [body]
      
      const { data, error } = await supabase
        .from('reviewers')
        .insert(dataToInsert)
        .select()
      
      if (error) {
        console.error('Error inserting reviewer(s):', error)
        throw error
      }
      
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      })
    }
    
    // PUT: Update reviewer
    if (req.method === 'PUT') {
      console.log('PUT request received for reviewers')
      const body = await req.json()
      const { id, ...updateData } = body
      
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID is required for update' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      
      const { data, error } = await supabase
        .from('reviewers')
        .update(updateData)
        .eq('id', id)
        .select()
      
      if (error) {
        console.error('Error updating reviewer:', error)
        throw error
      }
      
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // DELETE: Delete reviewer
    if (req.method === 'DELETE') {
      console.log('DELETE request received for reviewers')
      const { id } = await req.json()
      
      if (!id) {
        return new Response(JSON.stringify({ error: 'ID is required for delete' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      
      const { error } = await supabase
        .from('reviewers')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Error deleting reviewer:', error)
        throw error
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
    
  } catch (error) {
    console.error('Error in api-reviewers function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})