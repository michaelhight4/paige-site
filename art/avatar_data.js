/* Avatar DATA. Pure data (SVG fragments + palettes). Reskin by LifeSimArt.registerAvatarData({...}) merging new entries.
   Canvas: viewBox 0 0 100 120. Head centre (50,50), chin ~y75, shoulders start y~88.
   Placeholders in fragments: {skin} {skinD} {hair} {hairD} {eye} {lip} {c} {c2} */
(function(g){
  var A = g.LifeSimArt = g.LifeSimArt || {};
  var D = A.avatarData = {
    stages: { // age -> stage by `maxAge` (exclusive upper bound)
      list: [ {id:'baby',max:2}, {id:'child',max:13}, {id:'teen',max:20}, {id:'adult',max:65}, {id:'elder',max:999} ],
      params: {
        baby:  {hs:1.3, cy:67, bs:.62, eyes:'big',   hairForce:'tuft', noBeard:true, nose:'nose_small', pad:0},
        child: {hs:1.1, cy:57, bs:.86, eyes:'big',   noBeard:true, nose:'nose_small'},
        teen:  {hs:1.03,cy:52, bs:.96, noBeard:false},
        adult: {hs:1,   cy:50, bs:1},
        elder: {hs:1,   cy:51, bs:.98, gray:true, wrinkles:true}
      }
    },
    skins: [ {id:'s1',base:'#fbe0cc',shade:'#e8bfa3'}, {id:'s2',base:'#f3c9a5',shade:'#d9a67e'}, {id:'s3',base:'#e3b087',shade:'#c58f63'},
             {id:'s4',base:'#c98e62',shade:'#a96e46'}, {id:'s5',base:'#a8693e',shade:'#85502c'}, {id:'s6',base:'#7b4a2a',shade:'#5d361c'},
             {id:'s7',base:'#5a3520',shade:'#432512'}, {id:'s8',base:'#e8d9ff',shade:'#c7b3ec'} ],
    hairColors: [ {id:'black',c:'#1f1a1a',d:'#0f0b0b'}, {id:'dbrown',c:'#4a2e1e',d:'#33200f'}, {id:'brown',c:'#7a4a2a',d:'#5a341c'},
                  {id:'blonde',c:'#e5c167',d:'#c49c3e'}, {id:'ginger',c:'#c4562a',d:'#9b3f1b'}, {id:'gray',c:'#bdbdc4',d:'#98989f'},
                  {id:'white',c:'#efeff2',d:'#cfcfd6'}, {id:'blue',c:'#3d6fe0',d:'#2b4fb0'}, {id:'pink',c:'#e86fb0',d:'#c04e8d'} ],
    eyeColors: [ {id:'brown',c:'#4a2e1e'}, {id:'blue',c:'#3d7fe0'}, {id:'green',c:'#3f9a5a'}, {id:'hazel',c:'#8a6a2a'}, {id:'gray',c:'#7d8794'}, {id:'violet',c:'#8a4fd0'} ],
    lipColors: ['#c2574f','#d9788a','#a43b44','#e2907f'],
    genders: ['m','f','n'],
    heads: { m:{rx:22,ry:25}, f:{rx:20,ry:25}, n:{rx:21,ry:25} },
    // Hair: back = behind head, front = over head. Each may be '' . gender tag only affects random picks.
    hair: {
      bald:   {back:'',front:'', g:'mn'},
      buzz:   {back:'',front:'<path d="M28 44C27 29 38 23 50 23S73 29 72 44C68 35 60 32 50 32S32 35 28 44Z" fill="{hair}" opacity=".8"/>', g:'mn'},
      short:  {back:'',front:'<path d="M27 46C26 26 38 20 50 20S74 27 73 46C69 38 64 34 50 33C38 34 31 38 27 46Z" fill="{hair}"/>', g:'mn'},
      sidepart:{back:'',front:'<path d="M26 48C22 24 40 17 54 20C68 22 76 32 74 48C72 38 66 32 56 31C44 34 34 33 26 48Z" fill="{hair}"/><path d="M40 28C48 26 56 28 60 32" stroke="{hairD}" stroke-width="1.5" fill="none"/>', g:'mn'},
      spiky:  {back:'',front:'<path d="M26 46L25 28L34 33L36 17L44 27L50 13L56 27L64 17L66 33L75 28L74 46C70 38 62 34 50 34C38 34 30 38 26 46Z" fill="{hair}"/>', g:'m'},
      mohawk: {back:'',front:'<path d="M44 34L43 12Q50 4 57 12L56 34Z" fill="{hair}"/><path d="M27 44C28 38 34 34 44 34L44 40C36 40 30 41 27 44ZM73 44C72 38 66 34 56 34L56 40C64 40 70 41 73 44Z" fill="{hair}" opacity=".5"/>', g:'m'},
      curly:  {back:'<circle cx="30" cy="48" r="8" fill="{hair}"/><circle cx="70" cy="48" r="8" fill="{hair}"/>',front:'<g fill="{hair}"><circle cx="32" cy="34" r="9"/><circle cx="43" cy="26" r="10"/><circle cx="57" cy="26" r="10"/><circle cx="68" cy="34" r="9"/><circle cx="50" cy="31" r="8"/></g>', g:'mfn'},
      afro:   {back:'<circle cx="50" cy="38" r="33" fill="{hair}"/>',front:'<path d="M28 44C29 34 38 29 50 29S71 34 72 44C66 38 60 36 50 36S34 38 28 44Z" fill="{hair}"/>', g:'mfn'},
      long:   {back:'<path d="M24 50C20 20 38 14 50 14S80 20 76 50L79 96H21Z" fill="{hair}"/>',front:'<path d="M26 50C24 26 38 19 50 19S76 26 74 50C70 38 62 33 50 31C40 33 32 38 26 50Z" fill="{hair}"/><path d="M50 20L48 32" stroke="{hairD}" stroke-width="1.2"/>', g:'fn'},
      bob:    {back:'<path d="M24 48C22 20 38 15 50 15S78 20 76 48L78 72Q50 78 22 72Z" fill="{hair}"/>',front:'<path d="M25 50C23 26 38 19 50 19S77 26 75 50C70 40 60 31 44 32C36 33 29 40 25 50Z" fill="{hair}"/>', g:'fn'},
      ponytail:{back:'<path d="M68 32C92 34 92 66 80 78C82 58 76 50 70 44Z" fill="{hair}"/>',front:'<path d="M26 48C24 26 38 19 50 19S76 26 74 48C70 38 62 33 50 32C38 33 31 38 26 48Z" fill="{hair}"/>', g:'fn'},
      bun:    {back:'<circle cx="50" cy="12" r="9" fill="{hair}"/>',front:'<path d="M26 48C24 26 38 20 50 20S76 26 74 48C70 38 62 33 50 32C38 33 31 38 26 48Z" fill="{hair}"/>', g:'fn'},
      pigtails:{back:'<circle cx="21" cy="58" r="9" fill="{hair}"/><circle cx="79" cy="58" r="9" fill="{hair}"/>',front:'<path d="M26 48C24 26 38 19 50 19S76 26 74 48C68 36 60 32 50 31C40 32 32 36 26 48Z" fill="{hair}"/><circle cx="26" cy="48" r="3" fill="#e8497a"/><circle cx="74" cy="48" r="3" fill="#e8497a"/>', g:'f'},
      braids: {back:'<path d="M24 52C20 22 38 15 50 15S80 22 76 52L78 70L72 70L72 56L28 56L28 70L22 70Z" fill="{hair}"/><rect x="21" y="66" width="7" height="26" rx="3" fill="{hair}"/><rect x="72" y="66" width="7" height="26" rx="3" fill="{hair}"/>',front:'<path d="M26 50C24 26 38 19 50 19S76 26 74 50C70 38 62 33 50 31C40 33 32 38 26 50Z" fill="{hair}"/>', g:'f'},
      tuft:   {back:'',front:'<path d="M46 28Q50 14 56 24Q52 22 52 29Z" fill="{hair}"/>', g:'mfn'},
      elfear: {back:'',front:'<path d="M26 48C24 26 38 19 50 19S76 26 74 48C70 38 62 33 50 32C38 33 31 38 26 48Z" fill="{hair}"/>', g:'mfn'}
    },
    eyes: {
      round:  '<g><ellipse cx="41" cy="48" rx="4.2" ry="3.8" fill="#fff"/><ellipse cx="59" cy="48" rx="4.2" ry="3.8" fill="#fff"/><circle cx="41.5" cy="48.4" r="2.3" fill="{eye}"/><circle cx="58.5" cy="48.4" r="2.3" fill="{eye}"/><circle cx="41" cy="48" r="1" fill="#111"/><circle cx="59" cy="48" r="1" fill="#111"/><path d="M35 41Q41 38 46 41M54 41Q59 38 65 41" stroke="{hairD}" stroke-width="2" fill="none" stroke-linecap="round"/></g>',
      big:    '<g><ellipse cx="40" cy="50" rx="5.6" ry="5.6" fill="#fff"/><ellipse cx="60" cy="50" rx="5.6" ry="5.6" fill="#fff"/><circle cx="40.5" cy="50.5" r="3.6" fill="{eye}"/><circle cx="59.5" cy="50.5" r="3.6" fill="{eye}"/><circle cx="40.5" cy="50.5" r="1.7" fill="#111"/><circle cx="59.5" cy="50.5" r="1.7" fill="#111"/><circle cx="42" cy="48.6" r="1.1" fill="#fff"/><circle cx="61" cy="48.6" r="1.1" fill="#fff"/></g>',
      narrow: '<g><path d="M36 48Q41 44 46 48Q41 51 36 48ZM54 48Q59 44 64 48Q59 51 54 48Z" fill="#fff"/><circle cx="41" cy="48" r="2" fill="{eye}"/><circle cx="59" cy="48" r="2" fill="{eye}"/><path d="M34 43L46 42M54 42L66 43" stroke="{hairD}" stroke-width="2.2" stroke-linecap="round"/></g>',
      lashes: '<g><ellipse cx="41" cy="48" rx="4.4" ry="4" fill="#fff"/><ellipse cx="59" cy="48" rx="4.4" ry="4" fill="#fff"/><circle cx="41.5" cy="48.4" r="2.5" fill="{eye}"/><circle cx="58.5" cy="48.4" r="2.5" fill="{eye}"/><circle cx="41" cy="48" r="1.1" fill="#111"/><circle cx="59" cy="48" r="1.1" fill="#111"/><path d="M35.5 46Q41 42.5 46.5 46M53.5 46Q59 42.5 64.5 46" stroke="#1a1414" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M35 45L33 42.5M64.8 45L67 42.5" stroke="#1a1414" stroke-width="1.5" stroke-linecap="round"/><path d="M35 40Q41 37 46 40M54 40Q59 37 65 40" stroke="{hairD}" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>',
      sleepy: '<g><path d="M36 48Q41 52 46 48M54 48Q59 52 64 48" stroke="#1a1414" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M35 42Q41 40 46 42M54 42Q59 40 65 42" stroke="{hairD}" stroke-width="2" fill="none" stroke-linecap="round"/></g>',
      happy:  '<g><path d="M36 50Q41 43 46 50M54 50Q59 43 64 50" stroke="#1a1414" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>',
      closed: '<g><path d="M36 49Q41 52 46 49M54 49Q59 52 64 49" stroke="#1a1414" stroke-width="2" fill="none" stroke-linecap="round"/></g>',
      dead:   '<g stroke="#1a1414" stroke-width="2.2" stroke-linecap="round"><path d="M37 45L45 52M45 45L37 52M55 45L63 52M63 45L55 52"/></g>'
    },
    noses: {
      nose:'<path d="M48.5 52Q47 58 50 59Q53 58 51.5 52" stroke="{skinD}" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
      nose_small:'<circle cx="50" cy="57" r="1.8" fill="{skinD}"/>',
      nose_long:'<path d="M49 48Q46 59 50 60Q54 59 51 48" stroke="{skinD}" stroke-width="2" fill="none" stroke-linecap="round"/>'
    },
    mouths: {
      smile:  '<path d="M42 64Q50 71 58 64" stroke="#7a2e2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
      neutral:'<path d="M44 66H56" stroke="#7a2e2e" stroke-width="2.4" stroke-linecap="round"/>',
      grin:   '<path d="M41 63Q50 76 59 63Z" fill="#7a2e2e"/><path d="M43 64.5Q50 67 57 64.5" stroke="#fff" stroke-width="2.4" fill="none"/>',
      open:   '<ellipse cx="50" cy="67" rx="5" ry="4.5" fill="#7a2e2e"/><ellipse cx="50" cy="69" rx="3" ry="1.8" fill="#d9788a"/>',
      frown:  '<path d="M43 69Q50 62 57 69" stroke="#7a2e2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
      smirk:  '<path d="M43 66Q50 67 58 62" stroke="#7a2e2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
      lips:   '<path d="M42 65Q46 62 50 64Q54 62 58 65Q50 72 42 65Z" fill="{lip}"/><path d="M42 65Q50 67 58 65" stroke="#00000030" stroke-width="1" fill="none"/>',
      baby:   '<ellipse cx="50" cy="67" rx="3" ry="2.2" fill="#c2574f"/>'
    },
    wrinkles: '<g stroke="{skinD}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"><path d="M33 38Q41 35 47 38M53 38Q59 35 67 38"/><path d="M33 52Q31 56 34 59M67 52Q69 56 66 59"/><path d="M42 60Q40 64 42 68M58 60Q60 64 58 68"/></g>',
    // Accessories. layer: beard (over head, under features) | face (over features, under hair front) | top (over hair) | back
    accessories: {
      glasses:   {layer:'face',svg:'<g fill="none" stroke="#2b2b33" stroke-width="2"><circle cx="41" cy="48" r="7.5"/><circle cx="59" cy="48" r="7.5"/><path d="M48.5 48H51.5M33.5 47L28 44M66.5 47L72 44"/></g>'},
      sunglasses:{layer:'face',svg:'<g><path d="M32 44H68V50Q68 56 60 56Q53 56 52 50H48Q47 56 40 56Q32 56 32 50Z" fill="#1c1c22"/><path d="M32 44L27 42M68 44L73 42" stroke="#1c1c22" stroke-width="2"/></g>'},
      beard:     {layer:'beard',svg:'<path d="M28 54Q28 80 50 82Q72 80 72 54Q70 66 62 68Q50 62 38 68Q30 66 28 54Z" fill="{hair}"/>',adultOnly:true},
      stubble:   {layer:'beard',svg:'<path d="M30 58Q31 76 50 78Q69 76 70 58Q66 70 50 70Q34 70 30 58Z" fill="{hairD}" opacity=".35"/>',adultOnly:true},
      mustache:  {layer:'face',svg:'<path d="M40 62Q45 58 50 61Q55 58 60 62Q55 65 50 63Q45 65 40 62Z" fill="{hair}"/>',adultOnly:true},
      freckles:  {layer:'face',svg:'<g fill="{skinD}"><circle cx="36" cy="56" r=".9"/><circle cx="40" cy="58" r=".9"/><circle cx="34" cy="59" r=".9"/><circle cx="64" cy="56" r=".9"/><circle cx="60" cy="58" r=".9"/><circle cx="66" cy="59" r=".9"/></g>'},
      blush:     {layer:'face',svg:'<g fill="#ff7a8a" opacity=".35"><circle cx="35" cy="58" r="4"/><circle cx="65" cy="58" r="4"/></g>'},
      earring:   {layer:'face',svg:'<circle cx="28.5" cy="58" r="2.2" fill="#f4c542" stroke="#b78a10" stroke-width=".8"/>'},
      scar:      {layer:'face',svg:'<path d="M58 36L64 52M56 42L62 40M58 48L64 46" stroke="#a83a3a" stroke-width="1.6" stroke-linecap="round" fill="none"/>'},
      eyepatch:  {layer:'face',svg:'<path d="M26 40L74 36" stroke="#222" stroke-width="1.6"/><ellipse cx="59" cy="48" rx="7.5" ry="6.5" fill="#222"/>'},
      headband:  {layer:'top',svg:'<path d="M26 40Q50 26 74 40L74 45Q50 31 26 45Z" fill="#e8497a"/>'},
      cap:       {layer:'top',svg:'<path d="M26 40C26 22 74 22 74 40Z" fill="{c}"/><path d="M60 38H84Q86 42 76 42H60Z" fill="{c}"/><path d="M26 40H74" stroke="#0003" stroke-width="1.5"/>'},
      crown:     {layer:'top',svg:'<path d="M31 30L33 12L42 22L50 8L58 22L67 12L69 30Z" fill="#f4c542" stroke="#b78a10" stroke-width="1.5" stroke-linejoin="round"/><circle cx="50" cy="20" r="2.2" fill="#e54848"/>'},
      hardhat:   {layer:'top',svg:'<path d="M26 40C24 14 76 14 74 40Z" fill="#f2c200"/><rect x="22" y="38" width="56" height="5" rx="2.5" fill="#d9ab00"/><rect x="46" y="14" width="8" height="12" fill="#d9ab00"/>'},
      chefhat:   {layer:'top',svg:'<path d="M30 34Q22 28 28 20Q30 12 40 14Q50 6 60 14Q70 12 72 20Q78 28 70 34Z" fill="#fff" stroke="#d6d6d6"/><rect x="30" y="32" width="40" height="6" fill="#fff" stroke="#d6d6d6"/>'},
      wizardhat: {layer:'top',svg:'<path d="M16 40Q50 34 84 40L66 36L56 4Q52 -2 48 4L34 36Z" fill="{c}"/><path d="M30 34Q50 38 70 34L68 30Q50 34 32 30Z" fill="{c2}"/><circle cx="52" cy="22" r="2" fill="#f4c542"/>'},
      helm:      {layer:'top',svg:'<path d="M25 52V38C25 16 75 16 75 38V52H66V44H34V52Z" fill="#9aa3ad" stroke="#5b636d" stroke-width="1.5"/><path d="M50 16V38" stroke="#5b636d" stroke-width="2"/><path d="M47 14H53V10Q50 6 47 10Z" fill="#e54848"/>'},
      hood:      {layer:'top',svg:'<path d="M22 56C16 20 40 10 50 10S84 20 78 56L72 56C74 34 66 24 50 24S26 34 28 56Z" fill="{c}"/>'},
      pointears: {layer:'face',svg:'<path d="M28 48L16 38L29 56ZM72 48L84 38L71 56Z" fill="{skin}" stroke="{skinD}" stroke-width="1"/>'},
      halo:      {layer:'top',svg:'<ellipse cx="50" cy="8" rx="14" ry="4" fill="none" stroke="#f4c542" stroke-width="3"/>'},
      pacifier:  {layer:'face',svg:'<circle cx="50" cy="69" r="4.5" fill="#6fd0ff" stroke="#2f9ad0" stroke-width="1.2"/><circle cx="50" cy="75" r="2.4" fill="none" stroke="#2f9ad0" stroke-width="1.5"/>'}
    },
    // Outfit kinds: SVG fragments for torso (drawn from y=88 down to 120), {c}=main {c2}=secondary
    kinds: {
      tee:    '<path d="M12 120C12 98 28 88 50 88S88 98 88 120Z" fill="{c}"/><path d="M40 88.5Q50 99 60 88.5Z" fill="{skin}"/>',
      suit:   '<path d="M10 120C10 98 28 88 50 88S90 98 90 120Z" fill="{c}"/><path d="M40 88L50 120L60 88Z" fill="#fff"/><path d="M47 92H53L55 100L50 118L45 100Z" fill="{c2}"/><path d="M40 88L34 104L44 120M60 88L66 104L56 120" stroke="#0004" stroke-width="1.5" fill="none"/>',
      hoodie: '<path d="M10 120C10 98 28 88 50 88S90 98 90 120Z" fill="{c}"/><path d="M34 88Q50 104 66 88Q64 84 50 84Q36 84 34 88Z" fill="{skin}"/><path d="M34 88Q50 106 66 88L70 92Q50 112 30 92Z" fill="{c}" stroke="#0003"/><path d="M46 100V112M54 100V112" stroke="{c2}" stroke-width="1.8" stroke-linecap="round"/>',
      apron:  '<path d="M12 120C12 98 28 88 50 88S88 98 88 120Z" fill="{c2}"/><path d="M36 88H64V120H36Z" fill="{c}"/><path d="M36 88L32 120M64 88L68 120" stroke="{c}" stroke-width="4"/><path d="M40 88.5Q50 97 60 88.5Z" fill="{skin}"/>',
      scrubs: '<path d="M12 120C12 98 28 88 50 88S88 98 88 120Z" fill="{c}"/><path d="M38 88L50 106L62 88Z" fill="{skin}"/><path d="M38 88L50 106L62 88" stroke="{c2}" stroke-width="2.5" fill="none"/><rect x="62" y="104" width="10" height="8" rx="1.5" fill="{c2}" opacity=".6"/>',
      labcoat:'<path d="M10 120C10 98 28 88 50 88S90 98 90 120Z" fill="#f6f8fb" stroke="#cfd6df"/><path d="M40 88L50 120L60 88Z" fill="{c}"/><path d="M40 88L46 104L38 120M60 88L54 104L62 120" stroke="#cfd6df" stroke-width="1.5" fill="none"/><rect x="64" y="100" width="9" height="8" fill="none" stroke="#cfd6df"/>',
      uniform:'<path d="M10 120C10 98 28 88 50 88S90 98 90 120Z" fill="{c}"/><path d="M42 88L50 96L58 88Z" fill="#fff"/><path d="M50 96V120" stroke="{c2}" stroke-width="2"/><path d="M26 100H40V104H26Z" fill="{c2}"/><circle cx="68" cy="102" r="4" fill="#f4c542" stroke="#b78a10"/>',
      vest:   '<path d="M12 120C12 98 28 88 50 88S88 98 88 120Z" fill="{c2}"/><path d="M30 92L44 88L50 100L56 88L70 92L72 120H28Z" fill="{c}"/><path d="M42 88Q50 98 58 88Z" fill="{skin}"/>',
      blazer: '<path d="M10 120C10 98 28 88 50 88S90 98 90 120Z" fill="{c}"/><path d="M38 88L50 108L62 88Z" fill="{c2}"/><path d="M38 88L30 108L48 120M62 88L70 108L52 120" stroke="#0004" stroke-width="1.5" fill="none"/>',
      robe:   '<path d="M8 120C8 98 28 88 50 88S92 98 92 120Z" fill="{c}"/><path d="M38 88L50 120L62 88" fill="{skin}" opacity="0"/><path d="M38 88Q50 108 62 88" fill="{skin}"/><path d="M36 88L50 120M64 88L50 120" stroke="{c2}" stroke-width="4"/><path d="M14 112H86" stroke="{c2}" stroke-width="3" opacity=".6"/>',
      armor:  '<path d="M10 120C10 98 28 88 50 88S90 98 90 120Z" fill="#9aa3ad"/><path d="M24 90Q30 100 24 104M76 90Q70 100 76 104" stroke="#5b636d" stroke-width="2" fill="none"/><ellipse cx="22" cy="95" rx="10" ry="7" fill="#b7bfc8" stroke="#5b636d"/><ellipse cx="78" cy="95" rx="10" ry="7" fill="#b7bfc8" stroke="#5b636d"/><path d="M50 90V120" stroke="#5b636d" stroke-width="2"/><path d="M38 88Q50 96 62 88Z" fill="{skin}"/><rect x="44" y="102" width="12" height="10" rx="2" fill="{c}"/>',
      jersey: '<path d="M12 120C12 98 28 88 50 88S88 98 88 120Z" fill="{c}"/><path d="M38 88Q50 100 62 88" stroke="{c2}" stroke-width="3" fill="{skin}"/><text x="50" y="115" font-size="15" font-weight="900" text-anchor="middle" fill="{c2}" font-family="Arial,sans-serif">7</text>',
      dress:  '<path d="M16 120C16 98 30 88 50 88S84 98 84 120Z" fill="{c}"/><path d="M36 88Q50 104 64 88Z" fill="{skin}"/><path d="M36 88Q50 104 64 88" stroke="{c2}" stroke-width="2" fill="none"/>',
      pyjama: '<path d="M12 120C12 98 28 88 50 88S88 98 88 120Z" fill="{c}"/><g fill="{c2}"><circle cx="30" cy="104" r="2.5"/><circle cx="48" cy="110" r="2.5"/><circle cx="68" cy="102" r="2.5"/><circle cx="78" cy="113" r="2.5"/></g><path d="M40 88.5Q50 97 60 88.5Z" fill="{skin}"/>',
      onesie: '<path d="M14 120C14 100 30 90 50 90S86 100 86 120Z" fill="{c}"/><circle cx="50" cy="108" r="4" fill="{c2}"/><path d="M42 90Q50 96 58 90Z" fill="{skin}"/>'
    },
    // outfit id (career id, or custom) -> {kind,c,c2,acc:[accessory ids auto-added]}
    outfits: {
      default: {kind:'tee',c:'#5c8de0',c2:'#fff'},
      baby:    {kind:'onesie',c:'#bfe3ff',c2:'#ffd6e6'},
      kid:     {kind:'tee',c:'#ffb347',c2:'#fff'},
      student: {kind:'hoodie',c:'#7a64d6',c2:'#fff'},
      pajama:  {kind:'pyjama',c:'#7fb2e8',c2:'#fff'},
      fastfood:{kind:'apron',c:'#e85d3a',c2:'#ffd84d',acc:['cap:#e85d3a']},
      retail:  {kind:'vest',c:'#d63b3b',c2:'#fff'},
      driver:  {kind:'uniform',c:'#546e7a',c2:'#ffb300',acc:['cap:#37474f']},
      agent:   {kind:'blazer',c:'#2b6f6a',c2:'#f4c542'},
      media:   {kind:'hoodie',c:'#d6458a',c2:'#fff'},
      swe:     {kind:'hoodie',c:'#2d3748',c2:'#68d391'},
      finance: {kind:'suit',c:'#26313f',c2:'#c0392b'},
      medicine:{kind:'labcoat',c:'#2aa7b8',c2:'#fff'},
      surgeon: {kind:'scrubs',c:'#2aa7b8',c2:'#fff'},
      teacher: {kind:'blazer',c:'#8d6e63',c2:'#ffe082'},
      police:  {kind:'uniform',c:'#243b6b',c2:'#f4c542',acc:['cap:#243b6b']},
      chef:    {kind:'apron',c:'#f4f4f4',c2:'#e9e9e9',acc:['chefhat']},
      lawyer:  {kind:'suit',c:'#4a3b52',c2:'#f4c542'},
      artist:  {kind:'tee',c:'#e4572e',c2:'#fff',acc:['headband']},
      athlete: {kind:'jersey',c:'#2f6fd0',c2:'#fff'},
      actor:   {kind:'blazer',c:'#7b1e3a',c2:'#f4c542'},
      scientist:{kind:'labcoat',c:'#6c7ae0',c2:'#fff'},
      pilot:   {kind:'uniform',c:'#1f2d4d',c2:'#f4c542',acc:['cap:#1f2d4d']},
      builder: {kind:'vest',c:'#f57c00',c2:'#fdd835',acc:['hardhat']},
      royal:   {kind:'robe',c:'#7b1e3a',c2:'#f4c542',acc:['crown']},
      retired: {kind:'blazer',c:'#a58f78',c2:'#ede0cf'}
    },
    // order used for random picks / demo
    randomHair: { m:['short','sidepart','buzz','spiky','curly','afro','bald','mohawk'], f:['long','bob','ponytail','bun','curly','afro','braids'], n:['short','curly','bob','buzz','afro','long','bun'] }
  };
  A.registerAvatarData = function(extra){ // shallow-merge per section; arrays replaced, objects merged
    Object.keys(extra||{}).forEach(function(k){ var v=extra[k]; if (v && typeof v==='object' && !Array.isArray(v) && D[k] && typeof D[k]==='object' && !Array.isArray(D[k])) { Object.keys(v).forEach(function(kk){ D[k][kk]=v[kk]; }); } else D[k]=v; });
    return D;
  };
})(typeof window!=='undefined'?window:globalThis);
