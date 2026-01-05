"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
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
  readOnly?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  className,
  readOnly = false,
}: RichTextEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);
  // Store quill instance in ref to avoid re-renders that cause focus issues
  const quillInstanceRef = useRef<QuillInstance | null>(null);
  // Track focus state to enable/disable toolbar event subscriptions
  const [isFocused, setIsFocused] = useState(false);
  // Counter to force toolbar updates during typing/selection changes
  const [toolbarUpdateKey, setToolbarUpdateKey] = useState(0);

  const deltaValue: QuillDelta = useMemo(() => parseStoredContent(value), [value]);

  // Get quill instance from ref - callable by toolbar
  const getQuillInstance = useCallback(() => quillInstanceRef.current, []);

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
      {!readOnly && (
        <QuillToolbar
          getQuill={getQuillInstance}
          isFocused={isFocused}
          updateKey={toolbarUpdateKey}
        />
      )}
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
            if (readOnly) return;

            // Always store canonical JSON as { ops: [...] }
            const next = stringifyDelta(editor.getContents());
            onChange(next);
            // Trigger toolbar update for format changes during typing
            setToolbarUpdateKey((k) => k + 1);
          }}
          onChangeSelection={() => {
            // Trigger toolbar update when selection changes (for format state)
            if (isFocused) {
              setToolbarUpdateKey((k) => k + 1);
            }
          }}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={readOnly}
          onFocus={() => {
            if (readOnly) return;
            const q = quillRef.current?.getEditor?.();
            if (q) {
              quillInstanceRef.current = q;
              setIsFocused(true);
            }
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
        />
      </div>
    </div>
  );
}
