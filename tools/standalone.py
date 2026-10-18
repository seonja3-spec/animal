"""Build an offline playable single HTML file, without npm dependencies."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
rules = (root / 'src/rules.js').read_text().replace('export ', '')
wallet = (root / 'src/wallet.js').read_text().replace('export ', '')
app = '\n'.join(line for line in (root / 'src/app.js').read_text().splitlines() if not line.startswith('import '))
html = html.replace('<link rel="stylesheet" href="style.css">', f'<style>{css}</style>')
html = html.replace('<script type="module" src="src/app.js"></script>', f'<script type="module">{rules}\n{wallet}\n{app}</script>')
output = root.parent / 'animal-play-test.html'
output.write_text(html)
print(output)
