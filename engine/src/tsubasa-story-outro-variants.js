/** D-59 item 6: the 赛后 (outro) text is the original-anime account of a specific
 * result. Chapters 1-5 narrate a Nankatsu WIN (goals, 锁定胜局 ...); chapter 6 (final vs
 * 东邦) narrates the anime's DRAW (两校同时夺冠). D-50 lets a win OR a draw clear a chapter,
 * so the other clearing result needs its own text.
 * Draw lines for ch1-5 are the approved S-3-draw-postmatch.md text (D-60); ch6 WIN is project's D-63 text. Each
 * placeholder is one narrator line so it is obvious on screen; replace `lines`
 * with [{speaker,text}, ...] (≤11 chars per row, same rules as STORY_LINES). */
export const STORY_OUTRO_ANIME_OUTCOME=Object.freeze(['win','win','win','win','win','draw']);
const slot=(n,outcome)=>Object.freeze({placeholder:true,outcome,lines:Object.freeze([Object.freeze({speaker:null,text:`〔第${n}章${outcome==='draw'?'平局':'胜利'}台词待定〕`})])});
export const STORY_OUTRO_VARIANTS=Object.freeze([
 Object.freeze({placeholder:false,outcome:'draw',source:'embedded-story-content',lines:Object.freeze([{speaker:null,text:'南葛死守到最后一刻。'},{speaker:null,text:'南葛拿到全国大赛门票！'},{speaker:'nitta',text:'下次，我一定赢回来。'},{speaker:'tsubasa',text:'我等着你，新田！'},{speaker:'sanae',text:'全国大赛，加油！'}])}), // ch1 draw
 Object.freeze({placeholder:false,outcome:'draw',source:'embedded-story-content',lines:Object.freeze([{speaker:null,text:'南葛闯过了首战。'},{speaker:'soda',text:'你这家伙，真厉害。'},{speaker:'tsubasa',text:'你的剃刀也很可怕。'},{speaker:'tsubasa',text:'下次再较量！'}])}), // ch2 draw
 Object.freeze({placeholder:false,outcome:'draw',source:'embedded-story-content',lines:Object.freeze([{speaker:null,text:'空中杀法被挡了下来！'},{speaker:null,text:'南葛闯进了八强战！'},{speaker:'tachibana_kazuo',text:'下次换我们赢！'},{speaker:'tsubasa',text:'等你们再飞起来！'}])}), // ch3 draw
 Object.freeze({placeholder:false,outcome:'draw',source:'embedded-story-content',lines:Object.freeze([{speaker:null,text:'次藤的铁壁没被打穿。'},{speaker:null,text:'南葛闯进了准决赛！'},{speaker:'jito',text:'好小子，我服了。'},{speaker:'taki',text:'这是大家一起拼来的！'}])}), // ch4 draw
 Object.freeze({placeholder:false,outcome:'draw',source:'embedded-story-content',lines:Object.freeze([{speaker:null,text:'双方都没有放弃。'},{speaker:null,text:'南葛闯进了决赛！'},{speaker:'matsuyama',text:'翼，你真是不放弃的人。'},{speaker:'tsubasa',text:'松山，你也是！'}])}), // ch5 draw
 Object.freeze({placeholder:false,outcome:'win',source:'project D-63 (ch6 win, verbatim)',lines:Object.freeze([{speaker:null,text:'终场哨声响起！'},{speaker:null,text:'南葛达成全国三连冠！'},{speaker:'hyuga',text:'翼……下次我一定赢你。'},{speaker:'tsubasa',text:'随时奉陪，日向！'},{speaker:'sanae',text:'大家，辛苦了！'}].map(Object.freeze))}),
]);
/** Outro lines for a cleared result: anime text when the result matches the anime, else the variant slot. */
export function storyOutroLinesFor(chapterIndex,outcome,animeLines){if(outcome===STORY_OUTRO_ANIME_OUTCOME[chapterIndex])return animeLines;const v=STORY_OUTRO_VARIANTS[chapterIndex];return v&&v.outcome===outcome?v.lines:animeLines;}
