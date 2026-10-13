const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
exports.withBrowser=async fn=>{
 const version=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/main\.js\?v=([\d.]+)/)[1];
 const server=http.createServer((req,res)=>{
  const name=req.url.split('?')[0],file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
  try{res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 let browser;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  const screenshot=async name=>{if(process.env.INSPECTION_SCREENSHOTS)await page.screenshot({path:path.join(process.env.INSPECTION_SCREENSHOTS,name+'.png')});};
  await fn(page,{version,screenshot});assert.deepEqual(errors,[],'browser errors');
 }finally{await browser?.close();server.close();}
};
