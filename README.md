# mdREADER v8

**Lecteur Markdown élégant pour Chrome / Brave** — ouvrez un `.md`, il s'affiche mis en page.

## Fonctionnalités

- Rendu **GFM complet** (marked) : tableaux alignés, listes imbriquées/numérotées, tâches, notes de bas de page, alertes `> [!NOTE]`
- **Coloration syntaxique** (highlight.js) + bouton *Copier* sur chaque bloc de code
- **Sommaire** auto avec section active, ancres sur les titres (accents gérés, doublons dédoublonnés)
- **Actualisation automatique** : le rendu se met à jour quand le fichier change (scroll conservé)
- Thème clair/sombre (suit le système par défaut), réglages mémorisés
- Option « sauts de ligne » (un retour simple = `<br>`, activée par défaut)
- **Sécurité** : HTML assaini (DOMPurify), liens `javascript:` bloqués
- **100 % hors ligne** : polices et bibliothèques embarquées, aucun appel réseau
- Impression A4 optimisée (mode clair, sans interface)

## Installation

1. `chrome://extensions` (ou `brave://extensions`) → activer **Mode développeur**
2. **Charger l'extension non empaquetée** → choisir ce dossier
3. Dans les détails de l'extension, activer **Autoriser l'accès aux URL de fichier**

Sont rendus : `file:///*.md|.MD|.markdown|.mdown|.mkd`, `localhost/*.md`, `127.0.0.1/*.md`, `raw.githubusercontent.com/*.md`.

Ouvrir les `.md` dans le navigateur par défaut (macOS) :

```bash
brew install duti
duti -s com.brave.Browser md all      # ou com.google.Chrome
```

## Développement

```bash
npm install
npm run build     # src/ -> dist/content.js
```

```
manifest.json
src/content.js    # rendu, sommaire, live reload
src/styles.css    # styles (polices via fonts/)
dist/content.js   # bundle chargé par l'extension (à régénérer après modification)
fonts/            # Newsreader, JetBrains Mono, Instrument Sans (latin)
```


## Licence

MIT — voir [LICENSE](LICENSE). Un projet [Abricot Labs](https://github.com/cheezelcom).
