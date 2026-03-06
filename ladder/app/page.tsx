"use client";

import { ChangeEvent, useEffect, useState, useTransition } from "react";

type ResultState =
  | { type: "idle" }
  | { type: "pick"; value: string }
  | { type: "shuffle"; value: string[] };

const sampleNames = ["민지", "지훈", "서연", "도윤", "하린"];

function normalizeItems(raw: string): string[] {
  return raw
    .split(/\r?\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNamesQuery(queryValue: string): string[] {
  return queryValue
    .split(",")
    .map((item) => {
      try {
        return decodeURIComponent(item).trim();
      } catch {
        return item.trim();
      }
    })
    .filter(Boolean);
}

function buildShareUrl(items: string[]): string {
  const url = new URL(window.location.href);

  if (items.length === 0) {
    url.searchParams.delete("names");
  } else {
    const encoded = items.map((item) => encodeURIComponent(item)).join(",");
    url.searchParams.set("names", encoded);
  }

  return url.toString();
}

function shuffleItems(items: string[]): string[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export default function HomePage() {
  const [textareaValue, setTextareaValue] = useState("");
  const [result, setResult] = useState<ResultState>({ type: "idle" });
  const [message, setMessage] = useState("이름을 입력하거나 txt 파일을 불러오세요.");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const items = normalizeItems(textareaValue);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const namesParam = params.get("names");

    if (!namesParam) {
      return;
    }

    const parsed = parseNamesQuery(namesParam);
    if (parsed.length === 0) {
      return;
    }

    setTextareaValue(parsed.join("\n"));
    setMessage("공유 링크에서 목록을 불러왔습니다.");
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function ensureItems(): boolean {
    if (items.length > 0) {
      return true;
    }

    setMessage("최소 한 개 이상의 항목이 필요합니다.");
    return false;
  }

  function handlePickOne() {
    if (!ensureItems()) {
      return;
    }

    startTransition(() => {
      const chosen = items[Math.floor(Math.random() * items.length)];
      setResult({ type: "pick", value: chosen });
      setMessage("랜덤 선택이 완료되었습니다.");
    });
  }

  function handleShuffle() {
    if (!ensureItems()) {
      return;
    }

    startTransition(() => {
      setResult({ type: "shuffle", value: shuffleItems(items) });
      setMessage("전체 순서를 섞었습니다.");
    });
  }

  function handleReset() {
    setResult({ type: "idle" });
    setMessage("결과를 초기화했습니다.");
  }

  async function handleCopyUrl() {
    const shareUrl = buildShareUrl(items);

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setMessage("공유 링크를 복사했습니다.");
    } catch {
      setMessage("클립보드 복사에 실패했습니다.");
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.includes("text") && !file.name.endsWith(".txt")) {
      setMessage("텍스트 파일만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      setTextareaValue(normalizeItems(text).join("\n"));
      setResult({ type: "idle" });
      setMessage(`${file.name} 파일을 불러왔습니다.`);
    } catch {
      setMessage("파일을 읽지 못했습니다.");
    } finally {
      event.target.value = "";
    }
  }

  function loadSample() {
    setTextareaValue(sampleNames.join("\n"));
    setResult({ type: "idle" });
    setMessage("예시 목록을 적용했습니다.");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-mist text-ink">
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(208,238,222,0.95),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(240,138,93,0.18),_transparent_30%),linear-gradient(180deg,_#fcfaf5_0%,_#f4efe4_100%)]" />
        <div className="absolute left-1/2 top-24 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-white/40 blur-3xl" />

        <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <div className="animate-fade-in-up rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-glow backdrop-blur md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 inline-flex rounded-full border border-moss/15 bg-moss/5 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-moss uppercase">
                  Team Random Selector
                </p>
                <h1 className="font-display text-4xl font-semibold leading-tight text-moss sm:text-5xl">
                  메뉴, 순서, 역할을
                  <span className="block text-ember">한 번에 랜덤 선택</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-ink/75 sm:text-base">
                  회식 메뉴 결정, 발표 순서 정하기, 팀 내 가벼운 추첨을 위한 모바일 우선 랜덤 선택기입니다.
                  줄바꿈으로 목록을 붙여넣거나 txt 파일을 업로드한 뒤 바로 공유 링크까지 만들 수 있습니다.
                </p>
              </div>

              <div className="grid gap-3 rounded-[1.5rem] bg-moss p-4 text-white sm:grid-cols-3 lg:w-[24rem] lg:grid-cols-1">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Candidates</p>
                  <strong className="mt-2 block text-3xl font-semibold">{items.length}</strong>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Source</p>
                  <span className="mt-2 block text-sm text-white/85">
                    URL, 입력, txt 파일
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Mobile</p>
                  <span className="mt-2 block text-sm text-white/85">
                    작은 화면에서도 바로 사용
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="animate-fade-in-up rounded-[2rem] border border-moss/10 bg-white p-5 shadow-glow [animation-delay:120ms] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-moss">후보 목록</h2>
                  <p className="mt-1 text-sm text-ink/65">한 줄에 하나씩 입력하세요. 중복 항목도 그대로 유지됩니다.</p>
                </div>
                <button
                  type="button"
                  onClick={loadSample}
                  className="rounded-full border border-moss/15 px-4 py-2 text-sm font-medium text-moss transition hover:border-moss/35 hover:bg-moss/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                >
                  예시 불러오기
                </button>
              </div>

              <div className="mt-5">
                <label htmlFor="names" className="sr-only">
                  후보 목록 입력
                </label>
                <textarea
                  id="names"
                  value={textareaValue}
                  onChange={(event) => {
                    setTextareaValue(event.target.value);
                    setResult({ type: "idle" });
                  }}
                  placeholder={"민지\n지훈\n서연\n도윤"}
                  className="min-h-72 w-full rounded-[1.5rem] border border-moss/10 bg-[#fffdf8] px-4 py-4 text-base leading-7 text-ink outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-center rounded-[1.25rem] border border-dashed border-moss/20 bg-moss/5 px-4 py-4 text-sm font-medium text-moss transition hover:border-moss/40 hover:bg-moss/10 focus-within:border-moss/40 focus-within:bg-moss/10">
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                  txt 파일 불러오기
                </label>

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="rounded-[1.25rem] bg-ember px-4 py-4 text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                >
                  {copied ? "링크 복사됨" : "공유 링크 복사"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handlePickOne}
                  disabled={isPending}
                  className="rounded-[1.25rem] bg-moss px-4 py-4 text-sm font-semibold text-white transition hover:bg-moss/92 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                >
                  한 명 선택
                </button>
                <button
                  type="button"
                  onClick={handleShuffle}
                  disabled={isPending}
                  className="rounded-[1.25rem] bg-leaf px-4 py-4 text-sm font-semibold text-white transition hover:bg-leaf/92 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                >
                  순서 섞기
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-[1.25rem] border border-moss/15 px-4 py-4 text-sm font-semibold text-moss transition hover:border-moss/35 hover:bg-moss/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                >
                  결과 초기화
                </button>
              </div>

              <p className="mt-4 rounded-2xl bg-[#f8f4ea] px-4 py-3 text-sm text-ink/70">
                공유 URL 형식 예시: <span className="font-medium text-moss">`/?names=민지,지훈,서연`</span>
              </p>
            </section>

            <section className="animate-fade-in-up rounded-[2rem] border border-moss/10 bg-[#fdfbf6] p-5 shadow-glow [animation-delay:240ms] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-moss">결과</h2>
                  <p className="mt-1 text-sm text-ink/65">현재 상태와 최근 실행 결과를 확인합니다.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/60 shadow-sm">
                  {isPending ? "처리 중" : "준비됨"}
                </span>
              </div>

              <div className="mt-5 rounded-[1.75rem] bg-moss p-5 text-white" aria-live="polite">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Status</p>
                <p className="mt-3 text-sm leading-6 text-white/85">{message}</p>
              </div>

              <div className="mt-5 min-h-[22rem] rounded-[1.75rem] border border-moss/10 bg-white p-5" aria-live="polite">
                {result.type === "idle" ? (
                  <div className="flex h-full min-h-[18rem] flex-col items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,_rgba(216,239,227,0.7),_rgba(255,255,255,0.95))] p-6 text-center">
                    <div className="h-20 w-20 rounded-full bg-[linear-gradient(135deg,_#18392b,_#4d7c62)] p-[1px]">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-3xl">?</div>
                    </div>
                    <h3 className="mt-5 font-display text-2xl font-semibold text-moss">준비 완료</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-ink/65">
                      목록을 입력한 뒤 한 명 선택 또는 순서 섞기를 실행하세요. 결과는 이 영역에 강조되어 표시됩니다.
                    </p>
                  </div>
                ) : null}

                {result.type === "pick" ? (
                  <div className="animate-card-pop flex min-h-[18rem] flex-col justify-between rounded-[1.5rem] bg-[linear-gradient(160deg,_#18392b_0%,_#2f5f49_55%,_#f08a5d_160%)] p-6 text-white">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>Random Pick</span>
                      <span>1명 선택</span>
                    </div>
                    <div className="my-10">
                      <p className="bg-[length:200%_100%] bg-clip-text text-5xl font-semibold tracking-tight text-transparent animate-shimmer [background-image:linear-gradient(90deg,_rgba(255,255,255,0.58),_rgba(255,255,255,1),_rgba(255,255,255,0.58))] sm:text-6xl">
                        {result.value}
                      </p>
                    </div>
                    <p className="text-sm leading-6 text-white/78">바로 발표를 시작하거나 다음 결정을 이어갈 수 있습니다.</p>
                  </div>
                ) : null}

                {result.type === "shuffle" ? (
                  <div className="animate-card-pop rounded-[1.5rem] bg-[#fffaf0] p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-display text-xl font-semibold text-moss">랜덤 순서</h3>
                      <span className="rounded-full bg-moss px-3 py-1 text-xs font-semibold text-white">
                        {result.value.length} items
                      </span>
                    </div>
                    <ol className="grid gap-3">
                      {result.value.map((item, index) => (
                        <li
                          key={`${item}-${index}`}
                          className="flex items-center gap-4 rounded-[1.25rem] border border-moss/10 bg-white px-4 py-3 shadow-sm"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky font-display text-sm font-semibold text-moss">
                            {index + 1}
                          </span>
                          <span className="min-w-0 break-words text-sm font-medium text-ink sm:text-base">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-moss/10 bg-white px-4 py-4 text-sm leading-6 text-ink/68">
                줄바꿈 입력과 txt 업로드를 기본으로 지원합니다. URL 공유는 `names` 쿼리에 콤마 구분값을 사용하므로,
                이름 자체에 콤마가 포함된 경우는 초기 버전에서 권장하지 않습니다.
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
