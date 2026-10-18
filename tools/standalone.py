"""Build an offline playable single HTML file, without npm dependencies."""
from pathlib import Path
import base64
root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
rules = (root / 'src/rules.js').read_text().replace('export ', '')
audio = (root / 'src/audio.js').read_text().replace('export ', '')
wallet = (root / 'src/wallet.js').read_text().replace('export ', '')
app = '\n'.join(line for line in (root / 'src/app.js').read_text().splitlines() if not line.startswith('import '))
html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>{css}</style>')
html = html.replace('<script type="module" src="src/app.js"></script>', f'<script type="module">{rules}\n{wallet}\n{audio}\n{app}</script>')
# Inline artwork too, so the generated HTML remains playable offline.
for asset in (root / 'public/assets/animals').glob('*.webp'):
    data = 'data:image/webp;base64,' + base64.b64encode(asset.read_bytes()).decode()
    html = html.replace('/assets/animals/' + asset.name, data)
# The live app assembles animal URLs from IDs; use an inline lookup offline.
asset_urls = {asset.stem: 'data:image/webp;base64,' + base64.b64encode(asset.read_bytes()).decode()
              for asset in (root / 'public/assets/animals').glob('*.webp')}
import json
html = html.replace('`/assets/animals/${animalFiles[id]}.webp`',
                    '(' + json.dumps(asset_urls) + ')[animalFiles[id]]')
# Keep the bundled font available in the offline version too.
font_path = root / 'public/assets/fonts/Jua-Regular.woff'
html = html.replace('/assets/fonts/Jua-Regular.woff',
                    'data:font/woff;base64,' + base64.b64encode(font_path.read_bytes()).decode())
output = root.parent / 'animal-play-test.html'
output.write_text(html)
print(output)
