import {prepareMatchAI,finishMatchAI} from './match-ai.js';
import {updateMatchAITactics,scanAIObjectsInCone} from './match-ai-tactics.js';
import {applyBothTeammateCommands} from './mood-league.js';
import {refreshMatchCommandHud} from './match-command-hud.js';
import {updateBotBehavior,updateEarlyBot,createBotHelpers} from './match-ai-behaviors.js';
import {updateLateBot} from './match-ai-late-behaviors.js';
import {predictGoalLine,updateGoalkeeperBot,updateGoalkeeperReaction} from './match-ai-goalkeeper.js';
import {updateCarrierBot} from './match-ai-carrier.js';
export function originalBotHelpers(){const h=createBotHelpers({predictGoalLine,goalkeeper:updateGoalkeeperBot,goalkeeperReaction:updateGoalkeeperReaction,carrier:updateCarrierBot});h.early=(r,x,k)=>updateEarlyBot(r,x,k,h);h.late=(r,x,k)=>updateLateBot(r,x,k,h);h.scanB034=(r,x,side,mask)=>{r[0x21]=mask;return scanAIObjectsInCone(r,x,side);};return h;}
export function updateOriginalMatchAI(r){const prefix=prepareMatchAI(r),h=originalBotHelpers();let commands=null,hud=null;if(prefix.needsDecisions){updateMatchAITactics(r);commands=applyBothTeammateCommands(r);hud=refreshMatchCommandHud(r);}const behaviors=finishMatchAI(r,(memory,x)=>updateBotBehavior(memory,x,h));const events=[...prefix.commandEvents,...(commands??[]),...behaviors].flatMap(result=>result?.events??[]);return {prefix,commands,hud,behaviors,events};}
