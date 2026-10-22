#!/bin/sh
# Serves the repo and runs tests/ui.html in headless Chrome; prints the #result JSON. Usage: sh tests/run_ui.sh   (PORT, SEED, BUDGET, PAGE env overrides)
cd "$(dirname "$0")/.." || exit 1
PORT=${PORT:-$(python3 -c 'import socket;s=socket.socket();s.bind(("",0));print(s.getsockname()[1])')}
python3 -m http.server "$PORT" >/dev/null 2>&1 & SRV=$!
for i in 1 2 3 4 5 6 7 8 9 10; do python3 -c "import urllib.request;urllib.request.urlopen('http://localhost:$PORT/')" 2>/dev/null && break; sleep 0.5; done
google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget="${BUDGET:-300000}" --dump-dom "http://localhost:$PORT/tests/${PAGE:-ui.html}?seed=${SEED:-7}" 2>/dev/null > /tmp/ui_dom.html
kill $SRV 2>/dev/null
python3 - <<'P'
import re,html,json,sys
t=open('/tmp/ui_dom.html').read(); m=re.search(r'<pre id="result">(.*?)</pre>',t,re.S)
if not m: print('NO RESULT'); sys.exit(1)
r=html.unescape(m.group(1)); print(r if len(r)<6000 else r[:2500]+'\n...\n'+r[-2500:]); sys.exit(0 if '"PASS"' in r else 1)
P
