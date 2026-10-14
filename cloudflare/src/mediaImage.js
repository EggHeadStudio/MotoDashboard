export const MAX_IMAGE_BYTES=1500000,MAX_IMAGE_DIMENSION=1920;
export async function boundedBody(request,max=MAX_IMAGE_BYTES) {
  const declared=Number(request.headers.get('Content-Length') || 0);
  if(declared>max)throw Error('too_large');
  if(!request.body)throw Error('invalid_image');const reader=request.body.getReader(),chunks=[];let length=0;
  const deadline=Date.now()+10000;
  try {while(true){let timer;const next=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('bad_request')),Math.max(1,deadline-Date.now()));})]).finally(()=>clearTimeout(timer));if(next.done)break;length+=next.value.byteLength;
    if(length>max)throw Error('too_large');chunks.push(next.value);}}
  finally{await reader.cancel();}
  const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
const ascii=(bytes,start,length)=>String.fromCharCode(...bytes.subarray(start,start+length));
const crcTable=Uint32Array.from({length:256},(_,n)=>{let crc=n;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);return crc>>>0;});
export function inspectImage(bytes,mime) {
  if(bytes.length>MAX_IMAGE_BYTES)throw Error('too_large');if(bytes.length<24)throw Error('invalid_image');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width=0,height=0,type;
  if(ascii(bytes,0,4)==='RIFF' && ascii(bytes,8,4)==='WEBP') {
    type='image/webp';if(v.getUint32(4,true)+8!==bytes.length)throw Error('invalid_image');
    let offset=12,images=0;
    while(offset+8<=bytes.length) {
      const kind=ascii(bytes,offset,4),size=v.getUint32(offset+4,true),start=offset+8,end=start+size;
      if(end>bytes.length || !['VP8 ','VP8L','VP8X','ALPH'].includes(kind))throw Error('invalid_image');
      if(kind==='VP8X'){if(size!==10 || bytes[start]!==0)throw Error('invalid_image'); /* no EXIF/XMP/ICC/animation */
        width=1+bytes[start+4]+bytes[start+5]*256+bytes[start+6]*65536;height=1+bytes[start+7]+bytes[start+8]*256+bytes[start+9]*65536;}
      if(kind==='VP8 '){if(size<10 || (bytes[start]&1)!==0 || ascii(bytes,start+3,3)!=='\x9d\x01\x2a')throw Error('invalid_image');
        const w=v.getUint16(start+6,true)&16383,h=v.getUint16(start+8,true)&16383;if(width&&(w!==width||h!==height))throw Error('invalid_image');width=w;height=h;images++;}
      if(kind==='VP8L'){if(size<5 || bytes[start]!==47)throw Error('invalid_image');const b=v.getUint32(start+1,true);
        const w=(b&16383)+1,h=((b>>>14)&16383)+1;if(b>>>29 || (width&&(width!==w||height!==h)))throw Error('invalid_image');width=w;height=h;images++;}
      offset=end+(size&1);
    }
    if(offset!==bytes.length||images!==1)throw Error('invalid_image');
  } else if(ascii(bytes,0,8)==='\x89PNG\r\n\x1a\n') {
    type='image/png';let offset=8,first=true,data=false,ended=false;
    while(offset+12<=bytes.length) {
      const size=v.getUint32(offset),kind=ascii(bytes,offset+4,4),start=offset+8,end=start+size;
      if(end+4>bytes.length || !['IHDR','IDAT','IEND','sRGB','gAMA','cHRM'].includes(kind))throw Error('invalid_image');
      let crc=0xffffffff;for(let i=offset+4;i<end;i++)crc=(crc>>>8)^crcTable[(crc^bytes[i])&255];
      if((crc^0xffffffff)>>>0!==v.getUint32(end))throw Error('invalid_image');
      if(first){if(kind!=='IHDR'||size!==13)throw Error('invalid_image');width=v.getUint32(start);height=v.getUint32(start+4);
        if(bytes[start+8]!==8 || ![2,6].includes(bytes[start+9]) || bytes[start+10]||bytes[start+11]||bytes[start+12])throw Error('invalid_image');first=false;}
      else if(kind==='IHDR')throw Error('invalid_image');
      if(kind==='IDAT')data=true;
      if(kind==='IEND'){if(size!==0||!data||end+4!==bytes.length)throw Error('invalid_image');ended=true;}
      offset=end+4;
    }
    if(!ended)throw Error('invalid_image');
  } else if(bytes[0]===255 && bytes[1]===216) {
    type='image/jpeg';let offset=2,scan=false;
    while(offset+4<=bytes.length) {
      if(bytes[offset++]!==255)throw Error('invalid_image');while(bytes[offset]===255)offset++;
      const marker=bytes[offset++];if(marker===0xd9)break;
      const size=v.getUint16(offset),start=offset+2;if(size<2||offset+size>bytes.length)throw Error('invalid_image');
      // Reject EXIF/XMP/ICC/comments and non-baseline/progressive frames.
      if((marker>=0xe1&&marker<=0xef)||marker===0xfe)throw Error('invalid_image');
      if(marker===0xc0 || marker===0xc2){if(size<8||width||bytes[start]!==8)throw Error('invalid_image');height=v.getUint16(start+1);width=v.getUint16(start+3);}
      else if(![0xe0,0xdb,0xc4,0xdd,0xda].includes(marker))throw Error('invalid_image');
      offset+=size;if(marker===0xda){scan=true;break;}
    }
    if(!scan||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error('invalid_image');
  } else throw Error('invalid_image');
  if(mime!==type || !width||!height||width>MAX_IMAGE_DIMENSION||height>MAX_IMAGE_DIMENSION||width*height>3686400)throw Error('invalid_image');
  return {mime:type,width,height,bytes:bytes.length};
}
