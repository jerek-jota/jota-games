"""Order src/words.txt from easiest to hardest.

Score = how rare the word is in speech (frequency rank from movie/TV subtitles
and Google's top-20k list), how unusual its spelling is (rare letter pairs and
rare letters), and its length. The app reads the list's order as difficulty.

Usage: python3 src/score_words.py RANKED_JSON DICT_JSON
  RANKED_JSON: list of words, most frequent first
  DICT_JSON:   list of all dictionary words (for letter-pair statistics)
"""
import json, math, sys, os
from collections import Counter

ranked = json.load(open(sys.argv[1]))
dictionary = json.load(open(sys.argv[2]))
path = os.path.join(os.path.dirname(__file__), "words.txt")
words = open(path).read().split()

rank = {w: i for i, w in enumerate(ranked)}

def base_rank(w):
    # Words missing from the frequency list: use their root's rank, nudged harder.
    if w in rank: return rank[w]
    for suf, rep in (("ing", ""), ("ing", "e"), ("ed", ""), ("ed", "e"), ("ied", "y"), ("d", "")):
        if w.endswith(suf):
            r = w[: -len(suf)] + rep
            if r in rank: return rank[r] * 1.3 + 500
            if len(r) > 2 and r[-1] == r[-2] and r[:-1] in rank: return rank[r[:-1]] * 1.3 + 500
    return 9000

pairs = Counter()
for w in dictionary:
    t = "^" + w + "$"
    for a, b in zip(t, t[1:]): pairs[a + b] += 1
total = sum(pairs.values())
RARE = {"q": 1.0, "z": 0.9, "x": 0.9, "j": 0.9, "k": 0.4, "v": 0.4, "w": 0.3, "y": 0.3, "f": 0.2}

def spelling(w):
    t = "^" + w + "$"
    costs = sorted((-math.log((pairs[a + b] + 1) / total) for a, b in zip(t, t[1:])), reverse=True)
    return sum(costs[:2]) / 2 + sum(RARE.get(c, 0) for c in set(w))

def pct(values):
    order = sorted(range(len(values)), key=lambda i: values[i])
    out = [0.0] * len(values)
    for k, i in enumerate(order): out[i] = k / (len(values) - 1)
    return out

f = pct([math.log(base_rank(w) + 50) for w in words])
s = pct([spelling(w) for w in words])
l = [(len(w) - 4) / 4 for w in words]
score = [0.55 * a + 0.30 * b + 0.15 * c for a, b, c in zip(f, s, l)]
ordered = [w for _, w in sorted(zip(score, words))]
open(path, "w").write("\n".join(ordered) + "\n")
n = len(ordered)
for name, lo, hi in (("easiest", 0, 40), ("33%", n // 3, n // 3 + 40), ("66%", 2 * n // 3, 2 * n // 3 + 40), ("hardest", n - 40, n)):
    print(f"{name}: {' '.join(ordered[lo:hi])}")
