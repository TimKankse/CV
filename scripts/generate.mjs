import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentPath = resolve(projectRoot, "cv.content.json");
const languages = ["en", "sv"];

const content = JSON.parse(await readFile(contentPath, "utf8"));

function translate(value, language, field = "value") {
  if (typeof value === "string") return value;

  if (value && typeof value[language] === "string") {
    return value[language];
  }

  throw new Error(`Missing ${language} translation for ${field}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function text(value, language, field) {
  return escapeHtml(translate(value, language, field));
}

function renderContact(contact, language) {
  return content.person.contact
    .map((item, index) => {
      const label = text(item.label, language, `person.contact[${index}].label`);
      const value = text(item.value, language, `person.contact[${index}].value`);
      const renderedValue = item.href
        ? `<a href="${escapeHtml(item.href)}">${value}</a>`
        : value;

      return `          <p><span>${label}:</span> <strong>${renderedValue}</strong></p>`;
    })
    .join("\n");
}

function renderParagraphs(paragraphs = [], language, field) {
  return paragraphs
    .map(
      (paragraph, index) =>
        `          <p>${text(paragraph, language, `${field}.paragraphs[${index}]`)}</p>`,
    )
    .join("\n");
}

function renderItems(items, language, field) {
  return items
    .map((item, index) => {
      const itemField = `${field}.items[${index}]`;
      const organization = item.organization
        ? ` <span aria-hidden="true">|</span> ${text(item.organization, language, `${itemField}.organization`)}`
        : "";
      const meta = item.meta
        ? `\n          <p class="meta">${text(item.meta, language, `${itemField}.meta`)}</p>`
        : "";
      const paragraphs = item.paragraphs?.length
        ? `\n${renderParagraphs(item.paragraphs, language, itemField)}`
        : "";
      const bullets = item.bullets?.length
        ? `\n          <ul>\n${item.bullets
            .map(
              (bullet, bulletIndex) =>
                `            <li>${text(bullet, language, `${itemField}.bullets[${bulletIndex}]`)}</li>`,
            )
            .join("\n")}\n          </ul>`
        : "";

      return `        <article>
          <h3>${text(item.title, language, `${itemField}.title`)}${organization}</h3>${meta}${paragraphs}${bullets}
        </article>`;
    })
    .join("\n");
}

function renderSection(sectionName, language) {
  const section = content[sectionName];
  const body = section.items
    ? renderItems(section.items, language, sectionName)
    : renderParagraphs(section.paragraphs, language, sectionName);

  return `      <section id="${sectionName}">
        <h2>${text(section.heading, language, `${sectionName}.heading`)}</h2>
${body}
      </section>`;
}

function renderSkills(language) {
  const skillLines = content.skills.items
    .map(
      (item, index) =>
        `        <p><strong>${text(item.label, language, `skills.items[${index}].label`)}:</strong> ${text(item.value, language, `skills.items[${index}].value`)}</p>`,
    )
    .join("\n");

  return `      <section id="skills">
        <h2>${text(content.skills.heading, language, "skills.heading")}</h2>
${skillLines}
      </section>`;
}

function renderDocument(language) {
  const name = text(content.person.name, language, "person.name");

  return `<!doctype html>
<!-- Generated from cv.content.json. Run \`npm run build\` instead of editing this file. -->
<html lang="${language}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${name} – CV (${language.toUpperCase()})</title>
    <link rel="stylesheet" href="CV.css" />
  </head>
  <body>
    <main>
      <header>
        <h1>${name}</h1>
        <p class="headline">${text(content.person.headline, language, "person.headline")}</p>
        <div class="contact-details">
${renderContact(content.person.contact, language)}
        </div>
      </header>
${renderSection("profile", language)}
${renderSection("experience", language)}
${renderSection("education", language)}
${renderSection("projects", language)}
${renderSkills(language)}
    </main>
  </body>
</html>
`;
}

for (const language of languages) {
  const outputPath = resolve(projectRoot, `CV.${language}.html`);
  await writeFile(outputPath, renderDocument(language), "utf8");
  console.log(`Generated ${outputPath}`);
}

// Keep the original URL working; it is the English version.
await writeFile(resolve(projectRoot, "CV.html"), renderDocument("en"), "utf8");
console.log(`Generated ${resolve(projectRoot, "CV.html")}`);
