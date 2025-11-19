const fs = require('fs').promises;
const path = require('path');

async function generateMetabossUpdateFile() {
  try {
    // Load the NFT mint mapping file
    const mintMappingPath = path.join(__dirname, 'nft_mints.json');
    let allMetadata = [];

    try {
      const mintMappingContent = await fs.readFile(mintMappingPath, 'utf-8');
      const mintMapping = JSON.parse(mintMappingContent);

      // Convert mapping to array format
      allMetadata = Object.entries(mintMapping).map(([folderName, data]) => {
        // Handle both simple string format and object format
        if (typeof data === 'string') {
          return { name: folderName, mint: data };
        } else {
          return {
            name: data.name || folderName,
            mint: data.mint,
            uri: data.old_uri || ''
          };
        }
      });
    } catch (error) {
      console.error('Error loading nft_mints.json. Please create this file with your NFT mint addresses.');
      console.error('See README.md for the expected format.');
      return;
    }

    // Load the Arweave upload log
    const uploadLogPath = path.join(__dirname, 'arweave_uploads_log.json');
    let uploadLog;
    try {
      const uploadLogContent = await fs.readFile(uploadLogPath, 'utf-8');
      uploadLog = JSON.parse(uploadLogContent);
    } catch (error) {
      console.error('No arweave_uploads_log.json found. Please run uploadToArweave.js first.');
      return;
    }
    
    // Create mapping of NFT name to mint account
    const nameToMint = {};
    for (const nft of allMetadata) {
      // Remove "The" prefix and spaces for matching with folder names
      const simplifiedName = nft.name.replace('The ', '').replace(/\s+/g, '');
      nameToMint[nft.name] = nft.mint;
      nameToMint[simplifiedName] = nft.mint;
      
      // Also try with "The" prefix removed but keeping spaces
      const nameWithoutThe = nft.name.replace('The ', '');
      nameToMint[nameWithoutThe] = nft.mint;
    }
    
    // Generate metaboss update array
    const metabossUpdates = [];
    const notFoundFolders = [];
    
    for (const [folderName, uploadData] of Object.entries(uploadLog.uploads)) {
      if (!uploadData.metadataArweaveUrl) {
        console.log(`⚠️  Skipping ${folderName}: No metadata URL found`);
        continue;
      }
      
      // Try different variations of the folder name to find matching mint
      let mintAccount = null;
      
      // Try exact folder name
      if (nameToMint[folderName]) {
        mintAccount = nameToMint[folderName];
      }
      // Try with "The" prefix
      else if (nameToMint['The ' + folderName]) {
        mintAccount = nameToMint['The ' + folderName];
      }
      // Try removing "The" from folder name
      else if (folderName.startsWith('The')) {
        const withoutThe = folderName.substring(3);
        if (nameToMint[withoutThe]) {
          mintAccount = nameToMint[withoutThe];
        }
      }
      // Try the metadata name field if available
      else if (uploadData.metadata?.name && nameToMint[uploadData.metadata.name]) {
        mintAccount = nameToMint[uploadData.metadata.name];
      }
      
      if (mintAccount) {
        metabossUpdates.push({
          mint_account: mintAccount,
          new_uri: uploadData.metadataArweaveUrl
        });
        console.log(`✅ Mapped ${folderName} -> ${mintAccount}`);
      } else {
        notFoundFolders.push(folderName);
        console.log(`❌ Could not find mint for ${folderName}`);
      }
    }
    
    // Save metaboss update file
    const metabossFilePath = path.join(__dirname, 'metaboss_uri_updates.json');
    await fs.writeFile(metabossFilePath, JSON.stringify(metabossUpdates, null, 2));
    
    console.log('\n' + '='.repeat(50));
    console.log(`📝 Metaboss update file created: metaboss_uri_updates.json`);
    console.log(`✅ Successfully mapped: ${metabossUpdates.length} NFTs`);
    if (notFoundFolders.length > 0) {
      console.log(`❌ Could not map: ${notFoundFolders.length} folders`);
      console.log('   Not found:', notFoundFolders.join(', '));
    }
    
    console.log('\n📌 To update on-chain metadata, run:');
    console.log('metaboss update uri-all --keypair <KEYPAIR_PATH> --data-file metaboss_uri_updates.json');
    console.log('\nNote: You need the update authority keypair for the collection');
    
    // Also create a backup mapping file for reference
    const mappingPath = path.join(__dirname, 'nft_arweave_mapping.json');
    const mapping = {};
    for (const update of metabossUpdates) {
      const nftInfo = allMetadata.find(nft => nft.mint === update.mint_account);
      if (nftInfo) {
        mapping[nftInfo.name] = {
          mint: update.mint_account,
          old_uri: nftInfo.uri,
          new_uri: update.new_uri,
          image: nftInfo.image
        };
      }
    }
    await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2));
    console.log(`\n💾 Backup mapping saved to: nft_arweave_mapping.json`);
    
  } catch (error) {
    console.error('Error generating metaboss update file:', error);
  }
}

// Run the script
generateMetabossUpdateFile();