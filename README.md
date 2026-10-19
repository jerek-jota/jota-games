# Jota Games

A collection of word games that installs on a phone's home screen and works offline.

**Play:** https://jerek-jota.github.io/jota-games/

## Games

- **Letter Web** (4×4 and 5×5): trace words of 4+ letters along the lines between letters. Found words clear their lines away. Other real words count as blue bonus words.

## Project layout

- `index.html`, `sw.js`: built files that GitHub Pages serves. Don't edit these by hand.
- `src/app.src.html`: the app's screens, styles and game logic.
- `src/gen.js`: the Letter Web puzzle generator.
- `src/words.txt`: puzzle answers. About 5,700 everyday words, 4–8 letters, no plurals, with -ing/-ed forms. Shared by all games.
- `src/bonus.txt`: every other word in the US English spell-check dictionary (4–8 letters, no plurals). Tracing one counts as a blue bonus word.

Both lists come from word-frequency rankings (movie/TV subtitles and Google's 20k most common words), checked against an English dictionary and filtered for offensive words.
- `src/sw.template.js`: offline caching.

After changing anything in `src/`, rebuild and commit:

```
node src/build.js
```
