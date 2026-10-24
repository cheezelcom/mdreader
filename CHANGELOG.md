# Changelog

## [8.3.0] - 2026-10-24

### Retiré
- Mode d'impression ticket 80 mm (présent en 7.1.0) : retiré de la version publique. L'impression A4 reste disponible.

## [8.0.0] - 2026-10-24

### Changé
- Parseur maison remplacé par **marked** (GFM) + **DOMPurify** + **highlight.js**, embarqués (build esbuild)
- Polices embarquées (plus d'appel à Google Fonts)
- Thème via `data-theme`, suit `prefers-color-scheme` par défaut ; réglages dans `chrome.storage`
- En-tête réduit (56 px), contenu centré, sommaire plus lisible
- Permission `activeTab` retirée

### Corrigé
- Code corrompu (titres/italiques/listes interprétés dans les blocs de code)
- URL et mots en `snake_case` cassés par l'italique `_`
- Sommaire : accents, titres avec formatage, `#` dans le code, titres en double
- Listes imbriquées et numérotées ; cellules vides et alignement des tableaux
- Injection HTML via titre/auteur/sommaire ; liens `javascript:`
- Fichiers CRLF / BOM (frontmatter non détecté)

### Ajouté
- Coloration syntaxique, bouton Copier, ancres de titres
- Actualisation automatique du rendu, section active dans le sommaire
- Notes de bas de page, alertes GitHub, tableaux défilants
- Support `.MD`, `.mdown`, `.mkd`, `localhost` et `raw.githubusercontent.com`

## [7.0.0] - 2026-02-04
- Correctifs sauts de ligne, tableaux, métadonnées DC, pied de page

## [6.0.0] - 2026-02-04
- Première version publique
