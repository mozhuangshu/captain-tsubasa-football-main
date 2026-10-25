/** Original meeting-menu state-machine semantics. See docs/DEVELOPMENT.md */
import {initializeMenuScreen,readMenuCommand,navigateMenuOption,setMenuCursorPosition,setMenuCursorBlink,queueMenuSelectionTile,beginPaletteFade,advancePaletteFade,waitForPaletteFade} from './state-dispatch.js';
import {applyMoodAction,applyRandomMood,decodeMoodAction,preparePlayerOptionResponse,PLAYER_TEXT_C0A0,OPTION_TEXT_ADC2} from './mood-league.js';
import {leagueStateView} from './league-flow.js';
import {MissingTranslation} from './league.js';
import {moodTilePatch} from './sprite-mood-menu.js';
export const MEETING_PHASE_POINTERS=[[44125, 44041], [44125, 44041], [44135, 44061], [44135, 44061], [44159, 44109], [44135, 44061], [260, 0], [512, 257], [769, 514], [1026, 771], [3, 1028]];
export const MEETING_COORDINATE_DATA={"44125": [9, 18, 9, 19, 9, 20, 9, 21, 9, 22, 5, 6, 9, 6, 13, 6, 17, 6, 21, 6, 25, 6, 5, 11, 9, 11, 13, 11, 17, 11, 21, 11, 25, 11, 16, 20, 21, 20, 16, 22, 21, 22, 169, 0, 141, 206, 5, 173, 202, 5, 41, 32, 208, 14, 173, 202, 5, 41, 63, 141, 202, 5, 32, 239, 130, 76, 166, 172, 169, 4, 141, 202, 5, 96, 32, 68, 192, 32, 74, 192, 169, 4, 141, 89, 0, 96, 2, 13, 2, 13, 2, 13, 2, 10, 2, 4, 173, 202, 5, 10, 10, 10, 133, 38, 169, 34, 133, 50, 169, 46, 133, 51, 162, 0, 164, 38, 24, 173, 53, 174, 121, 55, 174, 133, 52, 173, 54, 174, 105, 0, 133, 53, 160, 0, 177, 52, 153, 185, 6, 200, 192, 16, 144, 246, 169, 16, 141, 184, 6, 165, 51, 141, 183, 6, 165, 50, 141, 182, 6, 173, 182, 6, 16, 251, 232, 224, 7, 176, 18, 24, 165, 51, 105, 32, 133, 51, 165, 50, 105, 0, 133, 50, 230, 38, 76, 207, 172, 96, 173, 202, 5, 173, 202, 5, 141, 209, 5, 32, 255, 177, 169, 89, 133, 28, 169, 90, 133, 29, 169, 91, 133, 30, 169, 5, 133, 31, 32, 145, 173, 165, 31, 141, 149, 6, 141, 184, 6, 169, 175, 141, 148, 6, 169, 207, 141, 183, 6, 169, 34, 141, 147, 6, 141, 182, 6, 96, 173, 202, 5, 32, 34, 178, 169, 2, 133, 28], "44041": [4, 1, 0, 0, 0, 2, 1, 1, 1, 3, 2, 2, 2, 4, 3, 3, 3, 0, 4, 4, 6, 6, 5, 1, 7, 7, 0, 2, 8, 8, 1, 3, 9, 9, 2, 4, 10, 10, 3, 5, 11, 11, 4, 0, 0, 0, 11, 7, 1, 1, 6, 8, 2, 2, 7, 9, 3, 3, 8, 10, 4, 4, 9, 11, 5, 5, 10, 6, 2, 2, 1, 1, 3, 3, 0, 0, 0, 0, 3, 3, 1, 1, 2, 2, 9, 18, 9, 19, 9, 20, 9, 21, 9, 22, 5, 6, 9, 6, 13, 6, 17, 6, 21, 6, 25, 6, 5, 11, 9, 11, 13, 11, 17, 11, 21, 11, 25, 11, 16, 20, 21, 20, 16, 22, 21, 22, 169, 0, 141, 206, 5, 173, 202, 5, 41, 32, 208, 14, 173, 202, 5, 41, 63, 141, 202, 5, 32, 239, 130, 76, 166, 172, 169, 4, 141, 202, 5, 96, 32, 68, 192, 32, 74, 192, 169, 4, 141, 89, 0, 96, 2, 13, 2, 13, 2, 13, 2, 10, 2, 4, 173, 202, 5, 10, 10, 10, 133, 38, 169, 34, 133, 50, 169, 46, 133, 51, 162, 0, 164, 38, 24, 173, 53, 174, 121, 55, 174, 133, 52, 173, 54, 174, 105, 0, 133, 53, 160, 0, 177, 52, 153, 185, 6, 200, 192, 16, 144, 246, 169, 16, 141, 184, 6, 165, 51, 141, 183, 6, 165, 50, 141, 182, 6, 173, 182, 6, 16, 251, 232, 224, 7, 176, 18, 24, 165, 51], "44135": [5, 6, 9, 6, 13, 6, 17, 6, 21, 6, 25, 6, 5, 11, 9, 11, 13, 11, 17, 11, 21, 11, 25, 11, 16, 20, 21, 20, 16, 22, 21, 22, 169, 0, 141, 206, 5, 173, 202, 5, 41, 32, 208, 14, 173, 202, 5, 41, 63, 141, 202, 5, 32, 239, 130, 76, 166, 172, 169, 4, 141, 202, 5, 96, 32, 68, 192, 32, 74, 192, 169, 4, 141, 89, 0, 96, 2, 13, 2, 13, 2, 13, 2, 10, 2, 4, 173, 202, 5, 10, 10, 10, 133, 38, 169, 34, 133, 50, 169, 46, 133, 51, 162, 0, 164, 38, 24, 173, 53, 174, 121, 55, 174, 133, 52, 173, 54, 174, 105, 0, 133, 53, 160, 0, 177, 52, 153, 185, 6, 200, 192, 16, 144, 246, 169, 16, 141, 184, 6, 165, 51, 141, 183, 6, 165, 50, 141, 182, 6, 173, 182, 6, 16, 251, 232, 224, 7, 176, 18, 24, 165, 51, 105, 32, 133, 51, 165, 50, 105, 0, 133, 50, 230, 38, 76, 207, 172, 96, 173, 202, 5, 173, 202, 5, 141, 209, 5, 32, 255, 177, 169, 89, 133, 28, 169, 90, 133, 29, 169, 91, 133, 30, 169, 5, 133, 31, 32, 145, 173, 165, 31, 141, 149, 6, 141, 184, 6, 169, 175, 141, 148, 6, 169, 207, 141, 183, 6, 169, 34, 141, 147, 6, 141, 182, 6, 96, 173, 202, 5, 32, 34, 178, 169, 2, 133, 28, 169, 218, 133, 29, 169, 219, 133, 30, 169, 8], "44061": [6, 6, 5, 1, 7, 7, 0, 2, 8, 8, 1, 3, 9, 9, 2, 4, 10, 10, 3, 5, 11, 11, 4, 0, 0, 0, 11, 7, 1, 1, 6, 8, 2, 2, 7, 9, 3, 3, 8, 10, 4, 4, 9, 11, 5, 5, 10, 6, 2, 2, 1, 1, 3, 3, 0, 0, 0, 0, 3, 3, 1, 1, 2, 2, 9, 18, 9, 19, 9, 20, 9, 21, 9, 22, 5, 6, 9, 6, 13, 6, 17, 6, 21, 6, 25, 6, 5, 11, 9, 11, 13, 11, 17, 11, 21, 11, 25, 11, 16, 20, 21, 20, 16, 22, 21, 22, 169, 0, 141, 206, 5, 173, 202, 5, 41, 32, 208, 14, 173, 202, 5, 41, 63, 141, 202, 5, 32, 239, 130, 76, 166, 172, 169, 4, 141, 202, 5, 96, 32, 68, 192, 32, 74, 192, 169, 4, 141, 89, 0, 96, 2, 13, 2, 13, 2, 13, 2, 10, 2, 4, 173, 202, 5, 10, 10, 10, 133, 38, 169, 34, 133, 50, 169, 46, 133, 51, 162, 0, 164, 38, 24, 173, 53, 174, 121, 55, 174, 133, 52, 173, 54, 174, 105, 0, 133, 53, 160, 0, 177, 52, 153, 185, 6, 200, 192, 16, 144, 246, 169, 16, 141, 184, 6, 165, 51, 141, 183, 6, 165, 50, 141, 182, 6, 173, 182, 6, 16, 251, 232, 224, 7, 176, 18, 24, 165, 51, 105, 32, 133, 51, 165, 50, 105, 0, 133, 50, 230, 38, 76, 207, 172, 96, 173, 202, 5, 173], "44159": [16, 20, 21, 20, 16, 22, 21, 22, 169, 0, 141, 206, 5, 173, 202, 5, 41, 32, 208, 14, 173, 202, 5, 41, 63, 141, 202, 5, 32, 239, 130, 76, 166, 172, 169, 4, 141, 202, 5, 96, 32, 68, 192, 32, 74, 192, 169, 4, 141, 89, 0, 96, 2, 13, 2, 13, 2, 13, 2, 10, 2, 4, 173, 202, 5, 10, 10, 10, 133, 38, 169, 34, 133, 50, 169, 46, 133, 51, 162, 0, 164, 38, 24, 173, 53, 174, 121, 55, 174, 133, 52, 173, 54, 174, 105, 0, 133, 53, 160, 0, 177, 52, 153, 185, 6, 200, 192, 16, 144, 246, 169, 16, 141, 184, 6, 165, 51, 141, 183, 6, 165, 50, 141, 182, 6, 173, 182, 6, 16, 251, 232, 224, 7, 176, 18, 24, 165, 51, 105, 32, 133, 51, 165, 50, 105, 0, 133, 50, 230, 38, 76, 207, 172, 96, 173, 202, 5, 173, 202, 5, 141, 209, 5, 32, 255, 177, 169, 89, 133, 28, 169, 90, 133, 29, 169, 91, 133, 30, 169, 5, 133, 31, 32, 145, 173, 165, 31, 141, 149, 6, 141, 184, 6, 169, 175, 141, 148, 6, 169, 207, 141, 183, 6, 169, 34, 141, 147, 6, 141, 182, 6, 96, 173, 202, 5, 32, 34, 178, 169, 2, 133, 28, 169, 218, 133, 29, 169, 219, 133, 30, 169, 8, 133, 31, 32, 145, 173, 56, 173, 185, 6, 237, 225, 5, 141, 185, 6, 165, 31, 141, 149, 6, 141, 184, 6, 169], "44109": [2, 2, 1, 1, 3, 3, 0, 0, 0, 0, 3, 3, 1, 1, 2, 2, 9, 18, 9, 19, 9, 20, 9, 21, 9, 22, 5, 6, 9, 6, 13, 6, 17, 6, 21, 6, 25, 6, 5, 11, 9, 11, 13, 11, 17, 11, 21, 11, 25, 11, 16, 20, 21, 20, 16, 22, 21, 22, 169, 0, 141, 206, 5, 173, 202, 5, 41, 32, 208, 14, 173, 202, 5, 41, 63, 141, 202, 5, 32, 239, 130, 76, 166, 172, 169, 4, 141, 202, 5, 96, 32, 68, 192, 32, 74, 192, 169, 4, 141, 89, 0, 96, 2, 13, 2, 13, 2, 13, 2, 10, 2, 4, 173, 202, 5, 10, 10, 10, 133, 38, 169, 34, 133, 50, 169, 46, 133, 51, 162, 0, 164, 38, 24, 173, 53, 174, 121, 55, 174, 133, 52, 173, 54, 174, 105, 0, 133, 53, 160, 0, 177, 52, 153, 185, 6, 200, 192, 16, 144, 246, 169, 16, 141, 184, 6, 165, 51, 141, 183, 6, 165, 50, 141, 182, 6, 173, 182, 6, 16, 251, 232, 224, 7, 176, 18, 24, 165, 51, 105, 32, 133, 51, 165, 50, 105, 0, 133, 50, 230, 38, 76, 207, 172, 96, 173, 202, 5, 173, 202, 5, 141, 209, 5, 32, 255, 177, 169, 89, 133, 28, 169, 90, 133, 29, 169, 91, 133, 30, 169, 5, 133, 31, 32, 145, 173, 165, 31, 141, 149, 6, 141, 184, 6, 169, 175, 141, 148, 6, 169, 207, 141, 183, 6, 169, 34, 141]};
export const MEETING_PANEL_ROWS=Object.freeze([0, 16, 16, 16, 32, 16, 48, 0, 0, 64, 16, 16, 32, 80, 48, 0, 96, 112, 128, 144, 160, 176, 192, 0, 0, 16, 16, 16, 32, 16, 48, 0, 208, 224, 224, 224, 224, 224, 240, 0]); // $016E47
export const MEETING_PANEL_BYTES=Object.freeze([103, 5, 29, 203, 183, 5, 104, 2, 2, 2, 2, 2, 2, 2, 2, 2, 93, 2, 2, 2, 2, 2, 94, 2, 2, 2, 2, 2, 2, 2, 2, 2, 117, 89, 89, 89, 89, 89, 111, 2, 2, 2, 2, 2, 2, 2, 2, 2, 106, 5, 5, 5, 5, 5, 105, 2, 2, 2, 2, 2, 2, 2, 2, 2, 93, 2, 2, 2, 2, 2, 94, 5, 5, 182, 183, 206, 222, 5, 5, 5, 93, 2, 2, 2, 2, 2, 94, 5, 5, 5, 5, 5, 5, 5, 5, 5, 120, 2, 2, 2, 2, 2, 2, 218, 2, 2, 2, 2, 2, 2, 2, 2, 121, 2, 5, 5, 5, 5, 2, 177, 203, 183, 2, 5, 5, 5, 5, 5, 121, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 218, 2, 219, 2, 121, 2, 2, 193, 172, 171, 2, 2, 180, 169, 186, 174, 173, 209, 187, 207, 121, 2, 2, 2, 2, 2, 2, 2, 2, 218, 2, 2, 218, 2, 2, 2, 121, 2, 2, 177, 167, 173, 2, 2, 162, 189, 182, 163, 177, 163, 197, 202, 122, 2, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 120, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 121, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 122, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]); // $016E6F
export const MEETING_RETURN_OPTIONS=Object.freeze([255, 255, 192, 193, 194, 195, 193, 192, 193, 194, 194]); // $016969
export const MEETING_TALK_MESSAGES=Object.freeze([13, 13, 14, 15]); // $01694C
export const MEETING_MOOD_MESSAGES=Object.freeze([34, 34, 32, 30, 30, 28, 255, 255]); // $016B98
export const MEETING_GROUP_SOUNDS=Object.freeze([78, 71, 74, 72, 73]); // $016A43
function need(s,key,...args){if(typeof s[key]!=='function')throw new MissingTranslation(key);return s[key](...args);}
const sound=(s,n)=>need(s,'requestSound',n);
function memory(r){if(!(r instanceof Uint8Array)||r.length<2048)throw new RangeError('2KB semantic state required');}
function moodState(r){const s=leagueStateView(r);s.moods=r.subarray(0x5d5,0x5e1);s.text0611=r.subarray(0x611,0x617);s.text0617=r.subarray(0x617,0x61f);Object.defineProperty(s,'message0606',{get:()=>r[0x606],set:v=>{r[0x606]=v;}});return s;}
function menuData(r,phase){
 const pointers=MEETING_PHASE_POINTERS[phase];if(!pointers)throw new RangeError('meeting phase');
 const read=p=>p<0x800?r.subarray(p,Math.min(2048,p+256)):MEETING_COORDINATE_DATA[p];
 r[0x2c]=pointers[0]&255;r[0x2d]=pointers[0]>>>8;r[0x2e]=pointers[1]&255;r[0x2f]=pointers[1]>>>8;
 return {positions:read(pointers[0]),neighbors:read(pointers[1])};
}
function speaker(r,player){
 const text=PLAYER_TEXT_C0A0[player];if(!text)throw new RangeError('speaker');let y=0;
 while(y<5&&text[y]!==255){r[0x611+y]=text[y];y++;}r[0x611+y]=0xf8;
}
function numberText(r,address,n){
 const digits=[Math.floor(n/100),Math.floor(n/10)%10,(n%10)|128];let seen=false;
 for(let i=0;i<3;i++){if(digits[i])seen=true;r[address+i]=seen?digits[i]|128:0;}r[address+3]=0xf8;
}
/** AFBD..B007 response selector, B265/B26A dynamic numeric parameters. */
export function prepareMeetingGroupResponse(r){
 switch(r[0x5d0]){
  case 0:r[0x606]=0x28+(r[0x300]&3);break;
  case 1:numberText(r,0x611,Math.max(0,16-r[0x558]));numberText(r,0x617,Math.max(0,70-r[0x555]));r[0x606]=0x33;break;
  case 2:r[0x606]=(0x2c+r[0x5e1])&255;break;
  case 3:r[0x606]=0x34+(r[0x300]&1);break;
  default:throw new RangeError('meeting group choice');
 }
 return r[0x606];
}
function glyphRows(text,blank,half1,half2){
 const top=[],bottom=[];
 for(const v of text){if(v>=128||v<16){bottom.push(v);top.push(blank);}else if(v<80){bottom.push(v|128);top.push(half1);}else{bottom.push((v+80)&255);top.push(half2);}}
 return [top,bottom];
}
/** ACBD/AE30 genuine seven 16-byte panel rows, no made-up menu text. */
export function meetingPanelPatches(index){
 if(index<0||index>4)throw new RangeError('meeting panel');const patches=[];
 for(let row=0;row<7;row++){const offset=MEETING_PANEL_ROWS[index*8+row];patches.push({address:0x222e+row*32,bytes:MEETING_PANEL_BYTES.slice(offset,offset+16),stride:1});}
 return patches;
}
export function meetingNamePatches(player,captain=false){
 const text=PLAYER_TEXT_C0A0[player];if(!text)throw new RangeError('player');const [top,bottom]=glyphRows(text,0x59,0x5a,0x5b),delta=captain?12:0;
 return [{address:0x22af-delta,bytes:top,stride:1},{address:0x22cf-delta,bytes:bottom,stride:1}];
}
export function meetingItemPatches(option,minimum){
 const text=OPTION_TEXT_ADC2[option];if(!text)throw new RangeError('item');const [top,bottom]=glyphRows(text,2,0xda,0xdb);bottom[0]=(bottom[0]-minimum)&255;
 return [{address:0x2275,bytes:top,stride:1},{address:0x2295,bytes:bottom,stride:1}];
}
function patches(s,list){need(s,'applyMeetingPatches',list);}
function portrait(r,s,player){const p=moodTilePatch(player,r[0x5d5+player]);patches(s,p.columns.map((bytes,i)=>({address:p.address+i,bytes,stride:32})));}
function showName(r,s){r[0x5d1]=r[0x5ca];patches(s,meetingNamePatches(r[0x5d1]));}
function showItem(r,s){patches(s,meetingItemPatches(r[0x5ca],r[0x5e1]));}
function restoreRootOption(r,positions){
 r[0x5ce]=0;
 if(r[0x5ca]&0x20)r[0x5ca]=4;
 else {r[0x5ca]&=63;queueMenuSelectionTile(r,0,positions,255);}
}
async function fadeOut(r,s){beginPaletteFade(r,'out');if(!s.updatePalette||!s.nextFrame)throw new MissingTranslation('meeting fade services');await waitForPaletteFade(r,s.updatePalette,s.nextFrame);}
async function exitMeeting(r,s){await fadeOut(r,s);r[0x59]=4;}
function commonDraw(r,s,positions,playerSelection){
 if(playerSelection){r[0x55e]=r[0x5d1];r[0x75]=0x16;r[0x76]=0x96;r[0x5ce]=4;}
 else {r[0x75]=0x16;r[0x76]=0x7f;}
 setMenuCursorPosition(r,0,positions);setMenuCursorBlink(r,0,playerSelection?1:0);
 for(let x=r[0x5c9]===6?1:0;x<3;x++)need(s,'drawMenuObject',r,x);
 need(s,'flushMenuSprites',r);
}
function returnRoot(r,s,cancel=false){
 sound(s,cancel?0x34:0x33);patches(s,meetingPanelPatches(4));
 r[0x5ca]=MEETING_RETURN_OPTIONS[r[0x5c9]];r[0x5c9]=1;return false;
}
function beginDialogue(r,s){r[0x5ca]=0;r[0x604]=128;need(s,'stepDialogue',r,s);}
function continueDialogue(r,s){need(s,'stepDialogue',r,s);}
/** A7A4 original initialization without fake dialogue or mood changes. */
function initializeMeeting(r,s){
 r[0x5e1]=Math.max(0,4-(r[0x558]>>>2));r[0x61]=5;r.fill(1,0x5ae,0x5b2);r[0x55d]=r[0x532];
 r[0x5b8]=0x26;r[0x5b9]=0x27;r[0x5bb]=0x11;need(s,'commitGraphicsBanks',r);
 r[0x315]=0x34;r[0x34e]=0xa7;r[0x316]=0x84;r[0x34f]=0xa7;r[0x62]=r[0x63]=5;
 for(let player=0;player<12;player++)portrait(r,s,player);
 patches(s,meetingNamePatches(r[0x532],true));r[0x5ca]=255;
}
/** Main2:0C/0D -> A778, every original phase 0..10; dialogue advancement is
 * the actual bank00 service, mandatory. No elapsed-time stand-in is allowed.
 */
export async function stepMeetingScreen(r,s){
 memory(r);if((r[0x58]&127)!==2||![12,13].includes(r[0x59]&127))throw new RangeError('meeting screen');
 if(!(r[0x59]&128)){initializeMenuScreen(r,s);initializeMeeting(r,s);restoreRootOption(r,menuData(r,0).positions);}
 const phase=r[0x5c9],data=menuData(r,phase);let playerSelection=[2,3,5,6,7,8].includes(phase);
 const command=()=>readMenuCommand(r);
 const nav=()=>{sound(s,0x32);navigateMenuOption(r,0,data.neighbors);};
 const finishConfirm=()=>{r[0x5ca]=255;sound(s,0x33);};
 if(phase===0){if(r[0x5b2]&128){r[0x5c9]++;sound(s,2);}advancePaletteFade(r,s.updatePalette);}
 else if(phase===1){
  if(r[0x5ca]&128)restoreRootOption(r,data.positions);
  const c=Math.min(command(),5);
  if(c===1){sound(s,0x33);await exitMeeting(r,s);}
  else if(c===3){sound(s,0x33);if(r[0x5ca]===4)await exitMeeting(r,s);else{queueMenuSelectionTile(r,0,data.positions,0);patches(s,meetingPanelPatches(r[0x5ca]));r[0x5c9]=r[0x5ca]+2;r[0x5ca]=255;}}
  else if(c===4){sound(s,0x34);r[0x5ca]=4;}
  else if(c===5)nav();
 }else if(phase===2||phase===3||phase===5){
  if(r[0x5ca]&128){r[0x5ca]=r[0x5d1];showName(r,s);}
  const c=Math.min(command(),5);
  if(c===1){sound(s,0x33);await exitMeeting(r,s);playerSelection=false;}
  else if(c===4)playerSelection=returnRoot(r,s,true);
  else if(c===5){nav();showName(r,s);}
  else if(c===3){
   if(phase===2){applyRandomMood(moodState(r),r[0x5d1]);portrait(r,s,r[0x5d1]);speaker(r,r[0x532]);r[0x606]=MEETING_TALK_MESSAGES[r[0x300]&3];r[0x5c9]=7;finishConfirm();}
   else if(phase===3){sound(s,0x33);r[0x5c9]=6;r[0x5ca]=255;}
   else {sound(s,0x33);await fadeOut(r,s);r[0x59]=10;r[0x5b]=13;return;}
  }
 }else if(phase===4){
  if(r[0x5ca]&128){r[0x5d2]=0;r[0x5ca]=0;}
  if(!(r[0x5ca]&64)){
   const c=Math.min(command(),5);
   if(c===1){sound(s,0x33);await exitMeeting(r,s);}
   else if(c===4)playerSelection=returnRoot(r,s,true);
   else if(c===5)nav();
   else if(c===3){r[0x5d0]=r[0x5ca];queueMenuSelectionTile(r,0,data.positions,0);r[0x5ca]=64;for(let player=0;player<12;player++)applyMoodAction(moodState(r),player,r[0x5d0]+8);}
  }else{
   if(r[0x5d2]===0){sound(s,MEETING_GROUP_SOUNDS[r[0x5ca]&15]);r[0x5d2]=24;r[0x5ca]++;}
   r[0x5d2]=(r[0x5d2]-1)&255;
   if(r[0x5ca]>=69){speaker(r,r[0x532]);r[0x606]=0x27;r[0x5c9]=9;r[0x5ca]=255;}
  }
 }else if(phase===6){
  if(r[0x5ca]&128){r[0x5ca]=r[0x5e1];showItem(r,s);}
  const c=command();
  if(c===1){sound(s,0x33);await exitMeeting(r,s);playerSelection=false;}
  else if(c===3){
   const option=r[0x5ca],player=r[0x5d1];let effect=1;
   if(option>=4){effect=decodeMoodAction(player,option-4);applyMoodAction(moodState(r),player,option-4);portrait(r,s,player);}
   preparePlayerOptionResponse(moodState(r),player,option,effect);r[0x5c9]=8;finishConfirm();
  }else if(c===4){sound(s,0x34);r[0x5c9]=3;r[0x5ca]=255;}
  else if(c>=5){
   if(c===6||c===8){r[0x5ca]++;if(r[0x5ca]>=12)r[0x5ca]=r[0x5e1];}
   else {const next=r[0x5ca]-1;r[0x5ca]=next<r[0x5e1]?11:next;}
   showItem(r,s);sound(s,0x32);
  }
 }else if(phase===7){
  if(r[0x5ca]&128)beginDialogue(r,s);
  else if(r[0x5ca]!==0){if(!(r[0x605]&128))playerSelection=returnRoot(r,s);else continueDialogue(r,s);}
  else if(r[0x605]&128)continueDialogue(r,s);
  else {speaker(r,r[0x5d1]);const reply=MEETING_MOOD_MESSAGES[(r[0x5d5+r[0x5d1]]&15)>>>1];r[0x606]=reply&128?16+r[0x5d1]:reply+(r[0x300]&1);r[0x604]=128;r[0x5ca]++;continueDialogue(r,s);}
 }else if(phase===8){
  if(r[0x5ca]&128)beginDialogue(r,s);
  else if(!(r[0x605]&128))playerSelection=returnRoot(r,s);
  else continueDialogue(r,s);
 }else if(phase===9){
  if(r[0x5ca]&128)beginDialogue(r,s);
  else if(r[0x605]&128){if((r[0x605]&32)&&!(r[0x300]&127)){r[0x5ca]^=1;sound(s,0x4b);}continueDialogue(r,s);}
  else {sound(s,0x4d);prepareMeetingGroupResponse(r);r[0x5c9]=10;r[0x5ca]=255;continueDialogue(r,s);}
 }else if(phase===10){
  if(r[0x5ca]&128)beginDialogue(r,s);
  else if(r[0x605]&128)continueDialogue(r,s);
  else if(r[0x5d0]===2 && r[0x606]<0x32){r[0x606]++;beginDialogue(r,s);}
  else playerSelection=returnRoot(r,s);
 }else throw new MissingTranslation(`meeting phase ${phase}`);
 commonDraw(r,s,data.positions,playerSelection);
}
export function meetingTileServices(layout,applyMenuTileRun){
 return {applyMeetingPatches:list=>{for(const p of list)applyMenuTileRun(layout,p.address,p.bytes,{vertical:p.stride===32});}};
}
