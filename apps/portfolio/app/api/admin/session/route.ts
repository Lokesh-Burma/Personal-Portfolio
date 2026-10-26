import {requireAdmin} from "@/lib/admin-auth";
import {authConfig} from "@/lib/auth/cognito";
import {localDemoEnabled} from "@/lib/local-state";
import {checkRequest,json,errorResponse} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{checkRequest(request);const s=await requireAdmin(),local=localDemoEnabled();let ready=local;if(!local){try{authConfig();ready=true;}catch{}}return json({authenticated:Boolean(s),email:s?.email || null,authMode:local?"local-demo":"cognito",loginReady:ready});}catch(e){return errorResponse(e);}}
