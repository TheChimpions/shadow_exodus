const fs = require('fs').promises;
const path = require('path');
const Arweave = require('arweave');

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

async function loadWallet() {
  const walletPath = path.join(__dirname, 'arweave-wallet.json');
  try {
    const walletData = await fs.readFile(walletPath, 'utf-8');
    return JSON.parse(walletData);
  } catch (error) {
    console.error('Error loading wallet. Please ensure arweave-wallet.json exists in the project directory.');
    console.error('You can download your wallet from https://arweave.app/ or generate one using arweave.wallets.generate()');
    throw error;
  }
}

async function uploadToArweave(filePath, contentType, wallet) {
  try {
    const data = await fs.readFile(filePath);
    
    const transaction = await arweave.createTransaction({
      data: data
    }, wallet);
    
    transaction.addTag('Content-Type', contentType);
    
    await arweave.transactions.sign(transaction, wallet);
    
    const response = await arweave.transactions.post(transaction);
    
    if (response.status === 200) {
      const arweaveUrl = `https://arweave.net/${transaction.id}`;
      console.log(`Uploaded ${filePath} to ${arweaveUrl}`);
      return arweaveUrl;
    } else {
      throw new Error(`Failed to upload ${filePath}: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error);
    throw error;
  }
}

async function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.gif': 'image/gif',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

async function processFolder(folderPath, wallet, uploadLog, options = {}) {
  try {
    const items = await fs.readdir(folderPath);
    const folderName = path.basename(folderPath);
    
    // Check if already uploaded by looking for arweave_url.txt file
    const arweaveUrlFiles = items.filter(item => item.endsWith('_arweave_url.txt'));
    if (arweaveUrlFiles.length > 0) {
      const urlFilePath = path.join(folderPath, arweaveUrlFiles[0]);
      const existingUrl = await fs.readFile(urlFilePath, 'utf-8');
      console.log(`\n⏭️  Skipping ${folderName} - already uploaded to Arweave`);
      console.log(`   Existing metadata URL: ${existingUrl.trim()}`);
      return;
    }
    
    const imageFiles = items.filter(item => {
      const ext = path.extname(item).toLowerCase();
      return ['.gif', '.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);
    });
    
    const jsonFiles = items.filter(item => item.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      console.log(`No JSON file found in ${folderPath}, skipping...`);
      return;
    }
    
    if (imageFiles.length === 0) {
      console.log(`No image files found in ${folderPath}, skipping...`);
      return;
    }
    
    console.log(`Processing folder: ${folderPath}`);
    console.log(`Found ${imageFiles.length} images and ${jsonFiles.length} JSON files`);
    
    // Initialize folder in upload log if not exists
    if (!uploadLog.uploads[folderName]) {
      uploadLog.uploads[folderName] = {
        folderPath: folderPath,
        files: {},
        metadata: null,
        metadataArweaveUrl: null,
        processedAt: null
      };
    }
    
    const uploadedFiles = [];
    let gifUrl = null;
    let firstImageUrl = null;

    for (const imageFile of imageFiles) {
      let arweaveUrl;
      let contentType = await getContentType(imageFile);

      // Check if this file was already uploaded
      if (uploadLog.uploads[folderName].files[imageFile]?.arweaveUrl) {
        arweaveUrl = uploadLog.uploads[folderName].files[imageFile].arweaveUrl;
        console.log(`⏭️  Skipping ${imageFile} - already uploaded: ${arweaveUrl}`);
      } else {
        const imagePath = path.join(folderPath, imageFile);
        arweaveUrl = await uploadToArweave(imagePath, contentType, wallet);

        // Save to upload log
        uploadLog.uploads[folderName].files[imageFile] = {
          arweaveUrl: arweaveUrl,
          contentType: contentType,
          uploadedAt: new Date().toISOString()
        };

        // Rate limiting only for new uploads
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      uploadedFiles.push({
        uri: arweaveUrl,
        type: contentType
      });

      // Track first image as fallback
      if (!firstImageUrl) {
        firstImageUrl = arweaveUrl;
      }

      if (path.extname(imageFile).toLowerCase() === '.gif') {
        gifUrl = arweaveUrl;
      }
    }
    
    for (const jsonFile of jsonFiles) {
      const jsonPath = path.join(folderPath, jsonFile);
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const metadata = JSON.parse(jsonContent);
      
      if (!metadata.properties) {
        metadata.properties = {};
      }
      metadata.properties.files = uploadedFiles;

      // Set main image (first image or gif if present)
      const mainImage = gifUrl || firstImageUrl;
      if (mainImage) {
        metadata.image = mainImage;
      }

      // Only set animation_url if --animation flag is passed and gif is present
      if (options.includeAnimationUrl === true && gifUrl) {
        metadata.animation_url = gifUrl;
      }
      
      await fs.writeFile(jsonPath, JSON.stringify(metadata, null, 2));
      console.log(`Updated metadata in ${jsonPath}`);
      
      // Upload the JSON metadata itself to Arweave
      console.log(`Uploading JSON metadata to Arweave...`);
      const jsonData = JSON.stringify(metadata, null, 2);
      const jsonTransaction = await arweave.createTransaction({
        data: jsonData
      }, wallet);
      
      jsonTransaction.addTag('Content-Type', 'application/json');
      
      await arweave.transactions.sign(jsonTransaction, wallet);
      
      const jsonResponse = await arweave.transactions.post(jsonTransaction);
      
      if (jsonResponse.status === 200) {
        const jsonArweaveUrl = `https://arweave.net/${jsonTransaction.id}`;
        console.log(`JSON metadata uploaded to: ${jsonArweaveUrl}`);
        
        // Save the Arweave URL for the metadata
        const metadataUrlFile = jsonPath.replace('.json', '_arweave_url.txt');
        await fs.writeFile(metadataUrlFile, jsonArweaveUrl);
        console.log(`Arweave URL saved to: ${path.basename(metadataUrlFile)}`);
        
        // Save to upload log
        uploadLog.uploads[folderName].metadata = metadata;
        uploadLog.uploads[folderName].metadataArweaveUrl = jsonArweaveUrl;
        uploadLog.uploads[folderName].processedAt = new Date().toISOString();
        
        // Save the upload log after each successful folder
        await saveUploadLog(uploadLog);
        console.log(`Backup saved to arweave_uploads_log.json`);
      } else {
        console.error(`Failed to upload JSON metadata: ${jsonResponse.status}`);
      }
    }
    
    console.log(`Successfully processed folder: ${folderPath}`);
  } catch (error) {
    console.error(`Error processing folder ${folderPath}:`, error);
  }
}

async function loadOrCreateUploadLog() {
  const logPath = path.join(__dirname, 'arweave_uploads_log.json');
  try {
    const logContent = await fs.readFile(logPath, 'utf-8');
    return JSON.parse(logContent);
  } catch (error) {
    // File doesn't exist, create new log
    return {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      uploads: {}
    };
  }
}

async function saveUploadLog(log) {
  const logPath = path.join(__dirname, 'arweave_uploads_log.json');
  log.lastUpdated = new Date().toISOString();
  await fs.writeFile(logPath, JSON.stringify(log, null, 2));
}

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const includeAnimationUrl = args.includes('--animation');

    const baseDir = path.join(__dirname, 'nftcollection');

    // Load or create upload log
    const uploadLog = await loadOrCreateUploadLog();
    console.log('Loading upload history...');

    if (includeAnimationUrl) {
      console.log('⚙️  Animation URL enabled (--animation flag detected)');
    }
    
    try {
      await fs.access(baseDir);
    } catch (error) {
      console.error(`Directory ${baseDir} does not exist.`);
      console.log('Please create the nftcollection directory and add your NFT folders with images and JSON metadata.');
      console.log('See nftcollection/Firestarter/ for an example structure.');
      return;
    }
    
    console.log('Loading Arweave wallet...');
    const wallet = await loadWallet();
    
    const address = await arweave.wallets.jwkToAddress(wallet);
    console.log(`Using wallet address: ${address}`);
    
    const balance = await arweave.wallets.getBalance(address);
    const ar = arweave.ar.winstonToAr(balance);
    console.log(`Wallet balance: ${ar} AR`);
    
    if (parseFloat(ar) < 0.01) {
      console.warn('Warning: Low wallet balance. You may not have enough AR to upload all files.');
    }
    
    const folders = await fs.readdir(baseDir);
    const validFolders = [];
    
    for (const folder of folders) {
      const folderPath = path.join(baseDir, folder);
      const stats = await fs.stat(folderPath);
      if (stats.isDirectory()) {
        validFolders.push(folderPath);
      }
    }
    
    console.log(`Found ${validFolders.length} folders to process`);
    
    for (let i = 0; i < validFolders.length; i++) {
      const folderName = path.basename(validFolders[i]);
      
      // Check if already processed
      if (uploadLog.uploads[folderName]?.processedAt) {
        console.log(`\n⏭️  Skipping ${folderName} - already processed on ${uploadLog.uploads[folderName].processedAt}`);
        continue;
      }
      
      console.log(`\nProcessing folder ${i + 1}/${validFolders.length}`);
      await processFolder(validFolders[i], wallet, uploadLog, { includeAnimationUrl });

      if (i < validFolders.length - 1) {
        console.log('Waiting before next folder to avoid rate limits...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log('\nAll folders processed successfully!');
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();