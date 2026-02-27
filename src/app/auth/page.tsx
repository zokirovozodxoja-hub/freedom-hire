import { Suspense } from "react";
import AuthClient from "./AuthClient";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "#0b1220",
            color: "#fff",
            display: "grid",
            placeItems: "center",
          }}
        >
          Загрузка...
        </div>
      }
    >
      <AuthClient />
    </Suspense>
  );
}
