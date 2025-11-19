const fs = require('fs').promises;
const path = require('path');
const Arweave = require('arweave');

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

async function uploadJsonToArweave(jsonPath) {
  try {
    // Load wallet
    const walletPath = path.join(__dirname, 'arweave-wallet.json');
    const wallet = JSON.parse(await fs.readFile(walletPath, 'utf-8'));
    
    // Read JSON file
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const metadata = JSON.parse(jsonContent);
    
    console.log(`Uploading: ${path.basename(jsonPath)}`);
    console.log(`NFT Name: ${metadata.name}`);
    
    // Create transaction
    const transaction = await arweave.createTransaction({
      data: jsonContent
    }, wallet);
    
    transaction.addTag('Content-Type', 'application/json');
    
    // Sign and post
    await arweave.transactions.sign(transaction, wallet);
    const response = await arweave.transactions.post(transaction);
    
    if (response.status === 200) {
      const arweaveUrl = `https://arweave.net/${transaction.id}`;
      console.log(`✅ Successfully uploaded!`);
      console.log(`📍 Arweave URL: ${arweaveUrl}`);
      
      // Save URL to file
      const urlFile = jsonPath.replace('.json', '_arweave_url.txt');
      await fs.writeFile(urlFile, arweaveUrl);
      console.log(`💾 URL saved to: ${path.basename(urlFile)}`);
      
      return arweaveUrl;
    } else {
      throw new Error(`Upload failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run for TheBinary
if (require.main === module) {
  const jsonPath = path.join(__dirname, 'chimpions_v2', 'TheBinary', 'TheBinary.json');
  uploadJsonToArweave(jsonPath);
}

module.exports = uploadJsonToArweave;