---
title: "The Spectral Image Processing System (SIPS) — Interactive Visualization and Analysis of Imaging Spectrometer Data"
簡稱: "Kruse 等人 1993"
年份: 1993
出處: "Remote Sensing of Environment 44:145–163"
用途: 支撐
狀態: 已讀相關段落
連結: "https://www2.fct.unesp.br/docentes/carto/enner/PPGCC/Comportamento%20Espectral%20de%20Alvos/Tecnicas%20Analise%20Espectro/The%20Spectral%20Image%20Processing%20System%20(SIPS)%20-%20Interactive%20Visualization%20and%20Analysis%20of%20Imaging%20Spectrometer%20Data.pdf"
程式碼: "尚未查找"
讀取日期: 2026-10-01
---
# Kruse 等人 1993
**閱讀紀錄**：PDF 共 19 頁（頁碼 145–163），首頁標題、作者（Kruse、Lefkoff、Boardman、Heidebrecht、Shapiro、Barloon、Goetz）、年份與期刊資訊皆與給定資訊相符。未讀完全文；從文字讀了引言、SAM 小節（p.156–157）與結論（p.162）。圖只看了文字層的圖說與內文描述（Fig. 6、Fig. 7），沒有看圖片本身。SAM 公式在文字層被拆壞，內容以內文敘述（「取點積的 arccosine」）與上下文確認，沒有裁切公式圖。
**閱讀範圍**：Introduction、「The Spectral Angle Mapper (SAM)」小節、Conclusions。其餘（資料校正、光譜庫、unmixing 等）未讀。
**論文群中的角色**：解釋 Benmoussat 等人 2012 Sec III-C 式(4) SAM 的原始出處與「對亮度／照度縮放不變」的理由。注意：Kruse 等人的 SAM 是角度（arccos，單位 radian），Benmoussat 式(4) 只寫了 arccos 內的 cos 值；Kruse 等人把 SAM 的演算法歸給 Boardman (1993a)，本文是把它放進 SIPS 軟體的描述。
## 困難點與研究動機
成像光譜儀（如 AVIRIS，最多 224 個波段）產生「#lines × #samples × #bands」的資料立方體，資料量大，需要互動式的視覺化與分析工具（Introduction，p.145–146）。SAM 要解決的是：影像光譜與參考光譜之間要快速量化相似度，且參考光譜（實驗室光譜）與遙測光譜之間有未知的增益差（p.157）。
## 核心想法與方法
- SAM 把兩條光譜視為 nb 維空間中的向量，計算兩者夾角（p.156）。
- 作者用兩波段的二維圖說明：同一材料、不同照度的光譜落在通過原點的同一條線上；照度弱的像素離原點較近，但向量夾角相同（p.156，Fig. 6）。
- 計算方式：對測試光譜 t 與參考光譜 r，取兩者內積除以長度乘積後的 arccosine（p.157）。
- 前提：資料已換算成「apparent reflectance」，暗電流（dark current）與 path radiance 的偏差已移除（p.156）。
- 輸出：每個影像像素得到一個以 radian 表示的角度值，小角度代表高相似、以較亮灰階顯示；介面有 Low／High Threshold 兩個滑桿調整對比，兩者可鎖定相距 1 radian，得到「比 High Threshold 更相似」的二值圖（p.157）。
## 論證脈絡
引言說明資料型態 → SIPS 各模組 → SAM 以幾何圖像解釋「角度不受向量長度影響」 → 因此實驗室光譜可直接與遙測反射率光譜比較 → 以 SAM Viewer（Fig. 7，dolomite 參考光譜）展示結果 → 結論說明 SIPS 是探索式視覺化加上定量建模的工具。
## 圖表（只列引用到的）
- Fig. 6（p.157）：兩波段平面上的參考光譜與測試光譜，過原點的向量代表同一材料的不同照度。
- Fig. 7（p.158）：SAM Viewer 視窗，對 dolomite 參考光譜的灰階相似度圖，亮處代表較佳匹配（僅讀圖說）。
## 證據
### SAM 對增益（縮放）不變（p.157）
- 標籤：原論文報告
- 如何檢驗：作者以幾何論證，未做數值實驗。
- 結果：原文說這個相似度量「insensitive to gain factors」，因為兩向量夾角與向量長度無關；因此實驗室光譜可與帶有未知地形照度增益的遙測反射率光譜直接比較。
- 可以支持什麼：支持 Benmoussat 等人把 SAM 用在「照明強度與表面角度會改變整體亮度」的金屬件偽光譜立方體（PSC）；但前提是各波段（本例為各照明組合）被乘上同一個增益。
### SAM 的輸出與門檻使用方式（p.157）
- 標籤：原論文報告
- 如何檢驗：軟體功能描述，無量化評估。
- 結果：角度以 radian 輸出，由使用者以滑桿自行設定門檻。
- 可以支持什麼：對應 Benmoussat 等人 Sec III-C「門檻需憑經驗選」的說法：SAM 的原始用法本來就是人工設定門檻。
## 解決的部分與剩餘問題
**作者明列的局限**：SAM 假設資料已校正為 apparent reflectance、暗電流與 path radiance 偏差已移除（p.156）。本文沒有對 SAM 的鑑別力做定量評估。
**我的判讀**：（待驗證的推論）(1) 縮放不變不等於對加性偏移不變；若偽光譜立方體的各張影像帶有相機暗電流或環境光偏移，SAM 值會改變，所以 Benmoussat 等人的前處理是否已扣除暗電流值得查。(2) 金屬件上鏡面反射使不同照明（偏振與否、白光與單色）的增益不一致，這不是單一縮放，SAM 的不變性只部分適用。(3) 這篇文章給的是角度（arccos），式(4) 若只算 cos，則「大值＝相似」，與 Kruse 等人「小角度＝相似」方向相反，閱讀 Table III 時要確認方向。
## 對應的知識點與互動單元
SAM 的定義（角度 vs. cos）、亮度／照度縮放不變性、加性偏移為什麼會破壞不變性、以夾角門檻產生二值偵測圖。
