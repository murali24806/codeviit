"use client"

import { useRef, useEffect, useState } from "react"
import { ZoomIn, ZoomOut } from "lucide-react"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
}

export function CodeEditor({ value, onChange, language }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)
  const [highlighted, setHighlighted] = useState("")
  const [fontSize, setFontSize] = useState(16) // Default larger 16px font size

  useEffect(() => {
    const lines = value.split("\n").length
    setLineCount(Math.max(lines, 25))
    setHighlighted(highlightCode(value, language))
  }, [value, language])

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    const start = target.selectionStart
    const end = target.selectionEnd

    if (e.key === "Tab") {
      e.preventDefault()
      if (e.shiftKey) {
        // Shift+Tab: Unindent
        const lineStart = value.lastIndexOf("\n", start - 1) + 1
        const lineEnd = value.indexOf("\n", end)
        const actualEnd = lineEnd === -1 ? value.length : lineEnd
        const targetText = value.substring(lineStart, actualEnd)
        const unindented = targetText.replace(/^(  |\t)/gm, "")
        const diff = targetText.length - unindented.length
        const newValue = value.substring(0, lineStart) + unindented + value.substring(actualEnd)
        onChange(newValue)
        setTimeout(() => {
          target.selectionStart = Math.max(lineStart, start - (diff > 0 ? 2 : 0))
          target.selectionEnd = Math.max(lineStart, end - diff)
        }, 0)
      } else if (start !== end) {
        // Block Indent
        const lineStart = value.lastIndexOf("\n", start - 1) + 1
        const lineEnd = value.indexOf("\n", end)
        const actualEnd = lineEnd === -1 ? value.length : lineEnd
        const targetText = value.substring(lineStart, actualEnd)
        const indented = targetText.replace(/^/gm, "  ")
        const addedCount = (targetText.match(/^/gm) || []).length * 2
        const newValue = value.substring(0, lineStart) + indented + value.substring(actualEnd)
        onChange(newValue)
        setTimeout(() => {
          target.selectionStart = start + 2
          target.selectionEnd = end + addedCount
        }, 0)
      } else {
        // Single Tab
        const newValue = value.substring(0, start) + "  " + value.substring(end)
        onChange(newValue)
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 2
        }, 0)
      }
    }

    if (e.key === "Enter") {
      e.preventDefault()
      const lines = value.substring(0, start).split("\n")
      const currentLine = lines[lines.length - 1]
      const indentMatch = currentLine.match(/^(\s+)/)
      const indent = indentMatch ? indentMatch[1] : ""
      const lastChar = value.substring(0, start).trim().slice(-1)
      const extraIndent = ["{", "(", "[", ":"].includes(lastChar) ? "  " : ""
      const newValue = value.substring(0, start) + "\n" + indent + extraIndent + value.substring(end)
      onChange(newValue)
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 1 + indent.length + extraIndent.length
      }, 0)
    }

    if (e.key === "Backspace" && start === end) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1
      const beforeCursor = value.substring(lineStart, start)
      if (beforeCursor.length > 0 && beforeCursor.trim() === "" && beforeCursor.length % 2 === 0) {
        e.preventDefault()
        const newValue = value.substring(0, start - 2) + value.substring(start)
        onChange(newValue)
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start - 2
        }, 0)
      }
    }

    const pairs: Record<string, string> = { "{": "}", "(": ")", "[": "]" }
    if (pairs[e.key] && start === end) {
      e.preventDefault()
      const newValue = value.substring(0, start) + e.key + pairs[e.key] + value.substring(end)
      onChange(newValue)
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 1
      }, 0)
    }
  }

  const getLanguageColor = () => {
    const colors: Record<string, string> = {
      cpp: "#f97316", c: "#94a3b8", python: "#60a5fa",
      javascript: "#fbbf24", typescript: "#60a5fa",
      java: "#f87171", go: "#34d399", rust: "#fb923c",
      kotlin: "#a78bfa", swift: "#f472b6",
    }
    return colors[language] || "#94a3b8"
  }

  const getFileExtension = () => {
    const exts: Record<string, string> = {
      cpp: "cpp", c: "c", python: "py", javascript: "js",
      typescript: "ts", java: "java", go: "go", rust: "rs",
      kotlin: "kt", swift: "swift", php: "php", ruby: "rb"
    }
    return exts[language] || "txt"
  }

  const lineHeightPx = Math.round(fontSize * 1.5)

  return (
    <div
      className="rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl flex flex-col h-full"
      style={{ background: "#1e1e1e" }}
    >
      {/* Editor Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] shrink-0"
        style={{ background: "#252526" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400">
            solution.{getFileExtension()}
          </span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full border font-semibold"
            style={{
              color: getLanguageColor(),
              borderColor: getLanguageColor() + "40",
              background: getLanguageColor() + "15"
            }}
          >
            {language}
          </span>
        </div>

        {/* Font Size Controls */}
        <div className="flex items-center gap-1 bg-black/40 border border-white/10 px-2 py-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setFontSize(prev => Math.max(12, prev - 1))}
            className="text-zinc-400 hover:text-white p-0.5"
            title="Decrease Font Size"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-zinc-300 px-1">{fontSize}px</span>
          <button
            type="button"
            onClick={() => setFontSize(prev => Math.min(26, prev + 1))}
            className="text-zinc-400 hover:text-white p-0.5"
            title="Increase Font Size"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex flex-1 min-h-[500px] overflow-hidden">

        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 overflow-hidden select-none py-4 px-3"
          style={{
            width: "56px",
            background: "#1e1e1e",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className="text-right font-mono font-medium"
              style={{
                color: "#6e7681",
                fontSize: `${fontSize}px`,
                lineHeight: `${lineHeightPx}px`,
                height: `${lineHeightPx}px`
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Syntax Highlighted Display */}
        <div
          className="absolute left-[56px] top-0 right-0 bottom-0 py-4 px-4 font-mono pointer-events-none overflow-hidden whitespace-pre"
          style={{
            color: "#d4d4d4",
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeightPx}px`
          }}
          dangerouslySetInnerHTML={{
            __html: highlighted || `<span style="color:#6e7681">// Write your ${language} solution here...</span>`
          }}
        />

        {/* Actual Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 bg-transparent outline-none font-mono py-4 px-4 resize-none w-full border-none focus:ring-0"
          style={{
            minHeight: "500px",
            caretColor: "#007acc",
            color: "transparent",
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeightPx}px`,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  )
}

function highlightCode(code: string, language: string): string {
  if (!code) return ""

  const keywordsMap: Record<string, string[]> = {
    cpp: ["int", "void", "return", "if", "else", "for", "while", "do", "break", "continue", "using", "namespace", "std", "cout", "cin", "endl", "auto", "const", "class", "struct", "bool", "true", "false", "nullptr", "new", "delete", "public", "private", "protected", "long", "char", "double", "float", "short", "unsigned", "signed", "static", "inline", "virtual", "override", "template", "typename", "include", "define"],
    c: ["int", "void", "return", "if", "else", "for", "while", "do", "break", "continue", "printf", "scanf", "char", "float", "double", "long", "short", "unsigned", "signed", "struct", "typedef", "const", "static", "NULL", "malloc", "free", "sizeof", "enum", "include", "define"],
    python: ["def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "import", "from", "class", "True", "False", "None", "print", "range", "len", "break", "continue", "pass", "lambda", "with", "as", "try", "except", "finally", "raise", "global", "self", "yield", "is"],
    javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "break", "continue", "class", "new", "this", "import", "export", "default", "true", "false", "null", "undefined", "typeof", "instanceof", "async", "await", "try", "catch", "finally", "throw", "switch", "case"],
    typescript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "break", "continue", "class", "new", "this", "import", "export", "default", "true", "false", "null", "undefined", "typeof", "instanceof", "async", "await", "try", "catch", "finally", "throw", "switch", "case", "type", "interface", "string", "number", "boolean", "any"],
    java: ["int", "void", "return", "if", "else", "for", "while", "break", "continue", "class", "public", "private", "protected", "static", "new", "this", "true", "false", "null", "import", "package", "String", "boolean", "long", "double", "float", "char", "final", "abstract", "interface", "extends", "implements", "try", "catch", "finally", "throw", "System", "out", "println"],
    go: ["func", "return", "if", "else", "for", "break", "continue", "var", "const", "type", "struct", "import", "package", "true", "false", "nil", "new", "make", "len", "cap", "append", "range", "map", "go", "defer", "select", "switch", "case", "default", "interface", "fmt", "Println", "Printf"],
    rust: ["fn", "return", "if", "else", "for", "while", "break", "continue", "let", "mut", "const", "struct", "enum", "impl", "use", "mod", "pub", "true", "false", "None", "Some", "Ok", "Err", "match", "loop", "move", "ref", "self", "trait", "type", "async", "await", "println"]
  }

  const keywordSet = new Set(keywordsMap[language] || keywordsMap.cpp)

  const lines = code.split("\n")
  const highlightedLines = lines.map(line => {
    let i = 0
    let out = ""
    const len = line.length

    while (i < len) {
      if (i === 0 && (language === "cpp" || language === "c") && line[i] === "#") {
        const rest = escapeHtml(line)
        return `<span style="color:#e06c75">${rest}</span>`
      }

      if (language === "python" && line[i] === "#") {
        const comment = escapeHtml(line.slice(i))
        out += `<span style="color:#6e7681;font-style:italic">${comment}</span>`
        break
      }
      if (language !== "python" && line[i] === "/" && line[i + 1] === "/") {
        const comment = escapeHtml(line.slice(i))
        out += `<span style="color:#6e7681;font-style:italic">${comment}</span>`
        break
      }

      if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
        const quote = line[i]
        let str = quote
        i++
        while (i < len && line[i] !== quote) {
          if (line[i] === "\\") {
            str += line[i]
            i++
            if (i < len) str += line[i]
          } else {
            str += line[i]
          }
          i++
        }
        if (i < len) {
          str += line[i]
          i++
        }
        out += `<span style="color:#98c379">${escapeHtml(str)}</span>`
        continue
      }

      if (/[0-9]/.test(line[i]) && (i === 0 || !/[a-zA-Z0-9_]/.test(line[i - 1]))) {
        let num = ""
        while (i < len && /[0-9.]/.test(line[i])) {
          num += line[i]
          i++
        }
        out += `<span style="color:#d19a66">${escapeHtml(num)}</span>`
        continue
      }

      if (/[a-zA-Z_]/.test(line[i])) {
        let ident = ""
        while (i < len && /[a-zA-Z0-9_]/.test(line[i])) {
          ident += line[i]
          i++
        }
        if (keywordSet.has(ident)) {
          out += `<span style="color:#c678dd;font-weight:600">${escapeHtml(ident)}</span>`
        } else if (i < len && line[i] === "(") {
          out += `<span style="color:#61afef">${escapeHtml(ident)}</span>`
        } else if (/^[A-Z]/.test(ident)) {
          out += `<span style="color:#e5c07b">${escapeHtml(ident)}</span>`
        } else {
          out += escapeHtml(ident)
        }
        continue
      }

      out += escapeHtml(line[i])
      i++
    }

    return out
  })

  return highlightedLines.join("\n")
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
