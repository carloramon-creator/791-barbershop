require('dotenv').config({ path: '.env.local' });

console.log('Keys in process.env loaded from .env.local:');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
    console.log(k);
}
