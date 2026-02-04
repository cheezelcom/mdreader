# mdREADER

**Elegant Markdown viewer for Chrome/Brave browsers**

A browser extension that transforms raw Markdown files into beautifully rendered documents with a modern, customizable interface.

![mdREADER Preview](screenshots/preview.png)

## ✨ Features

- 🌗 **Dark/Light mode** with persistent preference
- 📑 **Auto-generated table of contents** with smooth scroll navigation
- 📊 **Document metadata** (reading time, word count)
- 📱 **Responsive design** for desktop and mobile
- 🖨️ **Print optimized** - A4 layout with light mode for grayscale printing
- ⚡ **Zero dependencies** - Self-contained markdown parser
- 🎨 **Premium typography** - Newsreader, JetBrains Mono, Instrument Sans

## 📦 Installation

### From source (Developer mode)

1. Download or clone this repository
2. Open `chrome://extensions/` (Chrome) or `brave://extensions/` (Brave)
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked** and select the `mdreader` folder
5. Enable **Allow access to file URLs** in extension details

### Set as default app for .md files (macOS)

```bash
brew install duti
duti -s com.brave.Browser md all
# or for Chrome:
duti -s com.google.Chrome md all
```

## 🎯 Usage

Simply open any `.md` file in your browser. The extension automatically renders it with:

- Full-width header with document title and filename
- Collapsible sidebar with table of contents
- Reading progress bar
- Theme toggle (dark/light)
- Metadata panel (reading time, word count)

## 🖨️ Printing

Press `Cmd+P` (macOS) or `Ctrl+P` (Windows/Linux) to print. The extension automatically:

- Switches to light mode for grayscale printing
- Hides sidebar and UI controls
- Formats content for A4 paper
- Preserves header with document title and branding

## 🛠️ Development

```
mdreader/
├── manifest.json      # Extension configuration
├── src/
│   └── content.js     # Main script (parser + renderer + styles)
├── icons/
│   ├── icon48.png
│   └── icon128.png
└── screenshots/
```

### Supported Markdown

- Headers (H1-H6)
- **Bold** and *italic* text
- [Links](url) and ![images](url)
- Ordered and unordered lists
- Task lists `[ ]` and `[x]`
- `inline code` and code blocks
- > Blockquotes
- Horizontal rules
- ~~Strikethrough~~

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 🍊 Credits

**mdREADER** is a project by [Abricot Labs](https://github.com/cheezelcom)

---

Made with ☕ and curiosity
