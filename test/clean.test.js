// Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { jobIdFrom, cleanJob } = require("../clean.js");

const fixture = (id) => fs.readFileSync(path.join(__dirname, "fixtures", id + ".md"), "utf8");
const CLUTTER = [/\]\(/, /https?:\/\//, /!\[/, /\*\*/, /Show more/, /Referrals increase/, /See who/,
  /Sign in/, /Report this job/, /Email or phone/, /^(Be among|Over \d+).*applicants$/m, /Direct message/, /^Apply/m, /^Save/m];

test("jobIdFrom reads every LinkedIn link shape", () => {
  assert.equal(jobIdFrom("https://www.linkedin.com/jobs/view/4489026961/"), "4489026961");
  assert.equal(jobIdFrom("https://ca.linkedin.com/jobs/view/account-executive-at-progress-luv2pak-4489026961?trk=x"), "4489026961");
  assert.equal(jobIdFrom("https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4489033601&x=1"), "4489033601");
  assert.equal(jobIdFrom("  4489026961 "), "4489026961");
  assert.equal(jobIdFrom("https://www.linkedin.com/feed/"), null);
  assert.equal(jobIdFrom(""), null);
});

test("4489026961: header, description and criteria, no clutter", () => {
  const out = cleanJob(fixture("4489026961"));
  assert.ok(out.startsWith("Account Executive\nProgress Luv2Pak\nToronto, Ontario, Canada\n\nAccount Executive\n\nHelp Canada"), out.slice(0, 200));
  assert.match(out, /^Job Type: Full-time, Permanent$/m);
  assert.match(out, /^• Grow and support existing accounts/m);
  assert.match(out, /Then apply through this posting on Indeed or LinkedIn, or on our websites\.\n\nSeniority level: Mid-Senior level\nEmployment type: Full-time\nIndustries: Packaging & Containers$/);
  for (const re of CLUTTER) assert.doesNotMatch(out, re);
});

test("4489033601: pay range, no recruiter box, no clutter", () => {
  const out = cleanJob(fixture("4489033601"));
  assert.ok(out.startsWith(
    "Business Development Executive\nTruGreen\nToronto, Ontario, Canada\nPay: $60,000.00/yr - $65,000.00/yr (plus commission)\n\nJob Description\n\nProfessional B2B"),
    out.slice(0, 300));
  assert.match(out, /^• Customer Focus: Building strong/m);
  assert.match(out, /^• Action Oriented: Taking on/m);
  assert.doesNotMatch(out, /Ryan Riggin|provided pay range|This range is provided/);
  assert.match(out, /\n\nSeniority level: Mid-Senior level\nEmployment type: Full-time\nIndustries: Consumer Services$/);
  for (const re of CLUTTER) assert.doesNotMatch(out, re);
});

test("4489033601 in Jina's short shape (no header, no Show more line)", () => {
  const out = cleanJob(fixture("4489033601-short"));
  assert.ok(out.startsWith("Pay: $60,000.00/yr - $65,000.00/yr (plus commission)\n\nJob Description\n\n"), out.slice(0, 200));
  assert.match(out, /\n\nSeniority level: Mid-Senior level\nEmployment type: Full-time\nIndustries: Consumer Services$/);
  for (const re of CLUTTER) assert.doesNotMatch(out, re);
});
