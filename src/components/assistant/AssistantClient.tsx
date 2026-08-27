"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IntentChips } from "./IntentChips";
import { ResultTable } from "./ResultTable";
import type { AssistantAnswer } from "@/lib/ai/assistantEngine";
import { useLocale } from "@/lib/i18n/LocaleContext";

interface Turn {
  id: string;
  question: string;
  status: "loading" | "done" | "error";
  answer?: AssistantAnswer;
  error?: string;
}

let turnSeq = 0;

export function AssistantClient({
  initialQuery,
  focusedSkuId,
  focusedSkuName,
}: {
  initialQuery?: string;
  focusedSkuId?: string;
  focusedSkuName?: string;
}) {
  const { locale, t, tList } = useLocale();
  const [input, setInput] = useState(initialQuery ?? "");
  const [turns, setTurns] = useState<Turn[]>([]);
  const ranInitial = useRef(false);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    const id = `turn-${++turnSeq}`;
    setTurns((prev) => [...prev, { id, question: trimmed, status: "loading" }]);
    setInput("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, skuId: focusedSkuId, locale }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const answer: AssistantAnswer = await res.json();
      setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, status: "done", answer } : turn)));
    } catch (err) {
      setTurns((prev) =>
        prev.map((turn) => (turn.id === id ? { ...turn, status: "error", error: (err as Error).message } : turn))
      );
    }
  }

  useEffect(() => {
    if (ranInitial.current) return;
    ranInitial.current = true;
    if (initialQuery) void ask(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exampleQuestions = tList("assistant.exampleQuestions");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold text-(--text-primary)">{t("assistant.title")}</h1>
      <p className="mt-1 text-sm text-(--text-secondary)">{t("assistant.subtitle")}</p>

      {focusedSkuId ? (
        <div className="mt-3 rounded-md border border-(--series-1) bg-(--surface-card) px-3 py-2 text-xs text-(--text-secondary)">
          {t("assistant.focusedSkuBanner", { sku: focusedSkuName ?? focusedSkuId })}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("assistant.inputPlaceholder")}
          className="flex-1 rounded-md border border-(--border-hairline) bg-(--surface-card) px-3 py-2 text-sm text-(--text-primary) outline-none focus:border-(--series-1)"
        />
        <button
          type="submit"
          className="rounded-md bg-(--series-1) px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t("assistant.askButton")}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {exampleQuestions.map((q) => (
          <button
            key={q}
            onClick={() => void ask(q)}
            className="rounded-full border border-(--border-hairline) px-2.5 py-1 text-xs text-(--text-secondary) hover:border-(--series-1) hover:text-(--series-1)"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {turns.map((turn) => (
          <TurnBlock key={turn.id} turn={turn} />
        ))}
      </div>
    </div>
  );
}

function TurnBlock({ turn }: { turn: Turn }) {
  const { t } = useLocale();

  return (
    <div className="rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-(--text-muted)">{t("assistant.stage.question")}</div>
        <div className="mt-1 text-sm font-medium text-(--text-primary)">{turn.question}</div>
      </div>

      {turn.status === "loading" ? (
        <div className="mt-4 text-sm text-(--text-secondary)">{t("assistant.analyzing")}</div>
      ) : turn.status === "error" ? (
        <div className="mt-4 text-sm text-(--status-critical)">
          {t("assistant.errorPrefix", { message: turn.error ?? "" })}
        </div>
      ) : turn.answer ? (
        <>
          <div className="mt-4 border-t border-(--border-hairline) pt-4">
            <div className="text-[10px] uppercase tracking-wide text-(--text-muted)">{t("assistant.stage.analysis")}</div>
            <div className="mt-2">
              <IntentChips parsed={turn.answer.parsed} />
            </div>
          </div>

          <div className="mt-4 border-t border-(--border-hairline) pt-4">
            <div className="text-[10px] uppercase tracking-wide text-(--text-muted)">{t("assistant.stage.results")}</div>
            <div className="mt-2">
              <ResultTable rows={turn.answer.resultRows} />
            </div>
          </div>

          <div className="mt-4 border-t border-(--border-hairline) pt-4">
            <div className="text-[10px] uppercase tracking-wide text-(--text-muted)">{t("assistant.stage.explanation")}</div>
            <ul className="mt-2 space-y-1.5 text-sm text-(--text-secondary)">
              {turn.answer.explanation.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {turn.answer.resultRows[0] ? (
              <div className="mt-3 flex gap-3 text-xs">
                <Link href={`/inventory/${turn.answer.resultRows[0].skuId}`} className="text-(--series-1) hover:underline">
                  {t("assistant.links.viewInventory")}
                </Link>
                <Link href="/dashboard" className="text-(--series-1) hover:underline">
                  {t("assistant.links.viewDashboard")}
                </Link>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
