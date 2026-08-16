# Bilingual CV

All CV wording lives in [`cv.content.json`](./cv.content.json). The HTML files are generated outputs and should not be edited directly.

Each translatable value has an English (`en`) and Swedish (`sv`) version:

```json
{
  "heading": {
    "en": "Experience",
    "sv": "Arbetslivserfarenhet"
  }
}
```

Values that are identical in both languages, such as names and technology names, can remain plain strings.

## Generate the CVs

```sh
npm run build
```

This creates:

- `CV.en.html` – English
- `CV.sv.html` – Swedish
- `CV.html` – a backwards-compatible copy of the English version

## Regenerate whenever the content is saved

Start the watcher while editing:

```sh
npm run watch
```

Every save to `cv.content.json` then regenerates both language versions. Stop the watcher with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

The generator uses only Node.js, so there are no packages to install.
