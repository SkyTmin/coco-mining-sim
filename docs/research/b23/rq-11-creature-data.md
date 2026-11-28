# RQ11. Описание существа данными: что можно вынести из характерного кода

В мастерской уже сосуществуют ключи и контакты TechniqueBook, а также именованные beats и функция gesture. Команда ws events читает обе формы. Есть явные сокеты, события, состояния предмета и отчёт о местах, где адаптер не смог прочитать позу. Это даёт отправную точку для испытания формата без переписи каждой принятой картины. [Существующий адаптер](../../../tools/creatures/studio/events.ts#L1)

| Решение | Что описывается данными | Цена, риск и проверка |
| --- | --- | --- |
| Декларативные каналы, как в glTF и Lottie | ID цели, параметр, время ключа, значение, тип интерполяции и порядок наложения. Вложения и локальное время записываются явно | Мало решений у интерпретатора и воспроизводимое чтение. Сложное действие может превратиться в многословный список ключей. Замерить объём файла и время множественной правки относительно нынешней таблицы. [Канал glTF](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/animation.channel.schema.json) · [Слои Lottie](https://lottie.github.io/lottie-spec/latest/specs/layers/) · [Свойства Lottie](https://lottie.github.io/lottie-spec/latest/specs/properties/) |
| Именованные события, зависимые времена и короткая библиотека действий | Жест, контакт и первый кадр эффекта ссылаются на одну метку. Параметры события отделены от обработчика. Другой жест может взять тот же шаблон движения | Вложение экономит записи, но меняет риски при переименовании и смещении. Печатать разрешённый номер кадра у каждого участника и предупреждать, если цель не найдена. На первом этапе читать текущие источники через адаптер. [Spine Events](https://esotericsoftware.com/spine-events) · [GSAP Timeline](https://gsap.com/docs/v3/GSAP/Timeline/) |
| Авторские обработчики с явными входом и выходом | Стандартные дорожки меняют позы. Именованный обработчик вычисляет уникальную механику, получает время, позу и объявленные звенья, возвращает детерминированные результаты | Сохраняет особое поведение, но произвольный вызов может скрыть зависимости и расхождения между предпросмотром и выпуском. Godot не вызывает методную дорожку при предпросмотре в редакторе. Проверять одинаковый результат по пути показа и экспорта. [Godot track types](https://docs.godotengine.org/en/stable/tutorials/animation/animation_track_types.html) |
| Версионируемый экспорт авторского состояния | ID схемы, версия, именованные ссылки и миграция. Картина читается без приватного состояния редактора. Проверять старые карточки с каждым изменением семантики | Оплата миграций и независимых сравнений возникает при изменении версии. Старая семантика должна иметь явного читателя или преобразование с тестом результата. В Theatre core и studio разные лицензии. [Theatre Projects](https://www.theatrejs.com/docs/latest/manual/projects) · [OpenTimelineIO](https://opentimelineio.readthedocs.io/en/v0.16.0/tutorials/versioning-schemas.html) |

## Опыт на одном событии

Пробная версия карточки хранит событие удара и искру со смещением на один кадр. Миграция из упорядоченных пар в таблицу именованных меток оставила исходный объект прежним. Повторная миграция уже новой записи сохранила результат. Перенос удара с кадра 5 на 7 сдвинул искру с 6 на 8. Ссылка на отсутствующее имя вызвала отказ. Этот пример покрывает только уникальные имена и целые кадры. Два одинаковых имени в старом списке словарь свернул бы в одно: для реальных старых данных нужен отказ/диагностика до миграции. Неизвестная версия 88 проходит прототип без изменений. Общий читатель должен сообщить о неподдерживаемой версии до преобразования. Проверка границ не обнаруживает визуальный промах.

## Что сравнить в Ф3

Проверить три уровня. Сначала таблица событий поверх нынешних жестов, затем версионируемые параметры поз/слоёв, затем дополнительная библиотека общих механик. На одной небольшой и одной необычной форме посчитать строки карточки и характерного кода, объём описания в контексте Claude, время переименования и расхождение кадров при чтении старой версии. Перенос всего поведения в универсальный DSL пока не подтверждён опытом: обратное превращение данных в сложный язык может увеличить цену автора. Наличие большого процента JSON само по себе эффекта не доказывает.

## Воспроизведение опыта

Из каталога с временным файлом сохранить приведённый код как `probe.py` и выполнить `python probe.py`. Достаточно стандартной библиотеки Python.

```python
from copy import deepcopy
def migrate(card):
    card = deepcopy(card)
    if card['version'] == 1:
        card['beats'] = {key: int(frame) for key, frame in card.pop('marks')}
        card['version'] = 2
    return card
def resolve(card):
    events = sorted((card['beats'][key] + delta, verb) for key, delta, verb in card['events'])
    assert all(0 <= frame < card['frames'] for frame, verb in events)
    return events
old = {'version': 1, 'frames': 12, 'marks': [('hit', 5)], 'events': [('hit', 0, 'contact'), ('hit', 1, 'spark')]}
new = migrate(old)
before = resolve(new)
new['beats']['hit'] = 7
print('v1 unchanged', old['marks'])
print('idempotent', migrate(new) == new)
print('original',before,'retimed',resolve(new))
try:
    broken = migrate(old)
    broken['events'].append(('absent', 0, 'noise'))
    resolve(broken)
except KeyError as error:
    print('rejected unresolved anchor',error)
```

## Что именно прочитано

| Первоисточник и раздел | Факт источника | Применение или ограничение в Б23 | Лицензия и использование |
| --- | --- | --- | --- |
| [Lottie spec, Layers, Layer parenting, Time stretch and Time remap](https://lottie.github.io/lottie-spec/latest/specs/layers/) | Родитель задан индексом, циклы родства недопустимы, порядок слоёв самодостаточен. Для прекомпозиции можно менять локальное время, при совмещении stretch и remap сначала применяется stretch. | Хранить граф родства отдельно от порядка рисования, определить порядок преобразования времени. | Официальная спецификация, изучена без копирования. |
| [Spine User Guide, Events и Event properties](https://esotericsoftware.com/spine-events) | Событие имеет имя и исходные значения параметров. Ключ события может переопределить значения; приложение слушает его во время воспроизведения. | Отделить запись события и исполнителя реакции, связывая их по ID и кадру. | Руководство и runtime под собственными условиями ([условия](https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.2/LICENSE)), идеи без переноса. |
| [GSAP Timeline, Positioning animations in a timeline](https://gsap.com/docs/v3/GSAP/Timeline/) | Клип ставится по абсолютному времени, метке или смещению от метки/соседнего элемента. Таймлайны можно вкладывать. Относительная позиция может отсчитываться от последнего добавленного элемента. | В хранимой карточке выбрать чёткую семантику разрешения меток, печатать результирующие кадры для проверки. | Standard No Charge GSAP License ([условия](https://gsap.com/community/standard-license/)), код не переносить. |
| [Theatre.js Manual, Projects, State, Exporting](https://www.theatrejs.com/docs/latest/manual/projects) | Проект и лист организуют данные. Изменения и анимации хранятся в состоянии проекта, его экспорт передают @theatre/core. Локальное авторское состояние нужно явно экспортировать для другого зрителя. | Нужен повторяемый артефакт исполнения в git, а редактор может оставаться отдельным. | Проверены package.json: core Apache-2.0 ([условия](https://raw.githubusercontent.com/theatre-js/theatre/main/packages/core/package.json)), studio AGPL-3.0-only ([условия](https://raw.githubusercontent.com/theatre-js/theatre/main/packages/studio/package.json)), студию не переносить. |
| [OpenTimelineIO, Versioning Schemas, upgrade/downgrade](https://opentimelineio.readthedocs.io/en/v0.16.0/tutorials/versioning-schemas.html) | Сериализуемый тип имеет имя и номер версии, преобразование между версиями задаётся функцией. Если удалённое поле не влияет на расчёт, обратный путь может не восстановить исходное значение. | Писать миграцию и проверять её на реальном старом примере. Обратимость проверять на том наборе данных, который обещаем сохранять. | Библиотека Apache-2.0 ([условия](https://raw.githubusercontent.com/AcademySoftwareFoundation/OpenTimelineIO/main/LICENSE.txt)), код не переносился. |
| [Khronos glTF 2.0, animation.channel.schema.json](https://raw.githubusercontent.com/KhronosGroup/glTF/main/specification/2.0/schema/animation.channel.schema.json) | У канала обязательны ссылка на sampler и target. Это отдельные сущности, данные временной кривой можно повторно адресовать. | Один канал с явным адресатом, отдельный набор значений. Валидация графа должна подтверждать существование обеих ссылок. | Спецификация, только изучение. |
| [Godot, Animation track types, call method / animation playback / Bézier](https://docs.godotengine.org/en/stable/tutorials/animation/animation_track_types.html) | Дорожки свойств, вложенной анимации и точных вызовов методов имеют разные роли. Метод не исполняется при предварительном просмотре в редакторе. | Ограничить список видов событий; предпросмотр должен воспроизводить видимую часть авторского кода или сообщать о её отсутствии. | Документация изучена. Ядро Godot MIT ([условия](https://raw.githubusercontent.com/godotengine/godot/master/LICENSE.txt)). |
| [Lottie, Properties, Keyframe Easing](https://lottie.github.io/lottie-spec/latest/specs/properties/) | Дискретное удержание и интерполяция задаются данными ключа. Два управляющих вектора задают кривую интерполяции, для векторного свойства параметры могут различаться по координатам. | Описать единицы, hold и интерполяцию явно. Набор профилей должен быть компактным, чтобы не перегрузить автора. | Официальная спецификация, только изучение. |
| [W3C Web Animations, Keyframe spacing, computed keyframe offsets](https://www.w3.org/TR/web-animations-1/) | Проверочный источник 1. Нормализованные смещения ключей, правила заполнения пропущенных смещений и их порядок — тот же класс адресации момента на дорожке. | Уточняет граничные значения, но не добавляет способа связать возникновение предмета с владельцем. | Спецификация, только изучение. |
| [Qt Quick Timeline, KeyframeGroup target / property / keyframes](https://doc.qt.io/qt-6/qml-qtquick-timeline-keyframegroup.html) | Проверочный источник 2. Группа описывает ключи одного свойства одного объекта. Данные приходят из файла или дочерних ключей, оба сразу дают неопределённость. | Повторяет дорожку с адресатом и единственным источником. Уточнение исключающих режимов не требует нового элемента формата. | Документация Qt, без копирования. |
| [Android SDK, Keyframe, getFraction, getValue, getInterpolator](https://developer.android.com/reference/android/animation/Keyframe) | Проверочный источник 3. Ключ хранит значение, нормированное положение во времени и при необходимости интерполятор. | Уже покрыто свойством, временем и кривой. Документация не даёт доказательства качества анимации или сокращения цены производства. | Документация Android, без копирования. |

## Поиск и граница насыщения

Выполнено 9 разных запросов. Прочитано 11 первоисточников в таблице. Последние три прочитаны после составления списка типов решений в указанной последовательности. Для вопроса о границе данных и кода они повторили относительное время ключа, дорожку со ссылкой на свойство и выбор интерполяции. Корпус не определяет оптимальную грамматику мастерской: её нужно проверить на настоящих карточках.

1. `Lottie animation community specification layers parent shapes time remapping assets keyframe interpolation animation` — Найдены спецификации проекта Lottie, прочитаны слои, иерархия и свойства. Второй хост той же спецификации не считали независимым.
2. `Spine JSON format animation event timeline skeleton data version animation state mixed code` — Найдены Spine JSON и справочник применения анимаций. Формат уже читался в RQ02. Здесь отдельно прочитан первичный раздел Events.
3. `GSAP timeline position labels relative Theatre.js sheet sequence keyframes exported JSON` — GSAP и Theatre.js вышли как разные способы работы со временем и состоянием. Первичные руководства Timeline и Projects проверены напрямую.
4. `OpenTimelineIO architecture time range effects adapters serialization schema version migration Pixar USD schema skeleton binding animations` — Найден репозиторий OpenTimelineIO и его описание архитектуры. Для миграций открыто профильное руководство Versioning Schemas.
5. `Godot Animation Resource track paths method audio Call Method nested animation track editor 中文` — В смешанной выдаче старых версий glTF было легко перепутать 1.0 и 2.0. Для этого вопроса использована схема 2.0, и текущий раздел Godot о дорожках.
6. `Khronos glTF KhronosGroup specification animation channel target sampler interpolation node matrix translate data format` — Найден первичный animation.channel.schema.json; в нём необходимы target и sampler. Указания интернет-форумов не считали доказательством формата.
7. `GSAP Timeline position parameter labels relative insertion gsap.com Theatre.js sheets track sequences state documentation Chinese keyframes` — Официальная выдача GSAP показала Timeline и addLabel. Прочитан Timeline. Коммерческие условия проверены отдельно по собственной лицензии.
8. `OpenTimelineIO schema versioning upgrade serializable fields migration time RationalTime official` — Найдены руководства нескольких версий OpenTimelineIO, проверена 0.16.0. Сторонний github-wiki не требовался.
9. `Godot 动画 轨道 类型 方法 调用 动画播放 轨道 Godot 文档` — Найдена официальная китайская документация Godot той же ветки и названия дорожек. Один перевод не прибавлен к числу независимых источников.
