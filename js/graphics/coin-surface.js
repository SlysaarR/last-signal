// Photographic relief is split by detail size. Wear removes fine engraving
// before the larger outlines; it does not just blur or darken the whole face.
// Eight 256px decompositions bound memory even while browsing the full album.
const surfaces = new Map(), SIZE = 256;
function canvas() {
  const value = document.createElement('canvas');value.width=value.height=SIZE;return value;
}
function pixels(source, blur=0) {
  const value=canvas(),c=value.getContext('2d');
  c.filter=blur?`blur(${blur}px)`:'none';
  // Only RGB detail is decomposed; output opacity always comes from the original.
  c.drawImage(source,0,0,SIZE,SIZE);
  return c.getImageData(0,0,SIZE,SIZE).data;
}
function surface(source) {
  if(surfaces.has(source))return surfaces.get(source);
  const original=canvas();original.getContext('2d').drawImage(source,0,0,SIZE,SIZE);
  const data=pixels(original),fine=pixels(original,1.3),medium=pixels(original,5),broad=pixels(original,16);
  const mean=[0,0,0];let count=0;
  for(let y=48;y<208;y++)for(let x=48;x<208;x++) {
    const i=(y*SIZE+x)*4;for(let k=0;k<3;k++)mean[k]+=broad[i+k];count++;
  }
  for(let k=0;k<3;k++)mean[k]/=count;
  const value={data,fine,medium,broad,mean,out:canvas(),condition:null};
  if(surfaces.size>=8)surfaces.delete(surfaces.keys().next().value);
  surfaces.set(source,value);return value;
}
export function wornCoinFace(source,condition) {
  const quality=Math.max(0,Math.min(100,Number(condition)||0))/100;
  if(quality===1)return source;
  const s=surface(source);if(s.condition===quality)return s.out;
  const c=s.out.getContext('2d'),image=c.createImageData(SIZE,SIZE),out=image.data;
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) {
    const i=(y*SIZE+x)*4,dx=(x-128)/128,dy=(y-128)/128,r=Math.hypot(dx,dy);
    // Raised central motifs wear first. The rim protects the outer field.
    const high=.82+.18*Math.max(0,1-r*r)+.055*Math.sin(x*.041)*Math.sin(y*.037);
    const q=Math.max(0,1-(1-quality)*high);
    const fine=q**2.8,medium=q**1.8,coarse=q**1.12;
    const rim=Math.max(0,Math.min(1,(r-.90)/.055));
    for(let k=0;k<3;k++) {
      const base=s.mean[k]+(s.broad[i+k]-s.mean[k])*.14;
      const worn=base+(s.broad[i+k]-base)*coarse+(s.medium[i+k]-s.broad[i+k])*coarse
        +(s.fine[i+k]-s.medium[i+k])*medium+(s.data[i+k]-s.fine[i+k])*fine;
      // Rim engraving also loses relief, but remains a recognisable boundary.
      const edge=base+(s.data[i+k]-base)*(.32+.68*quality);
      out[i+k]=worn*(1-rim)+edge*rim;
    }
    out[i+3]=s.data[i+3];
  }
  c.putImageData(image,0,0);s.condition=quality;return s.out;
}
