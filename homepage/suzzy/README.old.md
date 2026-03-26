# 🌎 @suzzy/site
Homepage for blogs, documentation, accounts, and projects.


## 📄 Articles
This application has support for a custom article rendering system using XML 
and JSON syntax. Create a folder in the **views** directory and organize your
folder as show below:

```py
•
|__ /articles
|   |__ ...        # Your articles here
|__ manifest.json  # Your Manifest with Authors, Categories, and Paths
|__ browser.pug    # View for Article Directory
|__ post.pug       # View for Article Rendering
```

### Article Syntax
Articles follow HTML/XML like Syntax, a root `<article>` tag must be created 
with all following content tags placed inside. 

The following attributes **MUST** be present on the article tag:
|    Name    | Description                                         |
| :--------: | :-------------------------------------------------- |
|     id     | Unique Article ID for CategoryId                    |
|  authorId  | Relevant Author ID                                  |
| categoryId | Relevant Category ID                                |
|   title    | Article Title                                       |
|  created   | Article Date (Should be parsable with `new Date()`) |
|  snippet   | Article Snippet                                     |
|  noindex   | If value is `true` this article will not be indexed |

Afterwards you can place all your content tags inside below are all currently 
supported tags:

### Tag: text
A text element with support for formatting using the following subtags:
- `<h>: Hint` Makes text grey and small
- `<c>: Code` Highlights text and adds a dark background
- `<a>: Link` Similar to Anchor, supports **target** and **href** attributes
- `<b>: Bold` Renders text as bold or extra thicc
- `<i>: Italic` Render Text as Italicized
- `<s>: Strike` Renders text with a line in the middle of characters (̶E̶x̶a̶m̶p̶l̶e)

### Tag: header
Extra large highlighted text that will appear in the sidebar or chapter select.
Will be rendered with a normalized ID attribute for anchors.

### Tag: subheader
Large highlighted text.
Will be rendered with a normalized ID attribute for anchors.

### Tag: quote
Prefixes text content with `>` and renders it as grey with small text.

### Tag: code
Renders text as a big code block with syntax highlighting using the `syntax` 
attribute. Supports horizontal overflow and adds support for has JavaScript
for a **Copy to Cliboard** action.

### Tag: image
