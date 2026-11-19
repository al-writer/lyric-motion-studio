# Қара, қарғам!: YouTube upload kit

Not published yet. Before publishing, check the items marked **⚠**.

## Title

Qubit Quill – Қара, қарғам! | Qara, qarğam! (Official Lyric Video)

The Latin spelling `Qara, qarğam!` helps people who search without Kazakh
letters on their keyboard.

## Thumbnails

Rebuild with `node tools/render.mjs --track kara-kargam --thumbnail hero,line,macro,promo`
(files go to `out/`).

- Main: `kara-kargam-thumbnail-line.jpg` (the title set big, the crows beside it).
- In YouTube Studio → *Test & Compare* add `-macro` (crows close up) and
  `-promo` («Жаңылтпашты қайталап көр!»). YouTube picks the winner by watch time.
- `-hero` (the diorama with no title) is a spare.

## Description

⚠ Check the channel handle in the subscribe link and the Credits lines.

```
Қаңтарда Қарағандыда қараңғыда қардағы қарт қара қарға қарама-қарсы қарлы қырдағы қара қарғаға қарқылдап қарады! 🐦‍⬛

Песня-скороговорка на казахском: январская ночь в Караганде, старая ворона одна на заснеженном холме, пока на холм напротив не садится другая. Попробуйте спеть припев без запинки!

A Kazakh tongue-twister song: a January night in Karaganda, an old crow alone on a snowy hill until another one lands on the hill opposite. Try singing the chorus without tripping up.

🔔 Subscribe for new songs: https://www.youtube.com/@qubit_quill?sub_confirmation=1

⏱ Chapters
0:00 Intro
0:10 Verse
0:33 Chorus
0:56 Bridge
1:18 Outro

📝 Lyrics
[Intro]
Қара, қарғам...

[Verse]
Қаңтар түні, аяз қатты, көше бос,
Шам жарығы қар үстінде — жалғыз дос.
Қарт қарға отыр қырда үнсіз,
Көп қыс көрген, жалғыз, серіксіз.
Кенет қарсы қырға бір қарға қонды,
Жүрегінде ұмытылған от жанды.
Қараңғыда екеуі бір-біріне қарады —
Үнсіз жылдар артта қалды...
Қарт қарға қарқылдады!

[Chorus]
Қара, қарғам! Қаңтарда Қарағандыда
қараңғыда қардағы қарт қара қарға
қарама-қарсы қарлы қырдағы қара қарғаға
қарқылдап қарады!
Қара, қарғам! Қаңтарда Қарағандыда
қараңғыда қардағы қарт қара қарға
қарама-қарсы қарлы қырдағы қара қарғаға
қарқылдап қарады!

[Bridge]
О-о-о...
Қара, қара, қара, қарғам...
На-на-на...
Қара, қара, қара, қарғам...

[Outro]
Қара, қарғам...

🎧 Credits
Song, lyrics and visuals: Qubit Quill
Music produced with Suno (AI-assisted)
Lyric video made with Lyric Motion Studio: https://github.com/al-writer/lyric-motion-studio

#QubitQuill #жаңылтпаш #скороговорка
```

The chapters are set by hand: the bridge starts with the vocalise at 0:56,
before its first sung words at 1:04 (`tools/youtube.mjs` only sees sung
lines and would put it at 1:03).

## Tags

```
Qubit Quill, qubit_quill, Қара қарғам, Qara qargam, Kara kargam, жаңылтпаш, қазақша жаңылтпаш, скороговорка, казахская скороговорка, kazakh tongue twister, tongue twister song, қарға, ворона, Қарағанды, Караганда, Karaganda, қазақша ән, казахская песня, kazakh song, lyric video, lyrics, 2026
```

## Settings

- Category: **Music**. Audience: **No, it's not made for kids**.
- Video language: **Kazakh**. Caption language: **Kazakh**.
- Subtitles: upload `tracks/kara-kargam/build/lyrics.srt` (Subtitles → Upload
  file → *With timing*). Synced lyrics as captions, also indexed by search.
- ⚠ Altered or synthetic content: answer **Yes** if the vocals are AI-generated.
- Video file: `kara-kargam-wide-4k60.mp4` (4K HEVC 10-bit). YouTube re-encodes
  4K uploads with better codecs, so even 1080p viewers get a cleaner picture.
- End screen: from 1:16 (needs the last 5–20 s; the outro is calm enough for it).

## Shorts

Both vertical files are under 3 minutes, so either one publishes as a Short.

- `kara-kargam-vertical-4k60-21.5-57.mp4` (35 s: the crow lands, both choruses)
  is the better hook. `kara-kargam-vertical-4k60.mp4` is the whole song.
- Title: `Жаңылтпашты қайталап көр! 🐦‍⬛ Қара, қарғам! #shorts`
  (or in Russian: `Попробуй выговорить! 🐦‍⬛ Қара, қарғам! #shorts`)
- Description:

  ```
  Қаңтарда Қарағандыда қараңғыда қардағы қарт қара қарға… Can you say it? 🐦‍⬛
  Full lyric video on the channel.
  #жаңылтпаш #скороговорка #QubitQuill
  ```

- Once the main video is out, link it from the Short (*Related video*).
