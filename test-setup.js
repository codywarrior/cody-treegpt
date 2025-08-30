#!/usr/bin/env node

// Simple test to verify our setup
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing GPTree Setup...\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'prisma/schema.prisma',
  'src/app/page.tsx',
  'src/app/c/[cid]/page.tsx',
  'src/components/ChatPane.tsx',
  'src/components/Graph.tsx',
  'src/lib/auth.ts',
  'src/lib/db.ts',
  'src/lib/types.ts',
  'src/lib/tree-algorithms.ts',
  'src/lib/graph-layout.ts',
  '.env'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log('\n📦 Dependencies Check:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  'next',
  'react',
  'typescript',
  '@prisma/client',
  'prisma',
  'bcryptjs',
  'openai',
  'd3-selection',
  'd3-zoom',
  'framer-motion',
  'lucide-react'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allFilesExist = false;
  }
});

console.log('\n🔧 Environment Variables:');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasDbUrl = envContent.includes('DATABASE_URL');
  const hasSessionSecret = envContent.includes('SESSION_SECRET');
  const hasOpenAiKey = envContent.includes('OPENAI_API_KEY');
  
  console.log(`✅ DATABASE_URL: ${hasDbUrl ? 'Set' : 'Missing'}`);
  console.log(`✅ SESSION_SECRET: ${hasSessionSecret ? 'Set' : 'Missing'}`);
  console.log(`✅ OPENAI_API_KEY: ${hasOpenAiKey ? 'Set' : 'Missing'}`);
} else {
  console.log('❌ .env file missing');
}

console.log('\n🏗️  Build Test:');
console.log('Run `npm run build` to test the production build');

console.log('\n🚀 Next Steps:');
console.log('1. Set up your PostgreSQL database');
console.log('2. Run `npx prisma db push` to create tables');
console.log('3. Run `npm run dev` to start development server');
console.log('4. Visit http://localhost:3000 to test the app');

if (allFilesExist) {
  console.log('\n🎉 Setup appears complete! Ready for testing.');
} else {
  console.log('\n⚠️  Some files are missing. Please check the setup.');
}
