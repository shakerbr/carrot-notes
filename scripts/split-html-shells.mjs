import { readFileSync, writeFileSync } from 'node:fs';

function rebuildIndex() {
  const html = readFileSync('src/index.html', 'utf8');
  const headEnd = html.indexOf('</head>');
  const bodyStart = html.indexOf('<body>');
  const scriptMarker = '  <script src="vendor/marked.bundle.js"></script>';
  const bodyHtml = html.slice(html.indexOf('<body>'), html.indexOf(scriptMarker));

  const head = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CarrotNotes</title>
  <link rel="stylesheet" href="css/fonts.css">
  <link rel="stylesheet" href="css/dashboard.css">
</head>
`;

  const tail = `
  <script src="vendor/marked.bundle.js"></script>
  <script src="js/markdown-helpers.js"></script>
  <script src="js/dashboard.js"></script>
</body>
</html>
`;

  writeFileSync('src/index.html', head + bodyHtml + tail);
}

function rebuildNote() {
  const html = readFileSync('src/note.html', 'utf8');
  const scriptMarker = '  <script src="vendor/tiptap.bundle.js"></script>';
  const bodyHtml = html.slice(html.indexOf('<body>'), html.indexOf(scriptMarker));

  const head = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CarrotNote</title>
  <style>
    html, body { background: transparent !important; margin: 0; }
    #note-card { background: #FFF2E6; color: #5C2D00; }
  </style>
  <link rel="stylesheet" href="css/fonts.css">
  <link rel="stylesheet" href="css/note.css">
</head>
`;

  const tail = `
  <script src="vendor/tiptap.bundle.js"></script>
  <script src="js/editor-line-format.js"></script>
  <script src="js/markdown-helpers.js"></script>
  <script src="js/note.js"></script>
</body>
</html>
`;

  writeFileSync('src/note.html', head + bodyHtml + tail);
}

rebuildIndex();
rebuildNote();
console.log('Rebuilt index.html and note.html shells');
