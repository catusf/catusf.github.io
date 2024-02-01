---
categories: [Podcasts]
tags: [podcast,sách nói,audiobook]
pin: true
---

## Giới thiệu

Dự án Radio2Podcasts này đọc thông tin từ các trang web có audio và chuyển thành các podcast để nghe trên lại điện thoại dễ dàng. Để nghe, hãy sử dụng các ứng dụng sau: 
- Trên iOS: [Apple Podcasts](https://apps.apple.com/us/app/apple-podcasts/id525463029) hay [Pocket Casts](https://apps.apple.com/au/app/pocket-casts/id414834813) 
- Trên Android: [Podcast Addict](https://play.google.com/store/apps/details?id=com.bambuna.podcastaddict&hl=en&gl=US) hay [Pocket Casts](https://play.google.com/store/apps/details?id=au.com.shiftyjelly.pocketcasts)

Sau khi cài đặt một trong các ứng dụng trên, truy cập vào một trong 2 trang sau:
- [Các chương trình radio](https://catusf.github.io/radio2podcasts/index.html)
- [Các cuốn sách nói](https://catusf.github.io/radio2podcasts/index-ppud.html)
- [Các sách nói trên Archive.org](https://catusf.github.io/radio2podcasts/index-archive.html)

## Các podcasts đã tạo

Hiện nay các trang web hiện nay đã hỗ trợ:
- [VOV1](https://vov1.vn/) Đài tiếng nói Việt Nam
- [VOV6](https://vov6.vov.vn/) Đài tiếng nói Việt Nam
- [VOH](https://radio.voh.com.vn/) Đài tiếng nói Nhân dân TP HCM
- [DRT](https://www.drt.danang.vn/) Đài phát thanh truyền hình Đà Nẵng
- [Sách nói trên trang Phật pháp ứng dụng](https://phatphapungdung.com/sach-noi/)

## Một số hình ảnh

<img src="/assets/img/Podcast4.png" alt="Danh sách các chương trình" style="width: 50%;"/>

<br>

<img src="/assets/img/Podcast5.png" alt="Danh sách các chương trình" width="50%"/>

#### Giao diện nghe podcast

<img src="/assets/img/Podcast1.png" alt="Giao diện nghe podcast" width="50%"/>

<br>

<img src="/assets/img/Podcast2.png" alt="Giao diện nghe podcast" width="50%"/>

<br>

<img src="/assets/img/Podcast3.png" alt="Giao diện nghe podcast" width="50%"/>

## Công nghệ
Ở Việt Nam, không nhiều trang web của các đài phát thanh cung cấp podcast để đọc giả nghe lại các chương trình. Dự án Radio2Podcasts này thực hiện những việc sau:
1. Chạy chương trình Python (triển khai trên Heroku) định kỳ hàng giờ
2. Tìm ra các audio mới trên các website
3. Tạo ra file XML có format của podcast
4. Tạo ra file HTML của tất cả các podcast vừa tạo ra
5. Lưu các file XML và HTML lên một trang web (hiện dùng trang GitHub Pages các bạn đang xem)

Nếu bạn muốn sửa lỗi hay thay đổi chương trình, hãy truy cập vào [github.com/catusf/radio2podcasts](https://github.com/catusf/radio2podcasts).
