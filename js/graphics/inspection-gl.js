// One reusable GPU context for all three inspection canvases. No network assets.
import { inspectionLights } from './inspection-light.js?v=0.55.1';
let renderer;
export function renderMesh(model,yaw,pitch,width,height,zoom=1,light=0,pan=[0,0]) {
  if(renderer===undefined)renderer=createRenderer();
  return renderer?.(model,yaw,pitch,width,height,zoom,light,pan) || null;
}
function createRenderer() {
  const canvas=document.createElement('canvas');
  let gl;
  try {gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});}catch{return null;}
  if(!gl?.getParameter(gl.VERSION))return null;
  const vertex=`
    attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
    uniform mediump vec2 angle; uniform vec2 size; uniform float zoom; uniform vec2 pan;
    varying mediump vec3 surfaceNormal; varying mediump vec2 texCoord;
    vec3 turn(vec3 p) {
      float cy=cos(angle.x),sy=sin(angle.x),cp=cos(angle.y),sp=sin(angle.y);
      vec3 q=vec3(p.x*cy+p.z*sy,p.y,p.z*cy-p.x*sy);
      return vec3(q.x,q.y*cp-q.z*sp,q.y*sp+q.z*cp);
    }
    void main(){
      vec3 p=turn(position);float w=5.0-p.z;float scale=min(size.x*.36,size.y*.39)*zoom;
      gl_Position=vec4(p.x*scale*10.0/size.x+pan.x*2.0*w,p.y*scale*10.0/size.y+(.04-pan.y*2.0)*w,w*1.020202-.2020202,w);
      surfaceNormal=turn(normal);texCoord=uv;
    }`;
  const fragment=`
    precision mediump float;
    varying mediump vec3 surfaceNormal;varying mediump vec2 texCoord;
    uniform sampler2D image;uniform sampler2D relief;uniform float polish;uniform float reliefSide;
    uniform mediump vec2 angle;uniform vec3 light;
    vec3 turn(vec3 p) {
      float cy=cos(angle.x),sy=sin(angle.x),cp=cos(angle.y),sp=sin(angle.y);
      vec3 q=vec3(p.x*cy+p.z*sy,p.y,p.z*cy-p.x*sy);
      return vec3(q.x,q.y*cp-q.z*sp,q.y*sp+q.z*cp);
    }
    void main(){
      vec4 metal=texture2D(image,texCoord);if(metal.a<.1)discard;
      vec3 n=normalize(surfaceNormal);
      if(abs(reliefSide)>.5){
        vec3 detail=texture2D(relief,texCoord).rgb*2.0-1.0;
        n=normalize(turn(vec3(detail.x*reliefSide,detail.y,detail.z*reliefSide)));
      }
      float diffuse=.70+.30*max(0.0,dot(n,light));
      float highlight=pow(max(0.0,dot(n,normalize(light+vec3(0.0,0.0,1.0)))),18.0+polish*62.0)*(.02+polish*.16);
      gl_FragColor=vec4(metal.rgb*diffuse+vec3(1.0,.984,.9)*highlight,metal.a);
    }`;
  const compile=(kind,source)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Inspection shader');return shader;};
  let program;
  try{
    program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
  }catch{return null;}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,count,offset] of [['position',3,0],['normal',3,12],['uv',2,24]]){const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,count,gl.FLOAT,false,32,offset);}
  const uniforms=Object.fromEntries(['angle','size','polish','image','relief','reliefSide','light','zoom','pan'].map(name=>[name,gl.getUniformLocation(program,name)]));
  gl.uniform1i(uniforms.image,0);gl.uniform1i(uniforms.relief,1);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
  let current=null,textures=[],reliefs=[],ranges=[];
  const upload=source=>{
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    if(source)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,255,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return tex;
  };
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer=null;});
  canvas.addEventListener('webglcontextrestored',()=>{renderer=undefined;});
  return (model,yaw,pitch,width,height,zoom,light,pan)=>{
    if(gl.isContextLost())return null;
    if(current!==model){
      [...textures,...reliefs].forEach(t=>gl.deleteTexture(t));textures=[];reliefs=[];ranges=[];
      gl.activeTexture(gl.TEXTURE0);
      const vertices=[],adjacent=new Map(),key=p=>p.map(v=>v.toFixed(5)).join(',');
      for(const t of model.triangles)for(const p of t.points){const k=key(p)+':'+t.mat;if(!adjacent.has(k))adjacent.set(k,[]);adjacent.get(k).push(t.normal);}
      for(let mat=0;mat<model.textures.length;mat++) {
        const start=vertices.length/8;
        for(const t of model.triangles.filter(t=>t.mat===mat))for(let i=0;i<3;i++){
          const normals=adjacent.get(key(t.points[i])+':'+mat).filter(n=>n.reduce((s,v,k)=>s+v*t.normal[k],0)>.7);
          const normal=[0,1,2].map(k=>normals.reduce((s,n)=>s+n[k],0));const length=Math.hypot(...normal)||1;
          vertices.push(...t.points[i],...normal.map(n=>n/length),t.uv[i][0]/512,t.uv[i][1]/512);
        }
        ranges.push({start,count:vertices.length/8-start});
        textures.push(upload(model.textures[mat]));reliefs.push(upload(model.reliefMaps[mat]?.map?.canvas));
      }
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);current=model;
    }
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(uniforms.angle,yaw,pitch);gl.uniform2f(uniforms.size,width,height);gl.uniform1f(uniforms.polish,model.profile.polish);
    gl.uniform1f(uniforms.zoom,zoom);gl.uniform3fv(uniforms.light,inspectionLights[light]||inspectionLights[0]);
    gl.uniform2f(uniforms.pan,pan[0],pan[1]);
    ranges.forEach(({start,count},i)=>{
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[i]);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,reliefs[i]);
      gl.uniform1f(uniforms.reliefSide,model.reliefMaps[i]?.map?model.reliefMaps[i].side:0);
      gl.drawArrays(gl.TRIANGLES,start,count);
    });
    return canvas;
  };
}
