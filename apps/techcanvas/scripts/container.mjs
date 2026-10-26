// Docker needs an internal interface; publish this demo port on host loopback only.
import {createApp} from '../server.mjs';
const app=await createApp({provider:'demo'}),port=Number(process.env.PORT||4310);
app.server.listen(port,'0.0.0.0',()=>console.log('Local curated-demo container listening on '+port));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
