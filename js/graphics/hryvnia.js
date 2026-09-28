// Original schematic relief paths based on NBU 2004/2018 reference designs.
// Portraits deliberately omit mint-die microdetail; no photographic asset is shipped.
function line(c,points) { c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke(); }
function arcText(c,text,r,start,end,bottom=false) {
  c.font='bold 14px Georgia,serif';c.textAlign='center';c.textBaseline='middle';
  [...text].forEach((ch,i)=>{const a=start+(end-start)*i/(text.length-1);c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a+(bottom?-Math.PI/2:Math.PI/2));c.fillText(ch,0,0,11);c.restore();});
}
function face(c) {
  c.lineWidth=1.7;
  // Hair silhouette, face, cap with a fur band, beard and moustache.
  c.beginPath();c.moveTo(-30,-42);c.bezierCurveTo(-41,-21,-41,32,-35,53);c.lineTo(-21,58);c.quadraticCurveTo(0,71,26,53);c.lineTo(38,50);c.quadraticCurveTo(38,0,27,-40);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(-24,-33);c.bezierCurveTo(-29,-7,-23,20,-17,35);c.quadraticCurveTo(-4,53,13,42);c.quadraticCurveTo(31,30,26,-27);c.stroke();
  c.beginPath();c.moveTo(-34,-35);c.quadraticCurveTo(-26,-65,1,-76);c.quadraticCurveTo(26,-66,35,-36);c.lineTo(31,-23);c.quadraticCurveTo(0,-36,-35,-25);c.closePath();c.fill();c.stroke();
  c.beginPath();c.moveTo(-30,-38);c.quadraticCurveTo(0,-50,31,-34);c.stroke();
  line(c,[[0,-73],[4,-46]]);line(c,[[-7,-71],[-19,-44]]);line(c,[[7,-70],[22,-42]]);
  for(let i=0;i<18;i++){const x=-30+i*3.5,y=-33+Math.abs(x)*.16;line(c,[[x,y-5],[x+1,y+3]]);}
  // Brows, eyes and nose are engraved, not dark painted patches.
  c.beginPath();c.moveTo(-21,-15);c.quadraticCurveTo(-14,-20,-6,-14);c.moveTo(7,-15);c.quadraticCurveTo(15,-20,23,-12);c.stroke();
  c.beginPath();c.moveTo(-20,-9);c.quadraticCurveTo(-13,-15,-6,-8);c.moveTo(7,-9);c.quadraticCurveTo(15,-14,22,-7);c.stroke();
  line(c,[[-12,-11],[-12,-7]]);line(c,[[14,-10],[14,-6]]);
  c.beginPath();c.moveTo(1,-13);c.lineTo(-3,10);c.quadraticCurveTo(1,14,7,10);c.stroke();
  c.beginPath();c.moveTo(-15,23);c.quadraticCurveTo(-5,12,0,20);c.quadraticCurveTo(8,13,16,24);c.moveTo(-9,28);c.quadraticCurveTo(1,32,11,27);c.stroke();
  for(let i=0;i<7;i++){const x=-15+i*5;line(c,[[x,35],[x+2,43-Math.abs(x)*.1]]);}
  for(const x of [-33,-28,30,34])line(c,[[x,-19],[x+2,46]]);
}
export function paintHryvniaPortrait(c,item,relief) {
  const modern=item.year>=2018;
  relief(()=>{
    c.lineJoin='round';c.lineCap='round';
    c.strokeStyle=item.material==='yellow'?'#9d803e':'#81939b';
    if(modern) {
      // Large bust with legend around its lower perimeter.
      c.save();c.translate(0,-6);c.scale(1.06,1.06);face(c);
      c.beginPath();c.moveTo(-25,48);c.quadraticCurveTo(-46,52,-59,68);c.quadraticCurveTo(0,106,55,69);c.lineTo(26,48);c.quadraticCurveTo(0,72,-25,48);c.closePath();c.fill();c.stroke();
      for(let i=0;i<7;i++){const x=-42+i*13,y=70+10*(1-Math.abs(x)/45);c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.stroke();}
      c.restore();arcText(c,'ВОЛОДИМИР ВЕЛИКИЙ',106,Math.PI*.91,Math.PI*.09,true);
    } else {
      arcText(c,'ВОЛОДИМИР ВЕЛИКИЙ',106,Math.PI*1.04,Math.PI*1.96);
      // Half-length figure, cross staff on the left and model church on the right.
      c.save();c.translate(0,-30);c.scale(.54,.54);face(c);c.restore();
      c.lineWidth=1.7;c.beginPath();c.moveTo(-16,-6);c.quadraticCurveTo(-50,-4,-65,24);c.lineTo(-73,95);c.quadraticCurveTo(-20,119,55,96);c.lineTo(61,38);c.quadraticCurveTo(53,2,19,-6);c.quadraticCurveTo(0,12,-16,-6);c.closePath();c.fill();c.stroke();
      line(c,[[0,9],[0,109]]);line(c,[[8,12],[8,106]]);line(c,[[-44,37],[-42,99]]);line(c,[[30,45],[34,103]]);
      c.beginPath();c.moveTo(-49,12);c.quadraticCurveTo(0,40,47,8);c.moveTo(-49,18);c.quadraticCurveTo(0,47,49,15);c.stroke();
      for(let i=0;i<6;i++){c.beginPath();c.arc(-37+i*15,18+Math.sin(i*.6)*11,3,0,Math.PI*2);c.stroke();}
      line(c,[[-58,-68],[-58,102]]);line(c,[[-70,-53],[-46,-53]]);line(c,[[-64,-59],[-52,-59]]);
      c.beginPath();c.ellipse(-58,27,6,10,0,0,Math.PI*2);c.fill();c.stroke();
      // Architectural model in the prince's hand.
      c.fillRect(23,44,66,36);c.strokeRect(23,44,66,36);
      for(const [x,y,h] of [[29,34,14],[47,17,29],[67,32,15]]) {
        c.fillRect(x,y,14,h);c.strokeRect(x,y,14,h);c.beginPath();c.moveTo(x-2,y);c.quadraticCurveTo(x+7,y-20,x+16,y);c.closePath();c.fill();c.stroke();line(c,[[x+7,y-19],[x+7,y-27]]);line(c,[[x+3,y-23],[x+11,y-23]]);
      }
      for(let x=29;x<86;x+=12){c.beginPath();c.moveTo(x,75);c.lineTo(x,60);c.quadraticCurveTo(x+3,54,x+6,60);c.lineTo(x+6,75);c.stroke();}
      c.beginPath();c.moveTo(24,83);c.quadraticCurveTo(49,94,73,84);c.stroke();
    }
  });
}
