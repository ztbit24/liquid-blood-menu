# Liquid Blood Menu

Rövid, önálló SVG/CSS/JavaScript demo egy gooey blood drop menu effekt bemutatására. A középső "Adj vért" gomb kattintásra folyékony vércsepp animációval nyílik szét menüpontokra.

## Futtatás

A projekt nem igényel build lépést vagy függőségtelepítést.

1. Nyisd meg az `index.html` fájlt böngészőben.
2. Kattints az "Adj vért" gombra a menü nyitásához és zárásához.

Egyszerű lokális szerverrel is futtatható:

```bash
python3 -m http.server 8000
```

Ezután nyisd meg:

```text
http://localhost:8000
```

## Technológiák

- HTML
- CSS
- SVG filterek
- Vanilla JavaScript
- `requestAnimationFrame` alapú animáció

## Cél

A cél egy karbantartható, látványos gooey blood drop menu demo, külső könyvtárak nélkül.
