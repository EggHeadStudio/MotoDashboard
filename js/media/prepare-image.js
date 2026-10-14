export const SOURCE_LIMIT=12000000,UPLOAD_LIMIT=1500000;
export const MEDIA_ASPECTS={avatar:1,logo:1,icon:1,banner:3,photo:4/3};
function sourceDimensions(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),ascii=(start,n)=>String.fromCharCode(...bytes.slice(start,start+n));let width=0,height=0;
  if(ascii(0,8)==='\x89PNG\r\n\x1a\n' && bytes.length>=33){width=view.getUint32(16);height=view.getUint32(20);
    for(let at=8;at+12<=bytes.length;){const size=view.getUint32(at),kind=ascii(at+4,4);if(['acTL','fcTL','fdAT'].includes(kind))throw Error('invalid_image');if(at+size+12>bytes.length)throw Error('invalid_image');at+=size+12;}
  } else if(bytes[0]===255 && bytes[1]===216){let at=2;
    while(at+4<bytes.length){if(bytes[at++]!==255)throw Error('invalid_image');while(bytes[at]===255)at++;const kind=bytes[at++],size=view.getUint16(at);if(size<2||at+size>bytes.length)throw Error('invalid_image');
      if([0xc0,0xc1,0xc2].includes(kind)){height=view.getUint16(at+3);width=view.getUint16(at+5);break;}at+=size;}
  } else if(ascii(0,4)==='RIFF' && ascii(8,4)==='WEBP') {
    for(let at=12;at+8<=bytes.length;){const kind=ascii(at,4),size=view.getUint32(at+4,true),start=at+8;if(start+size>bytes.length)throw Error('invalid_image');
      if(['ANIM','ANMF'].includes(kind)||(kind==='VP8X' && (bytes[start]&2)))throw Error('invalid_image');
      if(kind==='VP8X'&&size>=10){width=1+bytes[start+4]+bytes[start+5]*256+bytes[start+6]*65536;height=1+bytes[start+7]+bytes[start+8]*256+bytes[start+9]*65536;}
      if(kind==='VP8 '&&size>=10){width=view.getUint16(start+6,true)&16383;height=view.getUint16(start+8,true)&16383;}
      if(kind==='VP8L'&&size>=5){const value=view.getUint32(start+1,true);width=(value&16383)+1;height=((value>>>14)&16383)+1;}at=start+size+(size&1);}
  }
  if(!width||!height||width*height>40000000)throw Error('invalid_image');
}
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
  // Bound decompressed dimensions and reject animation before allocating a decoder.
  try{sourceDimensions(new Uint8Array(await file.arrayBuffer()));}catch{throw Error('invalid_image');}
  onProgress(10);let decoded,url;
  try {
    if(typeof createImageBitmap==='function')try{decoded=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{/* Safari fallback uses normal image decode. */}
    if(!decoded){url=URL.createObjectURL(file);decoded=new Image();decoded.src=url;await decoded.decode();}
    const width=decoded.width || decoded.naturalWidth,height=decoded.height || decoded.naturalHeight;
    if(width*height>40000000||!width||!height)throw Error('invalid_image');
    const crop=cropRectangle(width,height,aspect,{zoom,x,y}),scale=Math.min(1,maxDimension/Math.max(crop.width,crop.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(crop.width*scale));canvas.height=Math.max(1,Math.round(crop.height*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('invalid_image');
    if(format==='image/jpeg'){ctx.fillStyle='#101214';ctx.fillRect(0,0,canvas.width,canvas.height);}
    ctx.drawImage(decoded,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);onProgress(45);
    // Canvas re-encoding stores pixels only; EXIF/GPS/XMP and originals never upload.
    let blob;for(const quality of [0.85,0.72,0.6]){blob=await new Promise(resolve=>canvas.toBlob(resolve,format,quality));if(blob && blob.size<=UPLOAD_LIMIT)break;}
    canvas.width=canvas.height=1;
    if(!blob||!blob.size||blob.type!==format||blob.size>UPLOAD_LIMIT)throw Error('too_large');
    onProgress(60);return blob;
  } finally {decoded?.close?.();if(url)URL.revokeObjectURL(url);}
}
