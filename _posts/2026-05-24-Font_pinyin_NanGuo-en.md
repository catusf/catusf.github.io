---
title: NanGuo Pinyin Font — Chinese characters with built-in pinyin
date: 2026-05-17
categories: [Utilities]
tags: [Chinese, Pinyin, fonts]
---

## Download

- **NanGuo Heiti Pinyin (sans):**
  [download font](https://github.com/catusf/NanGuo-Fonts/releases/latest/download/NanGuoHeitiPinyin.ttc)

- **NanGuo Songti Pinyin (serif):**
  [download font](https://github.com/catusf/NanGuo-Fonts/releases/latest/download/NanGuoSongtiPinyin.ttc)

- **Source code:**
  [github.com/catusf/NanGuo-Fonts](https://github.com/catusf/NanGuo-Fonts)

## Chinese font with pinyin

This is a special Simplified Chinese font set: each Chinese character has pinyin printed in small text above it. You type Chinese characters as usual — the pinyin appears automatically.

There are two families:

- **NanGuo Heiti Pinyin** — square, sans-serif.
- **NanGuo Songti Pinyin** — serif, traditional-style.

Both are based on Google's Noto fonts so they render clearly on all operating systems.

## Demo images

![NanGuo Heiti Pinyin font](https://github.com/catusf/NanGuo-Fonts/raw/main/documentation/NanGuo_Demo_Heiti.png)

![NanGuo Songti Pinyin font](https://github.com/catusf/NanGuo-Fonts/raw/main/documentation/NanGuo_Demo_Songti.png)

![Tang poem — Xiang Si](https://github.com/catusf/NanGuo-Fonts/raw/main/documentation/NanGuo_Poem_XiangSi.png)

## Support for characters with multiple pronunciations

Chinese has many polyphonic characters — characters with more than one pronunciation. For example, **行**: pronounced *xíng* meaning “to walk”, or *háng* meaning “row, line”.

This font set is optimized so that the most common pronunciations (especially characters included in HSK levels 1–6) appear in the first font release, minimizing the need to switch fonts.

Each family includes **6 variants × 2 weights (regular + bold) = 12 font files**:

- Version `-1`: shows the most common pronunciation.
- Versions `-2` to `-6`: show other pronunciations.
- Version `-6` will contain the light/neutral tone (轻声) if that tone is not present in version `-1`.

## Pinyin for compound words

Hanzi inside compound words can have pronunciations different from their most common standalone reading. Examples:

- 了解: le → liǎo
- 觉得: jiào → jué
- 高兴: xīng → xìng
- 银行: xíng → háng
- 差别: chà → chā
- 认为: wèi → wéi
- 便宜: biàn → pián

## Always free

The font is open source and published on GitHub. You can download it without logging in or paying.

Technically skilled users can download and modify the source as they wish.

## One font — many languages

Besides Chinese, the font supports many scripts. You can compose mixed-language documents without switching fonts:

- **European languages using Latin** — English, French, German, Spanish, Portuguese, Italian… (full diacritics).
- **Vietnamese** — full tone marks and vowels (ạ ả ấ ầ ẩ ẫ ậ ắ ằ ẳ ẵ ặ ế ề ể ễ ệ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ đ).
- **Cyrillic languages** — Russian, Ukrainian, Bulgarian… (Привет, Россия).

This makes it convenient for language teachers to prepare bilingual materials (Chinese–Vietnamese, Chinese–English, Chinese–Russian, etc.) with consistent typography.

## Notes

The font supports the full **GB2312** set (6,763 common Chinese characters), includes regular and bold weights, and is released under the **OFL** license (free for personal and commercial use).
