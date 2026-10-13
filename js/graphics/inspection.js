import { renderMesh } from './inspection-gl.js?v=0.32.0';
import { paintUkrainianCoin, isUkrainianCoin, coinEdgeType } from './ukrainian-coins.js?v=0.32.0';
import { conditionProfile, metalPalette, paintWear } from './condition.js?v=0.32.0';

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
  const triangles=[], textures=[], profile=conditionProfile(condition);
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
  function disc(radius,depth,front=base,back=base,edge=base,offset=[0,0,0],rotation=0,ripple=0) {
    const segments=96, transform=p=>rotatePoint(p,0,rotation).map((v,i)=>v+offset[i]);
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
    const point=(i,j)=>{const a=i/segments*TAU,b=j/rings*TAU;return rotatePoint([(radius+tube*Math.cos(b))*Math.cos(a)*sx,(radius+tube*Math.cos(b))*Math.sin(a)*sy,tube*Math.sin(b)],tilt,0).map((v,k)=>v+offset[k]);};
    for(let i=0;i<segments;i++)for(let j=0;j<rings;j++)quad(point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1),mat);
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
  if(isUkrainianCoin(item)) {
    const front=material(texture(c=>paintUkrainianCoin(c,item,condition,0)));
    const back=material(texture(c=>paintUkrainianCoin(c,item,condition,1)));
    const edge=material(metalTexture(item,condition,seed+331,(c,p)=>{
      const kind=coinEdgeType(item);c.lineWidth=1;
      for(let x=-128;x<128;x+=2)if(kind==='reeded'||kind==='sector'&&Math.floor((x+128)/24)%2===0){c.strokeStyle=p.dark;c.beginPath();c.moveTo(x,-128);c.lineTo(x,128);c.stroke();}
      if(kind==='lettered') {c.fillStyle=p.dark;c.font='bold 40px Georgia';c.textAlign='center';c.fillText('ОДНА · ГРИВНЯ',0,14,244);}
    }));
    disc(1,.13,front,back,edge);
  } else if(['ring','gemring','bracelet','earring','washer','tab'].includes(shape)) {
    torus(shape==='tab'?.55:.76,shape==='washer'?.17:.1,shape==='earring'?.73:1,shape==='ring'||shape==='gemring'?1.1:1);
    if(shape==='gemring'||item.name==='Срібний перстень')gem();
    if(shape==='tab')box(0,0,0,.88,.14,.13);
  } else if(shape==='chain'||shape==='wire') {
    if(shape==='chain')for(let i=0;i<7;i++)torus(.18,.045,1.3,.75,[-.96+i*.32,Math.sin(i*.75)*.18,0],i%2?1.05:0);
    else {
      // A bent wire with a round cross section.
      const point=(i,j)=>{const x=-1+i/32*2,a=j/8*TAU;return [x,.24*Math.sin(x*4)+.04*Math.cos(a),.1*Math.sin(x*3)+.04*Math.sin(a)];};
      for(let i=0;i<32;i++)for(let j=0;j<8;j++)quad(point(i,j+1),point(i+1,j+1),point(i+1,j),point(i,j));
    }
  } else if(shape==='nail'||shape==='bolt') {
    box(0,-.05,0,.15,1.65,.15);box(0,.8,0,.55,.12,.36);
    if(shape==='bolt')for(let i=0;i<9;i++)box(0,-.75+i*.13,0,.21,.035,.21);
  } else if(shape==='key') {
    torus(.3,.09,1,1,[0,.65,0]);box(0,-.2,0,.13,1.2,.14);box(.19,-.62,0,.4,.15,.14);box(.16,-.37,0,.33,.13,.14);
  } else if(shape==='can') {
    disc(.53,1.45,base,base,base,[0,0,0],Math.PI/2);
  } else if(shape==='foil'||shape==='sheet') {
    const point=(x,y,z)=>[x/4*1.7-.85,y/4*1.6-.8,(Math.sin(x*2+y)*.09+Math.cos(y*3)*.07)*(shape==='foil'?1:.35)+z];
    for(let x=0;x<4;x++)for(let y=0;y<4;y++){
      quad(point(x,y,.015),point(x+1,y,.015),point(x+1,y+1,.015),point(x,y+1,.015));
      quad(point(x,y+1,-.015),point(x+1,y+1,-.015),point(x+1,y,-.015),point(x,y,-.015));
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
        for(const x of [-21,21])for(const y of [-21,21]){c.beginPath();c.arc(x,y,11,0,TAU);c.fill();}
      }else if(shape==='coin') {
        c.font='bold 70px Georgia';c.fillText(item.value||'?',0,5);c.font='21px Georgia';c.fillText(item.unit||'МОНЕТА',0,43);
      }else if(shape==='pendant') {c.font='85px Georgia';c.fillText('✦',0,30);}
    }));
    disc(shape==='pendant'?.72:.86,shape==='watch'?.2:.12,face,base,base,[0,0,0],0,shape==='cap'?.055:0);
    if(shape==='watch'||shape==='pendant')torus(.12,.04,1,1,[0,shape==='watch'?1.02:.9,0]);
  }
  return {triangles,textures,profile};
}

// Perspective projection of actual mesh triangles, including the back and rim.
// Canvas keeps the game dependency-free and works without WebGL on older phones.
export function projectModel(model,yaw,pitch,width=600,height=500) {
  const scale=Math.min(width*.36,height*.39), camera=5;
  return model.triangles.map(t=>{
    const points=t.points.map(p=>rotatePoint(p,yaw,pitch)),normal=rotatePoint(t.normal,yaw,pitch);
    const center=[0,1,2].map(i=>points.reduce((sum,p)=>sum+p[i],0)/3);
    if(dot(normal,[-center[0],-center[1],camera-center[2]])<=0)return null;
    return {...t,normal,depth:center[2],projected:points.map(([x,y,z])=>[width/2+x*scale*camera/(camera-z),height*.48-y*scale*camera/(camera-z)])};
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
export function drawInspection(c,model,yaw=0,pitch=0,studio=true,width=600,height=500) {
  c.clearRect(0,0,width,height);
  const bg=c.createRadialGradient(width*.45,height*.4,10,width/2,height*.48,width*.65);
  bg.addColorStop(0,studio?'#344831':'#796449');bg.addColorStop(1,studio?'#101e15':'#201b15');c.fillStyle=bg;c.fillRect(0,0,width,height);
  const shadow=c.createRadialGradient(width/2,height*.9,0,width/2,height*.9,width*.29);
  shadow.addColorStop(0,'#0008');shadow.addColorStop(1,'#0000');c.save();c.translate(0,height*.76);c.scale(1,.16);c.fillStyle=shadow;c.fillRect(0,0,width,height*2);c.restore();
  const gpu=renderMesh(model,yaw,pitch,width,height);
  if(gpu){c.drawImage(gpu,0,0);return;}
  // Canvas fallback keeps rotation usable if GPU contexts are unavailable.

  for(const t of projectModel(model,yaw,pitch,width,height)) {
    const [a,b,d]=t.projected, [u,v,w]=t.uv;
    const determinant=(v[0]-u[0])*(w[1]-u[1])-(w[0]-u[0])*(v[1]-u[1]);
    if(Math.abs(determinant)<.001)continue;
    const ax=((b[0]-a[0])*(w[1]-u[1])-(d[0]-a[0])*(v[1]-u[1]))/determinant;
    const ay=((b[1]-a[1])*(w[1]-u[1])-(d[1]-a[1])*(v[1]-u[1]))/determinant;
    const bx=((d[0]-a[0])*(v[0]-u[0])-(b[0]-a[0])*(w[0]-u[0]))/determinant;
    const by=((d[1]-a[1])*(v[0]-u[0])-(b[1]-a[1])*(w[0]-u[0]))/determinant;
    c.save();path(c,t.projected,.6,Math.abs(t.normal[2])>.999?100:2);c.clip();
    c.transform(ax,ay,bx,by,a[0]-ax*u[0]-bx*u[1],a[1]-ay*u[0]-by*u[1]);
    c.drawImage(model.textures[t.mat],0,0);c.restore();

  }
}
