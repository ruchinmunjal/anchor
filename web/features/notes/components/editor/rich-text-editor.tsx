"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import type { QuillDelta } from "@/features/notes";
import { parseStoredContent, stringifyDelta } from "@/features/notes";
import { QuillToolbar } from "./quill-toolbar";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false }) as any;

// Quill instance type - react-quill-new doesn't export proper types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuillInstance = any;

interface RichTextEditorProps {
  value: string;
  onChange: (nextStoredContent: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  className,
}: RichTextEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);
  const [quill, setQuill] = useState<QuillInstance | null>(null);

  const deltaValue: QuillDelta = useMemo(() => parseStoredContent(value), [value]);

  const modules = useMemo(
    () => ({
      toolbar: false,
      history: {
        delay: 1000,
        maxStack: 200,
        userOnly: true,
      },
    }),
    [],
  );

  const formats = useMemo(
    () => [
      "bold",
      "italic",
      "underline",
      "strike",
      "header",
      "list", // ordered, bullet, checked/unchecked
      "blockquote",
      "code-block",
      "link",
    ],
    [],
  );

  return (
    <div className={className}>
      <QuillToolbar quill={quill} />
      <div className="anchor-quill">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value={deltaValue as any}
          onChange={(
            _html: string,
            _delta: unknown,
            source: "user" | "api" | "silent" | string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor: any,
          ) => {
            // Prevent initial hydration/normalization from triggering autosave.
            if (source !== "user") return;

            // Always store canonical JSON as { ops: [...] }
            const next = stringifyDelta(editor.getContents());
            onChange(next);
          }}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          onFocus={() => {
            const q = quillRef.current?.getEditor?.();
            if (q) setQuill(q);
          }}
        />
      </div>
    </div>
  );
}
