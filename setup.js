// Simple setup script to check if required tools are installed
console.log("Checking for required tools...");

// Check Node.js
const { execSync } = require('child_process');

try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' });
  console.log(`Node.js is installed: ${nodeVersion}`);
} catch (error) {
  console.log("Node.js is not installed. Please install it from https://nodejs.org/");
}

// Check npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' });
  console.log(`npm is installed: ${npmVersion}`);
} catch (error) {
  console.log("npm is not installed. Please install Node.js which includes npm.");
}

// Check MongoDB
try {
  const mongoVersion = execSync('mongod --version', { encoding: 'utf-8' });
  console.log(`MongoDB is installed: ${mongoVersion.split('\n')[0]}`);
} catch (error) {
  console.log("MongoDB is not installed. Please install it from https://www.mongodb.com/try/download/community");
}

console.log("\nSetup Instructions:");
console.log("1. Install Node.js from https://nodejs.org/");
console.log("2. Install MongoDB from https://www.mongodb.com/try/download/community");
console.log("3. Run 'npm install' in the project directory");
console.log("4. Start MongoDB service");
console.log("5. Run 'npm start' to start the server");