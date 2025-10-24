"use client";

import { JiraButtonsProps } from "@/app/types/jira";
import { useState } from "react";

export default function JiraButtons({projectId, report}: JiraButtonsProps) {

  const [, setResult] = useState<unknown>(null);
  const [, setLoading] = useState(false);
  const [, setError] = useState<unknown>(null);

  const handleTicketCreation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/jira/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId, report }),
      });
      const data = await res.json();
      

      if (!res.ok) {
        setError(data);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError({ error: "Unexpected error", details: e });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => handleTicketCreation()}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Create Ticket
      </button>
    </div>
  );
}