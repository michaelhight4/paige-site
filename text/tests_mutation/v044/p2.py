p='/workspace/kilumen/text/build_overworld_lines.py'
L=open(p).read().split('\n')
i=[n for n,l in enumerate(L) if l.startswith('_DEV = ')][0]
L[i]=r'''_DEV = re.compile(r"\b(press(es|ed|ing)?|click (on|the|to)|taps?|tapped|keyboard|shift key|space ?bar|enter key|esc key|ctrl|backspace|arrow keys?|wasd|quick key|key [0-9]|mouse|controller|gamepad|joystick|d-?pad)\b", re.I)
_DEV2 = re.compile(r"\b[A-Z] (key|button)\b|\b(Shift|Space|Enter|Esc|Tab|Backspace)\b")'''
s='\n'.join(L)
s=s.replace(r"elif isinstance(o, str) and _DEV.search(re.sub(r'\{\w+\}', '', o)):", r"elif isinstance(o, str) and (_DEV.search(re.sub(r'\{\w+\}', '', o)) or _DEV2.search(re.sub(r'\{\w+\}', '', o))):")
s=s.replace('''"keyboard": "quick slot N (the N key)", "controller": "quick slot N (L1 / R1)", "touch": "quick slot N (the slot button)",''','''"keyboard": "slot N (the N key)", "controller": "slot N (L1/R1)", "touch": "slot N",''')
open(p,'w').write(s)
