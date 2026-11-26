"""Update the inline primitive source after editing illustrator-primitives.js."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
p=root/'index.html'
html=p.read_text(encoding='utf8')
source=(root/'scripts'/'illustrator-primitives.js').read_text(encoding='utf8')
tag='<script id="nsp-illustrator-primitives">\n'+source+'\n</script>'
if '<script id="nsp-illustrator-primitives">' in html:
    html=re.sub(r'<script id="nsp-illustrator-primitives">[\s\S]*?</script>',lambda _:tag,html,count=1)
else:
    html=html.replace('<body>','<body>'+tag,1)
p.write_text(html,encoding='utf8',newline='')
