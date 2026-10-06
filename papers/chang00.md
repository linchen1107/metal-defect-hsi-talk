---
title: "An information-theoretic approach to spectral variability, similarity, and discrimination for hyperspectral image analysis"
簡稱: "Chang 2000"
年份: 2000
出處: "IEEE Transactions on Information Theory 46(5):1927–1932"
用途: 核心
狀態: 已讀全文
連結: "https://www2.umbc.edu/rssipl/pdf/IT_2000.pdf（DOI 10.1109/18.857802）"
程式碼: "尚未查找"
讀取日期: 2026-10-01
---
# Chang 2000
**閱讀紀錄**：全文 6 頁（頁碼 1927–1932）讀完。首頁標題、作者（Chein-I Chang，UMBC）、年份、期刊與卷期與給定資訊相符。看過文字層的 Table I–V 數字（表格內容以內文引用的數字核對，未逐格核對表格）；圖（Fig. 1、Fig. 2）只讀圖說，未看圖片。公式（1）–（11）由文字層讀取，符號有些遺失，以上下文確認。
**閱讀範圍**：摘要、Sec. I–VI（Introduction、SIM、SID、三項鑑別準則、實驗、結論）。參考文獻未細讀。
**論文群中的角色**：解釋 Benmoussat 等人 2012 Sec III-C 式(5) SID 的來源。Chang 式(4) 的 SID(x,y) = D(x‖y) + D(y‖x) 展開後就是 Benmoussat 的 Σ p log(p/q) + Σ q log(q/p)；p、q 的正規化即 Chang 式(1)。
## 困難點與研究動機
高光譜像素是不同材料依不同豐度混合而成，且大氣效應使光譜在取得時會變動，所以需要能描述光譜變異、相似與鑑別的度量（Sec. I）。當時常用的 SAM 被作者認為在保留光譜性質上不如 SID（Sec. I）。
## 核心想法與方法
- SIM（Spectral Information Measure）：假設各波段值非負，把像素向量 x 以 p_j = x_j / Σ x_l 正規化成機率向量（式(1)），之後可算平均、變異數、三、四階中心動差與熵 H(x) = −Σ p_l log p_l（Sec. II）。
- SID：定義第 l 波段自我資訊 I_l = −log p_l，相對熵 D(x‖y) = Σ p_l log(p_l/q_l)（式(3)，即 Kullback–Leibler 資訊量），再以對稱化 SID(x,y) = D(x‖y) + D(y‖x)（式(4)）。
- 三項鑑別準則：spectral discriminatory probability（式(5)，把某度量對光譜庫各條目的值正規化成機率）、spectral discriminatory power PW（式(6)，兩個像素相對於參考像素 d 的度量值比，取大於 1 的方向）、spectral discriminatory entropy（式(7)）。
- 對照用的度量：Euclidean distance（式(8)）與 SAM（式(9)，SAM = cos⁻¹(⟨s_i,s_j⟩ / (‖s_i‖‖s_j‖))，單位 radian）。作者指出單位向量時 ED = 2 sin(SAM/2)，SAM 小時兩者近似，所以實驗只比 SAM（Sec. V）。
## 論證脈絡
先把光譜當作機率分佈 → 以相對熵定義相似度 SID → 提出一個度量好壞的指標（PW）與庫比對指標（機率、熵）→ 在 AVIRIS 與 HYDICE 資料上比 SID 與 SAM → 結論 SID 的鑑別力較高。
## 圖表（只列引用到的）
- Fig. 1（p.1929）：AVIRIS 五種地物（blackbrush、creosote leaves、dry grass、red soil、sagebrush）反射率光譜，0.4–2.5 μm，158 個波段。
- Table II（p.1930）：五種光譜兩兩的 SAM（上三角）與 SID（下三角）值。
- Table III（p.1931）：以混合光譜 t 比對時 SAM 與 SID 的鑑別機率向量。
- Fig. 2（p.1930）：HYDICE 64×64 場景、15 個面板與五種面板光譜。
## 證據
### SID 對相近光譜的鑑別力高於 SAM（Sec. V, Example 1，式(10)(11)）
- 標籤：原論文報告
- 如何檢驗：以 blackbrush 為參考 d、creosote leaves 為 s_i、sagebrush 為 s_j（三者光譜相近），算 PW。
- 結果：PW_SID = 0.0497 / 0.0063 ≈ 7.9；PW_SAM = 0.1767 / 0.0681 ≈ 2.6。作者說 SID 約為 SAM 的三倍有效。
- 可以支持什麼：支持 Benmoussat 等人把 SID 列為候選度量；但這是區分相近材料的結果，與金屬缺陷偵測的資料不同。
### 混合光譜的辨識（Sec. V, Table III）
- 標籤：原論文報告
- 如何檢驗：目標 t 為 0.1055 blackbrush、0.0292 creosote leaves、0.0272 dry grass、0.7588 red soil、0.0974 sagebrush 的混合，對五條庫光譜算鑑別機率與熵。
- 結果：red soil 對 dry grass 的比值，SAM 為 0.1044 : 0.0769 ≈ 1.36，SID 為 0.0588 : 0.0112 ≈ 5.25；鑑別熵 SID 0.8843、SAM 1.1339。
- 可以支持什麼：SID 對相似光譜的區分較有餘裕。
### HYDICE 面板（Sec. V, Example 2，Table IV–V）
- 標籤：原論文報告
- 如何檢驗：五種面板光譜（P1–P5）作庫，目標取自 p5a 的混合像素。
- 結果：p^SAM(P4):p^SAM(P5) ≈ 2.09，p^SID(P4):p^SID(P5) ≈ 5.98；SID 約三倍有效，且熵最小。
- 可以支持什麼：同上。
## 解決的部分與剩餘問題
**作者明列的局限**：本文未列出明確局限；結論只說 SIM 類準則表現優於 SAM。
**我的判讀**：（待驗證的推論）(1) 式(1) 的正規化使 SID 對所有波段同乘一個正常數不變，這與 SAM 的縮放不變性相同，所以 SID 不是「比 SAM 更不受亮度影響」，而是比較光譜形狀的方式不同。(2) 式(1) 假設各分量非負，且 log(p/q) 在某分量為 0 時沒有定義，作者未討論；偽光譜立方體若有近 0 或負值（扣暗電流後），需要處理。(3) 作者的優勢只在兩個遙測資料集，且是「有參考光譜」的比對；Benmoussat 等人的目標是背景像素或平均光譜（近乎無監督），兩者設定不同，SID 優勢是否保留不能直接推論。(4) 作者以 PW 評估，不是偵測率或 AFAR，與 Benmoussat Table III 的指標不同。
## 對應的知識點與互動單元
SID 的定義與式(1) 正規化、KL 散度的對稱化、PW 指標、為什麼 SID 與 SAM 對縮放都不變、正規化後保留形狀而丟掉總亮度。
