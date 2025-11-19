const fs = require('fs');

function splitMetabossFile(inputFile, batchSize = 50) {
  try {
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    
    console.log(`Splitting ${data.length} entries into batches of ${batchSize}...`);
    
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const filename = `metaboss_batch_${Math.floor(i / batchSize) + 1}.json`;
      
      fs.writeFileSync(filename, JSON.stringify(batch, null, 2));
      batches.push(filename);
      
      console.log(`Created ${filename} with ${batch.length} entries`);
    }
    
    console.log(`\n📁 Created ${batches.length} batch files`);
    console.log('\n🚀 Run each batch separately:');
    batches.forEach((filename, index) => {
      console.log(`metaboss update uri-all --keypair <KEYPAIR> --data-file ${filename}`);
    });
    
    return batches;
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  const inputFile = process.argv[2] || 'metaboss_uri_updates.json';
  const batchSize = parseInt(process.argv[3]) || 50;
  
  splitMetabossFile(inputFile, batchSize);
}

module.exports = splitMetabossFile;