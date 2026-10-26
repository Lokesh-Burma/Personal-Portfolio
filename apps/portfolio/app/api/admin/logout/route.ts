import {clearAdminSessionCookie} from "@/lib/admin-auth";
import {authConfig,logoutUrl} from "@/lib/auth/cognito";
import {localDemoEnabled} from "@/lib/local-state";
import {checkRequest,json,errorResponse} from "@/lib/http";
export async function POST(request:Request){try{checkRequest(request);await clearAdminSessionCookie();let redirectUrl="/";if(!localDemoEnabled()){try{redirectUrl=logoutUrl(authConfig());}catch{}}return json({ok:true,redirectUrl});}catch(e){return errorResponse(e);}}
