// [ТЗ-04 §12] Reproducible comparison on production Luau, with explicit QA grants and permanent skills.
import { spawnSync } from 'node:child_process';
import { familyGameplay, familySkill } from './balance/data.mjs';
const minutes = Number(process.argv[2] ?? 60);
if (!(minutes > 0 && Number.isFinite(minutes))) throw new Error('Minutes must be positive');
console.log(`Этап 4: ${minutes} мин на семью, active; зерно 3032026.`);
console.log('QA: обычная кирка в 3:45, редкая в 15:00; навыки 0/0/0/0 и 3/1/0/0 с начала получения семьи.');
console.log('Транзакции, фишки, сундуки, бонусы, покупки и длительность ульты — из кода игры; без перерождений и питомцев.');
for (const family of Object.keys(familyGameplay)) {
  for (const skills of ['0,0,0,0', '3,1,0,0']) {
    const args = ['run','scripts/sim/run.luau','--',String(minutes),'active',
      `--picks=3:45:${family}_common,15:00:${family}_rare`, `--skills=${skills}`];
    const result = spawnSync('lune', args, { encoding:'utf8', maxBuffer:1024*1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    console.log(`\n${family} · навыки ${skills}`);
    console.log(result.stdout.split('\n').filter(line => /Плита мира|Итог за|Фишки:|Расчёт:/.test(line)).join('\n'));
  }
}
console.log(`\nПостоянные бонусы: +${familySkill.accountCoinsPerLevel * 100}% за каждый купленный уровень любой семьи.`);
