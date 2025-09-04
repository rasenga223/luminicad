#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const envExamplePath = join(process.cwd(), '.env.example');
const envPath = join(process.cwd(), '.env');

console.log('🔧 Setting up LuminiCAD environment variables...\n');

if (!existsSync(envExamplePath)) {
    console.error('❌ .env.example file not found!');
    process.exit(1);
}

if (existsSync(envPath)) {
    console.log('⚠️  .env file already exists. Skipping creation to avoid overwriting your configuration.');
    console.log('   If you need to reset your environment variables, delete the .env file and run this script again.');
    process.exit(0);
}


const exampleContent = readFileSync(envExamplePath, 'utf-8');


const envContent = exampleContent.replace(
    /# Copy this file to \.env and fill in your actual values/g,
    '# Environment variables for LuminiCAD\n# IMPORTANT: Replace these placeholder values with your actual Supabase credentials'
);

writeFileSync(envPath, envContent);

console.log('✅ Created .env file from .env.example');
console.log('\n📝 Next steps:');
console.log('1. Open .env file and replace placeholder values with your actual Supabase credentials');
console.log('2. Get your credentials from: https://supabase.com/dashboard/project/cgkomjgoddulaevzzmup/settings/api');
console.log('3. Never commit the .env file to version control');
console.log('\n🔒 Security reminder:');
console.log('- The anon key is safe to use in client-side code');
console.log('- Never expose your service role key in client-side code');
console.log('- Use Row Level Security (RLS) policies in Supabase to secure your data');
