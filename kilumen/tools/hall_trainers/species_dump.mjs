const r=process.argv[2];const ui=await import(r+'/src/ui/data.js');const {buildCreatures}=await import(r+'/src/battle/data/creatures.js');
const C=buildCreatures();const out=ui.SPECIES.map(s=>{const c=C[s.id];return {id:s.id,name:s.name,el:s.el,prevo:!!c.prevo,evos:!!c.evos,evoLevel:c.evoLevel,rarity:s.rarity,found:s.found,stage:s.stage}});
import fs from 'fs';fs.writeFileSync('/tmp/species.json',JSON.stringify(out));console.log(out.length,out[0],out[200]);
