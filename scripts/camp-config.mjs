const positive = value => Number.isFinite(value) && value > 0;
const integer = value => Number.isSafeInteger(value) && value > 0;
const hex = value => typeof value === "string" && /^[\da-f]{6}$/i.test(value);
const palette = (colors, size) => Array.isArray(colors) && colors.length === size && colors.every(hex);

export function validateCamp(camp, config) {
  const errors = [];
  const opening = config.plots.frameWidth * config.mine.blockSize;
  const side = 2 * config.plots.entranceRadius * Math.tan(Math.PI / config.plots.count);
  if (!(camp.archWidth > opening && camp.archWidth < side && camp.archHeight > config.mine.height * config.mine.blockSize)) {
    errors.push("camp.arch must clear the wall and fit a crater face");
  }
  if (!(camp.rimMax >= camp.rimMin && camp.rimMin > camp.archHeight && camp.rockMax >= camp.rockMin && positive(camp.rockMin))) {
    errors.push("camp.rim geometry");
  }
  if (!(integer(camp.lampCount) && integer(camp.lightBudget) && camp.lampCount <= camp.lightBudget && camp.lightBudget <= 16
    && camp.lampRadius > camp.centreRadius && camp.lampRadius < config.plots.entranceRadius)) {
    errors.push("camp.lamp budget or radius");
  }
  if (!hex(camp.lampColor) || !palette(camp.rankColors, 9) || !palette(camp.rockColors, 4)) {
    errors.push("camp.palette");
  }
  if (!(camp.clockTime >= 0 && camp.clockTime < 24 && camp.ambience >= 0 && camp.ambience <= 0.15)) {
    errors.push("camp.clockTime or ambience");
  }
  const dimensions = [camp.centreRadius, camp.pathWidth, camp.blendSeconds, camp.walkSpeed,
    camp.scaleHeight, camp.scaleRadius, camp.scaleSeconds, camp.nameDistance];
  if (!dimensions.every(positive) || !integer(camp.partBudget) || camp.partBudget > 2500 || ![2, 3].includes(camp.tentCount)) {
    errors.push("camp.dimensions or budget");
  }
  return errors;
}

export function validateSocial(social) {
  const errors = [];
  if (![social.viewers, social.guests].every(integer) || social.viewers > 4 || social.guests > 2) {
    errors.push("social.subscription limits");
  }
  const timing = [social.positionSeconds, social.reactionSeconds, social.askSeconds, social.challengeCooldown,
    social.countdown, social.scoreSeconds, social.boardSeconds, social.writeSeconds, social.cardSeconds,
    social.holoMin, social.holoMax, social.botSeconds, social.botAcceptSeconds, social.guestExitBlocks, social.spectatorExitBlocks];
  if (!timing.every(positive) || social.holoMax < social.holoMin) {
    errors.push("social.timing or distances");
  }
  if (social.boardSize !== 100 || social.positionSeconds < 0.5 || social.writeSeconds < 60 || social.boardSeconds < 120) {
    errors.push("social.board or update budget");
  }
  if (!Array.isArray(social.reactions) || social.reactions.join(",") !== "like,fire,bolt,wow,party,gem") {
    errors.push("social.reactions");
  }
  const shares = [social.keyChance, social.guestCoins, social.guestKeyHits];
  const rewards = [social.rewardLimit, social.winMinutes, social.loseMinutes, social.duelSeconds, social.duelWidth, social.duelHeight];
  if (!shares.every(n => positive(n) && n <= 1) || !rewards.every(integer) || social.duelWidth !== 5 || social.duelHeight !== 3) {
    errors.push("social.rewards or wall");
  }
  return errors;
}
