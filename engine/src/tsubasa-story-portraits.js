/** Editable runtime data. See docs/DEVELOPMENT.md. */
export const STORY_PORTRAIT_SCALE=2,STORY_PORTRAIT_W=63,STORY_PORTRAIT_H=63;/* 63 = 3x21: whole device px at DPR 1/2/2.625/3 */
export const STORY_PORTRAIT_ART=Object.freeze({
 tsubasa:Object.freeze({src:'./assets/story/portraits/tsubasa.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'5e9d0ae5459597cf25c6e34415a2221bbb750962fc65e3c3a7c90a0932cf4f91'}),
 ishizaki:Object.freeze({src:'./assets/story/portraits/ishizaki.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'666d822d3de09bae3102ff2480f48b87abe926fd78e4c5e15a889141deddff4e'}),
 taki:Object.freeze({src:'./assets/story/portraits/taki.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'c753d0830b69f68405bc3cb922f57f2e0f17b420c1ebe3ace844161a3d915c62'}),
 kisugi:Object.freeze({src:'./assets/story/portraits/kisugi.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'4a954192fdccdc9b3161d141a47e78ed317e813e9fa5ae18b25d0862716a103b'}),
 morisaki:Object.freeze({src:'./assets/story/portraits/morisaki.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'9233967220e85e30ae6195b38088af209ea2bd1520dcaae4aff00342d96b86ec'}),
 takasugi:Object.freeze({src:'./assets/story/portraits/takasugi.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'ce889b47f23bf8681a6c2e0f8dbe2a1aa9975ebc1e68881722ba848246b42048'}),
 sanae:Object.freeze({src:'./assets/story/portraits/sanae.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'4de2c8492885ff56ab00bd32c8dfa32ae03d7f4c19872aa5c2d5ffb1e6e55f36'}),
 nitta:Object.freeze({src:'./assets/story/portraits/nitta.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'f34632e078ed9a521acdd633dcbe2c07a17dae90a7441cd3fb0e7243e579615e'}),
 soda:Object.freeze({src:'./assets/story/portraits/soda.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'5ea982ec263b3abe5eb3a664d6eff1bfd423d4855524c7954dcf00851478246c'}),
 tachibana:Object.freeze({src:'./assets/story/portraits/tachibana.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'b71620b786886e7b8a03dad728f488803d537682c5a6c7695fc2a9f446fafbe5'}),
 jito:Object.freeze({src:'./assets/story/portraits/jito.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'3b6bdccfea445a3c0fafe9aad356f67ff531324d04bdf6adcfad42eba67d8306'}),
 sano:Object.freeze({src:'./assets/story/portraits/sano.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'91fbb3f84b6219cc950038d2cefa3f19d9d0ca809ed6011bc3fee48665ce11ee'}),
 matsuyama:Object.freeze({src:'./assets/story/portraits/matsuyama.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'c34fb3de6e303549d2d184068cb1dc98f129e6e16cbf90d0ee12533cbce91fd8'}),
 hyuga:Object.freeze({src:'./assets/story/portraits/hyuga.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'9c8941b51658236ec822a10d180aaac54673833988272ed115c8f6f53d20233f'}),
 wakashimazu:Object.freeze({src:'./assets/story/portraits/wakashimazu.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'04846af5522b760b586dfe9ea6d6a5a2f25e0d9c660bc3036de0b3e08bcb47cb'}),
 sawada:Object.freeze({src:'./assets/story/portraits/sawada.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'52d63042132d7cd3e54448b53925d6880b5954082b9f0fdcd4f65acc9587ef7e'}),
 /* expression variants (shout / hurt), 2026-10-17: id-expression; missing ones fall back to the normal portrait */
 'hyuga-shout':Object.freeze({src:'./assets/story/portraits/hyuga-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'3a4cb37c126ea8ad5f6b8e08f4f122cb4ef19abf460e2ce0a04d927141f282fa'}),
 'hyuga-hurt':Object.freeze({src:'./assets/story/portraits/hyuga-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'f95bde2b9082fdb84d602d90fa87df633ee8b2271da8103c117aec7c21713d9c'}),
 'ishizaki-shout':Object.freeze({src:'./assets/story/portraits/ishizaki-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'0d5285550ec6156993c46d07c608c4bac1cb247d2683757e1fd9b2357578741e'}),
 'ishizaki-hurt':Object.freeze({src:'./assets/story/portraits/ishizaki-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'a76f3ec112e77d5dc281bfca5ec52f8da824d578562d97bf1162c1e797906ced'}),
 'jito-shout':Object.freeze({src:'./assets/story/portraits/jito-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'95907b348ac97fe4f42b5315d9d4fe214cbfb92248f96a7ab4fbbec631c6f00e'}),
 'jito-hurt':Object.freeze({src:'./assets/story/portraits/jito-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'65615d922da717d8d8c6d0a7f40a04d6b8214f95dc2edec67c18ecfece9a5214'}),
 'matsuyama-shout':Object.freeze({src:'./assets/story/portraits/matsuyama-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'cde21651309f2d2cd8cb7c9f3bf947ef5d1431c890b6d1508efc6beb73f97628'}),
 'matsuyama-hurt':Object.freeze({src:'./assets/story/portraits/matsuyama-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'b8d87924000d58c8705710082890505ae37414db7204ee14fee03ea463eb7ea5'}),
 'morisaki-shout':Object.freeze({src:'./assets/story/portraits/morisaki-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'2b7eceb1bf14ae26d80a5fd4bc2f62ee452cf5138121a30c4e2c36474f8c3029'}),
 'morisaki-hurt':Object.freeze({src:'./assets/story/portraits/morisaki-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'534d46fadec6db14ff1afa575dd63a4ea56f6be04e5ac4c3f5e2f04edbc15b72'}),
 'nitta-shout':Object.freeze({src:'./assets/story/portraits/nitta-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'90d8cbbff8b271e657e431c6df43aea2bbdde600f9e5cba8f955a4eb9f4e227b'}),
 'nitta-hurt':Object.freeze({src:'./assets/story/portraits/nitta-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'1cc19e649df11508013d79a928fafe50ca7d3c624c590118fa704afdedfae4e4'}),
 'sanae-shout':Object.freeze({src:'./assets/story/portraits/sanae-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'02c814d9841dc7aec0b6b2440a17ed411284dd41d2db02a5fdadf7af01c2b913'}),
 'sanae-hurt':Object.freeze({src:'./assets/story/portraits/sanae-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'75292d7faaa1e239e85f159bdc300b5cc19ad1f11cd7603aab054122d6060e1e'}),
 'soda-shout':Object.freeze({src:'./assets/story/portraits/soda-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'c9b53ebdfea66c55fcbaa0ba86d2e53decd92626eb59b095d152e666dfb75429'}),
 'soda-hurt':Object.freeze({src:'./assets/story/portraits/soda-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'e02f0773c49565c620dfb9fd3a2997f1e5308bc4f745cd55654d28d18c66017c'}),
 'tsubasa-shout':Object.freeze({src:'./assets/story/portraits/tsubasa-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'e5b13dd959ba1f4fdf21e23ef725f2748821b5e3eb33cf861220dc32d9fef278'}),
 'tsubasa-hurt':Object.freeze({src:'./assets/story/portraits/tsubasa-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'ffbae4f36414f830af41bae0081124892b484318d91d40a79a46d18986a6ff61'}),
 'wakashimazu-shout':Object.freeze({src:'./assets/story/portraits/wakashimazu-shout.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'4c5619d12e4ac8ee12f39985b8f2b8cd98e5ac74945d19cfb6a7f35dab31aafd'}),
 'wakashimazu-hurt':Object.freeze({src:'./assets/story/portraits/wakashimazu-hurt.png',width:STORY_PORTRAIT_W,height:STORY_PORTRAIT_H,source:'embedded-artwork',sha256:'01b0c5648bf069dcb8ac0d95b04b84bb6b21ec5c079df5a1b2360bf7430b07fb'}),
});
/** portrait id -> art or null (null = name-only, no placeholder). */
const own=id=>id!=null&&Object.hasOwn(STORY_PORTRAIT_ART,id)?STORY_PORTRAIT_ART[id]:null;
/** portrait id (+ optional expression) -> art or null; an expression without its own art uses the normal one */
export const storyPortraitArt=(id,expression='normal')=>(expression&&expression!=='normal'&&typeof id==='string'&&!id.includes('-')?own(id+'-'+expression):null)??(typeof id==='string'&&id.includes('-')?null:own(id));
/* Fractional-DPR fix (S-5 step 2). Chrome paints a source pixel as a uniform block only when the
 * image box is BOTH an exact size in layout units (1/64 CSS px) mapping to integer device px, AND sits
 * on an integer device-px origin (measured: 2.625 needs both; DPR 1/2/3 are always exact).
 *  k  = device px per source px: the smallest k >= round(2*dpr) whose 48k/dpr and 42k/dpr are whole
 *       1/64 CSS px, capped at 1.5*round(2*dpr) (DPR 2.625 -> k 7 = 128x112 CSS; 1/2/3 -> 2/4/6).
 *  grid = smallest CSS step g with g*64 and g*dpr integers; the UI nudges the box origin onto it. */
const LU=64,isInt=v=>Math.abs(v-Math.round(v))<1e-6;
const okDpr=d=>Number.isFinite(d)&&d>0?d:1;
export function storyPortraitGrid(dpr=1){const d=okDpr(dpr);for(let a=1;a<=LU*16;a++){const g=a/LU;if(isInt(g*d))return g;}return null;}
export function storyPortraitLayout(dpr=1,w=STORY_PORTRAIT_W,h=STORY_PORTRAIT_H){const d=okDpr(dpr),base=Math.max(1,Math.round(STORY_PORTRAIT_SCALE*d));let k=base,exact=false;
 for(let c=base;c<=Math.floor(base*1.5);c++)if(isInt(w*c/d*LU)&&isInt(h*c/d*LU)){k=c;exact=true;break;}
 const grid=storyPortraitGrid(d);return {dpr:d,k,cssPxPerSourcePx:k/d,width:Math.round(w*k/d*LU)/LU,height:Math.round(h*k/d*LU)/LU,exact:exact&&grid!==null,grid};}
export const storyPortraitCssPxPerSourcePx=(dpr=1)=>storyPortraitLayout(dpr).cssPxPerSourcePx;
export const storyPortraitDevicePxPerSourcePx=(dpr=1)=>storyPortraitLayout(dpr).k;
/** shift needed (CSS px, >=0, < grid) to put a box origin on the device-px/layout-unit grid */
export const storyPortraitNudge=(origin,grid)=>{if(!grid)return 0;const t=Math.ceil(origin/grid-1e-6)*grid;return Math.round((t-origin)*LU)/LU;};
/** Keeps --story-portrait-w/h on the root in sync with devicePixelRatio (resize, zoom, moving screens) and
 * re-aligns rendered portraits. Returns {align, uninstall}. */
export function installStoryPortraitScale(win=globalThis){
 const doc=win.document,root=doc?.documentElement;if(!root)return {align(){},uninstall(){}};let mq=null;
 const align=()=>{if(root.dataset.storyPortraitDpr!==String(win.devicePixelRatio||1))return apply();/* DPR changed without an event (some emulators/zoom paths) */const L=storyPortraitLayout(win.devicePixelRatio||1);for(const img of doc.querySelectorAll('.story-portrait')){img.style.marginLeft=img.style.marginTop='0px';if(!L.grid)continue;const r=img.getBoundingClientRect();
   const dx=storyPortraitNudge(r.left+(win.scrollX||0),L.grid),dy=storyPortraitNudge(r.top+(win.scrollY||0),L.grid);img.style.marginLeft=dx+'px';img.style.marginTop=dy+'px';img.dataset.k=L.k;img.dataset.exact=L.exact?'1':'0';}};
 const apply=()=>{const dpr=win.devicePixelRatio||1,L=storyPortraitLayout(dpr);root.style.setProperty('--story-portrait-w',L.width+'px');root.style.setProperty('--story-portrait-h',L.height+'px');root.dataset.storyPortraitDpr=String(dpr);
  mq?.removeEventListener?.('change',apply);mq=win.matchMedia?.(`(resolution: ${dpr}dppx)`)??null;mq?.addEventListener?.('change',apply);align();};
 apply();win.addEventListener?.('resize',apply);return {align,apply,uninstall(){win.removeEventListener?.('resize',apply);mq?.removeEventListener?.('change',apply);}};
}
