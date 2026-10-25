/** Story portrait expressions (2026-10-17). tsubasa-story-lines.js is generated from the external
 * script and must not be hand-edited, so expressions live here, keyed by speaker + exact line text.
 * shout = calling a move / taunting; hurt = injured, beaten or rattled. Untagged lines use normal.
 * tests/tsubasa-story-portraits.test.mjs checks every entry still matches a real line. */
export const STORY_EXPRESSIONS=Object.freeze(['normal','shout','hurt']);
const T=(speaker,text,expression)=>Object.freeze({speaker,text,expression});
export const STORY_LINE_EXPRESSIONS=Object.freeze([
 // 第 1 章 大友
 T('nitta','翼前辈，今天我要赢！','shout'),T('tsubasa','那就不停球，直接打！','shout'),T('nitta','再来一次！再来一次！','shout'),
 T('morisaki','好快！我、我没看清！','hurt'),T('nitta','下次，我一定赢回来。','hurt'),T('sanae','全国大赛，加油！','shout'),
 // 第 2 章 东一
 T('soda','翼，我盯定你了！','shout'),T('soda','小心我的剃刀！','shout'),T('tsubasa','来吧，我不会退！','shout'),
 T('morisaki','这球怎么拐弯的啊！','hurt'),T('ishizaki','可恶，好锋利的球！','hurt'),T('tsubasa','试试新招，冲力射门！','shout'),T('tsubasa','还差一点点……','hurt'),
 // 第 3 章 花轮
 T('tsubasa','我也要跳得比谁都高！','shout'),T('morisaki','飞、飞那么高？','hurt'),
 // 第 4 章 比良户
 T('jito','这块头，你们撞得过吗？','shout'),T('tsubasa','大家，别被吓到！','shout'),T('morisaki','好、好重的射门……','hurt'),
 T('tsubasa','还没完！','hurt'),T('tsubasa','冲力射门，','shout'),T('tsubasa','第一次就送给你们！','shout'),T('tsubasa','来生！交给你了！','shout'),
 // 第 5 章 富良野
 T('tsubasa','我来扳回来！','shout'),T('sanae','翼，还能站起来吗？','hurt'),T('tsubasa','比赛还没结束！','hurt'),T('tsubasa','球给我，就从中圈开始！','shout'),
 // 第 6 章 东邦
 T('hyuga','翼，今天我要赢你！','shout'),T('wakashimazu','我的球门，不许进！','shout'),T('tsubasa','南葛要拿三连冠！','shout'),T('morisaki','我、我会拼命守的！','hurt'),
 T('hyuga','翼，你挡不住我！','shout'),T('tsubasa','我用冲力射门迎上去！','shout'),T('wakashimazu','怎么可能……','hurt'),T('ishizaki','翼，接球！','shout'),
 T('hyuga','泽田，借你的脚！','shout'),T('tsubasa','冲力射门！','shout'),T('hyuga','猛虎射门！','shout'),
]);
const byKey=new Map(STORY_LINE_EXPRESSIONS.map(e=>[e.speaker+'\u0000'+e.text,e.expression]));
/** -> 'normal' | 'shout' | 'hurt' */
export const storyLineExpression=line=>line?.speaker==null?'normal':byKey.get(line.speaker+'\u0000'+line.text)??'normal';
