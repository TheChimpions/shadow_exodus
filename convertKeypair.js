#!/usr/bin/env node

const bs58 = require('bs58').default;
const fs = require('fs');
const path = require('path');
const { Keypair } = require('@solana/web3.js');

function phantomToSolana(base58String, outputPath) {
  try {
    // Decode base58 string
    const privateKeyBytes = bs58.decode(base58String.trim());
    
    // Convert to array
    const keypairArray = Array.from(privateKeyBytes);
    
    // Validate
    if (keypairArray.length !== 64) {
      throw new Error(`Invalid key length: ${keypairArray.length}. Expected 64 bytes.`);
    }
    
    // Save to file
    fs.writeFileSync(outputPath, JSON.stringify(keypairArray));
    
    // Get public key
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairArray));
    
    return {
      publicKey: keypair.publicKey.toString(),
      outputPath: outputPath
    };
  } catch (error) {
    throw error;
  }
}

function solanaToPhantom(jsonPath) {
  try {
    // Read JSON file
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const keypairArray = JSON.parse(jsonContent);
    
    // Validate
    if (!Array.isArray(keypairArray) || keypairArray.length !== 64) {
      throw new Error('Invalid Solana keypair format');
    }
    
    // Convert to Uint8Array and encode as base58
    const privateKeyBytes = new Uint8Array(keypairArray);
    const base58String = bs58.encode(privateKeyBytes);
    
    // Get public key
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    
    return {
      base58: base58String,
      publicKey: keypair.publicKey.toString()
    };
  } catch (error) {
    throw error;
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('🔐 Keypair Converter - Convert between Phantom and Solana CLI formats');
    console.log('\nUsage:');
    console.log('  Convert Phantom to Solana CLI:');
    console.log('    node convertKeypair.js phantom-to-solana <base58-key> [output-file]');
    console.log('');
    console.log('  Convert Solana CLI to Phantom:');
    console.log('    node convertKeypair.js solana-to-phantom <json-file>');
    console.log('');
    console.log('Examples:');
    console.log('  node convertKeypair.js phantom-to-solana "5Kw9..." keypair.json');
    console.log('  node convertKeypair.js solana-to-phantom keypair.json');
    process.exit(1);
  }
  
  const command = args[0];
  
  try {
    if (command === 'phantom-to-solana' || command === 'p2s') {
      const base58Key = args[1];
      const outputPath = args[2] || 'solana-keypair.json';
      
      const result = phantomToSolana(base58Key, outputPath);
      
      console.log('✅ Conversion successful!');
      console.log(`📁 Saved to: ${result.outputPath}`);
      console.log(`🔑 Public Key: ${result.publicKey}`);
      console.log('\n📌 Use with Solana CLI:');
      console.log(`   solana config set --keypair ${result.outputPath}`);
      console.log(`   metaboss update uri-all --keypair ${result.outputPath} --data-file metaboss_uri_updates.json`);
      
    } else if (command === 'solana-to-phantom' || command === 's2p') {
      const jsonPath = args[1];
      
      const result = solanaToPhantom(jsonPath);
      
      console.log('✅ Conversion successful!');
      console.log(`🔑 Public Key: ${result.publicKey}`);
      console.log('\n📝 Phantom Private Key (base58):');
      console.log(result.base58);
      console.log('\n⚠️  Copy this key to import into Phantom wallet');
      console.log('⚠️  Keep this key secure and never share it!');
      
    } else {
      console.error(`❌ Unknown command: ${command}`);
      console.log('Use "phantom-to-solana" or "solana-to-phantom"');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = { phantomToSolana, solanaToPhantom };