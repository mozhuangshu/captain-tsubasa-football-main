// Fixed physical PRG15:$FAEE-$FBA8, parameters at $FBA9=2 and $FBAA=6.
// Input r[$04+x]=held, r[$08+x]=new press. All state remains byte-valued.
export const BUTTON_BUFFER_DELAY=2;
export const DIRECTION_REPEAT_WINDOW=6;
export function updateDirectionRepeat(r,x){
 r[0x57c+x]=0;
 const newlyPressed=r[0x08+x]&15;
 if(newlyPressed){
  r[0x1c]=newlyPressed;
  const intersection=newlyPressed&r[0x580+x];
  if(intersection){
   r[0x1c]=intersection;
   if(r[0x584+x]<DIRECTION_REPEAT_WINDOW){
    r[0x57c+x]=(r[0x57c+x]&240)|r[0x1c];
    return;
   }
  }
  r[0x584+x]=0;
  r[0x580+x]=(r[0x580+x]&240)|r[0x1c];
 }else{
  const age=(r[0x584+x]+1)&255;
  r[0x584+x]=(age&128)?127:age;
 }
}
export function updateInputHistory(r,x){
 if(!Number.isInteger(x)||x<0||x>3)throw new RangeError('Four original controller slots');
 const held=r[0x04+x];r[0x1c]=held>>1;
 const buttons=r[0x1c]&224;
 let commit=false;
 if(buttons===0){
  const pending=r[0x574+x];
  if(pending){r[0x1c]=pending;r[0x574+x]=0;commit=true;}
  else{r[0x574+x]=0;r[0x578+x]=0;r[0x56c+x]=0;r[0x570+x]=0;}
 }else if((((buttons<<2)&255)&held)&128){
  r[0x1c]|=128;commit=true;
 }else if(r[0x1c]&r[0x574+x]){
  r[0x578+x]=(r[0x578+x]+1)&255;
  if(r[0x578+x]>=BUTTON_BUFFER_DELAY){r[0x1c]&=r[0x574+x];commit=true;}
 }else{r[0x574+x]=r[0x1c];r[0x578+x]=0;}
 if(commit){r[0x570+x]=(r[0x1c]^r[0x56c+x])&r[0x1c];r[0x56c+x]=r[0x1c];}
 updateDirectionRepeat(r,x);
 return {buttons:r[0x56c+x],pressed:r[0x570+x],doubleDirection:r[0x57c+x]};
}
