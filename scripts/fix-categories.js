// One-time script to set category to null for submissions that defaulted to 'Other'
// Run with: node scripts/fix-categories.js

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixCategories() {
  console.log('Updating submissions with category "Other" to null...')

  const { data, error } = await supabase
    .from('submissions')
    .update({ category: null })
    .eq('category', 'Other')
    .select('id, title')

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log(`Updated ${data.length} submissions:`)
  data.forEach(s => console.log(`  - ${s.id}: ${s.title || '(no title)'}`))
  console.log('Done!')
}

fixCategories()
