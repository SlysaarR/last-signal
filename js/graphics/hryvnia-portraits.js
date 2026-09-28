// Original schematic portraits for circulating 2, 5 and 10 hryvnia coins.
// Reference: NBU SuperShort_5_10_pr_2019-11-26; not mint-die reproductions.
export const hryvniaNames = {1:'Володимир Великий',2:'Ярослав Мудрий',5:'Богдан Хмельницький',10:'Іван Мазепа'};
function path(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function legend(c,text){
  c.font='bold 13px Georgia,serif';c.textAlign='center';c.textBaseline='middle';
  const span=Math.min(2.75,text.length*.128),start=Math.PI/2+span/2;
  [...text].forEach((ch,i)=>{const a=start-span*i/(text.length-1);c.save();c.translate(Math.cos(a)*107,Math.sin(a)*107);c.rotate(a-Math.PI/2);c.fillText(ch,0,0,10);c.restore();});
}
function eyes(c){
  c.beginPath();c.moveTo(-22,-19);c.quadraticCurveTo(-12,-25,-4,-19);c.moveTo(7,-20);c.quadraticCurveTo(17,-26,25,-20);c.moveTo(-20,-14);c.quadraticCurveTo(-12,-19,-5,-13);c.moveTo(8,-14);c.quadraticCurveTo(17,-20,24,-14);c.stroke();
  path(c,[[-12,-16],[-12,-12]]);path(c,[[16,-16],[16,-12]]);
  c.beginPath();c.moveTo(2,-19);c.lineTo(-3,6);c.quadraticCurveTo(3,11,9,5);c.stroke();
}
function shoulders(c,prince){
  c.beginPath();c.moveTo(-20,31);c.quadraticCurveTo(-51,41,-70,65);c.quadraticCurveTo(0,93,70,64);c.quadraticCurveTo(47,39,22,29);c.lineTo(0,49);c.closePath();c.fill();c.stroke();
  path(c,[[-41,42],[-19,69],[0,50],[23,69],[44,41]]);
  if(prince){for(let x=-48;x<=48;x+=12){c.beginPath();c.arc(x,65+8*(1-Math.abs(x)/50),2.5,0,Math.PI*2);c.stroke();}}
  else {path(c,[[0,52],[0,80]]);for(let y=58;y<81;y+=9){c.beginPath();c.arc(7,y,2,0,Math.PI*2);c.stroke();}}
}
export function paintLaterHryvniaPortrait(c,item,relief){
 const prince=item.value===2,bohdan=item.value===5;
 relief(()=>{
  c.lineWidth=1.65;c.lineJoin='round';c.lineCap='round';
  // Keep each layer's relief stroke colour; the final inset lines stay legible.
  const shade=c.strokeStyle;
  shoulders(c,prince);
  c.beginPath();c.moveTo(-28,-45);c.bezierCurveTo(-34,-17,-29,19,-16,33);c.quadraticCurveTo(1,47,21,30);c.quadraticCurveTo(36,6,28,-46);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#6e8089';eyes(c);
  if(prince){
   // Fur cap with jewel, long hair and forked beard.
   c.beginPath();c.moveTo(-38,-43);c.quadraticCurveTo(-28,-89,2,-90);c.quadraticCurveTo(33,-85,40,-43);c.lineTo(35,-32);c.quadraticCurveTo(0,-44,-37,-31);c.closePath();c.fill();c.stroke();
   c.beginPath();c.moveTo(-35,-46);c.quadraticCurveTo(0,-61,36,-44);c.stroke();
   path(c,[[0,-87],[0,-50]]);c.beginPath();c.ellipse(0,-58,5,7,0,0,Math.PI*2);c.stroke();
   for(let x=-30;x<33;x+=6)path(c,[[x,-43+Math.abs(x)*.13],[x+1,-36+Math.abs(x)*.13]]);
   c.beginPath();c.moveTo(-26,2);c.quadraticCurveTo(-25,40,-9,55);c.lineTo(0,48);c.lineTo(10,54);c.quadraticCurveTo(30,35,28,0);c.stroke();
   for(let x=-19;x<=21;x+=5)path(c,[[x,24],[x*.6,46]]);
   for(const s of [-1,1]){c.beginPath();c.moveTo(s*33,-28);c.quadraticCurveTo(s*46,0,s*35,34);c.stroke();}
  }else if(bohdan){
   // Broad fur hat and plume distinguish the hetman silhouette.
   c.beginPath();c.moveTo(-42,-42);c.quadraticCurveTo(-46,-79,-11,-84);c.quadraticCurveTo(24,-90,38,-54);c.lineTo(40,-35);c.quadraticCurveTo(0,-47,-42,-32);c.closePath();c.fill();c.stroke();
   c.beginPath();c.moveTo(-37,-50);c.quadraticCurveTo(0,-64,35,-47);c.stroke();
   for(let x=-35;x<36;x+=5)path(c,[[x,-45],[x+2,-36]]);
   c.beginPath();c.moveTo(23,-68);c.quadraticCurveTo(38,-102,55,-94);c.quadraticCurveTo(51,-77,29,-65);c.stroke();path(c,[[26,-67],[48,-89]]);
   c.beginPath();c.moveTo(-2,12);c.bezierCurveTo(-19,6,-20,30,-35,31);c.moveTo(3,12);c.bezierCurveTo(20,5,24,28,35,29);c.moveTo(-12,26);c.quadraticCurveTo(0,33,13,25);c.stroke();
  }else{
   // Uncovered head, swept hair, narrow moustache and embroidered collar.
   c.beginPath();c.moveTo(-30,-2);c.bezierCurveTo(-47,-36,-33,-76,-2,-81);c.bezierCurveTo(28,-87,43,-49,31,-8);c.lineTo(25,-40);c.quadraticCurveTo(1,-48,-6,-65);c.quadraticCurveTo(-16,-45,-29,-38);c.closePath();c.fill();c.stroke();
   for(let i=0;i<5;i++){c.beginPath();c.moveTo(-6+i*5,-74);c.quadraticCurveTo(23+i*3,-69,29+i,-39);c.stroke();}
   c.beginPath();c.moveTo(0,12);c.quadraticCurveTo(-16,11,-25,25);c.moveTo(3,12);c.quadraticCurveTo(17,10,28,24);c.moveTo(-9,27);c.quadraticCurveTo(1,31,12,26);c.stroke();
   for(const s of [-1,1])for(let i=0;i<4;i++)path(c,[[s*(25+i*8),49+i*4],[s*(19+i*8),56+i*4]]);
  }
  c.strokeStyle=shade;
  legend(c,hryvniaNames[item.value].toUpperCase());
 });
}
