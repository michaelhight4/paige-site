/* Icon DATA: LifeSimArt.iconData[category][id] = {c:'#bgcolor', g:'<svg glyph fragments in a 48x48 box>'}  or {alias:'category.id', c:'#override'}.
   Glyph default fill is white; K = translucent dark detail. Add/replace via LifeSimArt.registerIcons({cat:{id:{c,g}}}). */
(function(g){
  var A = g.LifeSimArt = g.LifeSimArt || {};
  var S='fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"', K='rgba(0,0,0,.3)';
  function W(x,y,r){ r=r||4.5; return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#222" stroke="#fff" stroke-width="2"/>'; }
  var I = A.iconData = {
  career:{
    fastfood:{c:'#e8743b',g:'<path d="M11 22Q11 11 24 11Q37 11 37 22Z"/><path d="M10 26H38" '+S+'/><rect x="11" y="29" width="26" height="3.5" rx="1.7" fill="'+K+'"/><path d="M11 34H37Q37 39 31 39H17Q11 39 11 34Z"/>'},
    retail:{c:'#d65a5a',g:'<path d="M12 18H36L34 39H14Z"/><path d="M18 18V15Q24 7 30 15V18" '+S+'/>'},
    driver:{c:'#607d8b',g:'<circle cx="24" cy="24" r="13" '+S+'/><circle cx="24" cy="24" r="3.5"/><path d="M11 24H20M28 24H37M24 28V37" '+S+'/>'},
    agent:{c:'#2b8a7e',g:'<path d="M9 24L24 10L39 24V39H9Z"/><rect x="20" y="28" width="8" height="11" fill="'+K+'"/>'},
    media:{c:'#d6458a',g:'<rect x="9" y="19" width="30" height="19" rx="3"/><path d="M9 17L35 10L37 15L11 22Z" fill="'+K+'" stroke="#fff" stroke-width="1.5"/>'},
    swe:{c:'#4a6fa5',g:'<path d="M19 15L10 24L19 33M29 15L38 24L29 33" '+S+'/><path d="M26 12L22 36" '+S+'/>'},
    finance:{c:'#2e7d4f',g:'<rect x="10" y="26" width="7" height="12"/><rect x="20.5" y="19" width="7" height="19"/><rect x="31" y="10" width="7" height="28"/>'},
    medicine:{c:'#e04b5a',g:'<path d="M19 9H29V19H39V29H29V39H19V29H9V19H19Z"/>'},
    teacher:{c:'#8d6e63',g:'<path d="M24 14Q17 10 8 12V35Q17 33 24 37Q31 33 40 35V12Q31 10 24 14Z"/><path d="M24 14V37" stroke="'+K+'" stroke-width="2"/>'},
    police:{c:'#243b6b',g:'<path d="M24 8L38 13V24Q38 34 24 40Q10 34 10 24V13Z"/><circle cx="24" cy="23" r="5.5" fill="'+K+'"/>'},
    chef:{c:'#b0764a',g:'<path d="M14 25Q7 22 10 15Q13 10 19 12Q24 7 29 12Q35 10 38 15Q41 22 34 25V34H14Z"/><rect x="14" y="36" width="20" height="4" rx="1.5"/>'},
    lawyer:{c:'#5b4a6b',g:'<path d="M24 10V38M14 38H34M11 16H37" '+S+'/><path d="M11 16L6 28H16ZM37 16L32 28H42Z"/>'},
    artist:{c:'#e4572e',g:'<path d="M24 9C13 9 7 18 9 27C11 35 19 39 26 38C30 37 27 33 30 32C37 32 41 28 38 20C36 13 31 9 24 9Z"/><circle cx="17" cy="20" r="2.6" fill="#e4572e"/><circle cx="25" cy="16" r="2.6" fill="#2f6fd0"/><circle cx="32" cy="21" r="2.6" fill="#3fbf5f"/>'},
    athlete:{c:'#2f6fd0',g:'<path d="M15 10H33V20Q33 29 24 30Q15 29 15 20Z"/><path d="M15 14H9Q9 23 17 24M33 14H39Q39 23 31 24" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/><rect x="21.5" y="30" width="5" height="5"/><rect x="15" y="36" width="18" height="4" rx="1.5"/>'},
    pilot:{c:'#1f2d4d',g:'<path d="M24 7Q28 7 28 12V20L41 28V33L28 29V36L32 39V42L24 40L16 42V39L20 36V29L7 33V28L20 20V12Q20 7 24 7Z"/>'},
    scientist:{c:'#6c7ae0',g:'<path d="M20 9H28M21 9V20L12 36Q11 40 15 40H33Q37 40 36 36L27 20V9" '+S+'/><path d="M16 31H32L36 38H12Z"/>'},
    actor:{c:'#7b1e3a',g:'<path d="M24 8L28.5 18.5L40 19.5L31.5 27L34 38L24 32L14 38L16.5 27L8 19.5L19.5 18.5Z"/>'},
    builder:{c:'#f57c00',g:'<path d="M10 30C10 16 38 16 38 30Z"/><rect x="7" y="29" width="34" height="6" rx="3"/><rect x="21" y="14" width="6" height="9" fill="'+K+'"/>'}
  },
  asset:{
    stocks:{c:'#2e7d4f',g:'<path d="M9 35L19 24L26 30L39 14" '+S+'/><path d="M31 14H39V22" '+S+'/>'},
    bonds:{c:'#5470a8',g:'<rect x="9" y="12" width="30" height="24" rx="3"/><path d="M14 19H34M14 25H34M14 31H26" stroke="'+K+'" stroke-width="2.4" stroke-linecap="round"/>'},
    cash:{c:'#3a9d4f',g:'<rect x="7" y="14" width="34" height="20" rx="3"/><circle cx="24" cy="24" r="6" fill="'+K+'"/><circle cx="13" cy="24" r="2"/><circle cx="35" cy="24" r="2"/>'},
    gold:{c:'#c9971c',g:'<path d="M6 36L11 27H25L30 36Z"/><path d="M18 27L23 18H37L42 27Z"/><path d="M14 36L19 27M32 27L26 36" stroke="'+K+'" stroke-width="1.5"/>'},
    crypto:{c:'#f7931a',g:'<circle cx="24" cy="24" r="14" '+S+'/><path d="M20 15V33M20 16H27Q31 16 31 20T27 24H20M20 24H28Q32 24 32 28T28 32H20" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/>'},
    savings:{c:'#e86f9a',g:'<ellipse cx="23" cy="26" rx="14" ry="10"/><path d="M13 19L11 13L18 17Z"/><rect x="16" y="33" width="4" height="6" rx="1"/><rect x="28" y="33" width="4" height="6" rx="1"/><path d="M37 24H42V29H38" stroke="#fff" stroke-width="2.5" fill="none"/><rect x="20" y="19" width="8" height="2.4" rx="1.2" fill="'+K+'"/><circle cx="17" cy="25" r="1.5" fill="'+K+'"/>'},
    art:{c:'#8e5bd6',g:'<rect x="8" y="9" width="32" height="30" rx="2" '+S+'/><path d="M12 33L20 23L26 29L31 22L36 33Z"/><circle cx="31" cy="16" r="3"/>'},
    jewelry:{c:'#d6458a',g:'<path d="M14 14H34L41 23L24 40L7 23Z"/><path d="M7 23H41M14 14L19 23L24 40L29 23L34 14M19 23L24 14L29 23" stroke="'+K+'" stroke-width="1.6" fill="none"/>'},
    watch:{c:'#546e7a',g:'<rect x="17" y="6" width="14" height="36" rx="4" fill="'+K+'"/><circle cx="24" cy="24" r="12"/><path d="M24 17V24L29 27" stroke="#546e7a" stroke-width="2.5" fill="none" stroke-linecap="round"/>'},
    business:{c:'#795548',g:'<rect x="7" y="16" width="34" height="23" rx="3"/><path d="M17 16V12Q17 9 20 9H28Q31 9 31 12V16" '+S+'/><rect x="7" y="25" width="34" height="3" fill="'+K+'"/><rect x="21" y="23" width="6" height="7" rx="1" fill="#795548" stroke="#fff" stroke-width="1.5"/>'},
    insurance:{c:'#3d8fd1',g:'<path d="M24 7C13 7 8 16 8 24H40C40 16 35 7 24 7Z"/><path d="M24 24V37Q24 41 20 41Q17 41 16.500 38" '+S+'/>'},
    collectibles:{c:'#a0522d',g:'<rect x="8" y="20" width="32" height="19" rx="3"/><path d="M8 20Q8 10 24 10Q40 10 40 20Z"/><rect x="21" y="22" width="6" height="8" rx="1.5" fill="#f4c542"/><path d="M8 20H40" stroke="'+K+'" stroke-width="2"/>'},
    land:{c:'#6d8b3a',g:'<path d="M5 38L18 14L26 28L31 20L43 38Z"/><circle cx="34" cy="12" r="4"/>'}
  },
  activity:{
    gym:{c:'#e8743b',g:'<path d="M8 19V29M13 15V33M35 15V33M40 19V29M13 24H35" '+S.replace('stroke-width="3"','stroke-width="4"')+'/>'},
    study:{c:'#2f6fd0',g:'<path d="M24 11L44 20L24 29L4 20Z"/><path d="M12 25V33Q24 40 36 33V25L24 31Z"/><path d="M42 21V32" '+S.replace('stroke-width="3"','stroke-width="2"')+'/>'},
    socialize:{c:'#e86fb0',g:'<path d="M8 11H30Q33 11 33 14V24Q33 27 30 27H18L11 33V27H8Q5 27 5 24V14Q5 11 8 11Z"/><path d="M36 20H40Q43 20 43 23V32Q43 35 40 35V40L34 35H24Q21 35 21 32V30" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/>'},
    doctor:{c:'#e04b5a',g:'<path d="M24 40C10 30 8 22 8 18C8 12 12 9 17 9C20 9 22 11 24 14C26 11 28 9 31 9C36 9 40 12 40 18C40 22 38 30 24 40Z"/><path d="M12 24H19L22 18L26 30L29 24H36" stroke="#e04b5a" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'},
    cosmetic:{c:'#c77dff',g:'<path d="M24 6L28 19L41 24L28 29L24 42L20 29L7 24L20 19Z"/><path d="M38 6L39.500 10L43.500 11.500L39.500 13L38 17L36.500 13L32.500 11.500L36.500 10Z"/>'},
    work:{c:'#795548',alias:'asset.business'},
    meditate:{c:'#3aa6a0',g:'<circle cx="24" cy="12" r="5"/><path d="M24 19Q16 19 14 28L8 34Q16 38 24 36Q32 38 40 34L34 28Q32 19 24 19Z"/>'},
    vacation:{c:'#1fa5d6',g:'<circle cx="35" cy="13" r="6" fill="#ffd84d"/><path d="M22 40L24 18" '+S+'/><path d="M24 18Q12 12 7 22Q16 16 24 20ZM24 18Q36 14 41 24Q32 18 24 20ZM24 18Q22 8 12 6Q20 10 23 18Z"/><path d="M8 40H40" '+S+'/>'},
    date:{c:'#e8497a',g:'<path d="M24 40C10 30 8 22 8 17C8 11 12 8 17 8C20 8 22 10 24 13C26 10 28 8 31 8C36 8 40 11 40 17C40 22 38 30 24 40Z"/>'},
    party:{c:'#ff8c42',g:'<path d="M10 40L18 14L34 30Z"/><path d="M25 12V8M33 18L37 15M36 26H41" '+S+'/><circle cx="30" cy="9" r="2"/><circle cx="40" cy="20" r="2"/>'},
    library:{c:'#8d6e63',g:'<rect x="8" y="10" width="8" height="28" rx="1.5"/><rect x="18" y="14" width="8" height="24" rx="1.5"/><path d="M29 15L36 13L41 37L34 39Z"/>'},
    volunteer:{c:'#3fbf5f',g:'<path d="M24 36C12 28 10 22 10 18C10 13 13 11 17 11C20 11 22 13 24 16C26 13 28 11 31 11C35 11 38 13 38 18C38 22 36 28 24 36Z"/><path d="M4 33L12 31L18 35L26 40" '+S.replace('stroke-width="3"','stroke-width="2.6"')+'/>'},
    shopping:{c:'#d65a5a',g:'<path d="M5 9H11L16 29H35L39 15H13" '+S+'/><circle cx="19" cy="37" r="3"/><circle cx="33" cy="37" r="3"/>'},
    casino:{c:'#2b2b33',g:'<rect x="8" y="8" width="32" height="32" rx="6"/><g fill="#2b2b33"><circle cx="16" cy="16" r="3"/><circle cx="24" cy="24" r="3"/><circle cx="32" cy="32" r="3"/><circle cx="32" cy="16" r="3"/><circle cx="16" cy="32" r="3"/></g>'},
    pet:{c:'#a0764a',g:'<ellipse cx="24" cy="32" rx="9" ry="7"/><circle cx="12" cy="22" r="4.2"/><circle cx="20" cy="14" r="4.2"/><circle cx="29" cy="14" r="4.2"/><circle cx="37" cy="22" r="4.2"/>'}
  },
  ribbon:{
    honor:{c:'#f4b400',g:'<path d="M24 8L28.500 18.500L40 19.500L31.500 27L34 38L24 32L14 38L16.500 27L8 19.500L19.500 18.500Z"/>'},
    wealthy:{c:'#2e9e5a',g:'<circle cx="24" cy="24" r="15" '+S+'/><path d="M29 18Q27 15 24 15Q19 15 19 19Q19 22 24 24Q29 26 29 29Q29 33 24 33Q20 33 18.500 30M24 11V15M24 33V37" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/>'},
    famous:{c:'#e8497a',alias:'career.actor'},
    scholar:{c:'#2f6fd0',alias:'activity.study'},
    healthy:{c:'#e04b5a',alias:'activity.doctor'},
    happy:{c:'#f4b400',g:'<circle cx="24" cy="24" r="16"/><circle cx="18" cy="20" r="2.600" fill="#c98f00"/><circle cx="30" cy="20" r="2.600" fill="#c98f00"/><path d="M15 28Q24 38 33 28" stroke="#c98f00" stroke-width="3" fill="none" stroke-linecap="round"/>'},
    centenarian:{c:'#8e5bd6',g:'<text x="24" y="31" font-size="19" font-weight="900" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif">100</text><path d="M10 14L14 18M38 14L34 18M24 6V11" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/>'},
    parent:{c:'#59b8e8',g:'<circle cx="24" cy="20" r="10"/><circle cx="20.500" cy="19" r="1.500" fill="#59b8e8"/><circle cx="27.500" cy="19" r="1.500" fill="#59b8e8"/><path d="M21 24Q24 27 27 24" stroke="#59b8e8" stroke-width="1.600" fill="none"/><path d="M12 40Q12 31 24 31Q36 31 36 40Z"/>'},
    married:{c:'#e86fb0',g:'<circle cx="18" cy="28" r="9" '+S+'/><circle cx="30" cy="28" r="9" '+S+'/><path d="M24 10L28 15L24 19L20 15Z"/>'},
    criminal:{c:'#455a64',g:'<rect x="8" y="10" width="32" height="28" rx="3" '+S+'/><path d="M16 10V38M24 10V38M32 10V38" '+S.replace('stroke-width="3"','stroke-width="2.6"')+'/>'},
    philanthropist:{c:'#3fbf5f',alias:'activity.volunteer'},
    athlete:{c:'#2f6fd0',alias:'career.athlete'},
    tycoon:{c:'#795548',g:'<rect x="9" y="14" width="14" height="26"/><rect x="25" y="8" width="14" height="32"/><g fill="#795548"><rect x="12" y="18" width="3" height="3"/><rect x="17" y="18" width="3" height="3"/><rect x="12" y="25" width="3" height="3"/><rect x="17" y="25" width="3" height="3"/><rect x="28" y="12" width="3" height="3"/><rect x="33" y="12" width="3" height="3"/><rect x="28" y="19" width="3" height="3"/><rect x="33" y="19" width="3" height="3"/></g>'},
    survivor:{c:'#546e7a',alias:'career.police'}
  },
  vehicle:{
    bicycle:{c:'#43a047',g:'<circle cx="12" cy="31" r="7" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/><circle cx="36" cy="31" r="7" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/><path d="M12 31L21 18H31L36 31M21 18L25 31H12M19 14H24M31 18L29 12H34" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/>'},
    motorcycle:{c:'#e8743b',g:'<circle cx="11" cy="32" r="6" '+S+'/><circle cx="37" cy="32" r="6" '+S+'/><path d="M11 32L19 22H27L31 28H21L11 32M27 22L33 15H38M23 28L28 32H37" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/>'},
    hatch:{c:'#4a90d9',g:'<path d="M7 32V26Q7 23 10 23L14 22L19 14H31Q34 14 36 19L39 23Q42 24 42 28V32Z"/><path d="M20 17L17 22H27V17ZM30 17V22H36L33 17Z" fill="#4a90d9"/>'+W(15,32)+W(34,32)},
    sedan:{c:'#546e7a',g:'<path d="M5 32V27Q5 24 8 24L13 23L19 15H30Q33 15 35 20L38 24L42 26Q44 27 44 29V32Z"/><path d="M20 18L16 23H26V18ZM29 18V23H36L33 18Z" fill="#546e7a"/>'+W(14,32)+W(35,32)},
    sports:{c:'#d63b3b',g:'<path d="M4 32V28Q4 25 8 25L18 22L26 17H33L38 23Q44 24 44 28V32Z"/><path d="M26 19L20 23H35L32 19Z" fill="#d63b3b"/>'+W(13,32)+W(35,32)},
    super:{c:'#f4b400',g:'<path d="M3 33V29Q3 27 6 26L20 22L28 17H34L40 24L45 27V33Z"/><path d="M28 19L22 23H38L33 19Z" fill="#f4b400"/><path d="M4 22H9V26" '+S.replace('stroke-width="3"','stroke-width="2.2"')+'/>'+W(13,33)+W(36,33)},
    suv:{c:'#2e7d4f',g:'<path d="M5 33V20Q5 16 9 16H31Q34 16 36 20L40 25Q43 26 43 30V33Z"/><path d="M10 19V25H22V19ZM25 19V25H36L33 19Z" fill="#2e7d4f"/>'+W(14,33)+W(34,33)},
    truck:{c:'#8d6e63',g:'<rect x="5" y="14" width="22" height="19"/><path d="M27 20H35L41 27V33H27Z"/><path d="M30 22H34L37 27H30Z" fill="#8d6e63"/>'+W(13,34)+W(34,34)},
    bus:{c:'#f2a900',g:'<rect x="5" y="11" width="38" height="24" rx="4"/><g fill="#f2a900"><rect x="9" y="15" width="7" height="8" rx="1"/><rect x="18" y="15" width="7" height="8" rx="1"/><rect x="27" y="15" width="7" height="8" rx="1"/><rect x="36" y="15" width="5" height="12" rx="1"/></g>'+W(13,36,4)+W(33,36,4)},
    dinghy:{c:'#26a69a',g:'<path d="M5 29H43L38 37H11Z"/><path d="M24 6V26L36 26Z"/><path d="M22 10L10 26H22Z" fill="'+K+'"/>'},
    speedboat:{c:'#1fa5d6',g:'<path d="M4 29H42Q44 29 43 31L40 37H10Z"/><path d="M14 29L22 19H30L34 29Z"/><path d="M0 41Q6 38 12 41T24 41T36 41T48 41" '+S.replace('stroke-width="3"','stroke-width="2"')+'/>'},
    yacht:{c:'#3d5a99',g:'<path d="M4 29H44L39 38H9Z"/><rect x="12" y="21" width="22" height="8" rx="1"/><rect x="18" y="14" width="14" height="7" rx="1"/><path d="M26 6V14" '+S.replace('stroke-width="3"','stroke-width="2"')+'/><g fill="#3d5a99"><rect x="15" y="23" width="4" height="3"/><rect x="22" y="23" width="4" height="3"/><rect x="28" y="23" width="4" height="3"/></g>'},
    prop:{c:'#7e57c2',g:'<path d="M6 22H28L40 20Q44 22 40 26L28 26H10Z"/><path d="M16 22L10 12H16L24 22ZM16 26L22 36H17L10 26Z"/><path d="M40 15V31" '+S.replace('stroke-width="3"','stroke-width="2.4"')+'/>'},
    jet:{c:'#1f2d4d',alias:'career.pilot'},
    helicopter:{c:'#c0392b',g:'<ellipse cx="22" cy="26" rx="13" ry="8"/><path d="M33 24L44 20V25L34 29Z"/><path d="M6 12H38M22 12V18" '+S+'/><path d="M10 38H34M16 34L14 38M28 34L30 38" '+S.replace('stroke-width="3"','stroke-width="2"')+'/><ellipse cx="18" cy="25" rx="5" ry="4" fill="'+K+'"/>'}
  },
  property:{
    apt:{c:'#607d8b',g:'<rect x="11" y="7" width="26" height="33"/><g fill="#607d8b"><rect x="15" y="12" width="5" height="5"/><rect x="28" y="12" width="5" height="5"/><rect x="15" y="21" width="5" height="5"/><rect x="28" y="21" width="5" height="5"/><rect x="21" y="31" width="6" height="9"/></g>'},
    suburb:{c:'#43a047',g:'<path d="M5 24L24 8L43 24H39V40H9V24Z"/><rect x="33" y="9" width="5" height="9"/><rect x="19" y="29" width="10" height="11" fill="'+K+'"/><rect x="12" y="26" width="6" height="6" fill="'+K+'"/>'},
    penthouse:{c:'#7e57c2',g:'<rect x="12" y="16" width="24" height="24"/><rect x="16" y="8" width="16" height="8"/><path d="M14 22H34M14 29H34" stroke="'+K+'" stroke-width="2"/><path d="M24 2V8" '+S.replace('stroke-width="3"','stroke-width="2"')+'/>'},
    mansion:{c:'#c9971c',g:'<path d="M3 22L24 8L45 22H41V40H7V22Z"/><g fill="'+K+'"><rect x="10" y="26" width="4" height="14"/><rect x="34" y="26" width="4" height="14"/><rect x="21" y="29" width="6" height="11"/><rect x="16" y="26" width="3" height="5"/><rect x="29" y="26" width="3" height="5"/></g>'},
    cabin:{c:'#8d6e63',g:'<path d="M24 7L43 38H5Z"/><path d="M19 38V27H29V38Z" fill="'+K+'"/><path d="M14 30H34M11 35H37" stroke="'+K+'" stroke-width="1.5"/>'},
    condo:{c:'#26a69a',g:'<rect x="8" y="14" width="16" height="26"/><rect x="26" y="22" width="14" height="18"/><g fill="#26a69a"><rect x="11" y="18" width="4" height="4"/><rect x="17" y="18" width="4" height="4"/><rect x="11" y="26" width="4" height="4"/><rect x="17" y="26" width="4" height="4"/><rect x="29" y="26" width="4" height="4"/><rect x="34" y="26" width="3" height="4"/></g>'},
    farm:{c:'#c0392b',g:'<path d="M6 20L24 8L42 20V40H6Z"/><path d="M15 40V26H33V40M15 26L33 40M33 26L15 40" stroke="#c0392b" stroke-width="2" fill="none"/>'},
    castle:{c:'#78849b',g:'<path d="M6 40V12H12V16H16V12H20V18H28V12H32V16H36V12H42V40Z"/><path d="M19 40V30Q24 24 29 30V40Z" fill="'+K+'"/>'},
    townhouse:{c:'#d97b4a',g:'<path d="M4 18L12 10L20 18V40H4ZM20 18L28 10L36 18V40H20ZM36 18L44 10V40H36Z" fill="#fff" stroke="#d97b4a" stroke-width="1"/><g fill="'+K+'"><rect x="8" y="30" width="4" height="10"/><rect x="24" y="30" width="4" height="10"/><rect x="39" y="30" width="3" height="10"/></g>'},
    trailer:{c:'#90a4ae',g:'<rect x="5" y="14" width="38" height="20" rx="6"/><rect x="11" y="19" width="9" height="7" fill="'+K+'"/><rect x="31" y="19" width="6" height="15" fill="'+K+'"/>'+W(14,36,3.5)+W(32,36,3.5)},
    island:{c:'#1fa5d6',g:'<path d="M6 36Q24 28 42 36L36 40H12Z"/><path d="M24 33L25 17" '+S+'/><path d="M25 17Q14 10 8 18Q18 13 25 19ZM25 17Q36 11 41 19Q31 14 25 19Z"/><path d="M25 18Q26 9 33 6Q28 12 26 18Z"/>'},
    office:{c:'#455a64',g:'<rect x="10" y="6" width="28" height="34"/><g fill="#455a64"><rect x="14" y="11" width="4" height="4"/><rect x="22" y="11" width="4" height="4"/><rect x="30" y="11" width="4" height="4"/><rect x="14" y="19" width="4" height="4"/><rect x="22" y="19" width="4" height="4"/><rect x="30" y="19" width="4" height="4"/><rect x="14" y="27" width="4" height="4"/><rect x="30" y="27" width="4" height="4"/><rect x="21" y="32" width="7" height="8"/></g>'}
  },
  fallback:{ unknown:{c:'#9aa3af',g:'<path d="M17 18Q17 10 24 10Q32 10 32 17Q32 22 27 25Q24 27 24 31" '+S+'/><circle cx="24" cy="38" r="2.500"/>'} }
  };
  A.registerIcons = function(extra){ Object.keys(extra||{}).forEach(function(cat){ I[cat]=I[cat]||{}; Object.keys(extra[cat]).forEach(function(id){ I[cat][id]=extra[cat][id]; }); }); };
})(typeof window!=='undefined'?window:globalThis);
