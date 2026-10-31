"use client";
import {readOwnerSession} from "@/lib/auth/client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
export function OwnerLink(){const path=usePathname(),[signedIn,setSignedIn]=useState(false);useEffect(()=>{let active=true;const refresh=()=>readOwnerSession().then(s=>{if(active)setSignedIn(s.authenticated===true);}).catch(()=>{if(active)setSignedIn(false);});refresh();window.addEventListener("owner-session-changed",refresh);window.addEventListener("focus",refresh);return()=>{active=false;window.removeEventListener("owner-session-changed",refresh);window.removeEventListener("focus",refresh);};},[path]);return <Link href={signedIn?"/techcanvas/studio":"/login"} className="shrink-0 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent-soft">{signedIn?"Workspace":"Owner sign-in"}</Link>;}
