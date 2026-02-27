import AuthClient from "./AuthClient";

export default function AuthPage() {
<<<<<<< HEAD
  return <AuthClient />;
=======
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
>>>>>>> 186304f (fix: unify supabase client exports)
}
