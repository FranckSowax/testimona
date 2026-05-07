const fs = require('fs-extra');
const path = require('path');

const sourceFolder = path.join(__dirname, './src/assets/');
const destFolder = path.join(__dirname, './dist/assets/');

//Copy files
copyFiles(sourceFolder, destFolder);

function copyFiles(sourceFolder, destFolder) {
  if (fs.pathExistsSync(destFolder)) {
    fs.rmSync(destFolder, { recursive: true });
  }

  console.log('Copy assets directory');
  fs.mkdir(destFolder);

  sourceFiles = fs.readdirSync(sourceFolder);
  sourceFiles.forEach(function (file) {
    var sourceFilePath = path.join(sourceFolder, file);
    var destFilePath = path.join(destFolder, file);

    var isDir = fs.lstatSync(sourceFilePath).isDirectory();
    if (isDir) {
      copyFiles(sourceFilePath, destFilePath);
    } else {
      fs.copyFile(sourceFilePath, destFilePath, (err) => {
        if (err) {
          console.log('err:', err);
          return;
        }
        console.log(sourceFilePath + ' was copied to ' + destFilePath);
      });
    }
  });
}
