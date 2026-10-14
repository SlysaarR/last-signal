import { renderSoftwareMesh } from './inspection-software.js?v=0.51.0';
import { buildFindShape } from './find-shapes.js?v=0.51.0';
import { renderMesh } from './inspection-gl.js?v=0.51.0';
import { paintUkrainianCoin, isUkrainianCoin, coinEdgeType } from './ukrainian-coins.js?v=0.51.0';
import { conditionProfile, metalPalette, paintWear, artRandom } from './condition.js?v=0.51.0';
import { coinDesign, coinEdgeSpec } from '../../data/coin-art.js?v=0.51.0';
import { coinReliefImage } from './coin-reference.js?v=0.51.0';
import { makeReliefMap, relightFace, lightTerms } from './inspection-light.js?v=0.51.0';

const TAU=Math.PI*2;
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
export function rotatePoint([x,y,z], yaw, pitch) {
  const xx=x*Math.cos(yaw)+z*Math.sin(yaw), zz=z*Math.cos(yaw)-x*Math.sin(yaw);
  return [xx,y*Math.cos(pitch)-zz*Math.sin(pitch),y*Math.sin(pitch)+zz*Math.cos(pitch)];
}
function texture(paint) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d');c.translate(256,256);c.scale(2,2);paint(c);return canvas;
}
function metalTexture(item,condition,seed,face) {
  return texture(c=>{
    const p=metalPalette(item,condition), g=c.createLinearGradient(-128,-128,128,128);
    g.addColorStop(0,p.light);g.addColorStop(.3,p.mid);g.addColorStop(.6,p.light);g.addColorStop(1,p.dark);
    c.fillStyle=g;c.fillRect(-128,-128,256,256);
    if(face)face(c,p);
    paintWear(c,item,condition,seed);
  });
}
export function createInspectionModel(item, condition) {
  const triangles=[], textures=[], reliefMaps=[], profile=conditionProfile(condition);
  const material=tex=>{textures.push(tex);return textures.length-1;};
  const seed=(item.year||17)*31+(item.value||7)*19+(item.shape||'').length*97;
  const base=material(metalTexture(item,condition,seed));
  function tri(a,b,c,mat=base,uv) {
    const normal=unit(cross(sub(b,a),sub(c,a)));
    const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
    const axes=axis===2?[0,1]:axis===1?[0,2]:[2,1];
    triangles.push({points:[a,b,c],normal,mat,uv:uv||[a,b,c].map(p=>[256+p[axes[0]]*120,256-p[axes[1]]*120])});
  }
  function quad(a,b,c,d,mat=base,uv) {
    tri(a,b,c,mat,uv&&[uv[0],uv[1],uv[2]]);tri(a,c,d,mat,uv&&[uv[0],uv[2],uv[3]]);
  }
  function disc(radius,depth,front=base,back=base,edge=base,offset=[0,0,0],rotation=0,ripple=0,segments=96) {
    const transform=p=>rotatePoint(p,0,rotation).map((v,i)=>v+offset[i]);
    for(let i=0;i<segments;i++) {
      const a=i/segments*TAU,b=(i+1)/segments*TAU;
      const r1=radius*(1+ripple*Math.cos(a*16)),r2=radius*(1+ripple*Math.cos(b*16));
      const p=[r1*Math.cos(a),r1*Math.sin(a)],q=[r2*Math.cos(b),r2*Math.sin(b)];
      const f=p=>transform([...p,depth/2]), k=p=>transform([...p,-depth/2]);
      const uv=p=>[256+p[0]/radius*250,256-p[1]/radius*250];
      tri(f([0,0]),f(p),f(q),front,[[256,256],uv(p),uv(q)]);
      const buv=p=>[256-p[0]/radius*250,256-p[1]/radius*250];
      tri(k([0,0]),k(q),k(p),back,[[256,256],buv(q),buv(p)]);
      quad(f(p),k(p),k(q),f(q),edge,[[i/segments*512,0],[i/segments*512,512],[(i+1)/segments*512,512],[(i+1)/segments*512,0]]);
    }
  }
  function torus(radius,tube,sx=1,sy=1,offset=[0,0,0],tilt=0,mat=base) {
    const segments=radius<.3?24:48,rings=8;
    const point=(i,j)=>{const a=i/segments*TAU,b=j/rings*TAU;return rotatePoint([(radius+tube*Math.cos(b))*Math.cos(a)*sx,(radius+tube*Math.cos(b))*Math.sin(a)*sy,tube*Math.sin(b)],0,tilt).map((v,k)=>v+offset[k]);};
    for(let i=0;i<segments;i++)for(let j=0;j<rings;j++)quad(point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1),mat);
  }
  // Flat metal bands with a small bevel; a washer is not a torus.
  function band(outer,inner,depth,{sx=1,sy=1,bend=()=>0,offset=[0,0,0],pose=[0,0],ripple=0}={}) {
    const bevel=Math.min(.014,depth/4),segments=72;
    const section=[[inner+bevel,depth/2],[outer-bevel,depth/2],[outer,depth/2-bevel],[outer,-depth/2+bevel],[outer-bevel,-depth/2],[inner+bevel,-depth/2],[inner,-depth/2+bevel],[inner,depth/2-bevel]];
    const point=(i,j)=>{const a=i/segments*TAU,[r,z]=section[j%section.length],radius=r+ripple*Math.cos(a*21),x=radius*Math.cos(a)*sx,y=radius*Math.sin(a)*sy;return rotatePoint([x,y,z+bend(x,y)],...pose).map((v,k)=>v+offset[k]);};
    for(let i=0;i<segments;i++)for(let j=0;j<section.length;j++)quad(point(i,j),point(i,j+1),point(i+1,j+1),point(i+1,j));
  }
  function box(x,y,z,w,h,d) {
    const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,b,c])=>[x+a*w/2,y+b*h/2,z+c*d/2]);
    for(const f of [[4,5,6,7],[1,0,3,2],[0,4,7,3],[5,1,2,6],[7,6,2,3],[0,1,5,4]])quad(...f.map(i=>p[i]));
  }
  function gem() {
    const mat=material(metalTexture({name:'Срібло',shape:'gem'},100,1));
    const ring=[[0,.98,.12],[.22,.77,.12],[0,.56,.12],[-.22,.77,.12]];
    for(let i=0;i<4;i++){tri([0,.77,.4],ring[(i+1)%4],ring[i],mat);tri([0,.77,-.08],ring[i],ring[(i+1)%4],mat);}
  }
  const shape=item.shape;
  if(buildFindShape(item,condition,{tri,quad,disc,torus,box,material,metalTexture,base,seed,profile})) {
    // The new object owns all of its front, back and interior geometry.
  } else if(isUkrainianCoin(item)) {
    const front=material(texture(c=>paintUkrainianCoin(c,item,condition,0)));
    const back=material(texture(c=>paintUkrainianCoin(c,item,condition,1)));
    reliefMaps[front]={map:makeReliefMap(coinReliefImage(item,condition,0),condition),side:1};
    reliefMaps[back]={map:makeReliefMap(coinReliefImage(item,condition,1),condition),side:-1};
    const edge=material(metalTexture(item,condition,seed+331,(c,p)=>{
      c.save();
      const spec=coinEdgeSpec(item),kind=spec.kind;c.lineWidth=.3+.45*profile.relief;c.globalAlpha=profile.relief;
      const groove=x=>{c.strokeStyle=p.dark;c.beginPath();c.moveTo(x,-128);c.lineTo(x,128);c.stroke();c.strokeStyle=p.light;c.beginPath();c.moveTo(x+.6,-128);c.lineTo(x+.6,128);c.stroke();};
      if(kind==='reeded')for(let n=0;n<(spec.count||128);n++)groove(-128+n*256/(spec.count||128));
      if(kind==='sector')for(let group=0;group<spec.groups;group++)for(let tooth=0;tooth<spec.teeth;tooth++)groove(-128+(group+tooth/spec.teeth*.5)*256/spec.groups);
      if(kind==='lettered') {c.fillStyle=p.dark;c.font='bold 58px Georgia';c.textAlign='center';c.fillText(spec.text,0,20,245);}
      c.restore();
    }));
    const dimensions=coinDesign(item);
    const depth=dimensions?2*dimensions.thickness/dimensions.diameter:.13;
    // The two faces and edge share one worn outline, including every small nick.
    // Wear rounds the bevel instead of leaving a razor-sharp cylindrical rim.
    const random=artRandom(seed),nicks=Array.from({length:9},()=>[random()*TAU,.045+random()*.07,.004+random()*.012]);
    const bevel=.012+profile.wear*.015,segments=128;
    const point=(i,face,outer)=>{
      const angle=i/segments*TAU;
      const loss=nicks.reduce((s,[at,width,amount])=>{const distance=Math.atan2(Math.sin(angle-at),Math.cos(angle-at));return s+amount*Math.exp(-distance*distance/(width*width));},0)*profile.wear;
      const radius=1-loss-(outer?0:bevel);
      return [radius*Math.cos(angle),radius*Math.sin(angle),face*(depth/2-(outer?bevel:0))];
    };
    const uv=(p,side)=>[256+p[0]*250*side,256-p[1]*250];
    for(let i=0;i<segments;i++) {
      const a=point(i,1,false),b=point(i+1,1,false),c=point(i,-1,false),d=point(i+1,-1,false);
      const ao=point(i,1,true),bo=point(i+1,1,true),co=point(i,-1,true),do_=point(i+1,-1,true);
      tri([0,0,depth/2],a,b,front,[[256,256],uv(a,1),uv(b,1)]);
      tri([0,0,-depth/2],d,c,back,[[256,256],uv(d,-1),uv(c,-1)]);
      const x=i/segments*512,next=(i+1)/segments*512;
      quad(a,ao,bo,b,edge,[[x,0],[x,100],[next,100],[next,0]]);
      quad(ao,co,do_,bo,edge,[[x,100],[x,412],[next,412],[next,100]]);
      quad(co,c,d,do_,edge,[[x,412],[x,512],[next,512],[next,412]]);
    }
  } else if(shape==='washer') {
    band(.93,.43,.065,{bend:(x,y)=>.19*x*x+.3*Math.max(0,x-.12)+.025*Math.sin(y*4),pose:[-.18,.3]});
  } else if(shape==='tab') {
    band(.62,.4,.055,{sx:.77,sy:1.12});
    box(0,-.2,0,.85,.16,.055);disc(.085,.07,base,base,base,[0,-.25,.025]);
  } else if(shape==='cap') {
    disc(.79,.035,base,base,base,[0,0,.105]);
    band(.87,.78,.24,{ripple:.025});
  } else if(['ring','gemring','bracelet','earring'].includes(shape)) {
    if(shape==='earring') {
      torus(.73,.048,.72,1);box(0,.73,0,.08,.17,.09);
      disc(.075,.065,base,base,base,[0,.76,.04]);
    } else if(shape==='bracelet') {
      band(.88,.81,.17,{sx:1.12,sy:.8,pose:[.1,.18]});
      box(.96,0,.02,.1,.23,.2);
    } else {
      band(.8,.68,shape==='gemring'?.16:.25,{sy:1.03});
      if(shape==='gemring')gem();
      else if(item.name==='Срібний перстень') {
        const seal=material(metalTexture(item,condition,seed+17,(c,p)=>{c.strokeStyle=p.dark;c.lineWidth=4;c.beginPath();c.moveTo(-45,30);c.lineTo(0,-35);c.lineTo(45,30);c.stroke();}));
        disc(.23,.12,seal,base,base,[0,.73,.15]);
      }
    }
  } else if(shape==='chain'||shape==='wire') {
    if(shape==='chain')for(let i=0;i<7;i++)torus(.18,.045,1.3,.75,[-.96+i*.32,Math.sin(i*.75)*.18,0],i%2?1.05:0);
    else {
      // A bent wire with a round cross section.
      const point=(i,j)=>{const x=-1+i/32*2,a=j/8*TAU;return [x,.24*Math.sin(x*4)+.04*Math.cos(a),.1*Math.sin(x*3)+.04*Math.sin(a)];};
      for(let i=0;i<32;i++)for(let j=0;j<8;j++)quad(point(i,j+1),point(i+1,j+1),point(i+1,j),point(i,j));
    }
  } else if(shape==='nail'||shape==='bolt') {
    if(shape==='nail') {
      disc(.055,1.5,base,base,base,[0,.02,0],Math.PI/2);
      disc(.26,.065,base,base,base,[0,.78,0],Math.PI/2);
      for(let i=0;i<12;i++){const a=i/12*TAU,b=(i+1)/12*TAU;tri([.055*Math.cos(a),-.73,.055*Math.sin(a)],[.055*Math.cos(b),-.73,.055*Math.sin(b)],[0,-1,0]);}
    }else{
      disc(.115,1.45,base,base,base,[0,-.03,0],Math.PI/2);
      disc(.34,.24,base,base,base,[0,.77,0],Math.PI/2,0,6);
      const point=(i,j)=>{const a=i/16*TAU,b=j/4*TAU,r=.12+.018*Math.cos(b);return [r*Math.cos(a),-.75+i/160*1.37+.018*Math.sin(b),r*Math.sin(a)];};
      for(let i=0;i<160;i++)for(let j=0;j<4;j++)quad(point(i,j+1),point(i+1,j+1),point(i+1,j),point(i,j));
    }
  } else if(shape==='key') {
    band(.32,.21,.11,{offset:[0,.65,0]});box(0,-.2,0,.13,1.2,.14);box(.19,-.62,0,.4,.15,.14);box(.16,-.37,0,.33,.13,.14);
  } else if(shape==='can') {
    const lid=material(metalTexture(item,condition,seed+9,(c,p)=>{c.strokeStyle=p.dark;c.lineWidth=3;for(const r of [92,110]){c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();}c.lineWidth=9;c.beginPath();c.ellipse(0,0,22,38,0,0,TAU);c.stroke();}));
    disc(.53,1.45,base,lid,base,[0,0,0],Math.PI/2);
    for(const y of [-.73,.73])band(.55,.51,.035,{offset:[0,y,0],pose:[0,Math.PI/2]});
  } else if(shape==='foil'||shape==='sheet') {
    const size=6,foil=shape==='foil';
    const point=(x,y,z)=>[(x/size*1.7-.85)*(1+.06*Math.sin(y*3)),(y/size*1.6-.8)*(1+.06*Math.cos(x*4)),(Math.sin(x*2+y)*.2+Math.cos(y*3-x)*.16)*(foil?1:.2)+z];
    for(let x=0;x<size;x++)for(let y=0;y<size;y++){
      quad(point(x,y,.012),point(x+1,y,.012),point(x+1,y+1,.012),point(x,y+1,.012));
      quad(point(x,y+1,-.012),point(x+1,y+1,-.012),point(x+1,y,-.012),point(x,y,-.012));
    }
  } else {
    const face=material(metalTexture(item,condition,seed,(c,p)=>{
      c.strokeStyle=p.dark;c.lineWidth=2;c.beginPath();c.arc(0,0,105,0,TAU);c.stroke();
      c.textAlign='center';c.fillStyle=p.dark;
      if(shape==='watch') {
        c.fillStyle='#ddd4ba';c.beginPath();c.arc(0,0,103,0,TAU);c.fill();c.fillStyle=p.dark;
        for(let i=0;i<12;i++){const a=i/12*TAU;c.beginPath();c.moveTo(Math.sin(a)*84,Math.cos(a)*84);c.lineTo(Math.sin(a)*96,Math.cos(a)*96);c.stroke();}
        c.lineWidth=5;c.beginPath();c.moveTo(-40,-34);c.lineTo(0,0);c.lineTo(42,-56);c.stroke();
      }else if(shape==='button') {
        for(let i=0;i<12;i++){const a=i/12*TAU;c.beginPath();c.ellipse(Math.cos(a)*79,Math.sin(a)*79,7,15,a,0,TAU);c.stroke();}for(const x of [-21,21])for(const y of [-21,21]){c.beginPath();c.arc(x,y,11,0,TAU);c.fill();}
      }else if(shape==='coin') {
        c.font='bold 70px Georgia';c.fillText(item.value||(/п’ятак/.test(item.name)?5:/10/.test(item.name)?10:/півтинник/.test(item.name)?50:'✦'),0,5);c.font='21px Georgia';c.fillText(item.unit||(/п’ятак|10|півтинник/.test(item.name)?'КОПІЙОК':'МОНЕТА'),0,43);
      }else if(shape==='pendant') {c.font='85px Georgia';c.fillText('✦',0,30);}
    }));
    disc(shape==='pendant'?.72:.86,shape==='watch'?.2:.12,face,base,base,[0,0,0],0,shape==='cap'?.055:0);
    if(shape==='watch'||shape==='pendant')torus(.12,.04,1,1,[0,shape==='watch'?1.02:.9,0]);
  }
  return {triangles,textures,reliefMaps,profile};
}

// Perspective projection of actual mesh triangles, including the back and rim.
// Canvas keeps the game dependency-free and works without WebGL on older phones.
export function projectModel(model,yaw,pitch,width=600,height=500,zoom=1,pan=[0,0]) {
  const scale=Math.min(width*.36,height*.39)*zoom, camera=5;
  return model.triangles.map(t=>{
    const points=t.points.map(p=>rotatePoint(p,yaw,pitch)),normal=rotatePoint(t.normal,yaw,pitch);
    const center=[0,1,2].map(i=>points.reduce((sum,p)=>sum+p[i],0)/3);
    if(dot(normal,[-center[0],-center[1],camera-center[2]])<=0)return null;
    return {...t,normal,depth:center[2],projected:points.map(([x,y,z])=>[width*(.5+pan[0])+x*scale*camera/(camera-z),height*(.48+pan[1])-y*scale*camera/(camera-z)])};
  }).filter(Boolean).sort((a,b)=>a.depth-b.depth);
}
function path(c,points,expand=0,maxMiter=100) {
  const area=(points[1][0]-points[0][0])*(points[2][1]-points[0][1])-(points[1][1]-points[0][1])*(points[2][0]-points[0][0]);
  const sign=Math.sign(area);
  const normals=points.map((p,i)=>{const q=points[(i+1)%3],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy)||1;return [sign*dy/length,-sign*dx/length];});
  c.beginPath();points.forEach(([x,y],i)=>{
    const prev=normals[(i+2)%3],next=normals[i],denom=1+prev[0]*next[0]+prev[1]*next[1];
    if(denom>.00001){const dx=(prev[0]+next[0])*expand/denom,dy=(prev[1]+next[1])*expand/denom,limit=Math.min(1,maxMiter/(Math.hypot(dx,dy)||1));x+=dx*limit;y+=dy*limit;}
    i?c.lineTo(x,y):c.moveTo(x,y);
  });c.closePath();
}
function beginTextureTriangle(c,points,uv) {
  const [a,b,d]=points, [u,v,w]=uv;
  const determinant=(v[0]-u[0])*(w[1]-u[1])-(w[0]-u[0])*(v[1]-u[1]);
  if(Math.abs(determinant)<.001)return false;
  const ax=((b[0]-a[0])*(w[1]-u[1])-(d[0]-a[0])*(v[1]-u[1]))/determinant;
  const ay=((b[1]-a[1])*(w[1]-u[1])-(d[1]-a[1])*(v[1]-u[1]))/determinant;
  const bx=((d[0]-a[0])*(v[0]-u[0])-(b[0]-a[0])*(w[0]-u[0]))/determinant;
  const by=((d[1]-a[1])*(v[0]-u[0])-(b[1]-a[1])*(w[0]-u[0]))/determinant;
  c.save();path(c,points,.6,2);c.clip();
  c.transform(ax,ay,bx,by,a[0]-ax*u[0]-bx*u[1],a[1]-ay*u[0]-by*u[1]);
  return true;
}
function paintTexturePatch(c,texture,uv) {
  const x=Math.max(0,Math.min(...uv.map(p=>p[0]))-1),y=Math.max(0,Math.min(...uv.map(p=>p[1]))-1);
  const w=Math.min(512,Math.max(...uv.map(p=>p[0]))+1)-x,h=Math.min(512,Math.max(...uv.map(p=>p[1]))+1)-y;
  if(w>0&&h>0)c.drawImage(texture,x*texture.width/512,y*texture.height/512,w*texture.width/512,h*texture.height/512,x,y,w,h);
}
// A regular texture grid avoids the needle-shaped fan triangles that produced
// radial moire in Canvas at large zoom. One shared polygon clips every patch.
function drawCoinPlane(c,model,mat,texture,yaw,pitch,width,height,zoom,pan) {
  const faces=model.triangles.filter(t=>t.mat===mat),side=model.reliefMaps[mat].side;
  const z=faces[0].points[0][2],scale=Math.min(width*.36,height*.39)*zoom;
  const project=p=>{const [x,y,z]=rotatePoint(p,yaw,pitch);return [width*(.5+pan[0])+x*scale*5/(5-z),height*(.48+pan[1])-y*scale*5/(5-z)];};
  c.save();c.beginPath();
  faces.forEach((t,i)=>{const p=project(t.points[1]);i?c.lineTo(...p):c.moveTo(...p);});c.closePath();c.clip();
  const grid=10,step=512/grid;
  for(let y=0;y<grid;y++)for(let x=0;x<grid;x++) {
    const uv=[[x*step,y*step],[(x+1)*step,y*step],[(x+1)*step,(y+1)*step],[x*step,(y+1)*step]];
    const points=uv.map(([u,v])=>project([(u-256)/250*side,(256-v)/250,z]));
    for(const indices of [[0,1,2],[0,2,3]]) {
      if(beginTextureTriangle(c,indices.map(i=>points[i]),indices.map(i=>uv[i]))) {paintTexturePatch(c,texture,uv);c.restore();}
    }
  }
  c.restore();
}
const litFaces=new WeakMap();
export function drawInspection(c,model,yaw=0,pitch=0,studio=true,width=600,height=500,zoom=1,light=0,pan=[0,0]) {
  c.clearRect(0,0,width,height);
  const bg=c.createRadialGradient(width*.45,height*.4,10,width/2,height*.48,width*.65);
  bg.addColorStop(0,studio?'#344831':'#796449');bg.addColorStop(1,studio?'#101e15':'#201b15');c.fillStyle=bg;c.fillRect(0,0,width,height);
  const shadow=c.createRadialGradient(width/2,height*.9,0,width/2,height*.9,width*.29);
  shadow.addColorStop(0,'#0008');shadow.addColorStop(1,'#0000');c.save();c.translate(0,height*.76);c.scale(1,.16);c.fillStyle=shadow;c.fillRect(0,0,width,height*2);c.restore();
  const gpu=renderMesh(model,yaw,pitch,width,height,zoom,light,pan);
  if(gpu){c.drawImage(gpu,0,0);return;}
  const software=renderSoftwareMesh(model,yaw,pitch,width,height,zoom,light,pan);
  if(software){c.drawImage(software,0,0,width,height);return;}
  // Canvas fallback keeps rotation usable if GPU contexts are unavailable.

  const key=[yaw,pitch,light].join(':');
  let lit=litFaces.get(model);if(lit?.key!==key){lit={key,textures:[]};litFaces.set(model,lit);}
  const painted=new Set();
  for(const t of projectModel(model,yaw,pitch,width,height,zoom,pan)) {
    const relief=model.reliefMaps[t.mat];
    if(relief) {
      if(painted.has(t.mat))continue;painted.add(t.mat);
      if(!lit.textures[t.mat])lit.textures[t.mat]=relief.map?relightFace(model.textures[t.mat],relief.map,relief.side,yaw,pitch,model.profile.polish,light):model.textures[t.mat];
      drawCoinPlane(c,model,t.mat,lit.textures[t.mat],yaw,pitch,width,height,zoom,pan);continue;
    }
    if(!beginTextureTriangle(c,t.projected,t.uv))continue;
    const [diffuse,shine]=lightTerms(t.normal,model.profile.polish,light);
    paintTexturePatch(c,model.textures[t.mat],t.uv);
    c.fillStyle=`rgba(0,0,0,${1-diffuse})`;c.fillRect(0,0,512,512);
    c.fillStyle=`rgba(255,251,230,${shine})`;c.fillRect(0,0,512,512);
    c.restore();

  }
}
