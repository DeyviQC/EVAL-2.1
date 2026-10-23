// Replace a pristine tab's initial document so browser Back cannot return to about:blank.
// Existing tabs with navigation history are not reused or modified.
export async function openApplicationPage(context,url='https://127.0.0.1:8443/'){
 let page;
 for(const candidate of context.pages()){
  if(candidate.url()==='about:blank'&&await candidate.evaluate(()=>history.length)===1){page=candidate;break;}
 }
 page??=await context.newPage();
 await Promise.all([
  page.waitForURL(url,{waitUntil:'load'}),
  page.evaluate(target=>{window.location.replace(target);},url),
 ]);
 return page;
}
