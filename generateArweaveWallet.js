const Arweave = require('arweave');
const fs = require('fs');
const path = require('path');

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

async function generateWallet() {
  try {
    const walletPath = path.join(__dirname, 'arweave-wallet.json');
    
    if (fs.existsSync(walletPath)) {
      console.log('Warning: arweave-wallet.json already exists!');
      console.log('Delete the existing file if you want to generate a new wallet.');
      return;
    }
    
    console.log('Generating new Arweave wallet...');
    const wallet = await arweave.wallets.generate();
    
    fs.writeFileSync(walletPath, JSON.stringify(wallet, null, 2));
    
    const address = await arweave.wallets.jwkToAddress(wallet);
    
    console.log('\n✅ Wallet generated successfully!');
    console.log('📁 Saved to: arweave-wallet.json');
    console.log('🔑 Wallet Address:', address);
    console.log('\n⚠️  IMPORTANT:');
    console.log('1. Keep your wallet file secure - it contains your private key');
    console.log('2. Send AR tokens to the address above before uploading files');
    console.log('3. You can get AR from exchanges or the Arweave faucet for testing');
    console.log('\nTo check your balance:');
    console.log(`node -e "const Arweave = require('arweave'); const wallet = require('./arweave-wallet.json'); const arweave = Arweave.init({host: 'arweave.net', port: 443, protocol: 'https'}); arweave.wallets.jwkToAddress(wallet).then(addr => arweave.wallets.getBalance(addr)).then(balance => console.log('Balance:', arweave.ar.winstonToAr(balance), 'AR'))"`);
    
  } catch (error) {
    console.error('Error generating wallet:', error);
    process.exit(1);
  }
}

generateWallet();