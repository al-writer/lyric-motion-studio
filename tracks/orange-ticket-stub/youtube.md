# Orange Ticket Stub: YouTube upload kit

## Title

qubit_quill – Orange Ticket Stub (Official Lyric Video)

Alternative, shorter and closer to what people type: `qubit_quill – Orange Ticket Stub (Lyrics)`

## Thumbnail

`out/orange-ticket-stub-thumbnail-line.jpg` as the main one; add `-hero` and
`-macro` in YouTube Studio → *Test & Compare* so YouTube picks the winner by
watch time. Rebuild with `node tools/render.mjs --track orange-ticket-stub --thumbnail`.

## Description

Check the channel handle in the subscribe link before publishing.

```
A ticket stub, a torn cotton candy bag, a gum wrapper, one green button: the little things you keep when someone slips away into the crowd. "Orange Ticket Stub" by qubit_quill, official lyric video.

🔔 Subscribe for new songs: https://www.youtube.com/@qubit_quill?sub_confirmation=1

⏱ Chapters
0:00 Intro
0:21 Verse 1
0:52 Pre-Chorus
1:03 Chorus
1:34 Verse 2
2:04 Chorus
2:25 Bridge
2:56 Final Chorus
3:21 Outro

📝 Lyrics
[Verse 1]
I found your orange ticket stub
In the pocket of my coat
Sixteen cents of arcade luck
And a fold mark by your thumb
You wrote a name on the back
In blue ink, leaning hard
Like you knew the gate would close
Before we left the yard

[Pre-Chorus]
Now I spin it in my palm
Like a tiny warning sign
All that paper, all that time
Still humming in my mind

[Chorus]
Orange ticket stub
Hold me up, hold me up, hold me up
hold me up, hold me up
Orange ticket stub
You were gone too fast
Orange ticket stub
Tell me what we had
Orange ticket stub
I keep the little things

[Verse 2]
The cotton candy bag was torn
On the bench by platform nine
A gum wrapper, one green button
And your laugh between the lines
The vendor called “last round”
We both heard “stay”
But the crowd pulled on your sleeve
And you slipped away

[Pre-Chorus]
Now I spin it in my palm
Like a tiny warning sign
All that paper, all that time
Still humming in my mind

[Chorus]
Orange ticket stub
Hold me up, hold me up, hold me up
hold me up, hold me up
Orange ticket stub
You were gone too fast
Orange ticket stub
Tell me what we had
Orange ticket stub
I keep the little things

[Bridge]
Maybe love looks small at first
Just a crease, just a tear
Just a pocket full of proof
That you were really there
I put it by my keys
By the door, by the chain
If I lose that little square
Do I lose your name?

[Final Chorus]
Orange ticket stub
Hold me up, hold me up, hold me up
hold me up, hold me up
Orange ticket stub
You were gone too fast
Orange ticket stub
Tell me what we had
Orange ticket stub
I keep the little things

[Outro]
Orange ticket stub
Hold me up
Orange ticket stub
I keep the little things

🎧 Credits
Song, lyrics and visuals: qubit_quill
Music produced with Suno (AI-assisted)
Lyric video made with Lyric Motion Studio: https://github.com/al-writer/lyric-motion-studio

#qubitquill #OrangeTicketStub #lyrics
```

## Tags

```
qubit_quill, qubit quill, orange ticket stub, orange ticket stub lyrics, orange ticket stub qubit_quill, lyric video, lyrics, indie pop, bedroom pop, nostalgic song, sad love song, keep the little things, breakup song, new music 2026
```

## Settings

- Category: **Music**. Audience: **No, it's not made for kids**.
- Language and caption language: **English**.
- Subtitles: upload `tracks/orange-ticket-stub/build/lyrics.srt` (Subtitles → Upload file → *With timing*). Synced lyrics as captions, also indexed by search.
- Altered or synthetic content: the vocals are AI-generated (Suno), so answer **Yes**.
- Video file: `orange-ticket-stub-wide-4k60.mp4` (4K HEVC 10-bit). YouTube re-encodes 4K uploads with better codecs, so even 1080p viewers get a cleaner picture.
- End screen: subscribe element plus "best for viewer" video, from 3:35.
- Vertical version: at 3:46 it is longer than the 3-minute Shorts limit, so it would publish as a regular vertical video. For Shorts, cut the first chorus with `--format vertical --range 62,93`.
