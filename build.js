const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building executable with pkg...');

try {
    // Run pkg to build the executable
    execSync('npx pkg . --targets node18-win-x64 --output dist/heaven-bot.exe --compress GZip', { stdio: 'inherit' });
    console.log('Executable built successfully!');

    // Check if icon.ico exists
    const iconPath = path.join(__dirname, 'icon.ico');
    const exePath = path.join(__dirname, 'dist', 'heaven-bot.exe');

    if (fs.existsSync(iconPath)) {
        console.log('Found icon.ico! Applying new icon to the executable...');
        // Use resedit-cli to change the icon
        execSync(`npx resedit-cli --in "${exePath}" --out "${exePath}" --icon "${iconPath}"`, { stdio: 'inherit' });
        console.log('Icon applied successfully!');
    } else {
        console.log('\n--- NOTE ---');
        console.log('No "icon.ico" file found in the root directory.');
        console.log('To change the default Node.js green icon, place an icon file named "icon.ico" in this folder and run "npm run build:exe" again.');
        console.log('------------\n');
    }

} catch (error) {
    console.error('Error during build process:', error);
    process.exit(1);
}
