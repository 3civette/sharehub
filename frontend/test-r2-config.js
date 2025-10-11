/**
 * Quick R2 Configuration Test
 * Verifies that R2 credentials are valid and can connect to the bucket
 */

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const testR2Config = async () => {
  console.log('🧪 Testing R2 Configuration...\n');

  // Check environment variables
  const requiredVars = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME'
  ];

  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    process.exit(1);
  }

  console.log('✅ All environment variables present');
  console.log(`   Account ID: ${process.env.R2_ACCOUNT_ID}`);
  console.log(`   Bucket: ${process.env.R2_BUCKET_NAME}\n`);

  // Create R2 client
  try {
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    console.log('📡 Attempting to connect to R2...');

    // Try to list objects in the bucket (this will verify credentials and bucket access)
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 1, // Just list 1 object to test connection
    });

    const response = await r2Client.send(command);

    console.log('✅ Successfully connected to R2!');
    console.log(`   Objects in bucket: ${response.KeyCount || 0}`);

    if (response.KeyCount > 0) {
      console.log(`   First object: ${response.Contents[0].Key}`);
    } else {
      console.log('   Bucket is empty (this is normal for new buckets)');
    }

    console.log('\n🎉 R2 configuration is valid!\n');
    console.log('Next steps:');
    console.log('  1. ✅ R2 credentials verified');
    console.log('  2. ⏭️  Test upload/download flow');
    console.log('  3. ⏭️  Run contract tests\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ R2 Connection Failed!');
    console.error('Error:', error.message);

    if (error.Code === 'NoSuchBucket') {
      console.error('\n💡 The bucket does not exist or the name is wrong.');
      console.error(`   Current bucket name: ${process.env.R2_BUCKET_NAME}`);
      console.error('   Check that the bucket exists in Cloudflare R2 dashboard.');
    } else if (error.Code === 'InvalidAccessKeyId') {
      console.error('\n💡 The Access Key ID is invalid.');
      console.error('   Check your R2_ACCESS_KEY_ID in .env.local');
    } else if (error.Code === 'SignatureDoesNotMatch') {
      console.error('\n💡 The Secret Access Key is invalid.');
      console.error('   Check your R2_SECRET_ACCESS_KEY in .env.local');
    } else if (error.message.includes('getaddrinfo')) {
      console.error('\n💡 Network/DNS error - check your R2_ACCOUNT_ID');
      console.error(`   Current account ID: ${process.env.R2_ACCOUNT_ID}`);
    }

    console.error('\n📚 See docs/R2_SETUP.md for setup instructions\n');
    process.exit(1);
  }
};

testR2Config();
