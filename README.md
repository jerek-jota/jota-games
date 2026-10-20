# Jota Games

A collection of word games that installs on a phone's home screen and works offline.

**Play:** https://jerek-jota.github.io/jota-games/

## Games

- **Letter Web** (4×4 and 5×5, Easy / Medium / Hard, timed with best times): trace words of 4+ letters along the lines between letters. Found words clear their lines away. Other real words count as blue bonus words.
- **Midword**: guess the secret word. Each guess tells you whether the word comes before or after it, and how many words away the closest guesses are. Stats include a histogram of guesses per solved word.

## Project layout

- `index.html`, `sw.js`: built files that GitHub Pages serves. Don't edit these by hand.
- `src/app.src.html`: the app's screens, styles and game logic.
- `src/gen.js`: the Letter Web puzzle generator.
- `src/words.txt`: puzzle answers (4–12 letters), ordered easiest to hardest (the order sets difficulty; regenerate with `src/score_words.py`). About 5,700 everyday words, 4–8 letters, no plurals, with -ing/-ed forms. Shared by all games.
- `src/bonus.txt`: every other word in the US English spell-check dictionary (4–12 letters, no plurals). Tracing one counts as a blue bonus word.
- `src/short.txt`: everyday 2–3 letter words, accepted as Midword guesses.

Both lists come from word-frequency rankings (movie/TV subtitles and Google's 20k most common words), checked against an English dictionary and filtered for offensive words.
- `src/sw.template.js`: offline caching.

After changing anything in `src/`, rebuild and commit:

```
node src/build.js
```
