const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');

/**
 * Applies the Windows "hidden" attribute to a given file or directory.
 * Fails silently if the file doesn't exist or if not on Windows.
 * @param {string} filePath 
 */
function hideFile(filePath) {
    if (os.platform() === 'win32') {
        try {
            if (fs.existsSync(filePath)) {
                // Use execSync to ensure the command completes before moving on
                execSync(`attrib +h "${filePath}"`, { stdio: 'ignore' });
            }
        } catch { }
    }
}

module.exports = hideFile;
