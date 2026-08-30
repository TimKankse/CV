"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import sourceContent from "../cv.content.json";

type Language = string;
type LocalizedText = Record<string, string>;
type SectionKind = "text" | "entries" | "skills";
type TemplateName = "modern" | "classic" | "minimal";
type ThemeName = "forest" | "ink" | "slate" | "burgundy" | "custom";
type FontChoice = "humanist" | "serif" | "sans";
type HeadingStyle = "rule" | "label" | "plain";
type AppTheme = "light" | "dark";
type ViewMode = "library" | "editor";

type CvLanguage = {
  id: string;
  label: string;
  shortLabel: string;
};

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
  languages: CvLanguage[];
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

type CvRecord = {
  id: string;
  title: string;
  document: CvDocument;
  styles: StyleSettings;
  createdAt: number;
  updatedAt: number;
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

const LEGACY_STORAGE_KEY = "folio-cv-studio-v1";
const THEME_STORAGE_KEY = "folio-cv-studio-theme";
const CACHE_STORAGE_KEY = "folio-cv-studio-cache-v2";

const defaultLanguages: CvLanguage[] = [
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "sv", label: "Swedish", shortLabel: "SV" },
];

const languageLabels = {
  en: {
    content: "Content",
    design: "Design",
    preview: "Preview",
    edit: "Edit",
    saved: "Saved",
    saving: "Saving…",
    saveError: "Sync pending",
    addSection: "Add section",
    details: "Personal details",
    sections: "CV sections",
    backToSections: "All sections",
    editingLanguage: "Editing",
  },
  sv: {
    content: "Innehåll",
    design: "Design",
    preview: "Förhandsvisning",
    edit: "Redigera",
    saved: "Sparad",
    saving: "Sparar…",
    saveError: "Synkning väntar",
    addSection: "Lägg till avsnitt",
    details: "Personuppgifter",
    sections: "CV-avsnitt",
    backToSections: "Alla avsnitt",
    editingLanguage: "Redigerar",
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
    languages: defaultLanguages.map((item) => ({ ...item })),
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

function createBlankDocument(): CvDocument {
  return {
    languages: defaultLanguages.map((item) => ({ ...item })),
    person: {
      name: { en: "", sv: "" },
      headline: { en: "", sv: "" },
      contacts: [
        { id: newId("contact"), label: { en: "Email", sv: "E-post" }, value: { en: "", sv: "" } },
        { id: newId("contact"), label: { en: "Location", sv: "Ort" }, value: { en: "", sv: "" } },
      ],
    },
    sections: [
      {
        id: newId("profile"),
        kind: "text",
        heading: { en: "Profile", sv: "Profil" },
        headingStyle: "rule",
        compact: false,
        textStyle: "paragraphs",
        content: [{ en: "", sv: "" }],
      },
      {
        id: newId("experience"),
        kind: "entries",
        heading: { en: "Experience", sv: "Erfarenhet" },
        headingStyle: "rule",
        compact: false,
        entries: [{
          id: newId("entry"),
          title: { en: "", sv: "" },
          organization: { en: "", sv: "" },
          years: { en: "", sv: "" },
          meta: { en: "", sv: "" },
          contentStyle: "bullets",
          content: [{ en: "", sv: "" }],
        }],
      },
      {
        id: newId("education"),
        kind: "entries",
        heading: { en: "Education", sv: "Utbildning" },
        headingStyle: "rule",
        compact: false,
        entries: [{
          id: newId("entry"),
          title: { en: "", sv: "" },
          organization: { en: "", sv: "" },
          years: { en: "", sv: "" },
          meta: { en: "", sv: "" },
          contentStyle: "paragraphs",
          content: [{ en: "", sv: "" }],
        }],
      },
      {
        id: newId("skills"),
        kind: "skills",
        heading: { en: "Skills", sv: "Färdigheter" },
        headingStyle: "rule",
        compact: true,
        skills: [{ id: newId("skill"), label: { en: "", sv: "" }, value: { en: "", sv: "" } }],
      },
    ],
  };
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function translated(value: LocalizedText, language: Language) {
  return value[language] || "";
}

function translatedOrFallback(value: LocalizedText, language: Language) {
  return translated(value, language) || Object.values(value).find((item) => item.trim()) || "";
}

function editTranslation(value: LocalizedText, language: Language, next: string): LocalizedText {
  return { ...value, [language]: next };
}

function normalizeDocument(input: CvDocument): CvDocument {
  const legacy = input as CvDocument & { languages?: CvLanguage[] };
  const languages = Array.isArray(legacy.languages) && legacy.languages.length
    ? legacy.languages.map((item) => ({
      id: item.id,
      label: item.label || item.id.toUpperCase(),
      shortLabel: (item.shortLabel || item.id).toUpperCase().slice(0, 5),
    }))
    : defaultLanguages.map((item) => ({ ...item }));
  return { ...input, languages };
}

function normalizeRecord(record: CvRecord): CvRecord {
  return { ...record, document: normalizeDocument(record.document), styles: { ...defaultStyle, ...record.styles } };
}

function primaryLanguage(document: CvDocument) {
  return document.languages[0]?.id || "en";
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
  const [records, setRecords] = useState<CvRecord[]>([]);
  const [view, setView] = useState<ViewMode>("library");
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [activeCreatedAt, setActiveCreatedAt] = useState(0);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("en");
  const [activePanel, setActivePanel] = useState<"content" | "design">("content");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showLanguageManager, setShowLanguageManager] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [appTheme, setAppTheme] = useState<AppTheme>("light");
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const savedSignature = useRef("");

  const ui = language === "sv" ? languageLabels.sv : languageLabels.en;
  const selectedSection = document.sections.find((section) => section.id === activeSection);
  const activeLanguage = document.languages.find((item) => item.id === language) ?? document.languages[0];

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      let legacy: { document?: CvDocument; styles?: StyleSettings; appTheme?: AppTheme } | null = null;
      let cachedRecords: CvRecord[] = [];

      try {
        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        const storedLegacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        const storedCache = window.localStorage.getItem(CACHE_STORAGE_KEY);
        legacy = storedLegacy ? JSON.parse(storedLegacy) : null;
        cachedRecords = storedCache ? (JSON.parse(storedCache) as CvRecord[]).map(normalizeRecord) : [];

        if (storedTheme === "light" || storedTheme === "dark") {
          setAppTheme(storedTheme);
        } else if (legacy?.appTheme === "light" || legacy?.appTheme === "dark") {
          setAppTheme(legacy.appTheme);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          setAppTheme("dark");
        }
      } catch {
        // Editing remains available when browser storage is restricted.
      }

      try {
        const response = await fetch("/api/cvs", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load CVs");
        const payload = await response.json() as { cvs?: CvRecord[] };
        let nextRecords = Array.isArray(payload.cvs) ? payload.cvs.map(normalizeRecord) : [];

        if (nextRecords.length === 0) {
          const now = Date.now();
          const seedDocument = normalizeDocument(legacy?.document?.sections?.length ? legacy.document : createInitialDocument());
          const seedStyles = legacy?.styles ? { ...defaultStyle, ...legacy.styles } : defaultStyle;
          const seed: CvRecord = {
            id: newId("cv"),
            title: translated(seedDocument.person.name, "en") || "My CV",
            document: seedDocument,
            styles: seedStyles,
            createdAt: now,
            updatedAt: now,
          };
          const createResponse = await fetch("/api/cvs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(seed),
          });
          if (!createResponse.ok) throw new Error("Unable to create starter CV");
          const created = await createResponse.json() as { cv: CvRecord };
          nextRecords = [normalizeRecord(created.cv)];
        }

        if (!cancelled) {
          setRecords(nextRecords);
          try {
            window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(nextRecords));
          } catch {
            // The database remains the source of truth.
          }
        }
      } catch {
        if (!cancelled) {
          if (cachedRecords.length) {
            setRecords(cachedRecords);
          } else {
            const now = Date.now();
            const fallbackDocument = normalizeDocument(legacy?.document?.sections?.length ? legacy.document : createInitialDocument());
            setRecords([{
              id: newId("cv"),
              title: translated(fallbackDocument.person.name, "en") || "My CV",
              document: fallbackDocument,
              styles: legacy?.styles ? { ...defaultStyle, ...legacy.styles } : defaultStyle,
              createdAt: now,
              updatedAt: now,
            }]);
          }
          setSaveState("error");
        }
      } finally {
        if (!cancelled) {
          setLibraryLoading(false);
          setHydrated(true);
        }
      }
    }

    void loadLibrary();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, appTheme);
    } catch {
      // The selected theme can safely fall back to this session only.
    }
  }, [appTheme, hydrated]);

  useEffect(() => {
    if (!hydrated || view !== "editor" || !activeRecordId) return;
    const signature = JSON.stringify({ document, styles });
    if (signature === savedSignature.current) return;
    setSaveState("saving");
    const timeout = window.setTimeout(async () => {
      const now = Date.now();
      const record: CvRecord = {
        id: activeRecordId,
        title: translatedOrFallback(document.person.name, language) || (language === "sv" ? "Namnlöst CV" : "Untitled CV"),
        document,
        styles,
        createdAt: activeCreatedAt || now,
        updatedAt: now,
      };
      updateCachedRecord(record);
      try {
        const response = await fetch("/api/cvs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        if (!response.ok) throw new Error("Unable to save CV");
        savedSignature.current = signature;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [activeCreatedAt, activeRecordId, document, hydrated, language, styles, view]);

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

  function updateCachedRecord(record: CvRecord) {
    setRecords((current) => {
      const next = [record, ...current.filter((item) => item.id !== record.id)]
        .sort((a, b) => b.updatedAt - a.updatedAt);
      try {
        window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The database remains the source of truth.
      }
      return next;
    });
  }

  async function saveRecordNow(record: CvRecord) {
    setSaveState("saving");
    updateCachedRecord(record);
    try {
      const response = await fetch("/api/cvs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (!response.ok) throw new Error("Unable to save CV");
      savedSignature.current = JSON.stringify({ document: record.document, styles: record.styles });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function openRecord(record: CvRecord) {
    const nextDocument = normalizeDocument(record.document);
    setDocument(nextDocument);
    setStyles({ ...defaultStyle, ...record.styles });
    setActiveRecordId(record.id);
    setActiveCreatedAt(record.createdAt);
    setActivePanel("content");
    setActiveSection(null);
    setLanguage(primaryLanguage(nextDocument));
    setMobileView("edit");
    setSaveState("saved");
    savedSignature.current = JSON.stringify({ document: nextDocument, styles: { ...defaultStyle, ...record.styles } });
    setView("editor");
  }

  async function createCv() {
    const now = Date.now();
    const blankDocument = createBlankDocument();
    const record: CvRecord = {
      id: newId("cv"),
      title: "Untitled CV",
      document: blankDocument,
      styles: { ...defaultStyle },
      createdAt: now,
      updatedAt: now,
    };
    updateCachedRecord(record);
    try {
      const response = await fetch("/api/cvs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (!response.ok) throw new Error("Unable to create CV");
      const payload = await response.json() as { cv: CvRecord };
      updateCachedRecord(payload.cv);
      openRecord(payload.cv);
    } catch {
      setSaveState("error");
      openRecord(record);
    }
  }

  async function deleteCv(record: CvRecord) {
    const prompt = language === "sv"
      ? `Ta bort “${record.title}”? Det går inte att ångra.`
      : `Delete “${record.title}”? This cannot be undone.`;
    if (!window.confirm(prompt)) return;

    const previous = records;
    const next = records.filter((item) => item.id !== record.id);
    setRecords(next);
    try {
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The database remains the source of truth.
    }

    try {
      const response = await fetch(`/api/cvs?id=${encodeURIComponent(record.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete CV");
    } catch {
      setRecords(previous);
      setSaveState("error");
    }
  }

  function goToLibrary() {
    const signature = JSON.stringify({ document, styles });
    if (activeRecordId && signature !== savedSignature.current) {
      const now = Date.now();
      void saveRecordNow({
        id: activeRecordId,
        title: translatedOrFallback(document.person.name, language) || (language === "sv" ? "Namnlöst CV" : "Untitled CV"),
        document,
        styles,
        createdAt: activeCreatedAt || now,
        updatedAt: now,
      });
    }
    setShowAddSection(false);
    setShowLanguageManager(false);
    setView("library");
  }

  function renderLanguageSwitch() {
    return (
      <div className="language-switch" role="group" aria-label="CV language">
        {document.languages.map((item) => (
          <button type="button" className={language === item.id ? "active" : ""} aria-pressed={language === item.id} onClick={() => setLanguage(item.id)} title={item.label} key={item.id}>{item.shortLabel || "…"}</button>
        ))}
        <button type="button" className="manage-languages-button" onClick={() => setShowLanguageManager(true)} aria-label="Manage CV languages" title="Manage CV languages">＋</button>
      </div>
    );
  }

  function addLanguage() {
    const id = newId("language");
    const nextLanguage: CvLanguage = {
      id,
      label: "New language",
      shortLabel: `L${document.languages.length + 1}`,
    };
    setDocument((current) => ({ ...current, languages: [...current.languages, nextLanguage] }));
    setLanguage(id);
  }

  function updateLanguage(languageId: string, field: "label" | "shortLabel", value: string) {
    const nextValue = field === "shortLabel"
      ? value.replace(/\s/g, "").toUpperCase().slice(0, 5)
      : value;
    setDocument((current) => ({
      ...current,
      languages: current.languages.map((item) => item.id === languageId ? { ...item, [field]: nextValue } : item),
    }));
  }

  function removeLanguage(languageId: string) {
    if (document.languages.length === 1) return;
    const item = document.languages.find((candidate) => candidate.id === languageId);
    if (!item || !window.confirm(`Remove ${item.label || "this language"} from this CV?`)) return;
    const remaining = document.languages.filter((candidate) => candidate.id !== languageId);
    setDocument((current) => ({ ...current, languages: remaining }));
    if (language === languageId) setLanguage(remaining[0].id);
  }

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
    if (!section || !window.confirm(`Remove “${translatedOrFallback(section.heading, language)}”?`)) return;
    setDocument((current) => ({ ...current, sections: current.sections.filter((item) => item.id !== sectionId) }));
    setActiveSection(null);
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
    setLanguage("en");
    setActiveSection(null);
  }

  function exportPdf() {
    const previousTitle = window.document.title;
    window.document.title = `${translatedOrFallback(document.person.name, language) || "CV"} — CV`;
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
          <div><span className="eyebrow">Section</span><h2>{translatedOrFallback(section.heading, language) || "Untitled section"}</h2></div>
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

  if (view === "library") {
    const libraryCopy = language === "sv" ? {
      eyebrow: "CV-bibliotek",
      title: "Dina CV:n",
      intro: "Öppna ett sparat CV och fortsätt där du slutade, eller skapa ett nytt från en ren mall.",
      create: "Skapa nytt CV",
      loading: "Hämtar dina CV:n…",
      emptyTitle: "Inga CV:n ännu",
      emptyText: "Skapa ditt första CV för att komma igång.",
      open: "Öppna",
      updated: "Uppdaterad",
      delete: "Ta bort",
    } : {
      eyebrow: "CV library",
      title: "Your CVs",
      intro: "Open a saved CV and continue where you left off, or begin a new one from a clean structure.",
      create: "Create new CV",
      loading: "Loading your CVs…",
      emptyTitle: "No CVs yet",
      emptyText: "Create your first CV to get started.",
      open: "Open",
      updated: "Updated",
      delete: "Delete",
    };

    return (
      <main className={`studio-shell app-theme-${appTheme}`}>
        <header className="topbar library-topbar">
          <div className="brand-lockup"><span className="brand-mark">F</span><div><strong>Folio</strong><span>CV Studio</span></div></div>
          <div className="top-actions">
            <button
              className="theme-mode-button"
              onClick={() => setAppTheme((current) => current === "light" ? "dark" : "light")}
              aria-label={`Switch to ${appTheme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${appTheme === "light" ? "dark" : "light"} mode`}
            >
              <span aria-hidden="true">{appTheme === "light" ? "☾" : "☀"}</span>
              <span className="theme-mode-label">{appTheme === "light" ? "Dark" : "Light"}</span>
            </button>
            <button className="primary-button" onClick={() => void createCv()}>＋ {libraryCopy.create}</button>
          </div>
        </header>

        <section className="start-page">
          <div className="start-hero">
            <div className="start-hero-copy">
              <span className="eyebrow">{libraryCopy.eyebrow}</span>
              <h1>{libraryCopy.title}</h1>
              <p>{libraryCopy.intro}</p>
            </div>
            <button className="primary-button start-create-button" onClick={() => void createCv()}>＋ {libraryCopy.create}</button>
          </div>

          {libraryLoading ? (
            <div className="library-loading" role="status"><span />{libraryCopy.loading}</div>
          ) : records.length ? (
            <div className="library-grid">
              {records.map((record) => {
                const recordDocument = normalizeDocument(record.document);
                const cardLanguage = recordDocument.languages.some((item) => item.id === language) ? language : primaryLanguage(recordDocument);
                const displayName = translated(recordDocument.person.name, cardLanguage) || record.title;
                const headline = translated(recordDocument.person.headline, cardLanguage);
                const date = new Intl.DateTimeFormat(language === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(record.updatedAt);
                return (
                  <article className="library-card" key={record.id}>
                    <button className="library-card-preview" onClick={() => openRecord(record)} aria-label={`${libraryCopy.open} ${displayName}`}>
                      <span className="library-paper" style={{ "--library-accent": record.styles.accent } as CSSProperties}>
                        <span className="library-paper-header">
                          <strong>{displayName}</strong>
                          {headline && <em>{headline}</em>}
                        </span>
                        {recordDocument.sections.slice(0, 4).map((section) => (
                          <span className="library-paper-section" key={section.id}>
                            <b>{translated(section.heading, cardLanguage)}</b>
                            <i /><i /><i />
                          </span>
                        ))}
                      </span>
                    </button>
                    <div className="library-card-footer">
                      <div className="library-meta">
                        <strong>{displayName}</strong>
                        <span>{libraryCopy.updated} {date}</span>
                      </div>
                      <div className="library-card-actions">
                        <IconButton label={`${libraryCopy.delete} ${displayName}`} onClick={() => void deleteCv(record)}>×</IconButton>
                        <button className="soft-button library-open-button" onClick={() => openRecord(record)}>{libraryCopy.open}</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="library-empty">
              <span className="brand-mark">F</span>
              <h2>{libraryCopy.emptyTitle}</h2>
              <p>{libraryCopy.emptyText}</p>
              <button className="primary-button" onClick={() => void createCv()}>＋ {libraryCopy.create}</button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className={`studio-shell app-theme-${appTheme}`}>
      <header className="topbar">
        <button className="brand-lockup brand-button" onClick={goToLibrary} aria-label="Back to your CVs"><span className="brand-mark">F</span><span className="brand-copy"><strong>Folio</strong><span>CV Studio</span></span></button>
        <div className="mobile-view-switch" aria-label="Mobile view">
          <button className={mobileView === "edit" ? "active" : ""} onClick={() => setMobileView("edit")}>{ui.edit}</button>
          <button className={mobileView === "preview" ? "active" : ""} onClick={() => setMobileView("preview")}>{ui.preview}</button>
        </div>
        <div className="top-actions">
          <span className={`save-state ${saveState}`}>{saveState === "saved" ? ui.saved : saveState === "saving" ? ui.saving : ui.saveError}</span>
          <button
            className="theme-mode-button"
            onClick={() => setAppTheme((current) => current === "light" ? "dark" : "light")}
            aria-label={`Switch to ${appTheme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${appTheme === "light" ? "dark" : "light"} mode`}
          >
            <span aria-hidden="true">{appTheme === "light" ? "☾" : "☀"}</span>
            <span className="theme-mode-label">{appTheme === "light" ? "Dark" : "Light"}</span>
          </button>
          {renderLanguageSwitch()}
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
            <div className={`panel-scroll ${activeSection ? "panel-scroll-editor" : ""}`}>
              {activeSection === null ? (
                <div className="section-index-view">
                  <div className="document-heading"><div><span className="eyebrow">Document</span><h1>{translatedOrFallback(document.person.name, language) || "Untitled CV"}</h1></div></div>
                  <div className="section-index-heading"><span>{ui.sections}</span><span>{document.sections.length + 1}</span></div>
                  <div className="section-list" aria-label="CV sections">
                    <div className="section-row"><button className="section-select" onClick={() => setActiveSection("details")}><span className="section-number">00</span><span>{ui.details}</span><span className="section-open-arrow" aria-hidden="true">›</span></button></div>
                    {document.sections.map((section, index) => (
                      <div className="section-row" key={section.id}>
                        <button className="section-select" onClick={() => setActiveSection(section.id)}><span className="section-number">{String(index + 1).padStart(2, "0")}</span><span>{translatedOrFallback(section.heading, language) || "Untitled section"}</span><span className="section-open-arrow" aria-hidden="true">›</span></button>
                        <div className="reorder-controls"><IconButton label="Move section up" disabled={index === 0} onClick={() => moveSection(section.id, -1)}>↑</IconButton><IconButton label="Move section down" disabled={index === document.sections.length - 1} onClick={() => moveSection(section.id, 1)}>↓</IconButton></div>
                      </div>
                    ))}
                  </div>
                  <button className="add-section" onClick={() => setShowAddSection(true)}>＋ {ui.addSection}</button>
                </div>
              ) : (
                <div className="section-detail-view">
                  <div className="section-detail-toolbar">
                    <button className="editor-back-button" onClick={() => setActiveSection(null)}><span aria-hidden="true">←</span>{ui.backToSections}</button>
                    <span className="editing-language">{ui.editingLanguage} {activeLanguage?.label || language.toUpperCase()}</span>
                  </div>
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
              )}
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

      {showLanguageManager && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowLanguageManager(false)}>
          <div className="add-modal language-modal" role="dialog" aria-modal="true" aria-labelledby="language-manager-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div><span className="eyebrow">Translations</span><h2 id="language-manager-title">CV languages</h2><p>Add as many language versions as you need. Each language keeps its own text while sharing the same layout and style.</p></div>
              <IconButton label="Close" onClick={() => setShowLanguageManager(false)}>×</IconButton>
            </div>
            <div className="language-manager-list">
              {document.languages.map((item) => (
                <div className={`language-manager-row ${language === item.id ? "active" : ""}`} key={item.id}>
                  <button className="language-current-button" onClick={() => setLanguage(item.id)} aria-label={`Edit ${item.label || "language"}`} aria-pressed={language === item.id}><span>{language === item.id ? "✓" : ""}</span></button>
                  <label className="field"><span>Language name</span><input value={item.label} onChange={(event) => updateLanguage(item.id, "label", event.target.value)} placeholder="e.g. German" /></label>
                  <label className="field language-code-field"><span>Button label</span><input value={item.shortLabel} onChange={(event) => updateLanguage(item.id, "shortLabel", event.target.value)} placeholder="DE" /></label>
                  <IconButton label={`Remove ${item.label || "language"}`} disabled={document.languages.length === 1} onClick={() => removeLanguage(item.id)}>×</IconButton>
                </div>
              ))}
            </div>
            <button className="soft-button add-language-row-button" onClick={addLanguage}>＋ Add language</button>
            <p className="language-manager-note">Select the circle beside a language to edit that version of your CV.</p>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;
