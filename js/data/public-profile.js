import {CATEGORIES,text,enumValue} from './schema.js';
import {dataError} from '../firebase/access.js';

export const ACCENTS=['gold','ocean','forest','rose'];
export const BANNERS=['road','horizon','grid'];
export const MAX_SHOWCASE=4,MAX_AFFILIATIONS=2;
export const publicId=value=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export const profileDefaults=()=>({publicId:null,state:'active',visibility:'private',bio:'',category:null,accent:'gold',banner:'road',featuredVehicle:null,vehicleIds:[],affiliationIds:[]});
export function profileInput(value) {
  const result={bio:text(value.bio || '',300),category:value.category==null||value.category===''?null:enumValue(value.category,CATEGORIES),
    accent:enumValue(value.accent || 'gold',ACCENTS),banner:enumValue(value.banner || 'road',BANNERS),visibility:enumValue(value.visibility,['private','public'])};
  return result;
}
export function profileProjection(id,settings,displayName,updatedAt) {
  return {id,displayName,bio:settings.bio,category:settings.category,accent:settings.accent,banner:settings.banner,
    featuredVehicle:settings.featuredVehicle,vehicleIds:settings.vehicleIds,affiliationIds:settings.affiliationIds,updatedAt};
}
export function profileURL(id) {
  if(!publicId(id))throw dataError('invalid-input');
  const url=new URL('./',document.baseURI);url.hash='/rider/'+id;return url.href;
}
