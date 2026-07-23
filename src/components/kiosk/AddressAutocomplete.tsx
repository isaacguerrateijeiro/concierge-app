"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

export interface AddressPick {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPick: (pick: AddressPick) => void;
  placeholder: string;
  loadingLabel: string;
  emptyLabel: string;
  attributionLabel: string;
  inputStyle: CSSProperties;
  minChars?: number;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
  loadingLabel,
  emptyLabel,
  attributionLabel,
  inputStyle,
  minChars = 3,
}: AddressAutocompleteProps) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AddressPick[]>([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const q = value.trim();
    if (q.length < minChars) {
      setItems([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const seq = ++seqRef.current;
    const ctrl = new AbortController();
    setLoading(true);
    setOpen(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode/autocomplete?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as {
          suggestions?: Array<{
            id: string;
            label: string;
            lat: number;
            lon: number;
          }>;
        };
        if (seq !== seqRef.current) return;
        const next = (data.suggestions ?? []).map((s) => ({
          id: s.id,
          label: s.label,
          lat: s.lat,
          lon: s.lon,
        }));
        setItems(next);
        setActive(next.length ? 0 : -1);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        if (seq !== seqRef.current) return;
        setItems([]);
        setActive(-1);
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [value, minChars]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(item: AddressPick) {
    onPick(item);
    onChange(item.label);
    setOpen(false);
    setItems([]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showPanel = open && value.trim().length >= minChars;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= minChars) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {showPanel && (
        <div
          id={listId}
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 6px)",
            zIndex: 20,
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 16,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            overflow: "hidden",
            maxHeight: 360,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && items.length === 0 ? (
              <div style={hintStyle}>{loadingLabel}</div>
            ) : items.length === 0 ? (
              <div style={hintStyle}>{emptyLabel}</div>
            ) : (
              items.map((item, idx) => {
                const selected = idx === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className="tap"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => pick(item)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderBottom: "1px solid var(--line)",
                      padding: "18px 20px",
                      background: selected ? "rgba(22,20,15,0.06)" : "#fff",
                      cursor: "pointer",
                      fontFamily: "var(--sans)",
                      fontSize: 19,
                      color: "var(--ink)",
                      lineHeight: 1.35,
                    }}
                  >
                    {item.label}
                  </button>
                );
              })
            )}
          </div>
          <div
            style={{
              padding: "10px 16px",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--muted)",
              borderTop: "1px solid var(--line)",
              background: "rgba(22,20,15,0.03)",
            }}
          >
            {attributionLabel}
          </div>
        </div>
      )}
    </div>
  );
}

const hintStyle: CSSProperties = {
  padding: "20px",
  fontFamily: "var(--sans)",
  fontSize: 17,
  color: "var(--muted)",
};
