// Turns a LinkedIn job link into a job id, and the r.jina.ai markdown of a
// LinkedIn guest job posting into plain text for pasting into a form.
(function (root) {
  "use strict";

  function jobIdFrom(input) {
    var s = String(input || "").trim();
    var m =
      s.match(/[?&]currentJobId=(\d{6,})/) ||
      s.match(/\/jobs\/view\/(?:[^/?#]*?-)?(\d{6,})(?=[/?#]|$)/) ||
      s.match(/^(\d{6,})$/);
    return m ? m[1] : null;
  }

  // Lines of LinkedIn page chrome above the description: sign-in modals,
  // the Apply/Save/Report bar, applicant counts and the recruiter box.
  var CHROME_LINK = /\]\(https?:\/\/[a-z.]*linkedin\.com\/(login|uas\/|signup|legal\/|in\/|company\/|jobs\/view\/)/;
  var CHROME_TEXT = [
    /^(email or phone|password|show|or|sign in with email|apply|save|apply save)$/i,
    /^#+ (sign in|join or sign in|use ai to)/i,
    /^join to save /i,
    /^get ai-powered advice/i,
    /^am i a good fit/i,
    /^direct message the job poster/i,
    /^(be among the first \d+|over \d+|\d+) applicants$/i,
    /^\d+ (second|minute|hour|day|week|month)s? ago$/i,
    /^reposted /i,
  ];
  // The description ends at "Show more Show less", or at the job criteria
  // list or referral box when Jina leaves that line out.
  var DESCRIPTION_END = /^show more\s+show less$|^\*\s+### |^referrals increase/i;
  var PAY_HEADING = /^### (base pay range|additional compensation types)$/i;

  function isChrome(line) {
    var t = line.trim();
    if (CHROME_LINK.test(t)) return true;
    var bare = t.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
    return CHROME_TEXT.some(function (re) { return re.test(bare); });
  }

  function linkText(s) {
    return s
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  }

  function inline(s) {
    return linkText(s)
      .replace(/\*\*([^*]*?):\*\*(?=\S)/g, "$1: ")
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g, "$1")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function toPlain(lines) {
    var out = lines.map(function (line) {
      var m = line.match(/^(\s*)[*+-]\s+(.*)$/);
      if (m) return (m[1].length >= 2 ? "  " : "") + "• " + inline(m[2]);
      m = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (m) return m[1] + ". " + inline(m[2]);
      return inline(line.replace(/^\s*#+\s*/, ""));
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function nextValue(lines, i) {
    for (var j = i + 1; j < lines.length; j++) {
      var t = lines[j].trim();
      if (t) return /^#|^\*\s/.test(t) ? "" : inline(t);
    }
    return "";
  }

  function cleanJob(markdown) {
    var text = String(markdown || "");
    var cut = text.indexOf("Markdown Content:");
    if (cut >= 0) text = text.slice(cut + "Markdown Content:".length);
    var lines = text.replace(/\r/g, "").split("\n");

    var title = "", company = "", location = "", base = "", extra = "";
    var end = -1, start = 0;
    lines.forEach(function (line, i) {
      var t = line.trim(), m;
      if (!title && (m = t.match(/^## \[(.+?)\]\(/))) { title = inline(m[1]); start = i + 1; }
      else if (!company && (m = t.match(/^#### \[(.+?)\]\([^)]*\)\s*(.*)$/))) {
        company = inline(m[1]);
        location = inline(m[2]);
      }
      else if (/^### Base pay range$/i.test(t)) base = nextValue(lines, i);
      else if (/^### Additional compensation types$/i.test(t)) extra = nextValue(lines, i);
      else if (end < 0 && DESCRIPTION_END.test(t)) end = i;
    });

    // The description starts after the last bit of page chrome, and after
    // the pay box when there is one.
    if (end < 0) end = lines.length;
    for (var i = start; i < end; i++) {
      var t = lines[i].trim();
      if (isChrome(t)) start = i + 1;
      else if (PAY_HEADING.test(t)) {
        while (i + 1 < end && !lines[i + 1].trim()) i++;
        start = i + 2; // the heading's value line belongs to the pay box too
      }
    }
    var body = lines.slice(start, end).filter(function (l) { return !isChrome(l); });

    // Job criteria (Seniority level, Employment type, ...) follow the description.
    var criteria = [];
    for (var k = end; k < lines.length; k++) {
      var c = lines[k].trim();
      if (/^referrals increase/i.test(c)) break;
      var h = c.match(/^(?:\*\s+)?### (.+)$/);
      if (h) {
        var v = nextValue(lines, k);
        if (v) criteria.push(inline(h[1]) + ": " + v);
      }
    }

    var head = [title, company, location].filter(Boolean);
    if (base) head.push("Pay: " + base + (extra ? " (plus " + extra.toLowerCase() + ")" : ""));
    var parts = [head.join("\n"), toPlain(body), criteria.join("\n")];
    return parts.filter(Boolean).join("\n\n").trim();
  }

  var api = { jobIdFrom: jobIdFrom, cleanJob: cleanJob };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.JobText = api;
})(this);
