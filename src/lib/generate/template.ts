export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function extractJson<T = any>(text: string): T | null {
  return (
    relaxParse(text) ??
    strictParse(text)
  );
}

// 宽松 JSON 解析：用括号配对找边界，把 JSON 字符串内的真实换行/制表符转义成 \n \t
// 解决 AI 在 JSON 字符串里输出未转义换行（"## 标题\n\n正文"）导致 parse 失败的问题
function relaxParse(text: string): any | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let buf = '';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];

    if (escape) { buf += c; escape = false; continue; }
    if (c === '\\' && inString) { buf += c; escape = true; continue; }
    if (c === '"') { buf += c; inString = !inString; continue; }

    if (inString) {
      // 字符串内的控制字符：转义成 JSON 合法形式
      if (c === '\n') buf += '\\n';
      else if (c === '\r') buf += '\\r';
      else if (c === '\t') buf += '\\t';
      else buf += c;
      continue;
    }

    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        buf += c;
        try { return JSON.parse(buf); } catch { return null; }
      }
    }
    buf += c;
  }
  return null;
}

// 严格 JSON 解析（贪婪正则）
function strictParse(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
