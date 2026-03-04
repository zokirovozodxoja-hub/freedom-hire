import { Suspense } from "react";
import AuthClient from "./AuthClient";

export default function AuthPage() {
 return (
 <Suspense fallback={<div style={{ minHeight:"100vh", background:"#0b1220", color:"#fff", display:"grid", placeItems:"center" }}><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{borderColor:"rgba(196,173,255,0.2)",borderTopColor:"#C4ADFF"}} /></div>}>
 <AuthClient />
 </Suspense>
 );
}
