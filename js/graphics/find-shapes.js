// Original, procedural reconstructions. Open backs and holes are mesh geometry.
// Only called while inspecting a find or painting a nearby thumbnail.
const TAU=Math.PI*2;
const ellipse=(rx,ry,n=48,cx=0,cy=0)=>Array.from({length:n},(_,i)=>[cx+rx*Math.cos(i/n*TAU),cy+ry*Math.sin(i/n*TAU)]);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function buildFindShape(item,condition,api) {
 if(item.contentPack!=='finds048')return false;
 const {tri,quad,disc,box,material,metalTexture,base,seed,profile}=api;
 const face=paint=>material(metalTexture(item,condition,seed+17,(c,p)=>{
   c.save();c.globalAlpha=profile.relief;c.strokeStyle=p.dark;c.fillStyle=p.dark;c.lineWidth=1.8;paint(c,p);c.restore();
 }));
 const circle=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();};
 const rosette=(c,r=48)=>{for(let i=0;i<6;i++){const a=i/6*TAU;c.beginPath();c.ellipse(Math.cos(a)*r*.5,Math.sin(a)*r*.5,r*.48,r*.19,a,0,TAU);c.stroke();}circle(c,0,0,7);};
 const uv=p=>[256+p[0]*235,256-p[1]*235];
 // Ear clipping retains concave outlines (cross arms, key teeth, broken handle).
 function plate(outline,depth,front=base,back=base,offset=[0,0,0]) {
   let path=outline.slice();if(path.reduce((s,p,i)=>s+p[0]*path[(i+1)%path.length][1]-path[(i+1)%path.length][0]*p[1],0)<0)path.reverse();
   const at=(i,z)=>[path[i][0]+offset[0],path[i][1]+offset[1],z+offset[2]],ids=path.map((_,i)=>i);
   for(let guard=0;ids.length>2&&guard<path.length*path.length;guard++){
     let clipped=false;
     for(let j=0;j<ids.length;j++){
       const a=ids[(j+ids.length-1)%ids.length],b=ids[j],d=ids[(j+1)%ids.length];
       if(cross(path[a],path[b],path[d])<=1e-9)continue;
       if(ids.some(k=>k!==a&&k!==b&&k!==d&&cross(path[a],path[b],path[k])>=-1e-9&&cross(path[b],path[d],path[k])>=-1e-9&&cross(path[d],path[a],path[k])>=-1e-9))continue;
       const f=[a,b,d].map(i=>at(i,depth/2)),r=[d,b,a].map(i=>at(i,-depth/2));tri(...f,front,f.map(uv));tri(...r,back,r.map(uv));ids.splice(j,1);clipped=true;break;
     }
     if(!clipped)throw Error('Invalid find outline: '+item.shape);
   }
   for(let i=0;i<path.length;i++){const j=(i+1)%path.length;quad(at(i,depth/2),at(i,-depth/2),at(j,-depth/2),at(j,depth/2));}
 }
 function frame(outer,inner,depth,mat=base){
   for(let i=0;i<outer.length;i++){
     const j=(i+1)%outer.length,o=z=>[...outer[i],z],p=z=>[...outer[j],z],a=z=>[...inner[i],z],b=z=>[...inner[j],z],h=depth/2;
     quad(o(h),p(h),b(h),a(h),mat,[o(h),p(h),b(h),a(h)].map(uv));quad(o(-h),a(-h),b(-h),p(-h));
     quad(o(h),o(-h),p(-h),p(h));quad(a(h),b(h),b(-h),a(-h));
   }
 }
 // Small fittings do not need the full legacy jewelry mesh resolution.
 function torus(radius,tube,sx=1,sy=1,offset=[0,0,0],tilt=0,mat=base){
   const n=radius<.3?16:32,m=6,c=Math.cos(tilt),s=Math.sin(tilt),point=(i,j)=>{const a=i/n*TAU,b=j/m*TAU,x=(radius+tube*Math.cos(b))*Math.cos(a)*sx,y=(radius+tube*Math.cos(b))*Math.sin(a)*sy,z=tube*Math.sin(b);return [x+offset[0],y*c-z*s+offset[1],y*s+z*c+offset[2]];};
   for(let i=0;i<n;i++)for(let j=0;j<m;j++)quad(point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1),mat);
 }
 function lathe(section,mat=base,segments=32,offset=[0,0,0],inside=null){
   const distances=[0];for(let j=0;j<section.length;j++){const a=section[j],b=section[(j+1)%section.length];distances.push(distances.at(-1)+Math.hypot(a[0]-b[0],a[1]-b[1]));}
   const v=j=>distances[j]/distances.at(-1)*512;

   const point=(i,j)=>{const [r,y]=section[j%section.length],a=i/segments*TAU;return [r*Math.cos(a)+offset[0],y+offset[1],r*Math.sin(a)+offset[2]];};
   for(let i=0;i<segments;i++)for(let j=0;j<section.length;j++)quad(point(i,j),point(i,j+1),point(i+1,j+1),point(i+1,j),inside&&j>=inside.from?inside.mat:mat,[[i/segments*512,v(j)],[i/segments*512,v(j+1)],[(i+1)/segments*512,v(j+1)],[(i+1)/segments*512,v(j)]]);
 }
 function rod(a,b,r,mat=base,n=12){
   const delta=b.map((v,i)=>v-a[i]),length=Math.hypot(...delta),w=delta.map(v=>v/length),ref=Math.abs(w[1])<.9?[0,1,0]:[1,0,0];
   const u=[w[1]*ref[2]-w[2]*ref[1],w[2]*ref[0]-w[0]*ref[2],w[0]*ref[1]-w[1]*ref[0]],ul=Math.hypot(...u);for(let i=0;i<3;i++)u[i]/=ul;
   const v=[w[1]*u[2]-w[2]*u[1],w[2]*u[0]-w[0]*u[2],w[0]*u[1]-w[1]*u[0]],p=(at,i)=>at.map((q,k)=>q+r*(u[k]*Math.cos(i/n*TAU)+v[k]*Math.sin(i/n*TAU)));
   for(let i=0;i<n;i++){quad(p(a,i),p(a,i+1),p(b,i+1),p(b,i),mat);tri(a,p(a,i+1),p(a,i),mat);tri(b,p(b,i),p(b,i+1),mat);}
 }
 const shape=item.shape;
 if(shape==='shank-button'||shape==='domed-button'){
   const front=face(c=>{circle(c,0,0,105);circle(c,0,0,99);if(shape==='domed-button')for(let i=0;i<16;i++){const a=i/16*TAU;c.beginPath();c.moveTo(Math.cos(a)*94,Math.sin(a)*94);c.lineTo(Math.cos(a)*102,Math.sin(a)*102);c.stroke();}});
   const back=face(c=>{circle(c,0,0,96);circle(c,0,0,35);});
   if(shape==='shank-button')disc(.78,.08,front,back,base,[0,0,0],0,0,48);
   else {
     const n=40,rings=5,p=(i,j)=>{const r=j/rings*.78,a=i/n*TAU;return [r*Math.cos(a),r*Math.sin(a),.04+.28*(1-(r/.78)**2)];},map=p=>[256+p[0]/.78*250,256-p[1]/.78*250];
     for(let j=0;j<rings;j++)for(let i=0;i<n;i++){const points=[p(i,j),p(i,j+1),p(i+1,j+1),p(i+1,j)];quad(...points,front,points.map(map));}
     disc(.78,.07,base,back,base,[0,0,0],0,0,48);
   }
   torus(.19,.049,1,1,[0,0,-.23],Math.PI/2);rod([-.12,0,-.06],[.12,0,-.06],.055);
 }else if(shape==='rect-buckle'||shape==='double-buckle'){
   if(shape==='rect-buckle'){
     const rounded=(x,y,r)=>{const out=[];for(const [cx,cy,start] of [[x-r,y-r,0],[-x+r,y-r,Math.PI/2],[-x+r,-y+r,Math.PI],[x-r,-y+r,Math.PI*1.5]])for(let i=0;i<6;i++){const a=start+i/5*Math.PI/2;out.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}return out;};
     frame(rounded(.88,.63,.18),rounded(.70,.45,.11),.13);
     rod([-.78,-.18,.03],[-.78,.18,.03],.075);rod([-.78,0,.075],[.8,0,.13],.047);
   }else{
     frame(ellipse(.94,.62),ellipse(.76,.43),.14);rod([0,-.53,0],[0,.53,0],.08);rod([0,0,.09],[.89,0,.15],.05);torus(.11,.035,1,1,[0,0,.05],Math.PI/2);
   }
 }else if(shape==='cloth-seal'){
   const front=face(c=>{circle(c,0,0,95);c.lineWidth=3;circle(c,0,0,87);rosette(c,58);});
   const back=face(c=>{c.globalAlpha*=.45;for(let x=-90;x<=90;x+=15){c.beginPath();c.moveTo(x,-94);c.lineTo(x,94);c.stroke();c.beginPath();c.moveTo(-94,x);c.lineTo(94,x);c.stroke();}});
   disc(.74,.13,front,base,base,[0,0,.09],0,.011,48);disc(.69,.12,base,back,base,[.04,-.02,-.09],0,.016,48);box(-.68,.01,0,.28,.24,.19);
 }else if(shape==='barrel-key'){
   lathe([[.12,-.94],[.12,.42],[.072,.42],[.072,-.94]],base,24);
   torus(.30,.067,1,1,[0,.69,0]);lathe([[.17,.25],[.17,.36],[.12,.36],[.12,.25]],base,24);
   plate([[.08,-.82],[.43,-.82],[.43,-.67],[.31,-.67],[.31,-.58],[.46,-.58],[.46,-.41],[.08,-.41]],.13);
 }else if(shape==='thimble'){
   const inside=material(metalTexture(item,condition,seed+23,(c,p)=>{c.fillStyle=p.dark;c.fillRect(-128,-128,256,256);}));
   const dimples=face((c,p)=>{for(let y=-114;y<0;y+=10)for(let x=-123;x<125;x+=10){c.fillStyle=p.dark;c.beginPath();c.arc(x+(Math.round(y/10)%2)*5,y,2.5,0,TAU);c.fill();c.strokeStyle=p.light;c.beginPath();c.arc(x+(Math.round(y/10)%2)*5,y+1,3,.1,2.8);c.stroke();}});
   // Outer wall, rounded closed crown, inner wall and open mouth.
   lathe([[.52,-.79],[.55,-.73],[.49,.37],[.40,.64],[.24,.78],[0,.83],[0,.75],[.20,.70],[.33,.57],[.42,.33],[.47,-.74],[.47,-.79]],dimples,32,[0,0,0],{from:5,mat:inside});
   torus(.523,.022,1,1,[0,-.71,0],Math.PI/2);
 }else if(shape==='crotal-bell'){
   const n=24,m=14,outer=.72,inner=.66;
   const dark=material(metalTexture(item,condition,seed+23,(c,p)=>{c.fillStyle=p.dark;c.fillRect(-128,-128,256,256);}));
   const exists=(i,j)=>{i=(i+n)%n;if(j<0||j>=m)return false;const a=(i+.5)/n*TAU,t=(j+.5)/m*Math.PI,y=Math.cos(t),z=Math.sin(t)*Math.sin(a);return !(y<-.5&&Math.abs(z)<.16)&&!(Math.abs(y)<.18&&Math.abs(Math.cos(a))<.17);};
   const p=(i,j,r)=>{const a=i/n*TAU,t=j/m*Math.PI;return [r*Math.sin(t)*Math.cos(a),r*Math.cos(t),r*Math.sin(t)*Math.sin(a)];};
   for(let i=0;i<n;i++)for(let j=0;j<m;j++)if(exists(i,j)){
     const corners=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],o=corners.map(([a,b])=>p(a,b,outer)),k=corners.map(([a,b])=>p(a,b,inner));
     quad(...o);quad(...k.slice().reverse(),dark);
     for(const [edge,ni,nj] of [[0,i,j-1],[1,i+1,j],[2,i,j+1],[3,i-1,j]])if(!exists(ni,nj)){const next=(edge+1)%4;quad(o[edge],k[edge],k[next],o[next]);}
   }
   torus(.719,.024,1,1,[0,0,0],Math.PI/2);torus(.16,.05,1,1,[0,.83,0]);
   // A captive metal pellet is visible through the sound openings.
   lathe([[0,-.56],[.12,-.53],[.16,-.43],[.12,-.33],[0,-.30]],base,16,[.14,0,0]);
 }else if(shape==='strap-end'){
   const front=face(c=>{c.beginPath();c.moveTo(-25,-72);c.lineTo(-31,35);c.lineTo(0,91);c.lineTo(31,35);c.lineTo(25,-72);c.stroke();for(let y=-46;y<46;y+=24){c.beginPath();c.moveTo(-20,y);c.lineTo(0,y+17);c.lineTo(20,y);c.stroke();}});
   plate([[-.32,.83],[-.39,-.20],[-.22,-.65],[0,-.88],[.22,-.65],[.39,-.20],[.32,.83]],.10,front);
   plate([[-.32,.83],[-.34,.45],[.34,.45],[.32,.83]],.055,base,base,[0,0,-.12]);
   for(const x of [-.18,.18])disc(.06,.22,base,base,base,[x,.64,-.03],0,0,16);
 }else if(shape==='spoon-fragment'){
   const n=32,rings=5,p=(i,j,back)=>{const r=j/rings,a=i/n*TAU;return [.48*r*Math.cos(a),-.25+.64*r*Math.sin(a),.28*r*r-(back?.055:0)];};
   for(let i=0;i<n;i++)for(let j=0;j<rings;j++){
     quad(p(i,j,false),p(i,j+1,false),p(i+1,j+1,false),p(i+1,j,false));quad(p(i+1,j,true),p(i+1,j+1,true),p(i,j+1,true),p(i,j,true));
     if(j===rings-1)quad(p(i,j+1,false),p(i,j+1,true),p(i+1,j+1,true),p(i+1,j+1,false));
   }
   plate([[-.10,.34],[-.085,.98],[-.025,.92],[.02,1.03],[.09,.94],[.10,.34]],.075,base,base,[0,0,.23]);
 }else if(shape==='cross-pendant'){
   const front=face(c=>{for(const [x,y,r] of [[0,0,18],[0,-67,10],[0,70,10],[-53,0,10],[53,0,10]]){circle(c,x,y,r);c.beginPath();c.arc(x,y,2,0,TAU);c.fill();}});
   plate([[-.19,.81],[.19,.81],[.19,.23],[.65,.23],[.65,-.19],[.19,-.19],[.19,-.85],[-.19,-.85],[-.19,-.19],[-.65,-.19],[-.65,.23],[-.19,.23]],.105,front);
   torus(.12,.041,1,1,[0,.91,0]);
 }else if(shape==='oval-pendant'){
   const front=face(c=>{c.beginPath();c.ellipse(0,0,54,83,0,0,TAU);c.stroke();rosette(c,46);});
   plate(ellipse(.57,.81),.085,front);torus(.13,.045,1,1,[0,.92,0]);
 }else if(shape==='annular-brooch'){
   const front=face(c=>{for(let i=0;i<40;i++){const a=i/40*TAU;c.beginPath();c.moveTo(Math.cos(a)*79,Math.sin(a)*79);c.lineTo(Math.cos(a+.05)*87,Math.sin(a+.05)*87);c.stroke();}});
   frame(ellipse(.81,.81),ellipse(.64,.64),.11,front);rod([-.75,.12,.1],[.81,-.08,.12],.037);torus(.105,.025,1,1,[-.73,.12,.045],Math.PI/2);
   for(let i=0;i<4;i++){const a=i/4*TAU+.55;disc(.085,.14,base,base,base,[Math.cos(a)*.72,Math.sin(a)*.72,.065],0,0,16);}
 }else if(shape==='bezel-ring'){
   torus(.66,.092,1,1,[0,0,0],.92);
   const front=face(c=>{c.beginPath();c.ellipse(0,-61,32,23,0,0,TAU);c.stroke();c.beginPath();c.moveTo(-18,-60);c.lineTo(0,-76);c.lineTo(18,-60);c.lineTo(0,-47);c.closePath();c.stroke();});
   rod([-.27,.36,.48],[-.18,.51,.55],.13);rod([.27,.36,.48],[.18,.51,.55],.13);
   plate(ellipse(.34,.25,40,0,.51),.18,front,base,[0,0,.58]);
 }else return false;
 return true;
}
