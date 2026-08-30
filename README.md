# Folio CV Studio

Folio is a bilingual React CV editor built around clean, one-column documents. It starts with the content in `cv.content.json` and lets you edit, reorder and add sections while seeing an A4 preview.

## Features

- English and Swedish editing
- Device-local autosave
- Reorderable experience, education, project, skills and custom sections
- Modern, classic and minimal one-column templates
- Preset themes plus custom typography, colors, spacing and margins
- Print-quality PDF export through the browser
- Responsive editing and preview modes

## Run locally

```sh
npm install
npm run dev
```

Open the local address shown in the terminal.

## Build

```sh
npm run build
```

## Legacy static CV files

The original generated HTML files remain in the repository. To regenerate them from `cv.content.json`, run:

```sh
npm run generate:legacy
```

The web app imports `cv.content.json` as its initial document. Changes made in the browser are stored only on that device and do not overwrite the source JSON.
