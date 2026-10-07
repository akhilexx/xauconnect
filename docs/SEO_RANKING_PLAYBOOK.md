# Ranking playbook — Whitespark Local Update E49

Source: [Edward Sturm's Ranking Trick, Hacking AI Overviews, Parasite SEO](https://www.youtube.com/watch?v=2iLtrRbRFJw) (Whitespark, 30 Sep 2026, Darren Shaw with Edward Sturm). Show notes and the articles they discuss are listed at the bottom.

This file is the working map of that episode: what each method is, whether XAUConnect uses it, and where the code lives. The episode's own conclusion is the filter. Fundamentals that compound stay. Shortcuts that Google closed, or that the hosts said not to put on a real site, do not.

## What the episode concluded

Sturm and Shaw spent most of the hour on hacks that rank in hours and then vanish: LinkedIn-hashtag AI Overview tests, NotebookLM parasite pages, indexers, and the "King of AEO" pile-on. Their verdict, repeated in the second half:

- The best SEO is long-term fundamentals, not the hack that went viral this week.
- Do not spend a week on a loophole Google can close overnight. NotebookLM artifact pages were emptied the day after the trick spread. ChatGPT shared chats and Claude artifacts were closed the same way. Leftover Claude artifact URLs still rank only because they were crawled before the fix.
- Do not run indexers against a money site or a social account you care about. Shaw's test forced a dead LinkedIn post to position 2 for 30 minutes. It was gone the next day. They said the normal version is: keyword at the start of the post, then share it and link to it from your own site.
- Schema does not unlock rankings. Server-rendered HTML, the query in the right fields, and internal links do.
- AI answers are a head and a tail. A few brands are stuck in training data and get named almost every time. Everyone else rotates. Getting into the tail means being findable in the live search the model fans out to, not only in the exact prompt the user typed.

## 1. Placement contract

**What they said.** Across every page in the King of AEO pile-on, the query was in four places: page title, URL slug, H1, and the beginning of the first sentence. Video used the same rule on the title and the start of the description. The sentence was written so a model could lift it without guessing. "James Douly is the king of AEO" is unmistakable. A vague paragraph is not.

**What we do.**

| Field | Rule |
| --- | --- |
| Title | The H1, which is the query, plus the brand. |
| URL | Learn and guide slugs are the H1. Money URLs keep their existing paths (`/`, `/launchpad`, `/swap/...`). |
| H1 | The query, not a slogan that disagrees with the title. |
| First sentence | The exact query, then the page's own next sentence. Nothing generic is inserted in front of a guide that already explains the topic. |
| Citation | The first 20–30 words of that opening, stored as `citationSnippet`, rendered in `.seo-citation` with `id="answer"`. |

Code: `packages/seo/src/ranking.ts` (`ensureOpening`, `buildCitationSentence`). It runs at the end of `enrichAllPages`. Token, pair, and hub templates in `packages/seo/src/content-engine.ts` already open on their H1, so the pass does not stack a second sentence on top of them.

Homepage and launchpad are not registry pages. They follow the same contract in the React shells:

- `/` title, H1, and first sentence: "Launch a token on Meteora".
- `/launchpad` title, H1, and first sentence: "Launch a Gold Curve on Meteora".

`/learn` opens on "Learn DeFi swapping". `/learn/guides` opens on "How-to guides".

## 2. Topical-authority internal links

**What they said.** This is the method Sturm told people to do in the next 15 minutes, instead of another hack.

1. Search `site:yourdomain.com "the query"`.
2. The first result is usually the page Google already thinks is most relevant. That is the target. If you do not have a real page for the query, create one. A page about the query beats a buried section. Page-level relevance beats section-level relevance.
3. On every other indexed page that mentions the query, link the mention to the target.
4. If the useful part of the target is buried, link to an anchor (`#section`) instead of the top of the URL.

**What we do.** `applyTopicalLinks` in `packages/seo/src/ranking.ts` is that search, run across the registry:

- Targets are guide, learn, and short search H1s, plus two pinned money queries: "launch a token on meteora" → `/`, "gold curve on meteora" → `/launchpad`.
- A second needle drops a leading verb, so "How to set slippage tolerance" also matches pages that only say "slippage tolerance".
- Section headings become `#anchor` targets only when no dedicated page already owns that phrase, and only when the heading is at least four words.
- Guides and learn articles are preferred as the pages that pass the link. Cross-chain pages are last, so boilerplate does not fill the cap.
- Caps: 3 contextual links out of a page, 24 links into a target. The first paragraph (the citation) is never rewritten into a link.
- The homepage shell also links "how to launch a token on XAUConnect" and "swap" by hand, because `/` is not a registry document.

Rendered as normal in-body links in `apps/web/src/components/seo/seo-page-shell.tsx`. The footer "related" list stays; Sturm's point was the link in the sentence that already uses the words, not another block of related URLs.

## 3. Query fan-out

**What they said.** Claude, asked "who is the king of AEO", did not search that phrase. It searched "answer engine optimization AEO leading experts 2026" and then named whoever already ranks for the broader query. ChatGPT's fan-out can be inspected in the network panel (filter the conversation id, response JSON, key `queries`). If you only plant the exact prompt, you miss the query the model actually runs.

**What we do.** Every registry page gets one FAQ, first in the list, of the form "What is the best way to {query}?" when that question is not already there. The answer is taken from the page's own second paragraph, not a new template. FAQ schema and the visible FAQ block both expose it. The homepage JSON-LD asks "What is the best way to launch a token on Meteora?" and answers with the same sentence as the H1's first paragraph.

## 4. AI retrieval check

**What they said (Myriam Jessier).** To see if ChatGPT, Claude, or Gemini can retrieve a page, copy a 20–30 word sentence from it and prompt: search for `"that exact sentence"` and return only results that contain that text. A URL back means the model can see the page. No URL means it cannot. Chris Green has a Chrome extension that does the same check. Sturm's caveat: the model may paraphrase a long fan-out, so the sentence has to be exact and not too long. Inspect ChatGPT's `queries` array before you trust a "not indexed" result.

**What we do.** `citationSnippet` is that sentence. It is a verbatim slice of the visible opening (`.seo-citation`). After deploy, the check is:

1. Open a guide, copy the first sentence (20–30 words).
2. In ChatGPT, Claude, or Gemini: `Search for "<sentence>" and return any results which contain that exact text only.`
3. You want `https://xauconnect.com/...` back.

`llms.txt` tells assistants to quote that sentence and link the canonical URL.

## 5. Say it so a model can lift it

**What they said.** The pages that moved AI Overviews stated the claim in one sentence, then gave reasons. They did not bury the answer. Searchers and models both need the same plain line. Who is searching, and what they already believe, belongs in the page after that line.

**What we do.** The opening sentence is the claim. The rest of the article is the reasons, the steps, and the risk. Fan-out FAQs are direct answers. We do not add "you searched for" or other meta lines; the validator rejects those.

## 6. Images

**What they said.** Crown graphics and press-release images from the AEO contest showed up as Google image thumbnails because the image, the filename, and the surrounding words all said the same thing.

**What we do.** Homepage Open Graph alt is "Launch a token on Meteora — XAUConnect". Other marketing routes use the page title as the image alt. Feature marks that are real content use "`{feature} on XAUConnect`" rather than an empty alt. Decorative nav glyphs stay empty so they are not indexed as a pile of duplicate logos.

## 7. Video, LinkedIn, Reddit — operator work, not generated pages

These were the distribution channels in the contest. They are not things the site can honestly automate, and the episode was explicit that faking them is how the hack dies.

**YouTube (and Shorts, Reels, TikTok).** Put the query in the video title and in the first lines of the description. Paste the transcript into the description. Sturm's King of AEO short changed the AI Overview because the description was the transcript, and the overview reads descriptions. Google also reads the spoken transcript, so the claim should be in the first seconds, not the outro.

**LinkedIn.** Steve Toth's hashtag trick is not the mechanism. Shaw and Sturm settled it on the show: LinkedIn builds the URL slug from the first words of the post, hashtags or not, and it has no filter that strips `#`. The first words also land in the title and the meta description. LinkedIn's authority is why a post can be cited. What to actually do:

- Only pick a query where Google already shows LinkedIn posts.
- Put the query in the first words of the post. Write a real caption under that, with the reasons in short lines.
- Share the post and link to it from `xauconnect.com`. Do not buy an indexer to force it. If your posts are not getting indexed, post consistently until they do. A brand-new account with no engagement did not get indexed in their test until they used an indexer, and that result did not hold.

**Reddit.** Real answers on threads that already rank, with the same plain claim. The contest was full of posts that simply declared a winner. That is not a template to copy. Answer the question the thread asked, and name the product only when it is the useful part of the answer.

**Press.** A true announcement, with the query in the title, subheading, and first sentence, is the legitimate version of what Douly and Nissan did. Do not invent an event. Do not buy a $6 wire story to plant a false AI Overview. The hosts said the cheap wires rank and even syndicate, and they also said that game is for a different kind of site than a business you plan to keep.

## 8. What we do not implement

| Tactic | Why it stays out |
| --- | --- |
| Indexers / "instant index" on our URLs or social posts | The episode's own test died in a day. They said not to use them on a money site. |
| NotebookLM, ChatGPT share links, Claude artifacts as doorway hosts | Google and the labs closed these. Building on them is the week of work they said to skip. |
| Exact-match domain networks | Contest tactic. It is a footprint, not an asset. |
| Invented press releases and staged "crowning" stories | The AI Overview repeated events that never happened. We will not seed that. |
| Keyword-stuffed schema as the strategy | They laughed at the idea that schema is the unlock. We keep FAQ, Article, and HowTo because the content is real, and we put the sentence in the HTML. |
| Scaled doorway pages | Already forbidden in `docs/SEO_PAGES.md`. This pass does not add URL templates. |

Server-side rendering was the technical point they still called real. SEO routes are static HTML. The homepage hero and launchpad copy are server components, so the H1 and the first sentence are in the first response without JavaScript.

## 9. Where it lives

| Piece | File |
| --- | --- |
| Placement, citation, fan-out FAQ, contextual links | `packages/seo/src/ranking.ts` |
| Hub, token, and pair openings that already match the H1 | `packages/seo/src/content-engine.ts` |
| Meteora section that mentions the money queries | `packages/seo/src/learn-content-product.ts` (`how-to-launch-a-token-on-xauconnect`) |
| In-body links and `.seo-citation` | `apps/web/src/components/seo/seo-page-shell.tsx` |
| Homepage / launchpad H1 and first sentence | `apps/web/src/components/launchpad/launchpad-screen.tsx` |
| Homepage FAQ fan-out | `apps/web/src/components/seo/home-json-ld.tsx` |
| Citation in WebPage schema | `apps/web/src/lib/seo/metadata.ts` |
| Assistant instructions | `apps/web/public/llms.txt` |
| Checks | `scripts/seo/validate-seo-content.ts` (`rankingSelfCheck` plus opening and citation checks) |

Regenerate after copy changes:

```bash
pnpm seo:enrich
pnpm seo:validate
SEO_REFRESH=1 ./scripts/deploy.sh --seo
```

`seo:enrich` prints `openings`, `fanout`, `contextualLinks`, and `targets`. Validate fails if any indexable page's first sentence misses its query, or if the stored citation is not 20–30 words of text that actually appears on the page.

## 10. Show notes from the episode

- Steve Toth, LinkedIn and AI Overviews — the slug comes from the first words.
- Charles Floate / Gagan Ghotra, NotebookLM parasite SEO — patched; do not rebuild it.
- Rand Fishkin, five reasons AI-visibility tracking is on thin ice (non-deterministic answers, no prompt-volume source, personalization, citations that may be rationalizations, no audit trail).
- Glen Allsopp, 70k responses: the head brands stay, the tail turns over daily. Training data plus a live search, not a random spinner.
- Edward Sturm, [King of AEO](https://edwardsturm.com/articles/king-of-aeo-seo-tactics/) — the placement list above is the part worth keeping.
- Myriam Jessier, the 20–30 word retrieval prompt.
- Edward Sturm, [rank faster with topical authority you already have](https://edwardsturm.com/articles/topical-authority-rank-faster/) — section 2 of this file.
