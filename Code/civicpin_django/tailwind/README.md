# Tailwind build

`static/css/tailwind.css` is generated and committed, so running the site
needs no Node. Rebuild it after adding or changing Tailwind classes in
`templates/` or `static/js/`:

```sh
# from Code/civicpin_django
npx tailwindcss@3.4 -c tailwind/tailwind.config.js \
  -i tailwind/input.css -o static/css/tailwind.css --minify
```
