把怪物圖片放在這個資料夾。

檔名要對應 js/config.js 裡每一筆的 image 路徑，例如：
  zakum.png、horntail.png、pinkbean.png …

建議：正方形、去背 PNG，尺寸約 80×80 以上即可。

若某張圖不存在，卡片會自動改用該怪物的替代文字（fallback）
顯示，功能完全不受影響，補上圖片後就會自動出現。

想新增怪物：把圖片放進來，再到 js/config.js 的 MONSTERS
陣列照格式加一筆（id / name / image / fallback）。
