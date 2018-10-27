const chokidar = require('chokidar');
const child_process = require('child_process');

const sourceFile = 'examples/cheat-sheet/maven-security-cheat-sheet.adoc';
const templateFile = '../examples/cheat-sheet/snyk/template.js';

// One-liner for current directory, ignores .dotfiles
chokidar.watch(['examples/**/*.css', 'examples/**/*.js'], {ignored: /(^|[\/\\])\../}).on('all', (event, path) => {
  console.log(event, path);
  if (event === 'change') {
    try {
      child_process.exec(`./bin/asciidoctorjs-pdf ${sourceFile} --template-require ${templateFile}`);
    } catch (e) {
      console.log('error', e);
    }
  }
});

