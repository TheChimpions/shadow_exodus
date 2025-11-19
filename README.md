# NFT Metadata Upload to Arweave

This tool uploads NFT images and metadata to Arweave for permanent, decentralized storage, then optionally updates Solana NFT URIs using Metaboss.

## Overview

The workflow consists of:
1. **Upload media files** (images/GIFs) to Arweave
2. **Update JSON metadata** with Arweave URLs
3. **Upload metadata** to Arweave
4. **Update Solana NFTs** to point to new Arweave metadata URIs

## Prerequisites

### Required Wallets

1. **Arweave Wallet** (`arweave-wallet.json`)
   - Used to pay for permanent Arweave storage
   - Fund with AR tokens from [Arweave.app](https://arweave.app/)
   - Cost: ~0.0001-0.001 AR per file (varies by size)

2. **Solana Update Authority Keypair** (for NFT updates)
   - Required only if updating NFT metadata URIs on-chain
   - Must be the update authority for the NFTs
   - Format: Solana keypair JSON file or base58 private key

### Installation

```bash
npm install
```

## Directory Structure

Organize your NFT files like this:

```
nft-arweave-uploader/
├── nftcollection/             # Your NFT directory
│   ├── Firestarter/           # Individual NFT folder
│   │   ├── Firestarter.json              # Metadata JSON (required)
│   │   ├── Firestarter.png               # Image file(s)
│   │   ├── Firestarter.gif               # Optional animated version
│   │   └── Firestarter_arweave_url.txt   # Generated after upload
│   ├── AnotherNFT/
│   │   ├── AnotherNFT.json
│   │   └── AnotherNFT.png
│   └── ...
├── nft_mints.json             # Maps folder names to mint addresses
├── arweave-wallet.json        # Your Arweave wallet (excluded from git)
├── uploadToArweave.js         # Upload script
└── README.md
```

**Example structure included**: See `nftcollection/Firestarter/` for a working example.

## Metadata JSON Format

Each NFT folder should contain a `.json` file with this structure:

```json
{
  "name": "The Aberration",
  "symbol": "CHIMP",
  "description": "Description of your NFT",
  "seller_fee_basis_points": 700,
  "image": "",
  "attributes": [
    {
      "trait_type": "Tribe",
      "value": "Planeswalkers"
    },
    {
      "trait_type": "Artist 1",
      "value": "@artist1"
    }
  ],
  "properties": {
    "files": [],
    "category": "image",
    "creators": [
      {
        "address": "YourSolanaAddress",
        "share": 100
      }
    ]
  }
}
```

### Key Fields

- `name` - NFT display name
- `symbol` - Collection symbol
- `description` - NFT description
- `seller_fee_basis_points` - Royalty (700 = 7%)
- `image` - Main image URL (auto-populated by script)
- `animation_url` - GIF URL (optional, see below)
- `properties.files` - Array of all uploaded files (auto-populated)
- `properties.creators` - Creator addresses and revenue shares

## Image Handling

### Supported Formats
- `.png`, `.jpg`, `.jpeg` - Static images
- `.gif` - Animated images
- `.webp`, `.svg` - Other formats

### Main Image Selection

The script automatically sets the `image` field:
1. **If GIF present**: GIF becomes the main image
2. **No GIF**: First image file (alphabetically) becomes main image

### Animation URL Behavior

**Default** (no flags):
```bash
node uploadToArweave.js
```
- No `animation_url` field added to metadata
- Use for static NFTs or when animation isn't needed

**With animation** (GIFs only):
```bash
node uploadToArweave.js --animation
```
- Adds `animation_url` field pointing to the GIF
- Use for animated NFTs where GIF should play on marketplaces

**Example output**:
```json
{
  "image": "https://arweave.net/abc123...",
  "animation_url": "https://arweave.net/abc123...",  // Only with --animation flag
  "properties": {
    "files": [
      {
        "uri": "https://arweave.net/def456...",
        "type": "image/png"
      },
      {
        "uri": "https://arweave.net/abc123...",
        "type": "image/gif"
      }
    ]
  }
}
```

## How Mint Addresses Work

**IMPORTANT**: To update NFT metadata URIs on-chain, you need to provide mint addresses.

### Two Approaches:

**Approach 1: Manual mint mapping** (Recommended for general use)
Create `nft_mints.json` in your project root mapping folder names to mint addresses:

```json
{
  "TheAberration": {
    "mint": "23yTSXNuB93SQyyZjnoCqkboTeSQc48Rg1WzCcP6sUfC",
    "name": "The Aberration",
    "old_uri": "https://shdw-drive.genesysgo.net/vYS344w9wkeJG4ag6Y9uBLYu1TfYC7TEAgHusKgUNN3/TheAberration.json"
  },
  "TheAchromatic": {
    "mint": "7xKzNQDVxuphMh9cksaVKPsZWpMfDpU8qoGTbXjXyJdz",
    "name": "The Achromatic",
    "old_uri": "https://shdw-drive.genesysgo.net/vYS344w9wkeJG4ag6Y9uBLYu1TfYC7TEAgHusKgUNN3/TheAchromatic.json"
  },
  "TheYeoman": {
    "mint": "5BPjYvqmKN8S9ZqJ2mQQ9rVzCvXJpKJqLxKzNpLXyRmW",
    "name": "The Yeoman",
    "old_uri": "https://shdw-drive.genesysgo.net/vYS344w9wkeJG4ag6Y9uBLYu1TfYC7TEAgHusKgUNN3/TheYeoman.json"
  }
}
```

**Or use simplified format** (just folder name to mint address):
```json
{
  "TheAberration": "23yTSXNuB93SQyyZjnoCqkboTeSQc48Rg1WzCcP6sUfC",
  "TheAchromatic": "7xKzNQDVxuphMh9cksaVKPsZWpMfDpU8qoGTbXjXyJdz",
  "TheYeoman": "5BPjYvqmKN8S9ZqJ2mQQ9rVzCvXJpKJqLxKzNpLXyRmW"
}
```

The folder names must **exactly match** your directory names in `nftcollection/`.

**Approach 2: Fetch from collection** (For existing collections)
If you have an existing NFT collection, use a fetch script to get all mint addresses:
- Use Helius DAS API or similar RPC to fetch collection NFTs
- Extract mint addresses and names
- Save to `nft_mints.json` (or similar)

The `generateMetabossUpdate.js` script matches folder names to NFT names to find mint addresses.

## Usage

### 1. Setup Arweave Wallet

**Option A**: Use existing wallet
- Download from [Arweave.app](https://arweave.app/)
- Save as `arweave-wallet.json` in project root

**Option B**: Generate new wallet
```bash
node generateArweaveWallet.js
```
Then fund the generated address with AR tokens.

### 2. Check Wallet Balance

```bash
node uploadToArweave.js
# Output will show: "Wallet balance: X.XXXX AR"
```

### 3. Upload to Arweave

**Standard upload** (no animation URL):
```bash
node uploadToArweave.js
```

**With animation URL** (for animated NFTs):
```bash
node uploadToArweave.js --animation
```

### What Gets Uploaded

For each NFT folder, the script:
1. Uploads all image files to Arweave
2. Updates the JSON metadata:
   - `properties.files[]` - Array of all uploaded files with URIs and types
   - `image` - Main image (GIF if present, else first image)
   - `animation_url` - GIF URL (only with `--animation` flag)
3. Uploads the updated JSON metadata to Arweave
4. Saves metadata URI to `{NFT_NAME}_arweave_url.txt`

### Resume Support

The script automatically tracks uploads in `arweave_uploads_log.json`:
- Skips already-uploaded files
- Resumes interrupted uploads
- Safe to re-run without wasting AR tokens

### 4. Update Solana NFT URIs (Optional)

After uploading to Arweave, update your on-chain NFT metadata URIs:

```bash
metaboss update uri -k <UPDATE_AUTHORITY_KEYPAIR> -u <NEW_ARWEAVE_URI> -a <NFT_MINT_ADDRESS>
```

Or use the generated update file:
```bash
metaboss update uri-all -k <UPDATE_AUTHORITY_KEYPAIR> -d metaboss_uri_updates.json
```

## File Outputs

- `{NFT_NAME}_arweave_url.txt` - Metadata URI for each NFT
- `arweave_uploads_log.json` - Upload history and backup
- `metaboss_uri_updates.json` - Batch update file for Metaboss (if generated)

## Cost Estimation

### Arweave Storage Costs

| File Size | Estimated Cost |
|-----------|----------------|
| 100 KB    | ~0.0001 AR     |
| 1 MB      | ~0.001 AR      |
| 5 MB      | ~0.005 AR      |

**Example**: Uploading 200 NFTs with:
- 2 images per NFT (~500KB each)
- 1 JSON file per NFT (~2KB)

Total: ~0.2 AR (approximately)

Check current AR prices at [viewblock.io/arweave](https://viewblock.io/arweave)

### Solana Update Costs

- Updating NFT metadata URI: ~0.00001 SOL per transaction
- Negligible compared to Arweave costs

## Rate Limiting

The script includes built-in delays:
- **2 seconds** between file uploads
- **3 seconds** between folder processing

This prevents hitting Arweave rate limits.

## Troubleshooting

### Common Issues

**Error: No wallet found**
- Ensure `arweave-wallet.json` exists in project root
- Check file permissions

**Error: Insufficient balance**
- Check balance: Script shows balance on startup
- Add AR tokens to your wallet address
- Minimum recommended: 0.1 AR for small collections

**Upload failures**
- Check internet connection
- Verify Arweave network status: [arweave.net](https://arweave.net)
- Retry: Script will skip already-uploaded files

**Rate limiting**
- Increase delays in `uploadToArweave.js` (lines 132, 282)
- Wait a few minutes and retry

**Missing NFT folders**
- Verify folder structure matches `nftcollection/{NFT_NAME}/`
- Check that folders contain `.json` and image files

## Advanced Usage

### Custom Base Directory

Edit `uploadToArweave.js` line 243:
```javascript
const baseDir = path.join(__dirname, 'your_custom_directory');
```

### Content Type Mapping

Add custom file types in `getContentType()` function (line 50-61):
```javascript
const contentTypes = {
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.mp4': 'video/mp4',  // Add custom types
  // ...
};
```

## Security Notes

- **Never commit `arweave-wallet.json`** to version control
- Add to `.gitignore`:
  ```
  arweave-wallet.json
  *-keypair.json
  ```
- Keep update authority keypairs secure
- Arweave uploads are permanent and cannot be deleted

## Additional Scripts

### Core Utilities
- `generateArweaveWallet.js` - Generate new Arweave wallet
- `uploadJsonToArweave.js` - Upload single JSON file to Arweave

### NFT Update Utilities (Requires mint addresses)
- `generateMetabossUpdate.js` - Generate Metaboss update files from Arweave uploads
  - Requires: `nft_mints.json` with mint addresses
  - Generates: `metaboss_uri_updates.json`
- `validateMints.js` - Validate NFT mint addresses before updating
- `splitMetabossFile.js` - Split large update files into smaller batches
  - Usage: `node splitMetabossFile.js metaboss_uri_updates.json 50`

### Keypair Tools
- `convertKeypair.js` - Convert between Phantom (base58) and Solana CLI (JSON) formats
  - Phantom → Solana: `node convertKeypair.js phantom-to-solana "5Kw..." keypair.json`
  - Solana → Phantom: `node convertKeypair.js solana-to-phantom keypair.json`

## Support

For issues or questions:
- Arweave docs: [docs.arweave.org](https://docs.arweave.org)
- Metaboss docs: [metaboss.rs](https://metaboss.rs)
- Solana docs: [docs.solana.com](https://docs.solana.com)
