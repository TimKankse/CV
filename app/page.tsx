"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import sourceContent from "../cv.content.json";

type Language = "en" | "sv";
type LocalizedText = { en: string; sv: string };
type SectionKind = "text" | "entries" | "skills";
type TemplateName = "modern" | "classic" | "minimal";
type ThemeName = "forest" | "ink" | "slate" | "burgundy" | "custom";
type FontChoice = "humanist" | "serif" | "sans";
type HeadingStyle = "rule" | "label" | "plain";
type AppTheme = "light" | "dark";

type Contact = {
  id: string;
  label: LocalizedText;
  value: LocalizedText;
};

type CvEntry = {
  id: string;
  title: LocalizedText;
  organization: LocalizedText;
  years: LocalizedText;
  meta: LocalizedText;
  contentStyle: "bullets" | "paragraphs";
  content: LocalizedText[];
};

type SkillLine = {
  id: string;
  label: LocalizedText;
  value: LocalizedText;
};

type CvSection = {
  id: string;
  kind: SectionKind;
  heading: LocalizedText;
  headingStyle: HeadingStyle;
  compact: boolean;
  textStyle?: "paragraphs" | "bullets";
  content?: LocalizedText[];
  entries?: CvEntry[];
  skills?: SkillLine[];
};

type CvDocument = {
  person: {
    name: LocalizedText;
    headline: LocalizedText;
    contacts: Contact[];
  };
  sections: CvSection[];
};

type StyleSettings = {
  template: TemplateName;
  theme: ThemeName;
  accent: string;
  ink: string;
  font: FontChoice;
  typeScale: number;
  spacing: number;
  pageMargin: number;
  sectionRule: "full" | "short" | "none";
};

type RawLocalized = string | LocalizedText;
type RawItem = {
  title: RawLocalized;
  organization?: RawLocalized;
  years?: RawLocalized;
  meta?: RawLocalized;
  bullets?: RawLocalized[];
  paragraphs?: RawLocalized[];
};

const STORAGE_KEY = "folio-cv-studio-v1";

const languageLabels = {
  en: {
    content: "Content",
    design: "Design",
    preview: "Preview",
    edit: "Edit",
    saved: "Saved locally",
    saving: "Saving…",
    addSection: "Add section",
    details: "Personal details",
  },
  sv: {
    content: "Innehåll",
    design: "Design",
    preview: "Förhandsvisning",
    edit: "Redigera",
    saved: "Sparad lokalt",
    saving: "Sparar…",
    addSection: "Lägg till avsnitt",
    details: "Personuppgifter",
  },
} as const;

const themes: Record<Exclude<ThemeName, "custom">, { accent: string; ink: string }> = {
  forest: { accent: "#1f5c45", ink: "#18211d" },
  ink: { accent: "#24282d", ink: "#151719" },
  slate: { accent: "#3d5f78", ink: "#1b252c" },
  burgundy: { accent: "#7b3944", ink: "#261c1e" },
};

const defaultStyle: StyleSettings = {
  template: "modern",
  theme: "forest",
  accent: themes.forest.accent,
  ink: themes.forest.ink,
  font: "humanist",
  typeScale: 1,
  spacing: 1,
  pageMargin: 68,
  sectionRule: "full",
};

function localize(value: RawLocalized | undefined): LocalizedText {
  if (!value) return { en: "", sv: "" };
  return typeof value === "string" ? { en: value, sv: value } : { en: value.en, sv: value.sv };
}

function makeEntry(item: RawItem, sectionId: string, index: number): CvEntry {
  const paragraphContent = item.paragraphs?.map(localize) ?? [];
  const bulletContent = item.bullets?.map(localize) ?? [];
  return {
    id: `${sectionId}-item-${index}`,
    title: localize(item.title),
    organization: localize(item.organization),
    years: localize(item.years),
    meta: localize(item.meta),
    contentStyle: bulletContent.length ? "bullets" : "paragraphs",
    content: bulletContent.length ? bulletContent : paragraphContent,
  };
}

function makeEntrySection(
  id: string,
  raw: { heading: RawLocalized; items: RawItem[] },
): CvSection {
  return {
    id,
    kind: "entries",
    heading: localize(raw.heading),
    headingStyle: "rule",
    compact: false,
    entries: raw.items.map((item, index) => makeEntry(item, id, index)),
  };
}

function createInitialDocument(): CvDocument {
  const raw = sourceContent as unknown as {
    person: {
      name: RawLocalized;
      headline: RawLocalized;
      contact: Array<{ label: RawLocalized; value: RawLocalized }>;
    };
    profile: { heading: RawLocalized; paragraphs: RawLocalized[] };
    relevantExperience: { heading: RawLocalized; items: RawItem[] };
    experience: { heading: RawLocalized; items: RawItem[] };
    education: { heading: RawLocalized; items: RawItem[] };
    projects: { heading: RawLocalized; items: RawItem[] };
    skills: { heading: RawLocalized; items: Array<{ label: RawLocalized; value: RawLocalized }> };
  };

  return {
    person: {
      name: localize(raw.person.name),
      headline: localize(raw.person.headline),
      contacts: raw.person.contact.map((contact, index) => ({
        id: `contact-${index}`,
        label: localize(contact.label),
        value: localize(contact.value),
      })),
    },
    sections: [
      {
        id: "profile",
        kind: "text",
        heading: localize(raw.profile.heading),
        headingStyle: "rule",
        compact: false,
        textStyle: "paragraphs",
        content: raw.profile.paragraphs.map(localize),
      },
      makeEntrySection("relevant-experience", raw.relevantExperience),
      makeEntrySection("employment", raw.experience),
      makeEntrySection("education", raw.education),
      makeEntrySection("projects", raw.projects),
      {
        id: "skills",
        kind: "skills",
        heading: localize(raw.skills.heading),
        headingStyle: "rule",
        compact: true,
        skills: raw.skills.items.map((skill, index) => ({
          id: `skill-${index}`,
          label: localize(skill.label),
          value: localize(skill.value),
        })),
      },
    ],
  };
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function translated(value: LocalizedText, language: Language) {
  return value[language] || value[language === "en" ? "sv" : "en"];
}

function editTranslation(value: LocalizedText, language: Language, next: string): LocalizedText {
  return { ...value, [language]: next };
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

function IconButton({ label, onClick, children, disabled = false }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button className="icon-button" type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Home() {
  const [document, setDocument] = useState<CvDocument>(() => createInitialDocument());
  const [styles, setStyles] = useState<StyleSettings>(defaultStyle);
  const [language, setLanguage] = useState<Language>("en");
  const [activePanel, setActivePanel] = useState<"content" | "design">("content");
  const [activeSection, setActiveSection] = useState<string>("details");
  const [showAddSection, setShowAddSection] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [appTheme, setAppTheme] = useState<AppTheme>("light");
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  const ui = languageLabels[language];
  const selectedSection = document.sections.find((section) => section.id === activeSection);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { document?: CvDocument; styles?: StyleSettings; appTheme?: AppTheme };
        if (parsed.document?.sections?.length) setDocument(parsed.document);
        if (parsed.styles) setStyles({ ...defaultStyle, ...parsed.styles });
        if (parsed.appTheme === "light" || parsed.appTheme === "dark") setAppTheme(parsed.appTheme);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setAppTheme("dark");
      }
    } catch {
      // A private browsing policy can disable storage; editing still works in memory.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ document, styles, appTheme }));
      } catch {
        // Keep the editor usable even when local storage is unavailable.
      }
      setSaveState("saved");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [document, styles, appTheme, hydrated]);

  const previewVariables = useMemo(() => ({
    "--cv-accent": styles.accent,
    "--cv-ink": styles.ink,
    "--cv-scale": String(styles.typeScale),
    "--cv-spacing": String(styles.spacing),
    "--cv-margin": `${styles.pageMargin}px`,
    "--cv-font": styles.font === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : styles.font === "sans"
        ? "Inter, Arial, sans-serif"
        : "'Avenir Next', Inter, Arial, sans-serif",
  }) as CSSProperties, [styles]);

  function updatePersonField(field: "name" | "headline", value: string) {
    setDocument((current) => ({
      ...current,
      person: { ...current.person, [field]: editTranslation(current.person[field], language, value) },
    }));
  }

  function updateContact(contactId: string, field: "label" | "value", value: string) {
    setDocument((current) => ({
      ...current,
      person: {
        ...current.person,
        contacts: current.person.contacts.map((contact) => contact.id === contactId
          ? { ...contact, [field]: editTranslation(contact[field], language, value) }
          : contact),
      },
    }));
  }

  function addContact() {
    setDocument((current) => ({
      ...current,
      person: {
        ...current.person,
        contacts: [...current.person.contacts, { id: newId("contact"), label: { en: "Label", sv: "Etikett" }, value: { en: "", sv: "" } }],
      },
    }));
  }

  function removeContact(contactId: string) {
    setDocument((current) => ({ ...current, person: { ...current.person, contacts: current.person.contacts.filter((contact) => contact.id !== contactId) } }));
  }

  function updateSection(sectionId: string, updater: (section: CvSection) => CvSection) {
    setDocument((current) => ({ ...current, sections: current.sections.map((section) => section.id === sectionId ? updater(section) : section) }));
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    setDocument((current) => {
      const index = current.sections.findIndex((section) => section.id === sectionId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.sections.length) return current;
      const sections = [...current.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections };
    });
  }

  function removeSection(sectionId: string) {
    const section = document.sections.find((item) => item.id === sectionId);
    if (!section || !window.confirm(`Remove “${translated(section.heading, language)}”?`)) return;
    setDocument((current) => ({ ...current, sections: current.sections.filter((item) => item.id !== sectionId) }));
    setActiveSection("details");
  }

  function addSection(kind: "experience" | "education" | "text" | "bullets" | "skills") {
    const names = {
      experience: { en: "Experience", sv: "Erfarenhet" },
      education: { en: "Education", sv: "Utbildning" },
      text: { en: "New section", sv: "Nytt avsnitt" },
      bullets: { en: "Highlights", sv: "Höjdpunkter" },
      skills: { en: "Skills", sv: "Färdigheter" },
    };
    const id = newId("section");
    let section: CvSection;
    if (kind === "skills") {
      section = { id, kind: "skills", heading: names[kind], headingStyle: "rule", compact: true, skills: [{ id: newId("skill"), label: { en: "Category", sv: "Kategori" }, value: { en: "", sv: "" } }] };
    } else if (kind === "text" || kind === "bullets") {
      section = { id, kind: "text", heading: names[kind], headingStyle: "rule", compact: false, textStyle: kind === "bullets" ? "bullets" : "paragraphs", content: [{ en: "", sv: "" }] };
    } else {
      section = { id, kind: "entries", heading: names[kind], headingStyle: "rule", compact: false, entries: [{ id: newId("entry"), title: { en: "", sv: "" }, organization: { en: "", sv: "" }, years: { en: "", sv: "" }, meta: { en: "", sv: "" }, contentStyle: "bullets", content: [{ en: "", sv: "" }] }] };
    }
    setDocument((current) => ({ ...current, sections: [...current.sections, section] }));
    setActiveSection(id);
    setActivePanel("content");
    setShowAddSection(false);
  }

  function addEntry(sectionId: string) {
    updateSection(sectionId, (section) => ({
      ...section,
      entries: [...(section.entries ?? []), { id: newId("entry"), title: { en: "", sv: "" }, organization: { en: "", sv: "" }, years: { en: "", sv: "" }, meta: { en: "", sv: "" }, contentStyle: "bullets", content: [{ en: "", sv: "" }] }],
    }));
  }

  function updateEntry(sectionId: string, entryId: string, updater: (entry: CvEntry) => CvEntry) {
    updateSection(sectionId, (section) => ({ ...section, entries: section.entries?.map((entry) => entry.id === entryId ? updater(entry) : entry) }));
  }

  function removeEntry(sectionId: string, entryId: string) {
    updateSection(sectionId, (section) => ({ ...section, entries: section.entries?.filter((entry) => entry.id !== entryId) }));
  }

  function applyTheme(theme: Exclude<ThemeName, "custom">) {
    setStyles((current) => ({ ...current, theme, ...themes[theme] }));
  }

  function applyTemplate(template: TemplateName) {
    const templateDefaults: Record<TemplateName, Partial<StyleSettings>> = {
      modern: { font: "humanist", sectionRule: "full", pageMargin: 68, spacing: 1 },
      classic: { font: "serif", sectionRule: "short", pageMargin: 72, spacing: 1.04 },
      minimal: { font: "sans", sectionRule: "none", pageMargin: 64, spacing: .94 },
    };
    setStyles((current) => ({ ...current, template, ...templateDefaults[template] }));
  }

  function resetDocument() {
    if (!window.confirm("Reset the CV to the original project content?")) return;
    setDocument(createInitialDocument());
    setStyles(defaultStyle);
    setActiveSection("details");
  }

  function exportPdf() {
    const previousTitle = window.document.title;
    window.document.title = `${translated(document.person.name, language) || "CV"} — CV`;
    const restore = () => {
      window.document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  function renderSectionEditor(section: CvSection) {
    return (
      <div className="section-editor">
        <div className="editor-title-row">
          <div><span className="eyebrow">Section</span><h2>{translated(section.heading, language) || "Untitled section"}</h2></div>
          <IconButton label="Delete section" onClick={() => removeSection(section.id)}>×</IconButton>
        </div>
        <Field label="Section heading" value={translated(section.heading, language)} onChange={(value) => updateSection(section.id, (current) => ({ ...current, heading: editTranslation(current.heading, language, value) }))} />
        <div className="two-column-fields">
          <label className="field"><span>Heading style</span><select value={section.headingStyle} onChange={(event) => updateSection(section.id, (current) => ({ ...current, headingStyle: event.target.value as HeadingStyle }))}><option value="rule">Rule</option><option value="label">Label</option><option value="plain">Plain</option></select></label>
          <label className="check-field"><input type="checkbox" checked={section.compact} onChange={(event) => updateSection(section.id, (current) => ({ ...current, compact: event.target.checked }))} /><span>Compact spacing</span></label>
        </div>

        {section.kind === "text" && (
          <>
            <div className="segmented-control">
              <button className={section.textStyle === "paragraphs" ? "active" : ""} onClick={() => updateSection(section.id, (current) => ({ ...current, textStyle: "paragraphs" }))}>Paragraphs</button>
              <button className={section.textStyle === "bullets" ? "active" : ""} onClick={() => updateSection(section.id, (current) => ({ ...current, textStyle: "bullets" }))}>Bullet list</button>
            </div>
            <Field label={section.textStyle === "bullets" ? "One bullet per line" : "One paragraph per line"} multiline value={(section.content ?? []).map((line) => translated(line, language)).join("\n")} onChange={(value) => updateSection(section.id, (current) => ({ ...current, content: value.split("\n").map((line, index) => editTranslation(current.content?.[index] ?? { en: "", sv: "" }, language, line)) }))} />
          </>
        )}

        {section.kind === "entries" && (
          <div className="entry-stack">
            {(section.entries ?? []).map((entry, index) => (
              <div className="entry-card" key={entry.id}>
                <div className="entry-card-heading"><strong>Entry {index + 1}</strong><IconButton label="Remove entry" onClick={() => removeEntry(section.id, entry.id)}>×</IconButton></div>
                <div className="two-column-fields">
                  <Field label="Title" value={translated(entry.title, language)} onChange={(value) => updateEntry(section.id, entry.id, (current) => ({ ...current, title: editTranslation(current.title, language, value) }))} />
                  <Field label="Organization" value={translated(entry.organization, language)} onChange={(value) => updateEntry(section.id, entry.id, (current) => ({ ...current, organization: editTranslation(current.organization, language, value) }))} />
                </div>
                <div className="two-column-fields">
                  <Field label="Date or period" value={translated(entry.years, language)} onChange={(value) => updateEntry(section.id, entry.id, (current) => ({ ...current, years: editTranslation(current.years, language, value) }))} placeholder="2023–2025" />
                  <Field label="Supporting detail" value={translated(entry.meta, language)} onChange={(value) => updateEntry(section.id, entry.id, (current) => ({ ...current, meta: editTranslation(current.meta, language, value) }))} />
                </div>
                <div className="segmented-control compact-control">
                  <button className={entry.contentStyle === "bullets" ? "active" : ""} onClick={() => updateEntry(section.id, entry.id, (current) => ({ ...current, contentStyle: "bullets" }))}>Bullets</button>
                  <button className={entry.contentStyle === "paragraphs" ? "active" : ""} onClick={() => updateEntry(section.id, entry.id, (current) => ({ ...current, contentStyle: "paragraphs" }))}>Text</button>
                </div>
                <Field label="One item per line" multiline value={entry.content.map((line) => translated(line, language)).join("\n")} onChange={(value) => updateEntry(section.id, entry.id, (current) => ({ ...current, content: value.split("\n").map((line, lineIndex) => editTranslation(current.content[lineIndex] ?? { en: "", sv: "" }, language, line)) }))} />
              </div>
            ))}
            <button className="soft-button" onClick={() => addEntry(section.id)}>＋ Add entry</button>
          </div>
        )}

        {section.kind === "skills" && (
          <div className="entry-stack">
            {(section.skills ?? []).map((skill) => (
              <div className="skill-editor-row" key={skill.id}>
                <Field label="Category" value={translated(skill.label, language)} onChange={(value) => updateSection(section.id, (current) => ({ ...current, skills: current.skills?.map((item) => item.id === skill.id ? { ...item, label: editTranslation(item.label, language, value) } : item) }))} />
                <Field label="Skills" value={translated(skill.value, language)} onChange={(value) => updateSection(section.id, (current) => ({ ...current, skills: current.skills?.map((item) => item.id === skill.id ? { ...item, value: editTranslation(item.value, language, value) } : item) }))} />
                <IconButton label="Remove skill line" onClick={() => updateSection(section.id, (current) => ({ ...current, skills: current.skills?.filter((item) => item.id !== skill.id) }))}>×</IconButton>
              </div>
            ))}
            <button className="soft-button" onClick={() => updateSection(section.id, (current) => ({ ...current, skills: [...(current.skills ?? []), { id: newId("skill"), label: { en: "", sv: "" }, value: { en: "", sv: "" } }] }))}>＋ Add skill group</button>
          </div>
        )}
      </div>
    );
  }

  function renderPreviewSection(section: CvSection) {
    const heading = translated(section.heading, language);
    if (!heading) return null;
    return (
      <section className={`resume-section ${section.compact ? "compact" : ""} heading-${section.headingStyle}`} key={section.id}>
        <h3><span>{heading}</span></h3>
        {section.kind === "text" && section.textStyle === "bullets" ? (
          <ul className="resume-list">{(section.content ?? []).filter((line) => translated(line, language).trim()).map((line, index) => <li key={`${section.id}-text-${index}`}>{translated(line, language)}</li>)}</ul>
        ) : section.kind === "text" ? (
          <div className="resume-copy">{(section.content ?? []).filter((line) => translated(line, language).trim()).map((line, index) => <p key={`${section.id}-text-${index}`}>{translated(line, language)}</p>)}</div>
        ) : section.kind === "skills" ? (
          <div className="resume-skills">{(section.skills ?? []).filter((skill) => translated(skill.label, language) || translated(skill.value, language)).map((skill) => <p key={skill.id}><strong>{translated(skill.label, language)}{translated(skill.label, language) ? ":" : ""}</strong> {translated(skill.value, language)}</p>)}</div>
        ) : (
          <div className="resume-entries">{(section.entries ?? []).map((entry) => {
            const title = translated(entry.title, language);
            const organization = translated(entry.organization, language);
            const years = translated(entry.years, language);
            const meta = translated(entry.meta, language);
            if (!title && !organization && !entry.content.some((line) => translated(line, language))) return null;
            return (
              <article className="resume-entry" key={entry.id}>
                <div className="resume-entry-heading"><h4>{title}{organization && <><span aria-hidden="true"> · </span><em>{organization}</em></>}</h4>{years && <time>{years}</time>}</div>
                {meta && <p className="resume-meta">{meta}</p>}
                {entry.contentStyle === "bullets" ? (
                  <ul className="resume-list">{entry.content.filter((line) => translated(line, language).trim()).map((line, index) => <li key={`${entry.id}-line-${index}`}>{translated(line, language)}</li>)}</ul>
                ) : (
                  <div className="resume-copy">{entry.content.filter((line) => translated(line, language).trim()).map((line, index) => <p key={`${entry.id}-line-${index}`}>{translated(line, language)}</p>)}</div>
                )}
              </article>
            );
          })}</div>
        )}
      </section>
    );
  }

  return (
    <main className={`studio-shell app-theme-${appTheme}`}>
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">F</span><div><strong>Folio</strong><span>CV Studio</span></div></div>
        <div className="mobile-view-switch" aria-label="Mobile view">
          <button className={mobileView === "edit" ? "active" : ""} onClick={() => setMobileView("edit")}>{ui.edit}</button>
          <button className={mobileView === "preview" ? "active" : ""} onClick={() => setMobileView("preview")}>{ui.preview}</button>
        </div>
        <div className="top-actions">
          <span className={`save-state ${saveState}`}>{saveState === "saved" ? ui.saved : ui.saving}</span>
          <button
            className="theme-mode-button"
            onClick={() => setAppTheme((current) => current === "light" ? "dark" : "light")}
            aria-label={`Switch to ${appTheme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${appTheme === "light" ? "dark" : "light"} mode`}
          >
            <span aria-hidden="true">{appTheme === "light" ? "☾" : "☀"}</span>
            <span className="theme-mode-label">{appTheme === "light" ? "Dark" : "Light"}</span>
          </button>
          <button className="language-button" onClick={() => setLanguage((current) => current === "en" ? "sv" : "en")} aria-label="Switch editing language">{language.toUpperCase()}</button>
          <button className="primary-button" onClick={exportPdf}>Export PDF</button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`editor-panel ${mobileView === "preview" ? "mobile-hidden" : ""}`}>
          <div className="panel-tabs" role="tablist">
            <button role="tab" aria-selected={activePanel === "content"} className={activePanel === "content" ? "active" : ""} onClick={() => setActivePanel("content")}>{ui.content}</button>
            <button role="tab" aria-selected={activePanel === "design"} className={activePanel === "design" ? "active" : ""} onClick={() => setActivePanel("design")}>{ui.design}</button>
          </div>

          {activePanel === "content" ? (
            <div className="panel-scroll">
              <div className="document-heading"><div><span className="eyebrow">Document</span><h1>{translated(document.person.name, language) || "Untitled CV"}</h1></div></div>
              <div className="section-list" aria-label="CV sections">
                <div className={`section-row ${activeSection === "details" ? "active" : ""}`}><button className="section-select" onClick={() => setActiveSection("details")}><span className="section-number">00</span><span>{ui.details}</span></button></div>
                {document.sections.map((section, index) => (
                  <div className={`section-row ${activeSection === section.id ? "active" : ""}`} key={section.id}>
                    <button className="section-select" onClick={() => setActiveSection(section.id)}><span className="section-number">{String(index + 1).padStart(2, "0")}</span><span>{translated(section.heading, language) || "Untitled section"}</span></button>
                    <div className="reorder-controls"><IconButton label="Move section up" disabled={index === 0} onClick={() => moveSection(section.id, -1)}>↑</IconButton><IconButton label="Move section down" disabled={index === document.sections.length - 1} onClick={() => moveSection(section.id, 1)}>↓</IconButton></div>
                  </div>
                ))}
              </div>
              <button className="add-section" onClick={() => setShowAddSection(true)}>＋ {ui.addSection}</button>

              <div className="editor-divider" />
              {activeSection === "details" ? (
                <div className="section-editor">
                  <div className="editor-title-row"><div><span className="eyebrow">Header</span><h2>{ui.details}</h2></div></div>
                  <Field label="Full name" value={translated(document.person.name, language)} onChange={(value) => updatePersonField("name", value)} />
                  <Field label="Professional headline" value={translated(document.person.headline, language)} onChange={(value) => updatePersonField("headline", value)} />
                  <div className="entry-stack contacts-editor">
                    {document.person.contacts.map((contact) => (
                      <div className="contact-editor-row" key={contact.id}>
                        <Field label="Label" value={translated(contact.label, language)} onChange={(value) => updateContact(contact.id, "label", value)} />
                        <Field label="Value" value={translated(contact.value, language)} onChange={(value) => updateContact(contact.id, "value", value)} />
                        <IconButton label="Remove contact detail" onClick={() => removeContact(contact.id)}>×</IconButton>
                      </div>
                    ))}
                    <button className="soft-button" onClick={addContact}>＋ Add contact detail</button>
                  </div>
                </div>
              ) : selectedSection ? renderSectionEditor(selectedSection) : null}
            </div>
          ) : (
            <div className="panel-scroll design-panel">
              <div className="document-heading"><div><span className="eyebrow">Appearance</span><h1>Choose a direction</h1></div></div>
              <section className="design-group"><div className="design-group-heading"><h2>Layout template</h2><span>Always one column</span></div><div className="template-grid">
                {(["modern", "classic", "minimal"] as TemplateName[]).map((template) => <button className={`template-card ${styles.template === template ? "active" : ""}`} onClick={() => applyTemplate(template)} key={template}><span className={`template-mini mini-${template}`}><i /><b /><b /><b /></span><strong>{template[0].toUpperCase() + template.slice(1)}</strong></button>)}
              </div></section>
              <section className="design-group"><div className="design-group-heading"><h2>Theme</h2><span>Color only, never decoration</span></div><div className="theme-grid">
                {(Object.keys(themes) as Array<Exclude<ThemeName, "custom">>).map((theme) => <button className={`theme-option ${styles.theme === theme ? "active" : ""}`} onClick={() => applyTheme(theme)} key={theme}><span className="theme-swatch" style={{ background: themes[theme].accent }} /><span>{theme[0].toUpperCase() + theme.slice(1)}</span><i>✓</i></button>)}
              </div></section>
              <section className="design-group custom-controls"><div className="design-group-heading"><h2>Custom style</h2><span>Fine-tune the system</span></div>
                <div className="color-fields"><label className="color-field"><span>Accent</span><input type="color" value={styles.accent} onChange={(event) => setStyles((current) => ({ ...current, accent: event.target.value, theme: "custom" }))} /></label><label className="color-field"><span>Text</span><input type="color" value={styles.ink} onChange={(event) => setStyles((current) => ({ ...current, ink: event.target.value, theme: "custom" }))} /></label></div>
                <label className="field"><span>Type family</span><select value={styles.font} onChange={(event) => setStyles((current) => ({ ...current, font: event.target.value as FontChoice }))}><option value="humanist">Humanist sans</option><option value="sans">Neutral sans</option><option value="serif">Classic serif</option></select></label>
                <label className="range-field"><span><b>Type size</b><em>{Math.round(styles.typeScale * 100)}%</em></span><input type="range" min="0.88" max="1.12" step="0.02" value={styles.typeScale} onChange={(event) => setStyles((current) => ({ ...current, typeScale: Number(event.target.value) }))} /></label>
                <label className="range-field"><span><b>Vertical spacing</b><em>{Math.round(styles.spacing * 100)}%</em></span><input type="range" min="0.78" max="1.2" step="0.02" value={styles.spacing} onChange={(event) => setStyles((current) => ({ ...current, spacing: Number(event.target.value) }))} /></label>
                <label className="range-field"><span><b>Page margins</b><em>{styles.pageMargin}px</em></span><input type="range" min="44" max="88" step="2" value={styles.pageMargin} onChange={(event) => setStyles((current) => ({ ...current, pageMargin: Number(event.target.value) }))} /></label>
                <label className="field"><span>Section divider</span><select value={styles.sectionRule} onChange={(event) => setStyles((current) => ({ ...current, sectionRule: event.target.value as StyleSettings["sectionRule"] }))}><option value="full">Full rule</option><option value="short">Short rule</option><option value="none">No rule</option></select></label>
              </section>
              <button className="reset-button" onClick={resetDocument}>Reset document and style</button>
            </div>
          )}
        </aside>

        <section className={`preview-stage ${mobileView === "edit" ? "mobile-hidden-preview" : ""}`} aria-label="CV preview">
          <div className="preview-toolbar"><span>{ui.preview}</span><span>A4 · Live</span></div>
          <article className={`cv-page template-${styles.template} rule-${styles.sectionRule}`} style={previewVariables}>
            <header className="resume-header">
              <p className="resume-headline">{translated(document.person.headline, language)}</p>
              <h2>{translated(document.person.name, language)}</h2>
              <div className="resume-contacts">{document.person.contacts.filter((contact) => translated(contact.value, language).trim()).map((contact) => <span key={contact.id}>{translated(contact.value, language)}</span>)}</div>
            </header>
            <div className="resume-body">{document.sections.map(renderPreviewSection)}</div>
          </article>
        </section>
      </div>

      {showAddSection && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowAddSection(false)}>
          <div className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-section-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><span className="eyebrow">Structure</span><h2 id="add-section-title">Add a section</h2><p>Start with a useful structure, then rename and arrange it however you like.</p></div><IconButton label="Close" onClick={() => setShowAddSection(false)}>×</IconButton></div>
            <div className="section-type-grid">
              <button onClick={() => addSection("experience")}><strong>Experience</strong><span>Roles, projects or client work</span></button>
              <button onClick={() => addSection("education")}><strong>Education</strong><span>Courses, degrees or training</span></button>
              <button onClick={() => addSection("skills")}><strong>Skills list</strong><span>Simple categories without ratings</span></button>
              <button onClick={() => addSection("text")}><strong>Custom text</strong><span>Free-form paragraphs</span></button>
              <button onClick={() => addSection("bullets")}><strong>Custom list</strong><span>A clean list for anything else</span></button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;
