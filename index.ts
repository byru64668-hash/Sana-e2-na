import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const body=await req.json();const {action,data={},token}=body;
  const url=Deno.env.get("SUPABASE_URL")!;const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminCode=Deno.env.get("SCHOOLTRACK_ADMIN_CODE");
  if(!adminCode)return json({error:"Admin code secret is not configured."},500);
  const db=createClient(url,service);
  if(action==="admin_login"){
   if(data.code!==adminCode)return json({error:"Incorrect admin code."},401);
   const raw=crypto.randomUUID()+"."+crypto.randomUUID();
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)))).map(x=>x.toString(16).padStart(2,"0")).join("");
   await db.from("admin_sessions").upsert({token_hash:hash,expires_at:new Date(Date.now()+8*60*60*1000).toISOString()});
   return json({token:raw});
  }
  if(!token)return json({error:"Admin authorization required."},401);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,"0")).join("");
  const {data:session}=await db.from("admin_sessions").select("expires_at").eq("token_hash",hash).maybeSingle();
  if(!session||new Date(session.expires_at).getTime()<Date.now())return json({error:"Admin session expired. Sign in again."},401);
  if(action==="sync"){
   // Admin-only synchronization. Guest report submission is intentionally a separate action.
   const items=Array.isArray(data.items)?data.items:[];
   const reports=Array.isArray(data.reports)?data.reports:[];
   if(items.length){const {error}=await db.from("inventory_items").upsert(items);if(error)throw error;}
   if(reports.length){const {error}=await db.from("reports").upsert(reports.map((r:any)=>({...r,created_at:r.created_at||new Date().toISOString()})));if(error)throw error;}
   const {data:allItems,error:e1}=await db.from("inventory_items").select("*");if(e1)throw e1;
   const {data:allReports,error:e2}=await db.from("reports").select("*").order("created_at",{ascending:false});if(e2)throw e2;
   return json({items:allItems,reports:allReports});
  }
  return json({error:"Unknown action."},400);
 }catch(e){return json({error:String(e?.message||e)},500)}
});