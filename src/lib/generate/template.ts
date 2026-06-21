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
// 额外：AI 常在 content 里直接写代码/命令（`-p "..."`、`echo "x"`）含未转义双引号，
// 遇到字符串内的 `"` 时用 lookahead 启发式判断：跳过空白后若紧跟 `,`/`}`/`:`/`]` 才是字符串结束，
// 否则视为 content 内的字面引号，转义为 `\"` 后继续。
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
    if (c === '"') {
      if (inString) {
        let j = i + 1;
        while (j < text.length && (text[j] === ' ' || text[j] === '\n' || text[j] === '\r' || text[j] === '\t')) j++;
        if (j < text.length && (text[j] === ',' || text[j] === '}' || text[j] === ':' || text[j] === ']')) {
          buf += c;
          inString = false;
          continue;
        }
        buf += '\\"';
        continue;
      }
      buf += c;
      inString = true;
      continue;
    }

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
