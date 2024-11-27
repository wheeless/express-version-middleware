const fs = require('fs').promises;
const path = require('path');

const directoryPath = path.join(__dirname, 'build/cjs');

async function renameFilesInDirectory(directory) {
    try {
        const files = await fs.readdir(directory);
        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await renameFilesInDirectory(filePath); // Recursive call for directories
            } else if (path.extname(file) === '.js') {
                const newFilePath = filePath.replace('.js', '.cjs');
                await fs.rename(filePath, newFilePath);
                console.log(`Renamed: ${filePath} to ${newFilePath}`);
            }
        }
    } catch (err) {
        console.log('Unable to process directory: ' + err);
    }
}

async function updateImportPaths(directory) {
    const files = await fs.readdir(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            await updateImportPaths(fullPath);
        } else if (fullPath.endsWith('.cjs')) {
            // Adjusted to process .cjs files
            let content = await fs.readFile(fullPath, 'utf8');
            // A broader regex pattern, consider refining for your specific use case
            content = content.replace(/\.js"/g, '.cjs"').replace(/\.js'/g, ".cjs'");
            await fs.writeFile(fullPath, content, 'utf8');
        }
    }
}

async function processDirectory() {
    await renameFilesInDirectory(directoryPath);
    await updateImportPaths(directoryPath);
}

processDirectory();
