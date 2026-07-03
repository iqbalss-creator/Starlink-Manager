import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function importContacts() {
  const filePath = path.resolve(__dirname, '../contacts.md')
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const vcfData = fs.readFileSync(filePath, 'utf-8')
  const contacts: { name: string, whatsapp_number: string, gender: string | null }[] = []

  let currentName = ''
  let currentPhone = ''
  let currentGender: string | null = null

  const lines = vcfData.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    if (trimmed === 'BEGIN:VCARD') {
      currentName = ''
      currentPhone = ''
      currentGender = null
    } else if (trimmed.startsWith('FN:')) {
      let fullName = trimmed.substring(3).trim()
      
      // Determine Gender and clean up name
      const nameLower = fullName.toLowerCase()
      if (nameLower.includes('bapak') || nameLower.includes('pak ') || nameLower.includes('mr.') || nameLower.includes('dr. ') || nameLower.includes('drg. ')) {
        currentGender = 'Laki-laki'
        fullName = fullName.replace(/bapak|pak |mr\./ig, '').trim()
      } else if (nameLower.includes('ibu') || nameLower.includes('bu ') || nameLower.includes('mrs.') || nameLower.includes('ms.')) {
        currentGender = 'Perempuan'
        fullName = fullName.replace(/ibu|bu |mrs\.|ms\./ig, '').trim()
      }
      
      // Remove any trailing \n or formatting
      fullName = fullName.replace(/\\n/g, '').trim()
      currentName = fullName
      
    } else if (trimmed.includes('TEL;') || trimmed.includes('.TEL;')) {
      const match = trimmed.match(/pref:(.*)/)
      if (match && match[1]) {
        currentPhone = match[1].replace(/\\n/g, '').trim()
      } else {
        const fallbackMatch = trimmed.match(/TEL.*:(.*)/)
        if (fallbackMatch && fallbackMatch[1]) {
          currentPhone = fallbackMatch[1].replace(/\\n/g, '').trim()
        }
      }
    } else if (trimmed === 'END:VCARD') {
      if (currentName && currentPhone) {
        // Clean phone number (remove non digits except +)
        currentPhone = currentPhone.replace(/[^\d+]/g, '')
        contacts.push({
          name: currentName,
          whatsapp_number: currentPhone,
          gender: currentGender
        })
      }
    }
  }

  console.log(`Parsed ${contacts.length} contacts. Ready to insert...`)
  
  // Insert in chunks of 500
  const chunkSize = 500
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < contacts.length; i += chunkSize) {
    const chunk = contacts.slice(i, i + chunkSize)
    const { error } = await supabase.from('contacts').insert(chunk)
    
    if (error) {
      console.error(`Error inserting chunk ${i/chunkSize + 1}:`, error)
      errorCount += chunk.length
    } else {
      successCount += chunk.length
      console.log(`Inserted chunk ${i/chunkSize + 1} (${chunk.length} contacts)`)
    }
  }

  console.log('--- Import Complete ---')
  console.log(`Successfully imported: ${successCount}`)
  console.log(`Failed: ${errorCount}`)
}

importContacts()
