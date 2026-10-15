import { X509Certificate, createHash } from 'node:crypto';
import tls from 'node:tls';
// Certificate-only inspection of the fixed owned loopback endpoint. Application
// traffic still uses one exact SPKI pin, never blanket certificate suppression.
export async function loopbackCertificate(pem){
 const original=new X509Certificate(pem);certificateOptions(pem);
 const peer=await new Promise((ok,fail)=>{const socket=tls.connect({host:'127.0.0.1',port:8443,rejectUnauthorized:false},()=>{const raw=socket.getPeerCertificate().raw;socket.end();ok(new X509Certificate(raw));});socket.setTimeout(5000,()=>socket.destroy(Error('Local certificate inspection timed out')));socket.on('error',fail);});
 certificateOptions(peer.raw);
 if(peer.fingerprint256!==original.fingerprint256&&(peer.subject!==original.subject||!peer.issuer.includes('CN=Avast Web/Mail Shield Self-signed Root')))throw Error('Unexpected local TLS certificate');
 return peer.toString();
}
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function certificateOptions(pem, now=Date.now()) {
  const cert=new X509Certificate(pem);
  if(cert.checkIP('127.0.0.1')!=='127.0.0.1'||Date.parse(cert.validFrom)>now||Date.parse(cert.validTo)<=now)throw new Error('Owned loopback certificate is invalid or expired.');
  const pin=createHash('sha256').update(cert.publicKey.export({format:'der',type:'spki'})).digest('base64');
  return {ignoreHTTPSErrors:false,args:[`--ignore-certificate-errors-spki-list=${pin}`]};
}

export function resolveBrowserExecutable() {
  const candidates = [
    process.env.ProgramFiles && resolve(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
    process.env.LOCALAPPDATA && resolve(process.env.LOCALAPPDATA, 'BraveSoftware/Brave-Browser/Application/brave.exe')
  ];
  return candidates.find(path => path && existsSync(path));
}

