import { useState } from "react";
import { seedSampleData } from "../lib/adminApi";

export default function AdminSeed() {
    const [token, setToken] = useState("");
    const [basicUser, setBasicUser] = useState("");
    const [basicPass, setBasicPass] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const doSeed = async () => {
        setRunning(true);
        setResult(null);
        try {
            const data = await seedSampleData(token || undefined, basicUser || undefined, basicPass || undefined);
            setResult(`OK: user=${data.user_id} trip=${data.trip_id}`);
        } catch (err) {
            const error = err as Error;
            setResult(`Error: ${error?.message || String(err)}`);
        } finally {
            setRunning(false);
        }
    };

    return (
        <section className="mx-auto max-w-2xl p-6 text-[#50300d]">
            <h1 className="font-[Adamina] text-2xl">Admin: Seed Demo Data</h1>
            <p className="mt-2 mb-4">This page calls the protected seed endpoint. Provide the admin token and press Seed.</p>

            <label className="block mb-3">
                <span className="font-[Adamina] text-sm">Admin token</span>
                <input value={token} onChange={(e) => setToken(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </label>

            <p className="text-sm text-[#50300d] mb-2">Optional: if your deployment requires Basic Auth, provide credentials below.</p>
            <label className="block mb-3">
                <span className="font-[Adamina] text-sm">Basic auth user</span>
                <input value={basicUser} onChange={(e) => setBasicUser(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </label>
            <label className="block mb-3">
                <span className="font-[Adamina] text-sm">Basic auth password</span>
                <input type="password" value={basicPass} onChange={(e) => setBasicPass(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
            </label>

            <div className="flex gap-3">
                <button onClick={doSeed} disabled={running} className="rounded bg-[#5a392b] px-4 py-2 text-[#ffead4]">
                    {running ? 'Seeding…' : 'Seed demo data'}
                </button>
            </div>

            {result && <pre className="mt-4 rounded border p-3 bg-[#fff7ee]">{result}</pre>}
        </section>
    );
}
