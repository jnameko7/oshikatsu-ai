import { createClient } from "@supabase/supabase-js";

export default async function handler(req,res){
  if(req.method !== "POST") return res.status(405).json({error:"POST only"});
  const data = req.body || {};
  if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY){
    console.log("anonymous data:", data);
    return res.status(200).json({ok:true, mode:"log-only"});
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase.from("anonymous_diagnosis").insert({
    type:data.type || null,
    total:data.total ?? data.yearly ?? data.yearlySaving ?? null,
    monthly:data.monthly ?? data.monthlySaving ?? null,
    income:data.income ?? null,
    raw:data
  });
  if(error) return res.status(500).json({error:error.message});
  return res.status(200).json({ok:true});
}