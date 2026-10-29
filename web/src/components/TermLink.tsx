"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY, termByPlain, type GlossaryTerm } from "@/lib/glossary";

type ChartContext = {
  name?: string;
  rising?: string;
  time?: string;
  place?: string;
};

function chartLine(term: GlossaryTerm, ctx?: ChartContext): string | null {
  if (!ctx?.rising) return null;
  const who = ctx.name ? `${ctx.name}’s` : "this";
  if (term.id === "lagna") {
    const when = ctx.time ? ` at ${ctx.time}` : "";
    const where = ctx.place ? ` in ${ctx.place}` : "";
    return `${ctx.rising} was rising${when}${where}, so ${ctx.rising} is the 1st house and the count starts there.`;
  }
  if (term.id === "house") {
    return `In ${who} chart the houses count from ${ctx.rising} rising.`;
  }
  if (term.id === "sign") {
    return `${ctx.rising} is the rising sign here; every house takes its sign from that start.`;
  }
  if (term.id === "chart") {
    return `The rising box is ${ctx.rising}; signs stay put and the count walks from there.`;
  }
  return null;
}

function titleFor(term: GlossaryTerm) {
  if (term.chartLabel) return `${term.chartLabel} · ${term.plain}`;
  if (term.id === "lagna") return "Lagna · rising sign";
  return term.label;
}

function ExplainerBody({
  term,
  ctx,
  onRelated,
  onClose,
}: {
  term: GlossaryTerm;
  ctx?: ChartContext;
  onRelated: (id: string) => void;
  onClose: () => void;
}) {
  const here = chartLine(term, ctx);
  return (
    <>
      <div className="explainer__head">
        <h3 className="explainer__term">{titleFor(term)}</h3>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <p className="explainer__short">{term.short}</p>
      {here && (
        <div className="explainer__here">
          <strong>In {ctx?.name ? `${ctx.name}’s` : "this"} chart</strong>
          {here}
        </div>
      )}
      <p className="explainer__long">{term.long}</p>
      {term.seeAlso && term.seeAlso.length > 0 && (
        <div className="explainer__related">
          <span>See also</span>
          {term.seeAlso.map((id) => {
            const related = GLOSSARY[id];
            if (!related) return null;
            return (
              <button key={id} type="button" className="term" onClick={() => onRelated(id)}>
                {related.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function placePopover(
  pop: HTMLElement,
  anchor: { x: number; y: number },
  preferLeft: boolean,
) {
  const pad = 16;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  pop.style.visibility = "hidden";
  pop.style.left = "0px";
  pop.style.top = "0px";
  pop.style.maxWidth = `${Math.max(160, vw - pad * 2)}px`;
  const { width, height } = pop.getBoundingClientRect();

  let left = preferLeft ? anchor.x - width + 8 : anchor.x - 16;
  left = Math.min(Math.max(pad, left), vw - width - pad);

  let top = anchor.y + 12;
  if (top + height + pad > vh) top = anchor.y - height - 12;
  top = Math.min(Math.max(pad, top), Math.max(pad, vh - height - pad));

  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
  pop.style.visibility = "visible";
}

export function TermLink({
  termId,
  children,
  ctx,
  className,
}: {
  termId?: string;
  children: React.ReactNode;
  ctx?: ChartContext;
  className?: string;
}) {
  const reactId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [activeId, setActiveId] = useState(termId ?? "");
  const [narrow, setNarrow] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;

  const term =
    (activeId && GLOSSARY[activeId]) ||
    (typeof children === "string" ? termByPlain(children) : undefined) ||
    (termId ? GLOSSARY[termId] : undefined);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    if (!open || !term || narrow) return;
    const pop = popRef.current;
    if (!pop) return;

    const btn = btnRef.current?.getBoundingClientRect();
    const anchor = mousePos ?? (btn ? { x: btn.left, y: btn.bottom } : null);
    if (!anchor) return;
    const preferLeft = anchor.x > document.documentElement.clientWidth * 0.55;
    placePopover(pop, anchor, preferLeft);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinned(false);
        setOpen(false);
      }
    };
    const onDocPointer = (e: MouseEvent) => {
      if (!pinnedRef.current) return;
      const t = e.target as Node;
      if (pop.contains(t) || btnRef.current?.contains(t)) return;
      setPinned(false);
      setOpen(false);
    };
    const onReposition = () => {
      const nextBtn = btnRef.current?.getBoundingClientRect();
      const next = mousePos ?? (nextBtn ? { x: nextBtn.left, y: nextBtn.bottom } : null);
      if (!next) return;
      placePopover(pop, next, next.x > document.documentElement.clientWidth * 0.55);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocPointer);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocPointer);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, term, narrow, activeId, mousePos]);

  useEffect(() => {
    if (!open || !narrow) return;
    sheetRef.current?.showModal();
  }, [open, narrow]);

  useEffect(() => {
    if (!open && sheetRef.current?.open) sheetRef.current.close();
  }, [open]);

  useEffect(() => {
    return () => clearTimeout(hoverTimer.current);
  }, []);

  if (!term) {
    return <span className={className}>{children}</span>;
  }

  function closeAll() {
    setPinned(false);
    setOpen(false);
  }

  function toggle() {
    if (narrow) {
      setOpen((v) => !v);
      return;
    }
    if (pinned) {
      closeAll();
      return;
    }
    clearTimeout(hoverTimer.current);
    setActiveId(term!.id);
    setPinned(true);
    setOpen(true);
  }

  function openRelated(id: string) {
    setActiveId(id);
    setPinned(true);
    setOpen(true);
  }

  function handleMouseEnter(e: React.MouseEvent) {
    if (narrow || pinned) return;
    clearTimeout(hoverTimer.current);
    setMousePos({ x: e.clientX, y: e.clientY });
    setActiveId(term!.id);
    setOpen(true);
  }

  function handleMouseLeave() {
    if (narrow || pinned) return;
    hoverTimer.current = setTimeout(() => setOpen(false), 250);
  }

  function handlePopEnter() {
    clearTimeout(hoverTimer.current);
  }

  function handlePopLeave() {
    if (pinned) return;
    hoverTimer.current = setTimeout(() => setOpen(false), 250);
  }

  const explainer = (
    <ExplainerBody
      term={GLOSSARY[activeId] ?? term}
      ctx={ctx}
      onRelated={openRelated}
      onClose={closeAll}
    />
  );

  const popover =
    !narrow &&
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={popRef}
        id={`${reactId}-pop`}
        className="term-pop is-on"
        role="dialog"
        aria-label={term.label}
        onMouseEnter={handlePopEnter}
        onMouseLeave={handlePopLeave}
      >
        {explainer}
      </div>,
      document.body,
    );

  const sheet =
    narrow &&
    typeof document !== "undefined" &&
    createPortal(
      <dialog
        ref={sheetRef}
        className="term-sheet"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === sheetRef.current) setOpen(false);
        }}
      >
        <div className="term-sheet__panel">
          <span className="sheet__grip" aria-hidden />
          {open && explainer}
        </div>
      </dialog>,
      document.body,
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`term${className ? ` ${className}` : ""}`}
        aria-expanded={open}
        aria-controls={open ? `${reactId}-pop` : undefined}
        onClick={toggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </button>
      {popover}
      {sheet}
    </>
  );
}

export type { ChartContext };
