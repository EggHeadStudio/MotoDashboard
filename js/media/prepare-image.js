export const SOURCE_LIMIT=12000000,UPLOAD_LIMIT=1500000;
export const MEDIA_ASPECTS={avatar:1,logo:1,icon:1,banner:3,photo:4/3};
export function cropRectangle(width,height,aspect=4/3,{zoom=1,x=50,y=50}={}) {
  if(![width,height,aspect,zoom,x,y].every(Number.isFinite)||width<=0||height<=0||aspect<=0||zoom<1||zoom>3||x<0||x>100||y<0||y>100)throw Error('invalid_image');
  let w=width,h=width/aspect;if(h>height){h=height;w=h*aspect;}w/=zoom;h/=zoom;
  return {x:(width-w)*x/100,y:(height-h)*y/100,width:w,height:h};
}
export async function prepareImage(file,{aspect=4/3,zoom=1,x=50,y=50,format='image/jpeg',maxDimension=1600,onProgress=()=>{}}={}) {
  if(!['image/jpeg','image/png'].includes(format)||!Number.isFinite(maxDimension)||maxDimension<32||maxDimension>1600)throw Error('invalid_image');
  if(!(file instanceof Blob)||!file.size||file.size>SOURCE_LIMIT)throw Error('too_large');
  const head=new Uint8Array(await file.slice(0,16).arrayBuffer()),ascii=(start,n)=>String.fromCharCode(...head.slice(start,start+n));
  if(!((head[0]===255&&head[1]===216)||ascii(0,8)==='\x89PNG\r\n\x1a\n'||(ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP')))throw Error('invalid_image');
  onProgress(10);let decoded,url;
  try {
    if(typeof createImageBitmap==='function')try{decoded=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{/* Safari fallback uses normal image decode. */}
    if(!decoded){url=URL.createObjectURL(file);decoded=new Image();decoded.src=url;await decoded.decode();}
    const width=decoded.width || decoded.naturalWidth,height=decoded.height || decoded.naturalHeight;
    if(width*height>40000000||!width||!height)throw Error('invalid_image');
    const crop=cropRectangle(width,height,aspect,{zoom,x,y}),scale=Math.min(1,maxDimension/Math.max(crop.width,crop.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(crop.width*scale));canvas.height=Math.max(1,Math.round(crop.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('invalid_image');
    ctx.fillStyle='#101214';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(decoded,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);onProgress(45);
    // Canvas re-encoding stores pixels only; EXIF/GPS/XMP and originals never upload.
    let blob;for(const quality of [0.85,0.72,0.6]){blob=await new Promise(resolve=>canvas.toBlob(resolve,format,quality));if(blob && blob.size<=UPLOAD_LIMIT)break;}
    canvas.width=canvas.height=1;
    if(!blob||!blob.size||blob.type!==format||blob.size>UPLOAD_LIMIT)throw Error('too_large');
    onProgress(60);return blob;
  } finally {decoded?.close?.();if(url)URL.revokeObjectURL(url);}
}
