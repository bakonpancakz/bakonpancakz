## 🌟 `@bakonpancakz/badges`

Simple badge generator for my GitHub README, feel free to use them yourself.
```md
# Direct URL Template
https://raw.githubusercontent.com/bakonpancakz/bakonpancakz/main/badges/generated/{filename}.png
```

### ✍ Contributing

1. Add an entry to the `manifest.json` file using the following format:
    ```
    {filename} | {text content} | {background color}
    ```
    - Fields are seperated with a vertical bar `( | )`
    - Leading and trailing whitespaces are trimmed
    - `{background color}` must be compatible with CSS

2. Place an SVG with the matching **filename** into the **images** directory
   - Foreground `(fill)` should be off-white or specifically `#f0f0f0`
   - Background should be transparent

3. Re-render all badges before committing by running the render.js script
   ```
   npm install
   node render.js
   ```

Follow these instructions and I'll accept your pull request, thank you! :3