// One reusable GPU context for all three inspection canvases. No network assets.
let renderer;
export function renderMesh(model,yaw,pitch,width,height) {
  if(renderer===undefined)renderer=createRenderer();
  return renderer?.(model,yaw,pitch,width,height) || null;
}
function createRenderer() {
  const canvas=document.createElement('canvas');
  let gl;
  try {gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});}catch{return null;}
  if(!gl?.getParameter(gl.VERSION))return null;
  const vertex=`
    attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
    uniform vec2 angle; uniform vec2 size;
    varying vec3 surfaceNormal; varying vec2 texCoord;
    vec3 turn(vec3 p) {
      float cy=cos(angle.x),sy=sin(angle.x),cp=cos(angle.y),sp=sin(angle.y);
      vec3 q=vec3(p.x*cy+p.z*sy,p.y,p.z*cy-p.x*sy);
      return vec3(q.x,q.y*cp-q.z*sp,q.y*sp+q.z*cp);
    }
    void main(){
      vec3 p=turn(position);float w=5.0-p.z;float scale=min(size.x*.36,size.y*.39);
      gl_Position=vec4(p.x*scale*10.0/size.x,p.y*scale*10.0/size.y+.04*w,w*1.020202-.2020202,w);
      surfaceNormal=turn(normal);texCoord=uv;
    }`;
  const fragment=`
    precision mediump float;
    varying vec3 surfaceNormal;varying vec2 texCoord;
    uniform sampler2D image;uniform float polish;
    void main(){
      vec4 metal=texture2D(image,texCoord);if(metal.a<.1)discard;
      vec3 n=normalize(surfaceNormal);
      float diffuse=.64+.36*max(0.0,dot(n,normalize(vec3(-.4,.65,1.0))));
      float highlight=pow(max(0.0,dot(n,normalize(vec3(-.2,.32,1.0)))),12.0+polish*64.0)*(.045+polish*.28);
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
  const uniforms=Object.fromEntries(['angle','size','polish','image'].map(name=>[name,gl.getUniformLocation(program,name)]));
  gl.uniform1i(uniforms.image,0);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
  let current=null,textures=[],ranges=[];
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer=null;});
  canvas.addEventListener('webglcontextrestored',()=>{renderer=undefined;});
  return (model,yaw,pitch,width,height)=>{
    if(gl.isContextLost())return null;
    if(current!==model){
      textures.forEach(t=>gl.deleteTexture(t));textures=[];ranges=[];
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
        const tex=gl.createTexture();textures.push(tex);gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,model.textures[mat]);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      }
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);current=model;
    }
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(uniforms.angle,yaw,pitch);gl.uniform2f(uniforms.size,width,height);gl.uniform1f(uniforms.polish,model.profile.polish);
    ranges.forEach(({start,count},i)=>{gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.drawArrays(gl.TRIANGLES,start,count);});
    return canvas;
  };
}
