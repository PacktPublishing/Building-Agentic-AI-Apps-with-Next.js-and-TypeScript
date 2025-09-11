#!/usr/bin/env node

import crypto from 'crypto';
import { fileURLToPath } from 'url';

/**
 * Génère un token Bearer sécurisé pour l'authentification MCP
 */
function generateSecureToken() {
  // Génère 32 bytes aléatoirement et les convertit en base64url
  const randomBytes = crypto.randomBytes(32);
  const token = randomBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return token;
}

function main() {
  console.log('🔐 Générateur de token Bearer MCP\n');
  
  const token = generateSecureToken();
  
  console.log('Token généré:');
  console.log(`MCP_BEARER_TOKEN=${token}`);
  console.log('\n📋 Instructions:');
  console.log('1. Copiez cette ligne dans votre fichier .env.local');
  console.log('2. Redémarrez votre serveur Next.js');
  console.log('3. Utilisez ce token dans vos requêtes:');
  console.log(`   Authorization: Bearer ${token}`);
  console.log('\n⚠️  Gardez ce token secret et ne le partagez jamais !');
}

// Check if this file is being run directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}

export { generateSecureToken };
