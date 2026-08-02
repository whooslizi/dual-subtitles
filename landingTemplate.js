const { getLanguageOptions } = require('./languages');

function generateLandingHTML(manifest, baseUrl) {
  const languageOptions = getLanguageOptions();
  const optionsHTML = languageOptions
    .map(opt => `<option value="${opt}">${opt}</option>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${manifest.name}</title>
  <link rel="icon" type="image/png" href="${manifest.logo}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #09090b;
      color: #f4f4f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .wrapper {
      width: 100%;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5rem;
    }
    header {
      text-align: center;
      position: relative;
      width: 100%;
    }
    .gear-icon {
      position: absolute;
      right: 0;
      top: 0;
      color: #71717a;
      cursor: pointer;
      font-size: 1.25rem;
      transition: color 0.2s;
    }
    .gear-icon:hover { color: #f4f4f5; }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #ffffff;
    }
    h1 span { color: #3b82f6; }
    .tagline {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #71717a;
      margin-top: 0.5rem;
    }
    .card {
      width: 100%;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      overflow: hidden;
    }
    .card-header {
      background: #141417;
      border-bottom: 1px solid #27272a;
      padding: 0.75rem 1.25rem;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #a1a1aa;
    }
    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
    }
    .field {
      flex: 1;
      min-width: 200px;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #a1a1aa;
    }
    select {
      width: 100%;
      background: #09090b;
      border: 1px solid #27272a;
      color: #f4f4f5;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }
    select:focus { border-color: #3b82f6; }
    .btn {
      background: #2563eb;
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 0.65rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .btn:hover { background: #1d4ed8; }
    .btn-copy {
      background: #27272a;
      color: #e4e4e7;
    }
    .btn-copy:hover { background: #3f3f46; }
    @media (max-width: 640px) {
      .card-body { flex-direction: column; align-items: stretch; }
      .btn { width: 100%; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <header>
      <span class="gear-icon">⚙</span>
      <h1>Dual<span>Subtitles</span></h1>
      <div class="tagline">SCRAPE AND STREAM DUAL SUBTITLES SEAMLESSLY.</div>
    </header>

    <div class="card">
      <div class="card-header">CONFIGURATION</div>
      <div class="card-body">
        <div class="field">
          <label for="mainLang">PRIMARY LANGUAGE</label>
          <select id="mainLang">${optionsHTML}</select>
        </div>
        <div class="field">
          <label for="transLang">SECONDARY LANGUAGE</label>
          <select id="transLang">${optionsHTML}</select>
        </div>
        <a id="installBtn" href="#" class="btn">Install</a>
        <button id="copyBtn" class="btn btn-copy">Copy Link</button>
      </div>
    </div>
  </div>

  <script>
    const baseUrl = "${baseUrl}";
    const mainSelect = document.getElementById('mainLang');
    const transSelect = document.getElementById('transLang');
    const installBtn = document.getElementById('installBtn');
    const copyBtn = document.getElementById('copyBtn');

    mainSelect.value = 'English [eng]';
    transSelect.value = 'Vietnamese [vie]';

    function update() {
      const main = encodeURIComponent(mainSelect.value);
      const trans = encodeURIComponent(transSelect.value);
      const http = baseUrl + '/mainLang=' + main + '&transLang=' + trans + '/manifest.json';
      installBtn.href = http.replace(/^https?:\\/\\//, 'stremio://');
      copyBtn.dataset.url = http;
    }

    mainSelect.addEventListener('change', update);
    transSelect.addEventListener('change', update);
    update();

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(copyBtn.dataset.url).then(() => {
        copyBtn.innerText = 'Copied!';
        setTimeout(() => copyBtn.innerText = 'Copy Link', 2000);
      });
    });
  </script>
</body>
</html>`;
}

module.exports = generateLandingHTML;
