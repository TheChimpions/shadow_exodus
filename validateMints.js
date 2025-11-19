const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');

// Change this to your RPC endpoint
const connection = new Connection('https://api.mainnet-beta.solana.com');

async function validateMint(mintAddress) {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const accountInfo = await connection.getAccountInfo(mintPubkey);
    
    if (!accountInfo) {
      return { valid: false, error: 'Account does not exist' };
    }
    
    // Check if it's a valid mint account (SPL Token program)
    const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    if (accountInfo.owner.toString() !== TOKEN_PROGRAM_ID) {
      return { valid: false, error: 'Not a token mint account' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function validateAllMints() {
  try {
    console.log('Loading metaboss update file...');
    const updateFile = JSON.parse(fs.readFileSync('metaboss_uri_updates.json', 'utf-8'));
    
    console.log(`Validating ${updateFile.length} mint accounts...`);
    
    const results = [];
    const invalidMints = [];
    
    for (let i = 0; i < updateFile.length; i++) {
      const item = updateFile[i];
      const mint = item.mint_account;
      
      process.stdout.write(`\rValidating ${i + 1}/${updateFile.length}: ${mint.substring(0, 8)}...`);
      
      const validation = await validateMint(mint);
      
      if (validation.valid) {
        results.push(item);
      } else {
        invalidMints.push({
          mint: mint,
          error: validation.error,
          uri: item.new_uri
        });
        console.log(`\n❌ Invalid: ${mint} - ${validation.error}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n\n📊 Validation Results:`);
    console.log(`✅ Valid mints: ${results.length}`);
    console.log(`❌ Invalid mints: ${invalidMints.length}`);
    
    if (invalidMints.length > 0) {
      // Save clean update file without invalid mints
      fs.writeFileSync('metaboss_uri_updates_clean.json', JSON.stringify(results, null, 2));
      console.log(`\n💾 Clean update file saved: metaboss_uri_updates_clean.json`);
      
      // Save invalid mints for reference
      fs.writeFileSync('invalid_mints.json', JSON.stringify(invalidMints, null, 2));
      console.log(`📝 Invalid mints saved: invalid_mints.json`);
      
      console.log(`\n🔧 Use the clean file for metaboss:`);
      console.log(`metaboss update uri-all --keypair <KEYPAIR> --data-file metaboss_uri_updates_clean.json`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Quick check for a single mint
async function checkSingleMint(mintAddress) {
  console.log(`Checking mint: ${mintAddress}`);
  const result = await validateMint(mintAddress);
  console.log('Result:', result);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 1) {
    // Single mint check
    checkSingleMint(args[0]);
  } else {
    // Validate all mints
    validateAllMints();
  }
}

module.exports = { validateMint, validateAllMints };