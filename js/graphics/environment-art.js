// Cached ground detail only. It has no knowledge of target or hole positions.
import { siteRandom } from '../../data/site-layout.js?v=0.55.4';
export function paintEnvironmentGround(c,environment,seed=1){
 if(!environment)return;
 const {ground}=environment,random=siteRandom(seed^0x492649);
 c.save();c.fillStyle=ground==='damp'?'#375b7820':ground==='dry'?'#d3aa6c16':'#8c8d8520';c.fillRect(0,0,880,720);
 if(ground==='stony')for(let i=0;i<44;i++){
   const x=30+random()*820,y=30+random()*660,r=2+random()*5;
   c.fillStyle=i%2?'#bbbea54a':'#20291e60';c.beginPath();c.moveTo(x-r,y);c.lineTo(x-r*.2,y-r*.6);c.lineTo(x+r,y-r*.1);c.lineTo(x+r*.65,y+r*.5);c.lineTo(x-r*.6,y+r*.35);c.closePath();c.fill();
 }else if(ground==='dry')for(let i=0;i<34;i++){
   const x=random()*880,y=random()*720;c.strokeStyle='#463a252b';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x+6,y+3);c.lineTo(x+9,y+1);c.stroke();
 }
 c.restore();
}
