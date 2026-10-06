---
title: "Concordance measure employed for spectral object detection in hyperspectral and multispectral images"
簡稱: "Huck 與 Guillaume 2006"
年份: 2006
出處: "Astronomical Data Analysis conference IV（ADA IV），2006 年 9 月"
用途: 支撐
狀態: 待讀
連結: "尚未找到公開版本"
程式碼: "尚未查找"
讀取日期: 2026-10-01
---
# Huck 與 Guillaume 2006
**閱讀紀錄**：沒有取得這篇論文。搜尋了 Semantic Scholar、Crossref、OpenAlex 與一般網頁，都沒有找到本文或同一主題的期刊版與 HAL 典藏。作者是 Alexis Huck 與 Mireille Guillaume（Institut Fresnel，Aix-Marseille；Crossref 上同作者的其他文章為 CFAR 異常偵測、解混合）。沒有任何本文內容可引用。
**閱讀範圍**：無。以下僅描述我讀到的「間接線索」，不是本文的內容。
**論文群中的角色**：解釋 Benmoussat 等人 2012 Sec III-C 式(6) Kendall τ（TAU）用於光譜偵測的出處（該文參考文獻[8]）。
**間接線索（二手，非本文）**：Benmoussat 的博士論文（Aix-Marseille，2013，theses.fr 公開 PDF，p.42 式(1.30)、p.53 式(2.7)）也把 TAU 寫成 D_TAU(x,s) = 2/(N(N−1)) Σ_{n<k} sign[(x_k−x_n)(s_k−s_n)]，並說明 TAU 表示「一致的機率減不一致的機率」，且該論文把 Huck 與 Guillaume 的 ADA IV 論文列為此式的出處（參考文獻[26]）。這是用同作者博士論文確認「式(6) 出自這篇」，並非讀到本文。
## 困難點與研究動機
未讀。
## 核心想法與方法
未讀。
## 論證脈絡
未讀。
## 圖表（只列引用到的）
無。
## 證據
無（未取得）。
## 解決的部分與剩餘問題
**作者明列的局限**：未讀。
**我的判讀**：（待驗證的推論）依 Benmoussat 的博士論文敘述，TAU 只用 x 與 s 各波段值之間的大小順序，不使用數值本身，因此對任何嚴格遞增的轉換（含整體縮放）不變，這與 Kendall 1938 的秩相關性質一致；但這要等讀到 Huck 與 Guillaume 本文才能確認他們是否也這樣陳述。另外，只有 3 個元件（3 個波段）時成對數只有 3 對，τ 只能取少數離散值，這可能是 Benmoussat 觀察到 TAU 用 3 元件幾乎偵測不到的原因（待驗證）。
## 對應的知識點與互動單元
Kendall τ 作為光譜相似度、成對一致與不一致的計數、τ 只依賴順序所以對單調轉換與縮放不變、波段數少時 τ 的離散性。
