"use client"
import Image from "next/image"
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"
import { Card, CardContent } from "./components/ui/card"
import { Report } from "@/types/report";
import { useState } from "react"

export default function Home() {

  const [repoUrl, setRepoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Report | null>(null)

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl }),
    })

    const data = await response.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-3xl font-bold text-center flex items-center justify-center gap-2">
            <Image
              src="/github.svg"
              alt="DebtCheck Logo"    
              width={40}
              height={40} 
            />
          </h1>
          <p className="text-center text-gray-600">
            Drop your GitHub repo URL and we&apos;ll analyze it for technical debt.
          </p>
            <div className="flex gap-2">
            <Input
              placeholder="https://github.com/user/your-repo"
              value={repoUrl}
              onChange={(e: { target: { value: string } }) => setRepoUrl(e.target.value)}
              className="flex-1 placeholder-gray-500 text-gray-600"
            />
            <Button onClick={handleAnalyze} disabled={loading || !repoUrl}>
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
            </div>

          {result && (
            <div className="mt-4 text-gray-600 border rounded p-4">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
