import Link from "next/link";
import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/admin-auth";
import {authConfig,safeReturnTo} from "@/lib/auth/cognito";
import {localDemoEnabled} from "@/lib/local-state";
import {Section} from "@/components/section";
export const dynamic="force-dynamic";
export default async function Login({searchParams}:{searchParams:Promise<{returnTo?:string;error?:string}>}){const p=await searchParams,to=safeReturnTo(p.returnTo);if(await requireAdmin())redirect(to);const local=localDemoEnabled();let ready=local;try{if(!local){authConfig();ready=true;}}catch{}
 return <main><Section eyebrow="Owner access" title="One sign-in. Your whole workspace." intro="Sign in with your password and authenticator code to use the blog editor and TechCanvas together."><div className="max-w-xl rounded-xl border border-line bg-panel p-6">{p.error && <p role="alert" className="mb-4 text-muted">Sign-in could not be verified. Please try again.</p>}{local?<><p className="mb-4 text-muted">Local demo mode uses development credentials. It does not simulate Cognito MFA.</p><Link href="/admin" className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink">Open local demo sign-in</Link></>:ready?<><p className="mb-5 leading-7 text-muted">Cognito handles your password and MFA. One secure session unlocks both areas; signing out ends access to both.</p><a href={"/api/auth/login?returnTo="+encodeURIComponent(to)} className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-ink">Sign in with MFA</a></>:<p role="status" className="text-muted">Owner MFA login awaits the reviewed production configuration. Password-only login is disabled.</p>}</div></Section></main>;
}
