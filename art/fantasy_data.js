/* Example isekai/fantasy reskin pack. Load AFTER avatar_data.js / icon_data.js, then call LifeSimArt.fantasyPack.apply() (merges data; nothing is registered until then). Pure data: new outfits, hair colours, careers/icons. Pair with fantasy.css + <html class="theme-fantasy">. */
(function(g){
  var A = g.LifeSimArt;
  var S='fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  A.fantasyPack = { apply: function(){
  A.registerAvatarData({
    outfits:{
      knight:{kind:'armor',c:'#2f6fd0',c2:'#f4c542',acc:['helm']},
      mage:{kind:'robe',c:'#4b2a8c',c2:'#f4c542',acc:['wizardhat:#4b2a8c']},
      cleric:{kind:'robe',c:'#f2efe6',c2:'#f4c542',acc:['halo']},
      rogue:{kind:'hoodie',c:'#2d3a2d',c2:'#a0d37a',acc:['hood:#2d3a2d']},
      bard:{kind:'vest',c:'#c0392b',c2:'#f4c542',acc:['headband']},
      king:{kind:'robe',c:'#7b1e3a',c2:'#f4c542',acc:['crown']},
      peasant:{kind:'tee',c:'#a58f78',c2:'#fff'}
    },
    hairColors:[{id:'black',c:'#1f1a1a',d:'#0f0b0b'},{id:'dbrown',c:'#4a2e1e',d:'#33200f'},{id:'brown',c:'#7a4a2a',d:'#5a341c'},{id:'blonde',c:'#e5c167',d:'#c49c3e'},{id:'ginger',c:'#c4562a',d:'#9b3f1b'},{id:'gray',c:'#bdbdc4',d:'#98989f'},{id:'white',c:'#efeff2',d:'#cfcfd6'},{id:'blue',c:'#3d6fe0',d:'#2b4fb0'},{id:'pink',c:'#e86fb0',d:'#c04e8d'},{id:'silver',c:'#dfe6f2',d:'#b7c2d6'}]
  });
  A.registerIcons({
    career:{
      knight:{c:'#2f6fd0',g:'<path d="M24 6L26 28H22Z"/><path d="M14 28H34M24 28V38" '+S+'/><circle cx="24" cy="40" r="2.500"/>'},
      mage:{c:'#6c3fc0',g:'<path d="M12 38L30 20" '+S+'/><path d="M33 7L35 13L41 15L35 17L33 23L31 17L25 15L31 13Z"/>'},
      cleric:{c:'#c9971c',g:'<path d="M20 8H28V18H38V26H28V40H20V26H10V18H20Z"/>'},
      rogue:{c:'#3b5b3b',g:'<path d="M10 38L34 14L38 18L14 42Z"/><path d="M34 14L40 8L42 10L38 18" fill="#fff"/>'},
      bard:{c:'#c0392b',g:'<ellipse cx="19" cy="30" rx="10" ry="9"/><path d="M26 24L38 8M34 6L42 14" '+S+'/><circle cx="19" cy="30" r="3" fill="#c0392b"/>'},
      dragon:{c:'#b3402a',g:'<path d="M6 34Q12 12 26 14L34 8L36 16L42 20L34 24Q30 38 14 40Q10 38 6 34Z"/><circle cx="31" cy="17" r="1.800" fill="#b3402a"/>'}
    },
    property:{ tower:{c:'#7e57c2',g:'<path d="M16 40V16H32V40Z"/><path d="M13 16L24 4L35 16Z"/><rect x="21" y="22" width="6" height="8" rx="3" fill="#7e57c2"/>'} },
    vehicle:{ horse:{c:'#8d6e63',g:'<path d="M8 38V26Q8 18 16 16L28 10L34 14L40 12L38 20L34 24V38H30V30H16V38Z"/>'}, dragonmount:{c:'#b3402a',alias:'career.dragon'} }
  });
  } };
})(window);
