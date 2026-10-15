// Bounded CPU rasterizer for textured metal meshes when WebGL is unavailable.
// Keeps every triangle. One pixel upload replaces hundreds of Canvas clips/draws.
import { lightTerms, relightFace } from './inspection-light.js?v=0.55.4';

export const MAX_SOFTWARE_PIXELS = 300000;
export function softwareSize(width,height) {
  const scale=Math.min(2,Math.sqrt(MAX_SOFTWARE_PIXELS/(width*height)));
  return [Math.max(1,Math.floor(width*scale)),Math.max(1,Math.floor(height*scale))];
}
export function createRasterTarget(width,height,data=new Uint8ClampedArray(width*height*4)) {
  return {width,height,data,depth:new Float32Array(width*height)};
}
// Texture pixels are supplied by the adapter below; this core has no DOM or state.
export function rasterizeMesh(model,textures,target,yaw=0,pitch=0,zoom=1,light=0,pan=[0,0]) {
  const {width,height,data,depth}=target;
  data.fill(0);depth.fill(0);
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const scale=Math.min(width*.36,height*.39)*zoom*5;
  const ox=width*(.5+pan[0]),oy=height*(.48+pan[1]);
  const resolved=[];
  const turn=([x,y,z])=>{const xx=x*cy+z*sy,zz=z*cy-x*sy;return [xx,y*cp-zz*sp,y*sp+zz*cp];};
  for(const triangle of model.triangles) {
    const a=turn(triangle.points[0]),b=turn(triangle.points[1]),c=turn(triangle.points[2]),normal=turn(triangle.normal);
    if(normal[0]*(-a[0]-b[0]-c[0])+normal[1]*(-a[1]-b[1]-c[1])+normal[2]*(15-a[2]-b[2]-c[2])<=0)continue;
    const qa=1/(5-a[2]),qb=1/(5-b[2]),qc=1/(5-c[2]);
    const ax=ox+a[0]*scale*qa,ay=oy-a[1]*scale*qa;
    const bx=ox+b[0]*scale*qb,by=oy-b[1]*scale*qb;
    const cx=ox+c[0]*scale*qc,cy_=oy-c[1]*scale*qc;
    const area=(bx-ax)*(cy_-ay)-(by-ay)*(cx-ax);
    if(!Number.isFinite(area)||Math.abs(area)<1e-8)continue;
    const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(width-1,Math.ceil(Math.max(ax,bx,cx)));
    const minY=Math.max(0,Math.floor(Math.min(ay,by,cy_))),maxY=Math.min(height-1,Math.ceil(Math.max(ay,by,cy_)));
    if(minX>maxX||minY>maxY)continue;
    const mat=triangle.mat,texture=resolved[mat]||(resolved[mat]=typeof textures[mat]==='function'?textures[mat]():textures[mat]);
    const pixels=texture.data,tw=texture.width,th=texture.height;
    const [diffuse,shine]=texture.lit?[1,0]:lightTerms(normal,model.profile.polish,light),specular=shine*255;
    const uv=triangle.uv;
    const ua=uv[0][0]*qa*tw/512,ub=uv[1][0]*qb*tw/512,uc=uv[2][0]*qc*tw/512;
    const va=uv[0][1]*qa*th/512,vb=uv[1][1]*qb*th/512,vc=uv[2][1]*qc*th/512;
    const da=(by-cy_)/area,db=(cy_-ay)/area,dc=-da-db;
    const dq=da*qa+db*qb+dc*qc,du=da*ua+db*ub+dc*uc,dv=da*va+db*vb+dc*vc;
    const ab=(bx-ax)/(by-ay),bc=(cx-bx)/(cy_-by),ca=(ax-cx)/(ay-cy_);
    for(let y=minY;y<=maxY;y++) {
      const py=y+.5;
      // Scan only the triangle's span. A coin's narrow fan triangles otherwise
      // visit huge empty bounding boxes, especially at maximum zoom.
      let left=Infinity,right=-Infinity;
      if(by!==ay&&py>=Math.min(ay,by)&&py<=Math.max(ay,by)){const x=ax+(py-ay)*ab;left=Math.min(left,x);right=Math.max(right,x);}
      if(cy_!==by&&py>=Math.min(by,cy_)&&py<=Math.max(by,cy_)){const x=bx+(py-by)*bc;left=Math.min(left,x);right=Math.max(right,x);}
      if(ay!==cy_&&py>=Math.min(cy_,ay)&&py<=Math.max(cy_,ay)){const x=cx+(py-cy_)*ca;left=Math.min(left,x);right=Math.max(right,x);}
      const first=Math.max(minX,Math.ceil(left-.5-1e-7)),last=Math.min(maxX,Math.floor(right-.5+1e-7));
      if(first>last)continue;
      const px=first+.5;
      let wa=((bx-px)*(cy_-py)-(by-py)*(cx-px))/area;
      let wb=((cx-px)*(ay-py)-(cy_-py)*(ax-px))/area,wc=1-wa-wb;
      let q=wa*qa+wb*qb+wc*qc,u=wa*ua+wb*ub+wc*uc,v=wa*va+wb*vb+wc*vc;
      let at=y*width+first;
      for(let x=first;x<=last;x++,at++,wa+=da,wb+=db,wc+=dc,q+=dq,u+=du,v+=dv) {
        if(wa< -1e-7||wb< -1e-7||wc< -1e-7||q<=depth[at])continue;
        // Perspective-correct UVs and bilinear filtering, matching GL CLAMP_TO_EDGE.
        const tx=Math.max(0,Math.min(tw-1,u/q-.5)),ty=Math.max(0,Math.min(th-1,v/q-.5));
        const ix=Math.floor(tx),iy=Math.floor(ty),fx=tx-ix,fy=ty-iy;
        const p00=(iy*tw+ix)*4,p10=(iy*tw+Math.min(tw-1,ix+1))*4;
        const p01=(Math.min(th-1,iy+1)*tw+ix)*4,p11=(Math.min(th-1,iy+1)*tw+Math.min(tw-1,ix+1))*4;
        const w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
        const alpha=pixels[p00+3]*w00+pixels[p10+3]*w10+pixels[p01+3]*w01+pixels[p11+3]*w11;
        if(alpha<25.5)continue;
        const out=at*4;
        data[out]=(pixels[p00]*w00+pixels[p10]*w10+pixels[p01]*w01+pixels[p11]*w11)*diffuse+specular;
        data[out+1]=(pixels[p00+1]*w00+pixels[p10+1]*w10+pixels[p01+1]*w01+pixels[p11+1]*w11)*diffuse+specular*.984;
        data[out+2]=(pixels[p00+2]*w00+pixels[p10+2]*w10+pixels[p01+2]*w01+pixels[p11+2]*w11)*diffuse+specular*.9;
        data[out+3]=alpha;depth[at]=q;
      }
    }
  }
  return target;
}

const pixelCache=new WeakMap();
const litCache=new WeakMap();
let surface=null,unavailable=false;
export function renderSoftwareMesh(model,yaw,pitch,width,height,zoom=1,light=0,pan=[0,0]) {
  if(unavailable)return null;
  const [w,h]=softwareSize(width,height);
  try {
    if(!surface) {
      const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
      if(!context?.createImageData){unavailable=true;return null;}
      surface={canvas,context};
    }
    if(surface.canvas.width!==w||surface.canvas.height!==h||!surface.target) {
      surface.canvas.width=w;surface.canvas.height=h;
      surface.image=surface.context.createImageData(w,h);
      if(surface.image?.data?.length!==w*h*4){unavailable=true;surface=null;return null;}
      surface.target=createRasterTarget(w,h,surface.image.data);
    }
    const read=canvas=>{
      let pixels=pixelCache.get(canvas);
      if(!pixels){pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);pixelCache.set(canvas,pixels);}
      return pixels;
    };
    const key=yaw+':'+pitch+':'+light;
    let lit=litCache.get(model);
    if(lit?.key!==key){lit={key,pixels:[]};litCache.set(model,lit);}
    const textures=model.textures.map((canvas,mat)=>()=>{
      const relief=model.reliefMaps[mat];
      if(!relief)return read(canvas);
      // Use the existing photographic micro-relief, only for a visible face.
      // Zoom and pan reuse it. Replacing the angle drops the previous face buffers.
      if(!lit.pixels[mat]){
        const face=relief.map?relightFace(canvas,relief.map,relief.side,yaw,pitch,model.profile.polish,light):canvas;
        const pixels=read(face);lit.pixels[mat]={width:pixels.width,height:pixels.height,data:pixels.data,lit:true};
      }
      return lit.pixels[mat];
    });
    rasterizeMesh(model,textures,surface.target,yaw,pitch,zoom,light,pan);
    surface.context.putImageData(surface.image,0,0);
    return surface.canvas;
  } catch {
    // A blocked pixel-read API can still use the original clipped Canvas renderer.
    unavailable=true;surface=null;return null;
  }
}
