window.scoreJZ = function scoreJZ(answers) {
  // IIEF-5 savollari: Q3..Q7 (indekslar 2..6), har biri 1..5 ball, jami 5..25
  var sum = 0;
  for (var idx = 2; idx <= 6; idx++) {
    var val = typeof answers[idx] === "number" ? answers[idx] + 1 : 1;
    sum += val;
  }
  var lv = sum >= 17 ? 1 : sum >= 12 ? 2 : 3;
  // Q9 (indeks 8): 3 = "Umuman foyda bermagan" -> 1-daraja bo'lsa 2-darajaga tushiriladi
  if (answers[8] === 3 && lv === 1) {
    lv = 2;
  }
  return { sum: sum, lv: lv };
};
