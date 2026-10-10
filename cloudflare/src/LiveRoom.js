import {DurableObject} from 'cloudflare:workers';
export class LiveRoom extends DurableObject {
  async fetch() {return Response.json({error:'not_available'},{status:503});}
}
