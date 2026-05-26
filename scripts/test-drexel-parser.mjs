import assert from "node:assert/strict";
import { log } from "node:console";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const { parseDrexelInterviewText } = await import("../src/lib/drexelParser.ts");

const samplePath = process.env.DREXEL_IMPORT_SAMPLE ?? "pasted_import.rtfd/TXT.rtf";

const assertNoDuplicateLinks = (records) => {
  records.forEach((record) => {
    const urls = (record.links ?? []).map((link) => link.url.toLowerCase());
    assert.equal(new Set(urls).size, urls.length, `${record.position} has duplicate links`);
  });
};

const htmlFixture = `
  <table>
    <tr>
      <td>
        <a href="https://banner.drexel.edu/duprod/hwczkslib.P_StudentJobDisplay?i_job_num=111111">
          Data Analyst Co-op (111111)
        </a>
        &nbsp;&curren;&nbsp;<strong>Employer:</strong>&nbsp;Acme Analytics (9001)
        <br>Job Length:&nbsp;2 terms&nbsp;&curren;&nbsp;General Job Location:&nbsp;Philadelphia
      </td>
      <td>Interview:<br>Employer Site</td>
    </tr>
    <tr><td>Interview status:&nbsp;Accepted</td><td></td></tr>
    <tr>
      <td>
        <a href="https://banner.drexel.edu/duprod/hwczkslib.P_StudentJobDisplay?i_job_num=222222">
          Software Engineering Co-op (222222)
        </a>
        &nbsp;&curren;&nbsp;<strong>Employer:</strong>&nbsp;BuildCo (9002)
        <br>Job Length:&nbsp;1 term&nbsp;&curren;&nbsp;General Job Location:&nbsp;Remote
      </td>
      <td>Interview:<br>Employer will contact student</td>
    </tr>
    <tr><td>Interview status:&nbsp;Accepted</td><td></td></tr>
  </table>
`;

const plainFixture = `
Data Analyst Co-op (111111) ¤ Employer: Acme Analytics (9001)
Job Length: 2 terms ¤ General Job Location: Philadelphia
Interview:
Employer Site
Interview status: Accepted

Software Engineering Co-op (222222) ¤ Employer: BuildCo (9002)
Job Length: 1 term ¤ General Job Location: Remote
Interview:
Employer will contact student
Interview status: Accepted
`;

const htmlRecords = parseDrexelInterviewText(htmlFixture);
assert.equal(htmlRecords.length, 2);
assert.equal(htmlRecords[0].position, "Data Analyst Co-op");
assert.equal(htmlRecords[1].position, "Software Engineering Co-op");
assert.equal(htmlRecords[0].company, "Acme Analytics");
assert.equal(htmlRecords[1].company, "BuildCo");
assert.equal(htmlRecords[0].pipeline, "Student Needs to Contact Employer");
assert.equal(htmlRecords[1].pipeline, "Waiting for Employer to Contact Student");
assert.equal(htmlRecords[0].links?.length, 1);
assert.equal(htmlRecords[1].links?.length, 1);
assert.match(htmlRecords[0].jobDescriptionLink ?? "", /i_job_num=111111/);
assert.match(htmlRecords[1].jobDescriptionLink ?? "", /i_job_num=222222/);
assert.doesNotMatch(htmlRecords[0].jobDescriptionLink ?? "", /222222/);
assert.doesNotMatch(htmlRecords[1].jobDescriptionLink ?? "", /111111/);
assertNoDuplicateLinks(htmlRecords);

const plainRecords = parseDrexelInterviewText(plainFixture);
assert.equal(plainRecords.length, 2);
assert.equal(plainRecords[0].position, "Data Analyst Co-op");
assert.equal(plainRecords[1].position, "Software Engineering Co-op");
assert.equal(plainRecords[0].links?.length, 0);
assert.equal(plainRecords[1].links?.length, 0);

if (existsSync(samplePath)) {
  const sampleRecords = parseDrexelInterviewText(readFileSync(samplePath, "utf8"));
  assert.equal(sampleRecords.length, 15);
  assert.equal(sampleRecords[0].position, "20821 - Project Management - PECO - Project Controls (Alan Yun)");
  assert.equal(sampleRecords[1].position, "Comcast Data Management Co-op");
  assert.equal(sampleRecords[2].position, "Comcast Data Products and Governance Co-op");
  assert.equal(sampleRecords[0].links?.length, 1);
  assert.match(sampleRecords[0].jobDescriptionLink ?? "", /i_job_num=440851/);
  assert.match(sampleRecords[1].jobDescriptionLink ?? "", /i_job_num=447447/);
  assert.doesNotMatch(sampleRecords[0].jobDescriptionLink ?? "", /447447/);
  assertNoDuplicateLinks(sampleRecords);
}

log("Drexel parser tests passed.");
