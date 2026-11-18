const positive = n => Number.isFinite(n) && n > 0;
const integer = n => Number.isSafeInteger(n) && n > 0;
const hex = value => typeof value === "string" && /^[\da-f]{6}$/i.test(value);

export function validateCamp(c, d) {
  const errors = [];
  const opening = d.plots.frameWidth * d.mine.blockSize;
  const side = 2 * d.plots.entranceRadius * Math.tan(Math.PI / d.plots.count);
  if (!(c.archWidth > opening && c.archWidth < side && c.archHeight > d.mine.height * d.mine.blockSize)) errors.push("camp.arch must clear the wall and fit a crater face");
  if (!(c.rimMax >= c.rimMin && c.rimMin > c.archHeight && c.rockMax >= c.rockMin && positive(c.rockMin))) errors.push("camp.rim geometry");
  if (!(integer(c.lampCount) && c.lampCount <= c.lightBudget && c.lightBudget <= 16 && c.lampRadius > c.centreRadius && c.lampRadius < d.plots.entranceRadius)) errors.push("camp.lamp budget or radius");
  if (!hex(c.lampColor) || c.rankColors?.length !== 9 || !c.rankColors.every(hex) || c.rockColors?.length !== 4 || !c.rockColors.every(hex)) errors.push("camp.palette");
  if (!(c.clockTime >= 0 && c.clockTime < 24 && c.ambience >= 0 && c.ambience <= .15)) errors.push("camp.clockTime or ambience");
  if (![c.centreRadius,c.pathWidth,c.blendSeconds,c.walkSpeed,c.scaleHeight,c.scaleRadius,c.scaleSeconds,c.nameDistance].every(positive) || !integer(c.partBudget) || c.partBudget > 2500 || ![2,3].includes(c.tentCount)) errors.push("camp.dimensions or budget");
  return errors;
}

export function validateSocial(s) {
  const errors = [];
  if (![s.viewers,s.guests].every(integer) || s.viewers > 4 || s.guests > 2) errors.push("social.subscription limits");
  if (![s.positionSeconds,s.reactionSeconds,s.askSeconds,s.challengeCooldown,s.countdown,s.scoreSeconds,s.boardSeconds,s.writeSeconds,s.cardSeconds,s.holoMin,s.botSeconds,s.botAcceptSeconds,s.guestExitBlocks,s.spectatorExitBlocks].every(positive) || s.holoMax < s.holoMin || !positive(s.holoMax)) errors.push("social.timing or distances");
  if (s.boardSize !== 100 || s.positionSeconds < .5 || s.writeSeconds < 60 || s.boardSeconds < 120) errors.push("social.board or update budget");
  if (s.reactions?.join(",") !== "like,fire,bolt,wow,party,gem") errors.push("social.reactions");
  if (![s.keyChance,s.guestCoins,s.guestKeyHits].every(n => n > 0 && n <= 1) || ![s.rewardLimit,s.winMinutes,s.loseMinutes,s.duelSeconds,s.duelWidth,s.duelHeight].every(integer) || s.duelWidth !== 5 || s.duelHeight !== 3) errors.push("social.rewards or wall");
  return errors;
}
