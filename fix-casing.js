const fs = require('fs');
const path = require('path');

function fixCasing() {
  console.log('=== Running Case Sensitivity Auto-Fixer ===');

  const rootDir = process.cwd();
  const files = fs.readdirSync(rootDir);

  // 1. Find and rename src directory case-insensitively
  let srcDirName = null;
  for (const file of files) {
    if (file.toLowerCase() === 'src') {
      srcDirName = file;
      break;
    }
  }

  if (srcDirName) {
    if (srcDirName !== 'src') {
      console.log(`Found incorrect folder casing: "${srcDirName}". Renaming to "src"...`);
      const tempName = 'src_temp_rename';
      fs.renameSync(path.join(rootDir, srcDirName), path.join(rootDir, tempName));
      fs.renameSync(path.join(rootDir, tempName), path.join(rootDir, 'src'));
    } else {
      console.log('Folder "src" casing is already correct.');
    }
  } else {
    console.error('Error: "src" directory not found!');
    process.exit(1);
  }

  // 2. Find and rename main.tsx inside src case-insensitively
  const srcPath = path.join(rootDir, 'src');
  const srcFiles = fs.readdirSync(srcPath);
  let mainFileName = null;

  for (const file of srcFiles) {
    if (file.toLowerCase() === 'main.tsx') {
      mainFileName = file;
      break;
    }
  }

  if (mainFileName) {
    if (mainFileName !== 'main.tsx') {
      console.log(`Found incorrect main file casing: "${mainFileName}". Renaming to "main.tsx"...`);
      const tempName = 'main.tsx_temp_rename';
      fs.renameSync(path.join(srcPath, mainFileName), path.join(srcPath, tempName));
      fs.renameSync(path.join(srcPath, tempName), path.join(srcPath, 'main.tsx'));
    } else {
      console.log('File "src/main.tsx" casing is already correct.');
    }
  } else {
    console.error('Error: "main.tsx" file not found inside "src" directory!');
    process.exit(1);
  }

  console.log('=== Case Sensitivity Auto-Fixer Completed Successfully ===');
}

fixCasing();
