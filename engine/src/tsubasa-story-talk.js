/** 队内会议「交谈」 story lines (2026-10-19, new text — not from S-3; review before treating as final).
 * League story mode: after a teammate's original reply, the teammate says this chapter's line.
 * Keys = character ids (Nankatsu roster slots 0-6 and 11); slots 7-10 are unnamed and keep the original reply only.
 * Same rules as STORY_LINES: each row ≤11 characters, '\n' splits rows. */
const L=(speaker,text)=>Object.freeze({speaker,text});
export const STORY_TALK_LINES=Object.freeze([
 Object.freeze({// 第 1 章 大友
  tsubasa:L('tsubasa','新田的射门很快。\n别给他抬脚的空间！'),taki:L('taki','县大赛决赛了！\n边路交给我！'),kisugi:L('kisugi','今天也让我进一个！'),
  izawa:L('izawa','中场我来补位。'),ishizaki:L('ishizaki','新田那小子，\n我来贴身盯住！'),morisaki:L('morisaki','若林不在，\n我得守住球门……'),
  takasugi:L('takasugi','后场就交给我。'),wakabayashi:L('wakabayashi','腿伤还没好……\n森崎，拜托了。')}),
 Object.freeze({// 第 2 章 东一
  tsubasa:L('tsubasa','早田的剃刀射门\n会拐弯，别大意。'),taki:L('taki','全国大赛了，\n好兴奋啊！'),kisugi:L('kisugi','大阪队的防守\n也很硬啊。'),
  izawa:L('izawa','别让早田转身。'),ishizaki:L('ishizaki','剃刀？\n我用脸也挡下来！'),morisaki:L('morisaki','拐弯球……\n我要看准落点。'),
  takasugi:L('takasugi','定位球我去抢点。'),wakabayashi:L('wakabayashi','盯住球，别眨眼。')}),
 Object.freeze({// 第 3 章 花轮
  tsubasa:L('tsubasa','立花兄弟会飞。\n我们也要抢高点！'),taki:L('taki','他们的空中配合\n太花哨了！'),kisugi:L('kisugi','地面传球，\n不跟他们比跳。'),
  izawa:L('izawa','落点我来卡位。'),ishizaki:L('ishizaki','叠罗汉？\n我也会！大概……'),morisaki:L('morisaki','头顶上的球\n最难扑了……'),
  takasugi:L('takasugi','争顶交给我！'),wakabayashi:L('wakabayashi','出击要果断，森崎。')}),
 Object.freeze({// 第 4 章 比良户
  tsubasa:L('tsubasa','次藤力气很大，\n用速度甩开他！'),taki:L('taki','对面像一堵墙。'),kisugi:L('kisugi','墙也有缝，\n我来找！'),
  izawa:L('izawa','佐野很灵活，\n小心他钻空。'),ishizaki:L('ishizaki','被撞飞也要\n再站起来！'),morisaki:L('morisaki','那么重的射门，\n我接得住吗……'),
  takasugi:L('takasugi','身体对抗\n我不会输！'),wakabayashi:L('wakabayashi','守门员不能怕痛。')}),
 Object.freeze({// 第 5 章 富良野
  tsubasa:L('tsubasa','腿还有点痛，\n但我不会退。'),taki:L('taki','松山是北海道的\n铁人队长。'),kisugi:L('kisugi','他们跑不停，\n体力别输！'),
  izawa:L('izawa','中场一定要撑住。'),ishizaki:L('ishizaki','翼的伤……\n我们多跑一点！'),morisaki:L('morisaki','我也会\n拼到最后！'),
  takasugi:L('takasugi','后防线压上去。'),wakabayashi:L('wakabayashi','再赢一场就决赛了。')}),
 Object.freeze({// 第 6 章 东邦
  tsubasa:L('tsubasa','日向，\n决赛见分晓！'),taki:L('taki','三连冠就差\n最后一场了！'),kisugi:L('kisugi','若岛津的空手道\n扑救很难破。'),
  izawa:L('izawa','全员一起冲！'),ishizaki:L('ishizaki','猛虎射门……\n我拼了也要挡！'),morisaki:L('morisaki','我会守住\n大家的梦想！'),
  takasugi:L('takasugi','盯死日向！'),wakabayashi:L('wakabayashi','去吧，翼。\n把冠军拿回来！')}),
]);
/** Lines the league story adds around the original flow (new text, same rules). {opponent} = chapter opponent name. */
export const STORY_FLOW_LINES=Object.freeze({
 prologue:Object.freeze([L(null,'中学篇 剧情开始！'),L(null,'按顺序挑战六支强队，\n夺取全国三连冠！'),L('tsubasa','大家，出发吧！')]),
 retry:Object.freeze([L(null,'再次挑战{opponent}！'),L('tsubasa','这次一定要赢！')]),
 loss:Object.freeze([L(null,'南葛输掉了比赛……'),L('tsubasa','再来一次！\n我们不会放弃！')]),
 finale:Object.freeze([L(null,'中学篇，完。'),L(null,'全部对手已解锁！'),L(null,'继续联赛，\n向梦想杯进发吧！')]),
});
