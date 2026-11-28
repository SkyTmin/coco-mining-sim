# Б24 В1 · поиск по живым персонажам

**Вопрос.** За счёт каких проверяемых приёмов плоский персонаж передаёт объём, играет роль и отвечает на действие зрителя? Какие признаки остаются видны в короткой полосе кадров?

В подборке 12 работ. Из страниц авторов взяты только сведения о конкретном проекте. GIF изучались в нескольких декодированных фазах, видео — по стоп-кадрам. У Spine Dragon и Stretchyman просмотрен также официальный плеер в Chromium. У котов использованы два снимка редактора. Номера кадров, отсчёт с нуля и временные отметки приведены в карточках. [Атлас](ceiling/)

| Запрос | Что нашли или отклонили |
| --- | --- |
| Esoteric Spine examples stretchyman vine tank raptor weight animated character constraints | Нашлись отдельные технические проекты Raptor и Stretchyman. Развели толщину челюсти и мягкий сгиб ноги по двум карточкам. [Источник](https://esotericsoftware.com/spine-examples-raptor) |
| Rive teddy login state machine animation bear hands look author interactive art | Нашлась демонстрация Rive с роликом входа. Отброшены пересказы реализации формы. [Источник](https://rive.app/blog/animated-login-screen-design) |
| Live2D サンプルモデル 桃瀬ひより 名執尽 パラメータ 作例 モーション 物理演算 | Найдены паспорта моделей. Статичный портрет Hiyori сам по себе не показывает задержку волос. [Источник](https://www.live2d.com/en/learn/sample/momose-hiyori/) |
| Rive examples interactive character fire bear yeti animation state machine case study Duolingo | Вышли на исходную статью Duolingo и авторский лист вариантов рта. [Источник](https://blog.duolingo.com/world-character-visemes/) |
| Spine example projects chibi stickers dragon mesh animation rag doll stretchyman mix and match | По Dragon выяснилось различие между старым текстом и форматом 4.2 в живом примере. [Источник](https://esotericsoftware.com/files/examples/4.2/dragon/export/dragon-ess.json) |
| Live2D Cubism samples Haru Natori Mao Wanko animation parameters touch motion sample video | Найдены паспорта Haru и Mao. Функции в паспорте не доказывают выразительность конкретного кадра. [Источник](https://www.live2d.com/en/learn/sample/niziiro-mao/) |
| Cubism official demo Live2D WebGL Model Mao Hiyori Tororo Hijiki official sample preview drag model click | Официальная карточка котов ведёт к ролику. Зафиксирован также редакторский снимок, по которому видно положение лапы. [Источник](https://www.live2d.com/en/learn/sample/tororo-hijiki/) |
| site:rive.app/blog Brilliant Koji rig character scale case study animation eyes expression Rive | Найдена статья самой Brilliant с записью настройки голоса через громкость и параметры ореола. [Источник](https://rive.app/blog/brilliant-builds-its-math-and-coding-tutor-character-with-rive) |
| Duolingo Lily video call body animations eight head additive original Rive animation transitions | Портфолио ведущего аниматора содержит конкретные фазы реакций. [Источник](https://www.sarah-abbott.com/work/new-portfolio-item) |
| Spine hero celestial circus spine rig wings bird card physics example | По совместной выдаче отдельная авторская демонстрация этого героя для вывода не отобрана. |
| Rive character rig interactive animation Little Witch author explanation joystick card | Нашлась пользовательская карточка общего персонажного рига. Для выбранного вопроса о поведении взяли работу с видимым результатом жеста. [Источник](https://rive.app/marketplace/28370-53642-interactive-character-rig-bones-joysticks-and-data-binding/) |
| Live2D sample model video tororo hijiki animated cat illustration official 猫 モーション 紹介 | Найден комментарий студии на японском, включая выбор ограниченных параметров именно для кошачьих жестов. Из каталога далее вышли на портрет, Lamp Man, TR3 и Himawari. [Источник](https://www.live2dcs.jp/works/tororohiziki/) |
| Video Call With Lily Rive eight head body animations layers 8 head idle interview Duolingo animator | Сверен первоисточник о восьми движениях головы и восьми тела. Частота повторов в конкретной сессии не приведена. [Источник](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life) |
| site:live2d.com 中文 眨眼 物理 素材 参数 桃濑日和 毛发 口型 角度 | Открыта китайская карточка Hiyori, указана привязка волос. Нового результата по сравнению с японской карточкой нет, перевод отдельным первоисточником не считали. [Источник](https://www.live2d.com/zh-CHS/learn/sample/momose-hiyori/) |
| site:esotericsoftware.com spine demos IK stretching mesh skinning hero mix and match path example | Дополнительная проверка цели ноги и порядка ограничений в китайском тексте Spineboy. Нагрузку рига на телефон эта страница не измеряет. [Источник](https://zh.esotericsoftware.com/spine-examples-spineboy) |

## Где остановился поиск по этому вопросу

После авторских разборов отдельно проверили, не пропущен ли новый наблюдаемый приём в объяснениях самих инструментов. Следующие три новых документа прочитаны подряд. У каждого есть свои детали для инженера. Ни один не добавил новой категории **видимого** приёма к карточкам.

| Порядок чтения | Прочитанный фрагмент | Почему он не расширил визуальный ответ |
| --- | --- | --- |
| 1 | Cubism, раздел Skinning Function, несколько вращательных деформеров на одной ArtMesh для длинных волос и верёвок. [Live2D](https://docs.live2d.com/en/cubism-editor-manual/skinning/) | Плавный изгиб длинной детали уже виден у Stretchyman, а отдельная работа прядей — у Himawari. Различие форматов важно для Ф2. |
| 2 | Spine, Weights view, веса вершин сетки и пути относительно костей. [Esoteric Software](https://esotericsoftware.com/spine-weights) | Поведение привязанных вершин у поворота уже проверено в пасти Raptor, вдоль кривой — в ноге Stretchyman. |
| 3 | Spine, IK constraints, разница постановки конца цепи в цель и последовательного поворота костей. [Esoteric Software](https://esotericsoftware.com/spine-ik-constraints) | Пример руки и стопы объясняет тот же видимый эффект достижения цели. У Stretchyman также проверено, как при этом изгибается силуэт. |

**Ограничения.** Документация по отдельной функции ничего не говорит о качестве художественной игры и о работе конкретного примера на телефоне. Несколько редакторских GIF Teddy показывали почти одинаковую позу в выбранных фазах, поэтому итоговая карточка ссылается на видеозапись формы. Попытка прочитать превью YouTube для кошек вернула HTTP 403, использованы доступные снимки авторского редактора. Критерий насыщения относится к этому вопросу и этой подборке. По другим языкам, движкам и широкому вопросу об атласе он отдельно не проверен.

## Проверка за пределами трёх основных инструментов

Скептик предложил проверить независимые технологии. Запросы `Wolfwalkers Moho Cartoon Saloon rig wolves walking pack heads turnaround mesh artist Víctor Paredes Moho Animation Software interview`, `Adobe Character Animator Simpsons live Homer animator triggers voice lip sync puppet Fox production interview live performance Homer`, `Godot 2D skeleton demo cutout robot bones polygon game animation example GDQuest official Godot animation robot cutout 2D` расширили поиск. Для проверки сеток и смены рисунков также искали `site:wiki.synfig.org Skeleton Deformation Layer bones image character tutorial`. Портфолио Moho подтверждает использование инструмента, но не устройство волка в конкретном кадре. Поисковая выписка Toon Boom о Stack Wizard отвергнута: исходная страница вернула 404. [Moho с прямыми комментариями режиссёров](https://moho.lostmarble.com/pages/info)

В эфирном эпизоде The Simpsons добавился **другой способ исполнения реакции**. Актёр говорил в прямом эфире, а команда одновременно запускала готовые жесты клавишами. При просмотре записи нельзя определить, был жест выбран актёром, оператором или программой. Для В2 нужен журнал входных событий. Разбор пришёл от Adobe с комментариями производителя шоу. [Раздел Live Animation on TV](https://blog.adobe.com/en/publish/2017/12/18/animation-evolution-paper-digital-3d-live-stream)

После этой находки прочитаны три новых доступных источника. Попытка открыть Toon Boom между вторым и третьим чтением не дала доступного документа и не засчитана.

| Источник | Приём и результат сопоставления |
| --- | --- |
| [Godot, 2D skeletons](https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html) | На GBot форма изображения задаётся многоугольником, привязанным к костям. На выходе снова сгиб плоской детали, для которого уже есть смена поз и наблюдаемый контур у Raptor и Stretchyman. |
| [Synfig, Skeleton Deformation Layer](https://www.wiki.synfig.org/Skeleton_Deformation_Layer) | Растровая деформация нижележащего изображения через области влияния костей. Устройство и риск обрезки края отличаются от Spine, нового типа **видимого движения** не прибавилось. |
| [Krita, Animation](https://docs.krita.org/en/user_manual/animation.html) | На примере шага сначала задают две крайние позы, затем вставляют пробы промежуточных рисунков и выдержки. Это другой редактор, а наблюдаемая смена силуэтов с регулируемой длительностью уже проверена у Dragon. |

Эти три источника не расширили список видимых признаков. Они объясняют, почему один и тот же признак может получиться разными средствами.
