---
title: Font NanGuo Pinyin — chữ Hán có phiên âm sẵn
date: 2026-05-16
categories: [Tiện ích]
tags: [tiếng Trung, Chinese, fonts]
---

## Font chữ Hán có phiên âm

Đây là bộ font chữ Hán giản thể đặc biệt: mỗi chữ Hán đã có sẵn phiên âm
pinyin in nhỏ ở phía trên. Bạn chỉ cần gõ chữ
Hán như bình thường — pinyin tự xuất hiện. 

Có hai bộ font:

- **NanGuo Heiti Pinyin** — kiểu chữ vuông, không chân (sans).
- **NanGuo Songti Pinyin** — kiểu chữ có chân, dáng truyền thống (serif).

Cả hai đều dựa trên font Noto của Google nên hiển thị rất rõ trên mọi
hệ điều hành.

## Điểm mới: hỗ trợ chữ có nhiều cách đọc

Trong tiếng Trung có rất nhiều **đa âm tự** — tức là chữ có nhiều hơn
một cách đọc. Ví dụ chữ **行**: khi đọc là *xíng* nghĩa là "đi"; khi đọc
là *háng* nghĩa là "hàng, dãy".

Mỗi bộ font có **6 phiên bản × 2 độ đậm (thường + đậm) = 12 file font**:

- Phiên bản `-1`: ghi cách đọc phổ biến nhất.
- Phiên bản `-2` đến `-6`: ghi các cách đọc khác.

Bạn có thể xếp các phiên bản trong CSS `font-family` để chuyển qua lại
giữa các cách đọc, rất tiện cho việc học và dạy tiếng Trung.

## Một font — nhiều ngôn ngữ

Ngoài chữ Hán, font còn hỗ trợ nhiều hệ chữ khác. Bạn có thể soạn một
văn bản pha trộn nhiều thứ tiếng mà **không cần đổi font giữa chừng**:

- **Các ngôn ngữ châu Âu dùng chữ Latin** — tiếng Anh, Pháp, Đức, Tây
  Ban Nha, Bồ Đào Nha, Ý… (đầy đủ dấu á-à-ã-â-é-ñ-ü-ç…).
- **Tiếng Việt** — đầy đủ các dấu thanh và nguyên âm: ạ ả ấ ầ ẩ ẫ ậ ắ
  ằ ẳ ẵ ặ ế ề ể ễ ệ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ đ.
- **Các ngôn ngữ dùng chữ Kirin (Cyrillic)** — tiếng Nga, Ukraina,
  Bulgaria… (Привет, Россия).

Nhờ vậy giáo viên ngoại ngữ có thể dùng cùng một font để soạn giáo trình
song ngữ Trung – Việt, Trung – Anh, Trung – Nga… mà chữ vẫn đồng nhất
về kiểu dáng và độ đậm.

## Tải về

- **NanGuo Heiti Pinyin (sans):**
  [tải font](https://github.com/catusf/NanGuo-Fonts/releases/download/v1.0/NanGuoHeitiPinyin.ttc)

- **NanGuo Songti Pinyin (serif):**
  [tải font](https://github.com/catusf/NanGuo-Fonts/releases/download/v1.0/NanGuoSongtiPinyin.ttc)


- **Mã nguồn:**
  [github.com/catusf/NanGuo-Fonts](https://github.com/catusf/NanGuo-Fonts)

## Hình minh hoạ

![Font NanGuo Heiti Pinyin](https://catusf.github.io/img/NanGuo_Demo_Heiti.png)

![Font NanGuo Songti Pinyin](https://catusf.github.io/img/NanGuo_Demo_Songti.png)

![Bài thơ Đường - Tương tư ](https://catusf.github.io/img/NanGuo_Poem_XiangSi.png)

## Ghi chú

Font hỗ trợ đầy đủ bộ chữ **GB2312** (6.763 chữ Hán thông dụng), có cả
độ đậm thường và đậm, phát hành theo giấy phép **OFL** (dùng miễn phí
cho cả mục đích cá nhân và thương mại).
