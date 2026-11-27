window.scoreJZ = function scoreKardio(answers) {
  // ESC/WHO arterial hypertension clinical risk scoring across Q1..Q9
  var score = 0;

  // Q1: Age (0..4)
  var age = typeof answers[0] === "number" ? answers[0] : 0;
  if (age >= 3) score += 2;
  else if (age === 2) score += 1;

  // Q2: Blood pressure grade (0=normal, 1=Grade1, 2=Grade2, 3=Grade3, 4=unknown)
  var bp = typeof answers[1] === "number" ? answers[1] : 0;
  if (bp === 1) score += 2;
  else if (bp === 2) score += 4;
  else if (bp === 3) score += 7;
  else if (bp === 4) score += 2;

  // Q3: Duration (0..3)
  var since = typeof answers[2] === "number" ? answers[2] : 0;
  score += since;

  // Q4: Headache / dizziness (0..3)
  var head = typeof answers[3] === "number" ? answers[3] : 0;
  score += head;

  // Q5: Chest pain / palpitations (0..3)
  var chest = typeof answers[4] === "number" ? answers[4] : 0;
  score += chest * 2;

  // Q6: Shortness of breath / leg swelling (0..3)
  var breath = typeof answers[5] === "number" ? answers[5] : 0;
  score += breath * 2;

  // Q7: Medication adherence (1=only on spike, 2=uncontrolled on daily meds)
  var meds = typeof answers[6] === "number" ? answers[6] : 0;
  if (meds === 1 || meds === 2) score += 2;

  // Q8: Diabetes / high cholesterol / CKD (0..3)
  var dis = typeof answers[7] === "number" ? answers[7] : 0;
  score += dis * 2;

  // Q9: Family/personal CVD or hypertensive crisis (0..3)
  var fam = typeof answers[8] === "number" ? answers[8] : 0;
  if (fam === 3) score += 5;
  else if (fam === 2) score += 2;
  else if (fam === 1) score += 1;

  // Determine clinical risk level: 1 = Mild, 2 = Moderate, 3 = High
  var lv = score >= 15 ? 3 : score >= 7 ? 2 : 1;

  // Hard clinical red flags (Grade 3 BP >=180/110, resting chest pain/dyspnea, or prior crisis/CVD) -> Level 3
  if (bp === 3 || chest === 3 || breath === 3 || (fam === 3 && bp >= 2)) {
    lv = 3;
  } else if (bp === 2 && lv < 2) {
    lv = 2;
  }

  return { sum: score, lv: lv };
};
