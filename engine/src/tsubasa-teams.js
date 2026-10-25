import {TSUBASA_TEAMS,TSUBASA_ROSTERS,TSUBASA_KITS} from '../data/tsubasa-team-data.js';
export {TSUBASA_TEAMS,TSUBASA_ROSTERS,TSUBASA_KITS};
export const canonicalTeamId=id=>TSUBASA_TEAMS.aliasToCanonical[id&15];
const rosterByTeam=new Map(TSUBASA_ROSTERS.rosters.map(r=>[r.teamId,r])),kitsByTeam=new Map(TSUBASA_KITS.kits.map(k=>[k.teamId,k])),teamById=new Map(TSUBASA_TEAMS.teams.map(t=>[t.id,t]));
export const getTeam=id=>teamById.get(canonicalTeamId(id));
export function getPlayerIdentity(teamId,playerNumber,role){const r=rosterByTeam.get(canonicalTeamId(teamId)),p=r?.players.find(p=>p.playerNumber===playerNumber);if(!p)throw RangeError(`Unmapped team/player ${teamId}/${playerNumber}`);return {...p,teamId:canonicalTeamId(teamId),role};}
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
export function colorDistance(a,b){const aa=rgb(a),bb=rgb(b);return Math.hypot(...aa.map((v,i)=>v-bb[i]));}
const luminance=c=>{const r=rgb(c);return .2126*r[0]+.7152*r[1]+.0722*r[2];};
const split=k=>/split|vertical_stripes/.test(k.pattern??'');
function dominant(k){return split(k)?[k.shirt,k.trim]:[k.shirt];}
export function kitsConflict(a,b){if(luminance(a.shirt)>160&&luminance(b.shirt)>160)return true;const colorsA=dominant(a),colorsB=dominant(b);return colorsA.some(x=>colorsB.some(y=>colorDistance(x,y)<115));}
// The tiny source silhouette exposes little shirt area. Neutral black away
// cloth merges with its dark outline, and identical white shorts hide the
// remaining team cue. Collision-only kits therefore use a visibly chromatic
// whole set. These are explicitly adapted alternatives, never official kits.
const readableAway=(def,home)=>{
 const candidates=[def.away,...TSUBASA_KITS.collisionPolicy.emergencyFieldChoices];
 const choice=candidates.find(k=>!kitsConflict(home,k)&&colorDistance(home.shorts,k.shorts)>=115&&colorDistance(home.socks,k.socks)>=115);if(!choice)throw Error('No non-conflicting readable away kit');return choice;
};
const kitCache=new Map();
export function getMatchKits(homeId,awayId){
 const key=canonicalTeamId(homeId)+':'+canonicalTeamId(awayId);if(kitCache.has(key))return kitCache.get(key);
 const defs=[kitsByTeam.get(canonicalTeamId(homeId)),kitsByTeam.get(canonicalTeamId(awayId))],fields=[defs[0].field,defs[1].field],variants=['home','home'];
 if(kitsConflict(fields[0],fields[1])){fields[1]=readableAway(defs[1],fields[0]);variants[1]='adapted-away';}
 const keepers=[];for(let side=0;side<2;side++){const forbidden=[...fields.map(k=>k.shirt),...keepers.map(k=>k.shirt)],options=[defs[side].keeper,...defs[side].keeperAlternates],score=k=>Math.min(...forbidden.map(c=>colorDistance(k.shirt,c)));const match=options.find(k=>score(k)>=115);keepers.push(match??[...options].sort((a,b)=>score(b)-score(a))[0]);}
 const out=defs.map((def,side)=>({teamId:def.teamId,field:{...fields[side]},keeper:{...keepers[side],longSleeves:true},fieldVariant:variants[side],keeperVariant:keepers[side]===def.keeper?'primary':'alternate',fieldColorsAreAdaptation:variants[side]!=='home',keeperColorsAreAdaptation:keepers[side]!==def.keeper||Object.values(def.evidence?.keeper??{}).some(v=>String(v).includes('adaptation'))}));
 kitCache.set(key,out);return out;
}
