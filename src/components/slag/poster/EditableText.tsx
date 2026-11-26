import { useLayoutEffect, useRef, type CSSProperties, type ElementType } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange?: (v: string) => void;
  editable?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  multiline?: boolean;
  /** Element key, so the studio can find and outline this exact piece. */
  elementKey?: string;
  /** Outline this text as the selected element. */
  selected?: boolean;
  /** Called when the text is clicked or focused in the editor. */
  onActivate?: () => void;
}

/**
 * Inline-editable text. Uncontrolled while focused so the caret never jumps;
 * every keystroke still updates the campaign document immediately.
 */
export function EditableText({ value, onChange, editable, as: Tag = "div", className, style, placeholder, multiline, elementKey, selected, onActivate }: Props) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !editable) return;
    if (document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value, editable]);

  if (!editable) {
    if (!value) return null;
    return (
      <Tag className={className} style={style}>
        {value}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      data-el={elementKey}
      className={cn(
        className,
        onActivate && "rounded-[4px] outline-offset-4 transition-[outline-color]",
        onActivate && (selected ? "outline-2 outline-solid outline-primary" : "outline-1 outline-dashed outline-transparent hover:outline-primary/70"),
      )}
      style={{ ...style, cursor: "text", whiteSpace: multiline ? "pre-wrap" : undefined }}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      onClick={onActivate ? (e: React.MouseEvent) => { e.stopPropagation(); onActivate(); } : undefined}
      onFocus={onActivate}
      onInput={(e: React.FormEvent<HTMLElement>) => onChange?.((e.currentTarget as HTMLElement).innerText.replace(/\n$/, ""))}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
        if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
      }}
      onPaste={(e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, multiline ? text : text.replace(/\n/g, " "));
      }}
    />
  );
}
