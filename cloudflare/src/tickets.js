export const TICKET_TTL=30000;
export function randomTicket() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function ticketHash(ticket) {
  if(typeof ticket!=='string' || !/^[0-9a-f]{64}$/.test(ticket)) throw Error('invalid_ticket');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ticket))),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function consumeTicket(storage,ticket,origin,sessionId,now=Date.now()) {
  const key='ticket:'+await ticketHash(ticket);
  return storage.transaction(async tx=>{
    const value=await tx.get(key);if(value) await tx.delete(key);
    if(!value || value.origin!==origin || value.sessionId!==sessionId || value.until<=now || value.expiresAt<=now) throw Error('invalid_ticket');
    return value;
  });
}
