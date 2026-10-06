---
title: "Distance metrics and band selection in hyperspectral processing with applications to material identification and spectral libraries"
簡稱: "Keshava 2004"
年份: 2004
出處: "IEEE Transactions on Geoscience and Remote Sensing 42(7):1552–1565"
用途: 背景
狀態: 部分閱讀
連結: "https://doi.org/10.1109/TGRS.2004.830549"
程式碼: "尚未查找"
讀取日期: 2026-10-01
---
# Keshava 2004
**閱讀紀錄**：只讀到摘要（經 OpenAlex 取得）與書目資料。IEEE 全文需訂閱，Semantic Scholar 標示非開放取用，ResearchGate 與 Semantic Scholar 頁面無法下載。全文、圖表與公式都沒看，以下沒有頁碼可引。書目資料（單一作者 N. Keshava；2004；42(7)；1552–1565）與給定資訊相符。
**閱讀範圍**：摘要。
**論文群中的角色**：解釋 Benmoussat 等人 2012 Sec III-C 式(4) SAM 的性質與它和 Euclidean 距離的對照。若 Benmoussat 等人在「SAM 最好」之處引用本文，則本文是「SAM 與 EMD（Euclidean minimum distance）各有不同數學與物理性質」的背景（此一引用位置我未逐處核對）。
## 困難點與研究動機
摘要：多數高光譜演算法的核心是比較兩條光譜並回傳一個相似度純量的距離量測；最常見的兩種是 SAM 與 EMD，各有不同的數學與物理性質（摘要）。
## 核心想法與方法
- 列舉 SAM 與 EMD 的特性（摘要）。
- 依據 SAM 的「精確分解」，提出 band add-on（BAO）：逐步加入波段以增大兩條光譜的夾角分離度（摘要）。
- 延伸到兩個類別光譜的角度分離，提出兩種選波段與類別模板的演算法，用於僅有少量（<10）地面實測的材料辨識情境（摘要）。
## 論證脈絡
（僅摘要）距離量測的性質 → SAM 的分解 → BAO 波段選擇 → 與其他以度量為基礎的方法做二元鑑別測試。
## 圖表（只列引用到的）
無（未讀全文）。
## 證據
### 選波段可提升相近目標的鑑別（摘要）
- 標籤：原論文報告
- 如何檢驗：以真實資料做二元鑑別測試，與其他度量式方法比較（細節未讀）。
- 結果：摘要稱只用一小部分波段即可改善非常相似目標的鑑別，沒有數字。
- 可以支持什麼：支持「波段（在 Benmoussat 的設定中是照明組合）選擇會影響 SAM 的鑑別力」這個方向，可以用來思考 Benmoussat 等人 3 個元件的立方體幾乎偵測不到 TAU 的現象；但本摘要並未談 TAU。
## 解決的部分與剩餘問題
**作者明列的局限**：未讀全文，不知。
**我的判讀**：（待驗證的推論）偽光譜立方體只有 4 張影像（4 種照明），波段數遠小於高光譜的數百個；若 SAM 與 SID 在低維度下的性質與高維度不同，這篇的 SAM 分解可能提供解釋，但需讀全文確認。
## 對應的知識點與互動單元
SAM 與 Euclidean 距離的性質差異、SAM 的分解、選波段對角度分離度的影響。
