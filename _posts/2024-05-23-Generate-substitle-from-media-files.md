---
categories: [Tiện ích]
comments: true
tags: [tiếng Trung, Chinese, English]
title: Generate subtitle from media files
---



Download: [transcribe](https://github.com/catusf/create_subtitles/releases/tag/v1.0) 

This post introduces a tool that creates subtitles for any media in (almost) any language.

Using OpenAI's Whisper library (famous for ChatGPT), this tool reads any video and automatically transcribes the content discussed in the video. Of course, machine reading cannot be 100% accurate, but it can assist you in learning a foreign language.

Usage
1. Download the tool transcribe.

2. Copy the video files (preferably in mp4 format) and audio files that need subtitles into the `downloads` folder.

3. Run transcribe.exe to create and translate subtitles (default languages are Vietnamese and English).

4. After the software has finished running, go to the `downloads/subs` folder to find the original video files and the created subtitle files.

Use a video player that supports subtitle selection (such as MX Player or VLC Media Player) to watch.

<img src="https://catusf.github.io/img/transcribe_gui.png" alt="Subtitle creation and translation software interface" width="50%"/>
Software interface
<img src="https://catusf.github.io/img/Subtitle-ZH-VI-PY.png" alt="Combined Chinese-Vietnamese-Pinyin subtitles" width="50%"/>
Combined Chinese-Vietnamese-Pinyin subtitles

## Notes

The program running time may be quite long, depending on your computer's configuration, so please be patient :)

## Tip

Installing the Mengshen font (guide here) on your computer can help you remember both the characters and the Pinyin when watching Chinese subtitles.

<img src="https://catusf.github.io/img/Subtitle-ZH-with-Pinyin-Font.png" alt="Chinese subtitles with Pinyin font" width="50%"/>
Chinese subtitles with Pinyin font
