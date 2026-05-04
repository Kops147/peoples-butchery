import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

export const supabase = createClient(
  'https://qhlzbphdvfundrmejzzf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobHpicGhkdmZ1bmRybWVqenpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTk4MDgsImV4cCI6MjA5MzQ3NTgwOH0.bnn291AdWHsbABk1I-wjMcZ82rExnC6vklEOD37uHPw'
)
