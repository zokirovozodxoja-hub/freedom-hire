import { supabase } from "../lib/supabase";

export default async function Home() {
  const { data, error } = await supabase.from("jobs").select("*");

  return (
    <pre>
      {error
        ? "ERROR:\n" + JSON.stringify(error, null, 2)
        : "DATA:\n" + JSON.stringify(data, null, 2)}
    </pre>
  );
}