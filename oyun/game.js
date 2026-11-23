'use strict';
/* Blokzia — özgün blok bulmaca oyunu. Tek dosya, bağımlılık yok. */
(() => {
const N = 8, NOVA_MAX = 6;
const PALETTE = [
  ['#FF6B6B', '#FF9A8F', '#D94452'], ['#FFB23E', '#FFD27A', '#E08A12'], ['#6FD65B', '#A5EC8E', '#3FA83A'],
  ['#25CDBE', '#7BE8DC', '#12998F'], ['#4C9DFF', '#8FC3FF', '#2B6FDB'], ['#9A78FF', '#C2ADFF', '#6C49D8'],
  ['#FF74BE', '#FFA8D8', '#D9488F'],
];
// [ağırlık, şekil] — dönüşler otomatik üretilir
const BASE = [
  [2, ['#']], [4, ['##']], [5, ['###']], [4, ['####']], [2, ['#####']],
  [6, ['##', '##']], [3, ['###', '###', '###']], [3, ['###', '###']],
  [5, ['#.', '##']], [4, ['#.', '#.', '##']], [4, ['.#', '.#', '##']],
  [4, ['###', '.#.']], [3, ['.##', '##.']], [3, ['##.', '.##']],
  [3, ['#..', '#..', '###']], [1.5, ['#.', '.#']], [1, ['#..', '.#.', '..#']],
];
const rot = rows => { const h = rows.length, w = rows[0].length, o = []; for (let r = 0; r < w; r++) { let s = ''; for (let c = 0; c < h; c++) s += rows[h - 1 - c][r]; o.push(s); } return o; };
const SHAPES = [];
for (const [wt, rows] of BASE) {
  const seen = new Map(); let r = rows;
  for (let k = 0; k < 4; k++) { seen.set(r.join('/'), r); r = rot(r); }
  for (const rr of seen.values()) {
    const cells = [];
    rr.forEach((s, y) => [...s].forEach((ch, x) => { if (ch === '#') cells.push([y, x]); }));
    SHAPES.push({ cells, h: rr.length, w: rr[0].length, wt: wt / seen.size, n: cells.length });
  }
}
const NOVA_SHAPE = { cells: [0, 1, 2].flatMap(y => [0, 1, 2].map(x => [y, x])), h: 3, w: 3, n: 9 };

/* ---------- kalıcı veri, ayarlar, dil ---------- */
const $ = id => document.getElementById(id);
const LS = {
  get(k, d) { try { const v = localStorage.getItem('blokzia.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('blokzia.' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('blokzia.' + k); } catch {} },
};
// desteklenen diller (dünyada en çok konuşulanlar); ilk açılışta telefonun dili seçilir
const LANGS = [['tr', 'Türkçe'], ['en', 'English'], ['es', 'Español'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch'], ['it', 'Italiano'],
  ['ru', 'Русский'], ['ar', 'العربية'], ['hi', 'हिन्दी'], ['id', 'Bahasa Indonesia'], ['ja', '日本語'], ['zh', '中文'], ['ko', '한국어']];
const LANG_CODES = LANGS.map(l => l[0]);
const cfg = Object.assign({ sound: true, music: true, haptic: true, notif: true, theme: 'dark', lang: (l2 => LANG_CODES.includes(l2) ? l2 : 'en')((navigator.language || 'en').slice(0, 2).toLowerCase()) }, LS.get('cfg', {}));
if (!LANG_CODES.includes(cfg.lang)) cfg.lang = 'en';
const stats = Object.assign({ adv: 1, best: 0, games: 0, lines: 0, daily: { date: '', best: 0 } }, LS.get('stats', {}));
const T = {
  tr: { combo: 'Renk Kombosu!', puTip: '⭐ Altın yıldızın üstüne blok koy: Nova dolar!', jbTip: 'Satır patlattıkça çubuk dolar, dolunca Joker kazanırsın!', power: 'Güç-up!', play: 'Oyna', cont: 'Devam Et', daily: 'Günlük Bulmaca', classic: 'Klasik', dailyS: 'Günlük', privacy: 'Gizlilik seçenekleri', joker: 'JOKER', jokerHint: 'Sığmayan bloğa dokun: Joker onu sığan bir bloğa çevirir!', jokerGot: 'Joker dolu!', jokerNone: 'Joker boş — tek hamlede 2 satır patlat ya da 3 seri yap.', adv: 'Macera', level: 'Bölüm', win: 'Bölüm Tamamlandı!', next: 'Sonraki Bölüm', goalStar: n => `Hedef: ${n} yıldız topla ★`, goalScore: n => `Hedef: ${n} puana ulaş`, paused: 'Duraklatıldı', resume: 'Devam', restart: 'Yeniden Başla',
    home: 'Ana Menü', over: 'Hamle Kalmadı', newBest: 'YENİ REKOR!', again: 'Tekrar Oyna', revive: 'İkinci Şans', hold: 'CEP', drag: 'SÜRÜKLE', tag: 'Yerleştir · Patlat · Tekrarla',
    tip: 'Blokları sürükle, satır ya da sütunu doldur!', tip2: 'İpucu: Bir bloğu CEP kutusuna bırakıp sonraya sakla', praise: ['', '', 'Güzel!', 'Harika!', 'Muhteşem!', 'Efsane!'],
    stuck: 'Sığmıyor: bloğa dokun ya da CEP\'e at', breakTip: 'Biraz mola iyi gelir. Bloklar seni bekler.', surprise: 'Sürpriz! +300 ve Joker', record: 'REKOR', firstRec: 'İlk rekorunu kır!', clean: 'Tertemiz!', streak: 'Seri', lines: 'Satır', today: 'Bugün' },
  en: { combo: 'Color Combo!', puTip: '⭐ Place a block on the gold star to charge Nova!', jbTip: 'Clear lines to fill the bar and earn a Joker!', power: 'Power-up!', play: 'Play', cont: 'Continue', daily: 'Daily Puzzle', classic: 'Classic', dailyS: 'Daily', privacy: 'Privacy options', joker: 'JOKER', jokerHint: 'Tap a block that does not fit: the Joker turns it into one that does!', jokerGot: 'Joker ready!', jokerNone: 'Joker empty — clear 2 lines at once or build a 3 streak.', adv: 'Adventure', level: 'Level', win: 'Level Complete!', next: 'Next Level', goalStar: n => `Goal: collect ${n} stars ★`, goalScore: n => `Goal: reach ${n} points`, paused: 'Paused', resume: 'Resume', restart: 'Restart',
    home: 'Main Menu', over: 'No Moves Left', newBest: 'NEW BEST!', again: 'Play Again', revive: 'Second Chance', hold: 'POCKET', drag: 'DRAG', tag: 'Place · Pop · Repeat',
    tip: 'Drag blocks to fill a row or column!', tip2: 'Tip: drop a block into the POCKET to save it for later', praise: ['', '', 'Nice!', 'Great!', 'Amazing!', 'Legendary!'],
    stuck: "Doesn't fit: tap it or drop it in POCKET", breakTip: 'A short break feels nice. The blocks will wait.', surprise: 'Surprise! +300 and a Joker', record: 'BEST SCORE', firstRec: 'Set your first record!', clean: 'Spotless!', streak: 'Streak', lines: 'Lines', today: 'Today' },
};
Object.assign(T.tr, { newIn: 'Yeni oyun ', nPuzzle: '🧩 Yeni bir bulmaca seni bekliyor!', nDaily: '📅 Bugünün bulmacası hazır.', nSurprise: '🎁 Sürpriz seni bekliyor!', nBest: n => `👑 Rekorun ${n}. Geçebilir misin?`, nFirst: '👑 İlk rekorunu kırmaya ne dersin?' });
Object.assign(T.en, { newIn: 'New game in ', nPuzzle: '🧩 A new puzzle is waiting for you!', nDaily: "📅 Today's puzzle is ready.", nSurprise: '🎁 A surprise is waiting for you!', nBest: n => `👑 Your best is ${n}. Can you beat it?`, nFirst: '👑 Ready to set your first record?' });
Object.assign(T, {
  es: { combo: '¡Combo de color!', puTip: '⭐ ¡Pon un bloque sobre la estrella dorada para cargar Nova!', jbTip: '¡Limpia líneas para llenar la barra y ganar un Comodín!', power: '¡Poder!', play: 'Jugar', cont: 'Continuar', daily: 'Puzle diario', classic: 'Clásico', dailyS: 'Diario', privacy: 'Opciones de privacidad', joker: 'COMODÍN', jokerHint: 'Toca un bloque que no cabe: ¡el Comodín lo cambia por uno que sí!', jokerGot: '¡Comodín listo!', jokerNone: 'Comodín vacío: limpia 2 líneas a la vez o haz una racha de 3.', paused: 'En pausa', resume: 'Seguir', restart: 'Reiniciar',
    home: 'Menú principal', over: 'Sin movimientos', newBest: '¡NUEVO RÉCORD!', again: 'Jugar de nuevo', revive: 'Segunda oportunidad', hold: 'BOLSILLO', drag: 'ARRASTRA', tag: 'Coloca · Explota · Repite',
    tip: '¡Arrastra bloques y llena una fila o columna!', tip2: 'Consejo: guarda un bloque en el BOLSILLO para después', praise: ['', '', '¡Bien!', '¡Genial!', '¡Increíble!', '¡Legendario!'],
    stuck: 'No cabe: tócalo o ponlo en el BOLSILLO', breakTip: 'Un descanso sienta bien. Los bloques te esperan.', surprise: '¡Sorpresa! +300 y un Comodín', record: 'RÉCORD', firstRec: '¡Consigue tu primer récord!', clean: '¡Impecable!', streak: 'Racha', lines: 'Líneas', today: 'Hoy',
    newIn: 'Nueva partida en ', nPuzzle: '🧩 ¡Un nuevo puzle te espera!', nDaily: '📅 El puzle de hoy está listo.', nSurprise: '🎁 ¡Una sorpresa te espera!', nBest: n => `👑 Tu récord es ${n}. ¿Puedes superarlo?`, nFirst: '👑 ¿Listo para tu primer récord?' },
  pt: { combo: 'Combo de cor!', puTip: '⭐ Coloque um bloco na estrela dourada para carregar a Nova!', jbTip: 'Limpe linhas para encher a barra e ganhar um Coringa!', power: 'Poder!', play: 'Jogar', cont: 'Continuar', daily: 'Desafio diário', classic: 'Clássico', dailyS: 'Diário', privacy: 'Opções de privacidade', joker: 'CORINGA', jokerHint: 'Toque num bloco que não cabe: o Coringa troca por um que cabe!', jokerGot: 'Coringa pronto!', jokerNone: 'Coringa vazio: limpe 2 linhas de uma vez ou faça uma sequência de 3.', paused: 'Pausado', resume: 'Continuar', restart: 'Recomeçar',
    home: 'Menu principal', over: 'Sem jogadas', newBest: 'NOVO RECORDE!', again: 'Jogar de novo', revive: 'Segunda chance', hold: 'BOLSO', drag: 'ARRASTE', tag: 'Encaixe · Exploda · Repita',
    tip: 'Arraste os blocos e complete uma linha ou coluna!', tip2: 'Dica: guarde um bloco no BOLSO para depois', praise: ['', '', 'Boa!', 'Ótimo!', 'Incrível!', 'Lendário!'],
    stuck: 'Não cabe: toque nele ou coloque no BOLSO', breakTip: 'Uma pausa faz bem. Os blocos esperam por você.', surprise: 'Surpresa! +300 e um Coringa', record: 'RECORDE', firstRec: 'Faça seu primeiro recorde!', clean: 'Impecável!', streak: 'Sequência', lines: 'Linhas', today: 'Hoje',
    newIn: 'Novo jogo em ', nPuzzle: '🧩 Um novo desafio espera por você!', nDaily: '📅 O desafio de hoje está pronto.', nSurprise: '🎁 Uma surpresa espera por você!', nBest: n => `👑 Seu recorde é ${n}. Consegue bater?`, nFirst: '👑 Pronto para seu primeiro recorde?' },
  fr: { combo: 'Combo couleur !', puTip: '⭐ Posez un bloc sur l’étoile dorée pour charger Nova !', jbTip: 'Effacez des lignes pour remplir la barre et gagner un Joker !', power: 'Bonus !', play: 'Jouer', cont: 'Continuer', daily: 'Puzzle du jour', classic: 'Classique', dailyS: 'Du jour', privacy: 'Options de confidentialité', joker: 'JOKER', jokerHint: 'Touchez un bloc qui ne rentre pas : le Joker le change en un bloc qui rentre !', jokerGot: 'Joker prêt !', jokerNone: 'Joker vide : effacez 2 lignes d’un coup ou faites une série de 3.', paused: 'Pause', resume: 'Reprendre', restart: 'Recommencer',
    home: 'Menu principal', over: 'Plus de coups', newBest: 'NOUVEAU RECORD !', again: 'Rejouer', revive: 'Seconde chance', hold: 'POCHE', drag: 'GLISSEZ', tag: 'Placez · Explosez · Recommencez',
    tip: 'Glissez les blocs pour remplir une ligne ou une colonne !', tip2: 'Astuce : gardez un bloc dans la POCHE pour plus tard', praise: ['', '', 'Bien !', 'Génial !', 'Incroyable !', 'Légendaire !'],
    stuck: 'Ne rentre pas : touchez-le ou POCHE', breakTip: 'Une petite pause fait du bien. Les blocs vous attendent.', surprise: 'Surprise ! +300 et un Joker', record: 'RECORD', firstRec: 'Établissez votre premier record !', clean: 'Impeccable !', streak: 'Série', lines: 'Lignes', today: "Aujourd'hui",
    newIn: 'Nouvelle partie dans ', nPuzzle: '🧩 Un nouveau puzzle vous attend !', nDaily: '📅 Le puzzle du jour est prêt.', nSurprise: '🎁 Une surprise vous attend !', nBest: n => `👑 Votre record est ${n}. Pouvez-vous le battre ?`, nFirst: '👑 Prêt pour votre premier record ?' },
  de: { combo: 'Farbkombo!', puTip: '⭐ Setz einen Block auf den goldenen Stern, um Nova zu laden!', jbTip: 'Räume Reihen ab, um die Leiste zu füllen und einen Joker zu holen!', power: 'Power-up!', play: 'Spielen', cont: 'Weiter', daily: 'Tagesrätsel', classic: 'Klassisch', dailyS: 'Täglich', privacy: 'Datenschutzoptionen', joker: 'JOKER', jokerHint: 'Tippe auf einen Block, der nicht passt: Der Joker macht daraus einen passenden!', jokerGot: 'Joker bereit!', jokerNone: 'Joker leer – räume 2 Reihen auf einmal oder schaffe eine 3er-Serie.', paused: 'Pausiert', resume: 'Fortsetzen', restart: 'Neustart',
    home: 'Hauptmenü', over: 'Keine Züge mehr', newBest: 'NEUER REKORD!', again: 'Nochmal spielen', revive: 'Zweite Chance', hold: 'TASCHE', drag: 'ZIEHEN', tag: 'Setzen · Sprengen · Wiederholen',
    tip: 'Ziehe Blöcke und fülle eine Reihe oder Spalte!', tip2: 'Tipp: Leg einen Block in die TASCHE für später', praise: ['', '', 'Gut!', 'Super!', 'Fantastisch!', 'Legendär!'],
    stuck: 'Passt nicht: antippen oder in die TASCHE legen', breakTip: 'Eine kleine Pause tut gut. Die Blöcke warten auf dich.', surprise: 'Überraschung! +300 und ein Joker', record: 'REKORD', firstRec: 'Stell deinen ersten Rekord auf!', clean: 'Blitzblank!', streak: 'Serie', lines: 'Reihen', today: 'Heute',
    newIn: 'Neues Spiel in ', nPuzzle: '🧩 Ein neues Rätsel wartet auf dich!', nDaily: '📅 Das heutige Rätsel ist bereit.', nSurprise: '🎁 Eine Überraschung wartet auf dich!', nBest: n => `👑 Dein Rekord ist ${n}. Schaffst du mehr?`, nFirst: '👑 Bereit für deinen ersten Rekord?' },
  it: { combo: 'Combo colore!', puTip: '⭐ Metti un blocco sulla stella d’oro per caricare Nova!', jbTip: 'Elimina linee per riempire la barra e ottenere un Jolly!', power: 'Potenziamento!', play: 'Gioca', cont: 'Continua', daily: 'Puzzle del giorno', classic: 'Classico', dailyS: 'Giornaliero', privacy: 'Opzioni privacy', joker: 'JOLLY', jokerHint: 'Tocca un blocco che non entra: il Jolly lo trasforma in uno che entra!', jokerGot: 'Jolly pronto!', jokerNone: 'Jolly vuoto: elimina 2 linee insieme o fai una serie di 3.', paused: 'In pausa', resume: 'Riprendi', restart: 'Ricomincia',
    home: 'Menu principale', over: 'Nessuna mossa', newBest: 'NUOVO RECORD!', again: 'Gioca ancora', revive: 'Seconda possibilità', hold: 'TASCA', drag: 'TRASCINA', tag: 'Posiziona · Esplodi · Ripeti',
    tip: 'Trascina i blocchi e completa una riga o colonna!', tip2: 'Suggerimento: metti un blocco nella TASCA per dopo', praise: ['', '', 'Bene!', 'Fantastico!', 'Incredibile!', 'Leggendario!'],
    stuck: 'Non entra: toccalo o mettilo nella TASCA', breakTip: 'Una pausa fa bene. I blocchi ti aspettano.', surprise: 'Sorpresa! +300 e un Jolly', record: 'RECORD', firstRec: 'Stabilisci il tuo primo record!', clean: 'Perfetto!', streak: 'Serie', lines: 'Linee', today: 'Oggi',
    newIn: 'Nuova partita tra ', nPuzzle: '🧩 Un nuovo puzzle ti aspetta!', nDaily: '📅 Il puzzle di oggi è pronto.', nSurprise: '🎁 Una sorpresa ti aspetta!', nBest: n => `👑 Il tuo record è ${n}. Riesci a batterlo?`, nFirst: '👑 Pronto per il tuo primo record?' },
  ru: { combo: 'Цветовое комбо!', puTip: '⭐ Поставь блок на золотую звезду — Нова зарядится!', jbTip: 'Убирай линии, чтобы заполнить шкалу и получить Джокера!', power: 'Бонус!', play: 'Играть', cont: 'Продолжить', daily: 'Головоломка дня', classic: 'Классика', dailyS: 'День', privacy: 'Настройки конфиденциальности', joker: 'ДЖОКЕР', jokerHint: 'Нажми на блок, который не помещается: Джокер заменит его подходящим!', jokerGot: 'Джокер готов!', jokerNone: 'Джокер пуст — убери 2 линии за ход или сделай серию из 3.', paused: 'Пауза', resume: 'Продолжить', restart: 'Заново',
    home: 'Главное меню', over: 'Ходов нет', newBest: 'НОВЫЙ РЕКОРД!', again: 'Играть снова', revive: 'Второй шанс', hold: 'КАРМАН', drag: 'ТЯНИ', tag: 'Ставь · Взрывай · Повторяй',
    tip: 'Перетаскивай блоки и заполняй ряд или столбец!', tip2: 'Совет: положи блок в КАРМАН на потом', praise: ['', '', 'Хорошо!', 'Отлично!', 'Потрясающе!', 'Легендарно!'],
    stuck: 'Не влезает: нажми или в КАРМАН', breakTip: 'Небольшой перерыв полезен. Блоки подождут.', surprise: 'Сюрприз! +300 и Джокер', record: 'РЕКОРД', firstRec: 'Поставь свой первый рекорд!', clean: 'Чисто!', streak: 'Серия', lines: 'Линии', today: 'Сегодня',
    newIn: 'Новая игра через ', nPuzzle: '🧩 Тебя ждёт новая головоломка!', nDaily: '📅 Головоломка дня готова.', nSurprise: '🎁 Тебя ждёт сюрприз!', nBest: n => `👑 Твой рекорд — ${n}. Сможешь побить?`, nFirst: '👑 Готов поставить первый рекорд?' },
  ar: { combo: 'كومبو الألوان!', puTip: '⭐ ضع كتلة على النجمة الذهبية لشحن نوفا!', jbTip: 'امسح الأسطر لملء الشريط والحصول على جوكر!', power: 'قوة!', play: 'العب', cont: 'متابعة', daily: 'لغز اليوم', classic: 'كلاسيكي', dailyS: 'يومي', privacy: 'خيارات الخصوصية', joker: 'جوكر', jokerHint: 'المس كتلة لا تناسب: الجوكر يحولها إلى كتلة مناسبة!', jokerGot: 'الجوكر جاهز!', jokerNone: 'الجوكر فارغ — امسح سطرين معًا أو حقق سلسلة من 3.', paused: 'متوقف مؤقتًا', resume: 'استئناف', restart: 'إعادة البدء',
    home: 'القائمة الرئيسية', over: 'لا توجد حركات', newBest: 'رقم قياسي جديد!', again: 'العب مجددًا', revive: 'فرصة ثانية', hold: 'الجيب', drag: 'اسحب', tag: 'ضع · فجّر · كرّر',
    tip: 'اسحب الكتل واملأ صفًا أو عمودًا!', tip2: 'نصيحة: احفظ كتلة في الجيب لوقت لاحق', praise: ['', '', 'جيد!', 'رائع!', 'مذهل!', 'أسطوري!'],
    stuck: 'لا تناسب: المسها أو ضعها في الجيب', breakTip: 'استراحة قصيرة مفيدة. الكتل بانتظارك.', surprise: 'مفاجأة! +300 وجوكر', record: 'الرقم القياسي', firstRec: 'حقق أول رقم قياسي لك!', clean: 'نظيف تمامًا!', streak: 'سلسلة', lines: 'أسطر', today: 'اليوم',
    newIn: 'لعبة جديدة خلال ', nPuzzle: '🧩 لغز جديد بانتظارك!', nDaily: '📅 لغز اليوم جاهز.', nSurprise: '🎁 مفاجأة بانتظارك!', nBest: n => `👑 رقمك القياسي ${n}. هل تتفوق عليه؟`, nFirst: '👑 مستعد لأول رقم قياسي؟' },
  hi: { combo: 'रंग कॉम्बो!', puTip: '⭐ सुनहरे तारे पर ब्लॉक रखें, नोवा चार्ज होगा!', jbTip: 'लाइनें साफ़ करें, बार भरेगा और जोकर मिलेगा!', power: 'पावर-अप!', play: 'खेलें', cont: 'जारी रखें', daily: 'आज की पहेली', classic: 'क्लासिक', dailyS: 'दैनिक', privacy: 'गोपनीयता विकल्प', joker: 'जोकर', jokerHint: 'जो ब्लॉक फिट नहीं होता उसे छुएँ: जोकर उसे फिट होने वाले ब्लॉक में बदल देगा!', jokerGot: 'जोकर तैयार!', jokerNone: 'जोकर खाली — एक चाल में 2 लाइनें साफ़ करें या 3 की स्ट्रीक बनाएँ।', paused: 'रुका हुआ', resume: 'जारी रखें', restart: 'फिर से शुरू',
    home: 'मुख्य मेनू', over: 'कोई चाल नहीं बची', newBest: 'नया रिकॉर्ड!', again: 'फिर खेलें', revive: 'दूसरा मौका', hold: 'जेब', drag: 'खींचें', tag: 'रखें · फोड़ें · दोहराएँ',
    tip: 'ब्लॉक खींचें और पंक्ति या कॉलम भरें!', tip2: 'सुझाव: किसी ब्लॉक को बाद के लिए जेब में रखें', praise: ['', '', 'बढ़िया!', 'शानदार!', 'कमाल!', 'लाजवाब!'],
    stuck: 'फिट नहीं होता: छुएँ या जेब में डालें', breakTip: 'थोड़ा आराम अच्छा है। ब्लॉक आपका इंतज़ार करेंगे।', surprise: 'सरप्राइज़! +300 और एक जोकर', record: 'रिकॉर्ड', firstRec: 'अपना पहला रिकॉर्ड बनाएँ!', clean: 'बिल्कुल साफ़!', streak: 'स्ट्रीक', lines: 'लाइनें', today: 'आज',
    newIn: 'नया गेम ', nPuzzle: '🧩 एक नई पहेली आपका इंतज़ार कर रही है!', nDaily: '📅 आज की पहेली तैयार है।', nSurprise: '🎁 एक सरप्राइज़ आपका इंतज़ार कर रहा है!', nBest: n => `👑 आपका रिकॉर्ड ${n} है। क्या आप इसे तोड़ सकते हैं?`, nFirst: '👑 पहला रिकॉर्ड बनाने के लिए तैयार?' },
  id: { combo: 'Kombo Warna!', puTip: '⭐ Taruh blok di bintang emas untuk mengisi Nova!', jbTip: 'Hapus baris untuk mengisi bar dan dapatkan Joker!', power: 'Kekuatan!', play: 'Main', cont: 'Lanjutkan', daily: 'Teka-teki Harian', classic: 'Klasik', dailyS: 'Harian', privacy: 'Opsi privasi', joker: 'JOKER', jokerHint: 'Ketuk blok yang tidak muat: Joker mengubahnya jadi blok yang muat!', jokerGot: 'Joker siap!', jokerNone: 'Joker kosong — hapus 2 baris sekaligus atau buat rentetan 3.', paused: 'Dijeda', resume: 'Lanjut', restart: 'Ulangi',
    home: 'Menu Utama', over: 'Tidak ada langkah', newBest: 'REKOR BARU!', again: 'Main Lagi', revive: 'Kesempatan Kedua', hold: 'SAKU', drag: 'SERET', tag: 'Taruh · Ledakkan · Ulangi',
    tip: 'Seret blok dan penuhi satu baris atau kolom!', tip2: 'Tips: simpan blok di SAKU untuk nanti', praise: ['', '', 'Bagus!', 'Hebat!', 'Luar biasa!', 'Legendaris!'],
    stuck: 'Tidak muat: ketuk atau taruh di SAKU', breakTip: 'Istirahat sebentar itu baik. Blok menunggumu.', surprise: 'Kejutan! +300 dan Joker', record: 'REKOR', firstRec: 'Cetak rekor pertamamu!', clean: 'Bersih!', streak: 'Rentetan', lines: 'Baris', today: 'Hari ini',
    newIn: 'Game baru dalam ', nPuzzle: '🧩 Teka-teki baru menunggumu!', nDaily: '📅 Teka-teki hari ini sudah siap.', nSurprise: '🎁 Ada kejutan untukmu!', nBest: n => `👑 Rekormu ${n}. Bisa mengalahkannya?`, nFirst: '👑 Siap mencetak rekor pertama?' },
  ja: { combo: 'カラーコンボ！', puTip: '⭐ 金の星にブロックを置くとノヴァがたまる！', jbTip: 'ラインを消すとバーがたまり、ジョーカーがもらえる！', power: 'パワーアップ！', play: 'プレイ', cont: '続ける', daily: 'デイリーパズル', classic: 'クラシック', dailyS: 'デイリー', privacy: 'プライバシー設定', joker: 'ジョーカー', jokerHint: '入らないブロックをタップ：ジョーカーが入るブロックに変えます！', jokerGot: 'ジョーカー準備OK！', jokerNone: 'ジョーカーは空です。一度に2列消すか3連続を作ろう。', paused: '一時停止', resume: '再開', restart: 'やり直す',
    home: 'メインメニュー', over: '置ける場所がありません', newBest: '新記録！', again: 'もう一度', revive: 'セカンドチャンス', hold: 'ポケット', drag: 'ドラッグ', tag: '置く・消す・くり返す',
    tip: 'ブロックをドラッグして行か列をそろえよう！', tip2: 'ヒント：ブロックをポケットに入れて後で使おう', praise: ['', '', 'いいね！', 'すごい！', '最高！', '伝説！'],
    stuck: '入りません：タップするかポケットへ', breakTip: '少し休憩しよう。ブロックは待っています。', surprise: 'サプライズ！+300とジョーカー', record: 'ベスト', firstRec: '最初の記録を作ろう！', clean: 'ピカピカ！', streak: '連続', lines: 'ライン', today: '今日',
    newIn: '次のゲームまで ', nPuzzle: '🧩 新しいパズルが待っています！', nDaily: '📅 今日のパズルができました。', nSurprise: '🎁 サプライズが待っています！', nBest: n => `👑 ベストは${n}点。超えられる？`, nFirst: '👑 最初の記録に挑戦しよう！' },
  zh: { combo: '同色连消！', puTip: '⭐ 把方块放在金星上，为 Nova 充能！', jbTip: '消除行来填满能量条，获得百搭！', power: '能量！', play: '开始', cont: '继续', daily: '每日谜题', classic: '经典', dailyS: '每日', privacy: '隐私选项', joker: '百搭', jokerHint: '点击放不下的方块：百搭会把它变成能放下的方块！', jokerGot: '百搭已就绪！', jokerNone: '百搭用完了——一次消除2行或连续消除3次即可获得。', paused: '已暂停', resume: '继续', restart: '重新开始',
    home: '主菜单', over: '无路可走', newBest: '新纪录！', again: '再玩一次', revive: '第二次机会', hold: '口袋', drag: '拖动', tag: '放置 · 消除 · 重复',
    tip: '拖动方块，填满一行或一列！', tip2: '提示：把方块放进口袋留着以后用', praise: ['', '', '不错！', '太棒了！', '惊人！', '传奇！'],
    stuck: '放不下：点击它或放进口袋', breakTip: '休息一下吧，方块会等你。', surprise: '惊喜！+300 和一个百搭', record: '最高分', firstRec: '创造你的第一个纪录！', clean: '全部清空！', streak: '连击', lines: '行', today: '今天',
    newIn: '新游戏 ', nPuzzle: '🧩 新的谜题在等你！', nDaily: '📅 今日谜题已准备好。', nSurprise: '🎁 有惊喜在等你！', nBest: n => `👑 你的纪录是 ${n}，能超越吗？`, nFirst: '👑 准备创造第一个纪录了吗？' },
  ko: { combo: '컬러 콤보!', puTip: '⭐ 금별 위에 블록을 놓으면 노바가 충전돼요!', jbTip: '줄을 지우면 바가 차고 조커를 얻어요!', power: '파워업!', play: '플레이', cont: '계속하기', daily: '오늘의 퍼즐', classic: '클래식', dailyS: '데일리', privacy: '개인정보 옵션', joker: '조커', jokerHint: '맞지 않는 블록을 탭하세요: 조커가 맞는 블록으로 바꿔줘요!', jokerGot: '조커 준비 완료!', jokerNone: '조커가 없어요 — 한 번에 2줄을 지우거나 3연속을 만드세요.', paused: '일시정지', resume: '계속', restart: '다시 시작',
    home: '메인 메뉴', over: '놓을 곳이 없어요', newBest: '신기록!', again: '다시 하기', revive: '두 번째 기회', hold: '포켓', drag: '드래그', tag: '놓고 · 터뜨리고 · 반복',
    tip: '블록을 드래그해서 가로나 세로 줄을 채우세요!', tip2: '팁: 블록을 포켓에 넣어 나중에 쓰세요', praise: ['', '', '좋아요!', '멋져요!', '대단해요!', '전설!'],
    stuck: '안 맞아요: 탭하거나 포켓에 넣으세요', breakTip: '잠깐 쉬어 가세요. 블록이 기다려요.', surprise: '서프라이즈! +300과 조커', record: '최고 기록', firstRec: '첫 기록을 세워보세요!', clean: '깨끗해요!', streak: '연속', lines: '줄', today: '오늘',
    newIn: '새 게임 ', nPuzzle: '🧩 새로운 퍼즐이 기다려요!', nDaily: '📅 오늘의 퍼즐이 준비됐어요.', nSurprise: '🎁 서프라이즈가 기다려요!', nBest: n => `👑 최고 기록은 ${n}점. 넘을 수 있나요?`, nFirst: '👑 첫 기록에 도전해볼까요?' },
});
// eksik bir metin olursa İngilizcesi gösterilir
const ZT = {
  tr: ['Selam! Ben Zia. Blokları sürükle!', 'Hadi, devam!', 'Rekor senin! 😎', 'Bir güç dene!', "CEP'i kullan!", 'Bir daha deneyelim!', 'Şimşek', 'Renk Diskosu', 'Karıştır', 'Hedef', 'Patlatmak için tahtada bir yere dokun', 'Bu güç bitti — hediye ve kupalarla kazan!', 'Yeni güç!', 'Tahta zaten boş!', 'Hadi oynayalım!'],
  en: ["Hi! I'm Zia. Drag the blocks!", 'Keep going!', 'The record is yours! 😎', 'Try a power!', 'Use the POCKET!', "Let's try again!", 'Lightning', 'Color Disco', 'Shuffle', 'Target', 'Tap the board to blast that spot', 'Out of this power — earn more from gifts and trophies!', 'New power!', 'The board is already empty!', "Let's play!"],
  es: ['¡Hola! Soy Zia. ¡Arrastra los bloques!', '¡Sigue así!', '¡El récord es tuyo! 😎', '¡Prueba un poder!', '¡Usa el BOLSILLO!', '¡Intentémoslo otra vez!', 'Rayo', 'Disco de color', 'Mezclar', 'Diana', 'Toca el tablero para explotar ese punto', 'Sin este poder: gana más con regalos y trofeos', '¡Nuevo poder!', '¡El tablero ya está vacío!', '¡A jugar!'],
  pt: ['Oi! Eu sou o Zia. Arraste os blocos!', 'Continue!', 'O recorde é seu! 😎', 'Use um poder!', 'Use o BOLSO!', 'Vamos de novo!', 'Raio', 'Disco de cores', 'Embaralhar', 'Alvo', 'Toque no tabuleiro para explodir ali', 'Sem este poder: ganhe mais com presentes e troféus', 'Novo poder!', 'O tabuleiro já está vazio!', 'Vamos jogar!'],
  fr: ['Salut ! Moi, c’est Zia. Glisse les blocs !', 'Continue !', 'Le record est à toi ! 😎', 'Essaie un pouvoir !', 'Utilise la POCHE !', 'On réessaie !', 'Éclair', 'Disco couleur', 'Mélanger', 'Cible', 'Touche le plateau pour faire exploser cet endroit', 'Plus de ce pouvoir : gagnes-en avec les cadeaux et trophées', 'Nouveau pouvoir !', 'Le plateau est déjà vide !', 'On joue !'],
  de: ['Hi! Ich bin Zia. Zieh die Blöcke!', 'Weiter so!', 'Der Rekord gehört dir! 😎', 'Probier eine Kraft!', 'Nutze die TASCHE!', 'Nochmal versuchen!', 'Blitz', 'Farbdisco', 'Mischen', 'Ziel', 'Tippe aufs Brett, um die Stelle zu sprengen', 'Diese Kraft ist leer – hol mehr mit Geschenken und Pokalen', 'Neue Kraft!', 'Das Brett ist schon leer!', 'Los geht’s!'],
  it: ['Ciao! Sono Zia. Trascina i blocchi!', 'Continua così!', 'Il record è tuo! 😎', 'Prova un potere!', 'Usa la TASCA!', 'Riproviamo!', 'Fulmine', 'Disco colori', 'Mescola', 'Bersaglio', 'Tocca il tabellone per far esplodere quel punto', 'Potere esaurito: guadagnane con regali e trofei', 'Nuovo potere!', 'Il tabellone è già vuoto!', 'Giochiamo!'],
  ru: ['Привет! Я Зиа. Тяни блоки!', 'Так держать!', 'Рекорд твой! 😎', 'Попробуй силу!', 'Используй КАРМАН!', 'Давай ещё раз!', 'Молния', 'Цветное диско', 'Перемешать', 'Цель', 'Нажми на поле, чтобы взорвать это место', 'Сила закончилась — получай её из подарков и кубков', 'Новая сила!', 'Поле уже пустое!', 'Играем!'],
  ar: ['مرحبًا! أنا زيا. اسحب الكتل!', 'استمر!', 'الرقم القياسي لك! 😎', 'جرّب قوة!', 'استخدم الجيب!', 'لنحاول مجددًا!', 'برق', 'ديسكو الألوان', 'خلط', 'هدف', 'المس اللوحة لتفجير ذلك المكان', 'نفدت هذه القوة — اربح المزيد من الهدايا والكؤوس', 'قوة جديدة!', 'اللوحة فارغة بالفعل!', 'هيا نلعب!'],
  hi: ['नमस्ते! मैं ज़िया हूँ। ब्लॉक खींचें!', 'चलते रहो!', 'रिकॉर्ड तुम्हारा! 😎', 'कोई पावर आज़माओ!', 'जेब इस्तेमाल करो!', 'चलो फिर से!', 'बिजली', 'रंग डिस्को', 'फेंटें', 'निशाना', 'उस जगह को फोड़ने के लिए बोर्ड छुएँ', 'यह पावर खत्म — तोहफ़ों और ट्रॉफ़ी से और पाएँ', 'नई पावर!', 'बोर्ड पहले से खाली है!', 'चलो खेलें!'],
  id: ['Hai! Aku Zia. Seret bloknya!', 'Lanjutkan!', 'Rekor milikmu! 😎', 'Coba kekuatan!', 'Pakai SAKU!', 'Ayo coba lagi!', 'Petir', 'Disko Warna', 'Acak', 'Target', 'Ketuk papan untuk meledakkan titik itu', 'Kekuatan habis — dapatkan dari hadiah dan piala', 'Kekuatan baru!', 'Papan sudah kosong!', 'Ayo main!'],
  ja: ['やあ！ジアだよ。ブロックをドラッグしてね！', 'その調子！', '記録更新！😎', 'パワーを使ってみて！', 'ポケットを使おう！', 'もう一回やろう！', 'いなずま', 'カラーディスコ', 'シャッフル', 'ねらい撃ち', '盤面をタップしてその場所を爆破', 'パワー切れ — プレゼントとトロフィーで増やそう', '新しいパワー！', '盤面はもう空っぽ！', 'あそぼう！'],
  zh: ['嗨！我是 Zia。拖动方块吧！', '继续加油！', '纪录是你的！😎', '试试能量道具！', '用口袋！', '再来一次！', '闪电', '彩色迪斯科', '洗牌', '靶心', '点击棋盘炸开那个位置', '道具用完了——用礼物和奖杯赢取更多', '新道具！', '棋盘已经空了！', '开玩吧！'],
  ko: ['안녕! 난 지아야. 블록을 끌어 봐!', '계속 가자!', '기록은 네 거야! 😎', '파워를 써 봐!', '포켓을 써!', '다시 해 보자!', '번개', '컬러 디스코', '섞기', '타깃', '보드를 탭해서 그 자리를 터뜨려', '파워가 없어요 — 선물과 트로피로 얻으세요', '새 파워!', '보드가 이미 비었어!', '놀자!'],
};
const PKT = {"tr": "Parlayan güç kutusunun üstüne blok koy: güç patlar!", "en": "Place a block on the glowing power box to unleash it!", "es": "¡Pon un bloque sobre la caja de poder brillante para activarla!", "pt": "Coloque um bloco na caixa de poder brilhante para ativá-la!", "fr": "Posez un bloc sur la boîte de pouvoir brillante pour la déclencher !", "de": "Setz einen Block auf die leuchtende Kraftbox, um sie auszulösen!", "it": "Metti un blocco sulla scatola potere luminosa per attivarla!", "ru": "Поставь блок на светящуюся коробку силы — она сработает!", "ar": "ضع كتلة على صندوق القوة المتوهج لتفجيره!", "hi": "चमकते पावर बॉक्स पर ब्लॉक रखें, पावर फूटेगी!", "id": "Taruh blok di kotak kekuatan yang bersinar untuk melepaskannya!", "ja": "光るパワーボックスにブロックを置くとパワーが発動！", "zh": "把方块放在发光的能量盒上即可触发！", "ko": "빛나는 파워 상자 위에 블록을 놓으면 파워가 터져요!"};
const PBT = {"tr": "Bomba", "en": "Bomb", "es": "Bomba", "pt": "Bomba", "fr": "Bombe", "de": "Bombe", "it": "Bomba", "ru": "Бомба", "ar": "قنبلة", "hi": "बम", "id": "Bom", "ja": "ボム", "zh": "炸弹", "ko": "폭탄"};
const CHT = {"tr": "Zincir", "en": "Chain", "es": "Cadena", "pt": "Corrente", "fr": "Chaîne", "de": "Kette", "it": "Catena", "ru": "Цепь", "ar": "سلسلة", "hi": "चेन", "id": "Rantai", "ja": "チェーン", "zh": "连锁", "ko": "체인"};
const CLT = {"tr": "Kıl Payı!", "en": "Close Call!", "es": "¡Por los pelos!", "pt": "Por um triz!", "fr": "De justesse !", "de": "Knapp!", "it": "Per un pelo!", "ru": "На волоске!", "ar": "بأعجوبة!", "hi": "बाल-बाल बचे!", "id": "Nyaris!", "ja": "ギリギリ！", "zh": "惊险！", "ko": "아슬아슬!"}, MGT = {"tr": "MEGA ZİNCİR!", "en": "MEGA CHAIN!", "es": "¡MEGA CADENA!", "pt": "MEGA CORRENTE!", "fr": "MÉGA CHAÎNE !", "de": "MEGA-KETTE!", "it": "MEGA CATENA!", "ru": "МЕГА ЦЕПЬ!", "ar": "سلسلة ضخمة!", "hi": "मेगा चेन!", "id": "MEGA RANTAI!", "ja": "メガチェーン！", "zh": "超级连锁！", "ko": "메가 체인!"};
const PWD = {"tr": {"z": "⚡ Satır ve sütunu patlatır", "b": "💣 3×3 alanı patlatır", "d": "🪩 Aynı renkleri patlatır", "t": "🎯 4 bloğu vurur"}, "en": {"z": "⚡ Clears row and column", "b": "💣 Clears a 3×3 area", "d": "🪩 Clears one color", "t": "🎯 Hits 4 blocks"}, "es": {"z": "⚡ Limpia fila y columna", "b": "💣 Limpia un área 3×3", "d": "🪩 Limpia un color", "t": "🎯 Golpea 4 bloques"}, "pt": {"z": "⚡ Limpa linha e coluna", "b": "💣 Limpa uma área 3×3", "d": "🪩 Limpa uma cor", "t": "🎯 Acerta 4 blocos"}, "fr": {"z": "⚡ Efface ligne et colonne", "b": "💣 Efface une zone 3×3", "d": "🪩 Efface une couleur", "t": "🎯 Touche 4 blocs"}, "de": {"z": "⚡ Räumt Reihe und Spalte", "b": "💣 Räumt 3×3 Felder", "d": "🪩 Räumt eine Farbe", "t": "🎯 Trifft 4 Blöcke"}, "it": {"z": "⚡ Elimina riga e colonna", "b": "💣 Elimina un’area 3×3", "d": "🪩 Elimina un colore", "t": "🎯 Colpisce 4 blocchi"}, "ru": {"z": "⚡ Убирает ряд и столбец", "b": "💣 Убирает зону 3×3", "d": "🪩 Убирает один цвет", "t": "🎯 Бьёт 4 блока"}, "ar": {"z": "⚡ يمسح الصف والعمود", "b": "💣 يمسح منطقة 3×3", "d": "🪩 يمسح لونًا واحدًا", "t": "🎯 يصيب 4 كتل"}, "hi": {"z": "⚡ पंक्ति और कॉलम साफ़", "b": "💣 3×3 क्षेत्र साफ़", "d": "🪩 एक रंग साफ़", "t": "🎯 4 ब्लॉक पर वार"}, "id": {"z": "⚡ Hapus baris dan kolom", "b": "💣 Hapus area 3×3", "d": "🪩 Hapus satu warna", "t": "🎯 Kena 4 blok"}, "ja": {"z": "⚡ 縦横一列を消す", "b": "💣 3×3を消す", "d": "🪩 同じ色を消す", "t": "🎯 4ブロックを撃つ"}, "zh": {"z": "⚡ 消除整行和整列", "b": "💣 消除3×3区域", "d": "🪩 消除同色方块", "t": "🎯 击中4个方块"}, "ko": {"z": "⚡ 가로세로 줄 제거", "b": "💣 3×3 영역 제거", "d": "🪩 같은 색 제거", "t": "🎯 블록 4개 명중"}};
const ZK = ['zHi', 'zGo', 'zRec', 'zThink', 'zHold', 'zOver', 'pZap', 'pDisco', 'pShuf', 'pAim', 'pAimTip', 'pNone', 'pGot', 'pEmpty', 'zPlay'];
for (const [lg, arr] of Object.entries(ZT)) { T[lg] = T[lg] || {}; ZK.forEach((k, i) => { T[lg][k] = arr[i]; }); T[lg].pkTip = PKT[lg]; T[lg].pBomb = PBT[lg]; T[lg].chain = CHT[lg]; T[lg].close = CLT[lg]; T[lg].mega = MGT[lg]; T[lg].pwd = PWD[lg]; }
const t = k => (T[cfg.lang] && T[cfg.lang][k] !== undefined ? T[cfg.lang][k] : T.en[k]);
// sesli övgü: telefonun kendi seslendirme motoru, seçili dilde (internet gerekmez)
const VOICE = { tr: 'tr-TR', en: 'en-US', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', ru: 'ru-RU', ar: 'ar-SA', hi: 'hi-IN', id: 'id-ID', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR' };
let lastSay = 0;
const voiceOK = {}; // dil başına: telefonda o dilin sesi var mı
let ziaVoiceAt = -1e9;
function say(text, enText) {
  if (!cfg.sound || !text) return;
  if (Math.abs(performance.now() - ziaVoiceAt) < 1500) return; // Zia konuşuyorsa sesli övgü susar
  const now = Date.now(); if (now - lastSay < 900) return; lastSay = now; // üst üste konuşmasın
  const c = window.Capacitor; if (!c || !c.isNativePlatform || !c.isNativePlatform() || !c.nativePromise) return;
  const lang = VOICE[cfg.lang] || 'en-US';
  const speak = (txt, lg) => c.nativePromise('TextToSpeech', 'speak', { text: txt.replace(/[!！¡]/g, ''), lang: lg, rate: 1.05, pitch: 1.25, volume: 1, category: 'ambient' }).catch(() => {});
  const go = ok => ok || !enText ? speak(text, lang) : speak(enText, 'en-US');
  if (voiceOK[lang] !== undefined) return go(voiceOK[lang]);
  c.nativePromise('TextToSpeech', 'isLanguageSupported', { lang }).then(r => { voiceOK[lang] = !!(r && r.supported); go(voiceOK[lang]); }).catch(() => { voiceOK[lang] = true; go(true); });
}
const fmt = n => n.toLocaleString(cfg.lang);
const dateKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const seedOf = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h | 0; };

/* ---------- Geçiş reklamı (AdMob) ----------
   AdMob kuralları: yalnızca doğal geçişte (oyun bitti -> kullanıcı yeni oyuna dokundu), 3 oyunda bir,
   en az 2 dakika arayla. Açılışta, oyun ortasında ve otomatik yeniden başlamada asla gösterilmez.
   Test sürümü (build-android.bat) HER ZAMAN test reklamı gösterir; gerçek reklam yalnızca
   build-release.bat ile üretilen yayın paketinde (release.js -> BLOKZIA_RELEASE = true) açılır. */
const ADS = {
  android: 'ca-app-pub-3905348091939243/8156519041', // AdMob: Blokzia / Oyun sonu - Gecis
  ios: 'ca-app-pub-3905348091939243/5463208416',      // AdMob: Blokzia iOS / Oyun sonu - Gecis (iOS)
  testing: !window.BLOKZIA_RELEASE,
  grace: 3,        // ilk 3 oyun sonu reklamsız (yeni oyuncu)
  every: 4,        // sonrasında her 4 oyun sonunda bir
  gapMs: 150000,   // iki reklam arası en az 2,5 dakika
};
const Ads = {
  ready: false, ends: 0, last: 0, privacy: false,
  cap() { const c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.nativePromise ? c : null; },
  call(m, o = {}) { const c = this.cap(); return c ? c.nativePromise('AdMob', m, o) : Promise.reject(new Error('web')); },
  async init() {
    if (!this.cap()) return; // tarayıcıda reklam yok
    try { // GDPR/KVKK onay penceresi (gerekiyorsa Google gösterir)
      let ci = await this.call('requestConsentInfo', {});
      if (ci && ci.status === 'REQUIRED' && ci.isConsentFormAvailable) ci = await this.call('showConsentForm', {}) || ci;
      this.privacy = !!(ci && ci.privacyOptionsRequirementStatus === 'REQUIRED');
      if (this.privacy && typeof render === 'function') render();
    } catch {}
    try { await this.call('initialize', { initializeForTesting: ADS.testing }); } catch {}
    this.prepare();
  },
  prepare() {
    const c = this.cap(); if (!c) return; this.ready = false;
    const ios = (c.getPlatform ? c.getPlatform() : 'android') === 'ios';
    this.call('prepareInterstitial', { adId: ios ? ADS.ios : ADS.android, isTesting: ADS.testing })
      .then(() => { this.ready = true; }).catch(() => setTimeout(() => this.prepare(), 30000));
  },
  // yalnızca oyun bittikten sonra, yeni oyun başlarken çağrılır — oyun ortasında asla reklam çıkmaz
  async gameEnded(userInitiated = true) {
    if (!userInitiated) return; // otomatik yeniden başlatma ve Macera geçişleri sayılmaz
    stats.ended = (stats.ended || 0) + 1; LS.set('stats', stats);
    const now = Date.now();
    if (stats.ended <= ADS.grace || stats.ended % ADS.every || !this.ready || now - this.last < ADS.gapMs) return;
    this.last = now; this.ready = false; Music.stop();
    try { await this.call('showInterstitial', {}); } catch {}
    this.prepare(); Music.sync();
  },
  // AdMob/GDPR: kullanıcı iznini istediği an değiştirebilmeli (Ayarlar menüsündeki düğme)
  async privacyOptions() { try { await this.call('showPrivacyOptionsForm', {}); } catch {} },
  // İkinci Şans: geçiş reklamı gösterilir (ödüllü reklam kullanılmaz). Reklam hazır değilse oyuncu engellenmez.
  secondChance: async () => {
    // günde bir ücretsiz; sonraki kullanımlar geçiş reklamıyla
    if (stats.reviveDay !== dateKey()) { stats.reviveDay = dateKey(); LS.set('stats', stats); return true; }
    if (!Ads.cap() || !Ads.ready) return true;
    Ads.ready = false; Music.stop();
    try { await Ads.call('showInterstitial', {}); } catch {}
    Ads.prepare(); Music.sync(); return true;
  },
};

/* ---------- yerel hatırlatma bildirimleri (internet/sunucu gerekmez) ----------
   Oyun kapatılınca planlanır, açılınca iptal edilir. Günde en fazla 1, gece (22:00-09:00) yok, 7 gün sonra durur. */
const Notif = {
  ids: [101, 102, 103, 104],
  call(m, o = {}) { const c = Ads.cap(); return c ? c.nativePromise('LocalNotifications', m, o) : Promise.reject(new Error('web')); },
  at(days, h, m) { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); },
  cancel() { return this.call('cancel', { notifications: this.ids.map(id => ({ id })) }).catch(() => {}); },
  async schedule() {
    if (!cfg.notif) return;
    try {
      const p = await this.call('checkPermissions'); if (!p || p.display !== 'granted') return;
      const list = [
        [101, 1, 19, 0, t('nPuzzle')],
        [102, 2, 12, 30, t('nDaily')],
        [103, 4, 19, 0, t('nSurprise')],
        [104, 7, 19, 0, stats.best ? t('nBest')(fmt(stats.best)) : t('nFirst')],
      ];
      await this.cancel();
      await this.call('schedule', { notifications: list.map(([id, d, h, m, body]) => ({ id, title: 'Block Zia', body, schedule: { at: this.at(d, h, m), allowWhileIdle: true } })) });
    } catch {}
  },
  async ask() { // birkaç oyundan sonra bir kez izin iste (açılışta değil)
    if (cfg.notifAsked || !cfg.notif || !Ads.cap()) return;
    cfg.notifAsked = true; LS.set('cfg', cfg);
    try { await this.call('requestPermissions'); } catch {}
  },
};
document.addEventListener('visibilitychange', () => { document.hidden ? Notif.schedule() : Notif.cancel(); });
Notif.cancel();

/* ---------- ses motoru: tamamı WebAudio sentezi, harici dosya yok ---------- */
let ac, master, sfxBus, musBus, noiseBuf;
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.connect(master);
    sfxBus = ac.createGain(); sfxBus.connect(comp);
    // müzik: yumuşak alçak geçiren filtre + hafif yankı
    musBus = ac.createGain(); musBus.gain.value = 0;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    const dl = ac.createDelay(1); dl.delayTime.value = .38; const fb = ac.createGain(); fb.gain.value = .35;
    musBus.connect(lp); lp.connect(comp); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate);
    const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(f, d, type = 'sine', v = .15, when = 0, slide = 0, bus, atk = .005) {
  try {
    audio(); const t0 = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + atk); g.gain.exponentialRampToValueAtTime(.0008, t0 + d);
    o.connect(g).connect(bus || sfxBus); o.start(t0); o.stop(t0 + d + .05);
  } catch {}
}
function noise(d, f, v, when = 0, q = 1, f2 = 0) {
  try {
    audio(); const t0 = ac.currentTime + when, s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f, t0); if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + d);
    s.connect(bp).connect(g).connect(sfxBus); s.start(t0); s.stop(t0 + d + .05);
  } catch {}
}
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const hz = semi => 261.63 * 2 ** (semi / 12);
/* hazır ses dosyaları (www/sounds): yüklenemezse sentez sesleri yedek olarak çalışır */
const SMP = {}; let smpLoaded = false, smpActive = 0;
const SMP_NAMES = ['zboom','zengine','zyeah','zwow','zwoo','press','whoosh','pick','ui','clear','combo','coin','streak','joker','nova','clean','levelwin','levelnext','record','over','bad'];
function loadSamples() {
  if (smpLoaded) return; smpLoaded = true;
  try { audio(); } catch { return; }
  SMP_NAMES.forEach(n => fetch(`sounds/${n}.mp3`).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(buf => { SMP[n] = buf; }).catch(() => {}));
}
// çalınan ses dosyası; başarılıysa true döner
function samp(name, vol = 1, rate = 1) {
  const b = SMP[name]; if (!b || !ac || !sfxBus) return false;
  if (smpActive >= 4) return true; // çok fazla ses üst üste binmesin: fazlası atlanır
  try {
    const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g).connect(sfxBus); smpActive++; s.onended = () => { smpActive--; }; s.start(); return true;
  } catch { return false; }
}
document.addEventListener('pointerdown', () => { try { audio(); loadSamples(); } catch {} }, { once: true });
let lastTick = 0, placeK = 0;
const sfx = {
  pick: () => { if (!cfg.sound) return; if (samp('pick', .8, .97 + Math.random() * .06)) return; tone(880, .08, 'sine', .07); tone(1320, .06, 'sine', .03, .015); },
  // sürüklerken hücre değişince: geçerli yerde yumuşak tık, çizgi tamamlanacaksa parlak nota
  hover: (valid, lines) => {
    if (!cfg.sound) return; const now = performance.now(); if (now - lastTick < 45) return; lastTick = now;
    if (!valid) { noise(.03, 900, .025, 0, 2); return; }
    if (lines) { const s = PENTA[Math.min(lines, 4) + 2]; tone(hz(12 + s), .18, 'triangle', .07); tone(hz(24 + s), .12, 'sine', .03, .02); }
    else { tone(620, .05, 'sine', .05); noise(.02, 3000, .02, 0, 3); }
  },
  pocket: () => { if (!cfg.sound) return; tone(520, .12, 'triangle', .08, 0, 780); },
  // yerleştirme: orta perdeli, kısa kuyruklu ahşap vuruşu (blok yerine oturuyor hissi)
  // perde hafif değişir ki sürekli aynı ses olmasın; kısa düşen perde + tok gövde + tahta tıkırtısı
  place: () => {
    return; // bloğu yerine koyunca ses çalmaz (kullanıcı isteği); çizgi patlatma sesleri aynen kalır
    const s = PENTA[(placeK++ % 3) + 1];
    tone(hz(s + 12), .11, 'triangle', .12, 0, hz(s + 12) * .7, null, .002);
    tone(hz(s + 24), .05, 'sine', .02, 0, 0, null, .002);
    noise(.03, 1200, .05, 0, 2.5);
  },
  bad: () => { if (!cfg.sound) return; if (samp('bad', .45)) return; tone(220, .14, 'sine', .07, 0, 150); },
  whoosh: () => { if (!cfg.sound) return; if (samp('whoosh', .55)) return; tone(300, .18, 'sine', .05, 0, 900); },
  joker: () => { if (!cfg.sound) return; if (samp('joker', .9)) return; tone(660, .2, 'triangle', .07); },
  ui: () => { if (!cfg.sound) return; if (samp('ui', .6)) return; tone(740, .06, 'sine', .06); },
  // patlatma: seri arttıkça yükselen arpej + parıltı + hışırtı
  clear: (n, st) => {
    if (!cfg.sound) return;
    if (samp('clear', 1, .97 + Math.random() * .06)) { if (st >= 2) samp('combo', .7, 1 + Math.min(st, 8) * .035); if (st >= 3) samp('streak', .6); return; }
    const base = Math.min(st - 1, 7);
    noise(.45, 600, .09, 0, .7, 6000);
    for (let k = 0; k < Math.min(n + 3, 7); k++) {
      const f = hz(PENTA[Math.min(base + k, PENTA.length - 1)] + 12);
      tone(f, .5, 'triangle', .09, k * .055); tone(f * 2, .35, 'sine', .035, k * .055 + .01);
    }
    if (n >= 2) [0, 4, 7, 12].forEach((s, i) => tone(hz(s + 24 + base), .9, 'sine', .04, .3 + i * .03, 0, null, .02));
  },
  // puan: küçük madeni para şıngırtısı
  coin: k => { if (!cfg.sound) return; if (samp('coin', .45, 1 + k * .04)) return; tone(1568 + k * 60, .09, 'square', .018); tone(2093 + k * 80, .14, 'sine', .03, .03); },
  clean: () => { if (!cfg.sound) return; if (samp('clean', .8)) return; [0, 4, 7, 11, 14, 19].forEach((s, i) => tone(hz(s + 12), 1.2, 'sine', .06, i * .07, 0, null, .01)); },
  nova: () => { if (!cfg.sound) return; if (samp('nova', .9)) return; tone(90, .6, 'sawtooth', .08, 0, 40); noise(.7, 300, .15, 0, .5, 4000); tone(700, .5, 'sine', .08, .05, 1800); },
  over: () => { if (!cfg.sound) return; if (samp('over', .8)) return; [7, 4, 0, -5].forEach((s, k) => tone(hz(s), .6, 'triangle', .08, k * .18)); },
};

/* ---------- arka plan müziği: sakin, üretken, tekrar hissi vermez ---------- */
const CHORDS = [[0, 4, 7, 11], [-3, 0, 4, 7, 14], [-7, -3, 0, 4, 9], [-5, -1, 2, 7, 9]]; // Cmaj7, Am9, Fmaj7, G6
const Music = {
  on: false, timer: 0, next: 0, step: 0,
  sync() { this.stop(); }, // arka plan müziği kaldırıldı; yalnızca ses efektleri çalar
  start() {
    if (this.on) return; try { audio(); } catch { return; }
    if (ac.state !== 'running') return; // tarayıcı ilk dokunuştan önce sese izin vermez
    this.on = true; this.next = ac.currentTime + .1;
    musBus.gain.cancelScheduledValues(ac.currentTime); musBus.gain.setTargetAtTime(.55, ac.currentTime, 1.5);
    this.timer = setInterval(() => this.tick(), 250); this.tick();
  },
  stop() {
    if (!this.on) return; this.on = false; clearInterval(this.timer);
    if (ac) { musBus.gain.cancelScheduledValues(ac.currentTime); musBus.gain.setTargetAtTime(0, ac.currentTime, .4); }
  },
  tick() {
    while (this.next < ac.currentTime + 1.2) {
      const bar = this.step >> 3, beat = this.step & 7, ch = CHORDS[bar % 4], t = Math.max(0, this.next - ac.currentTime);
      if (beat === 0) {
        ch.forEach(s => { tone(hz(s - 12), 7.5, 'sine', .035, t, 0, musBus, 1.8); tone(hz(s - 12) * 1.003, 7.5, 'triangle', .012, t, 0, musBus, 2.2); });
        tone(hz(ch[0] - 24), 7, 'sine', .05, t, 0, musBus, 1);
      }
      if (Math.random() < (beat % 2 ? .18 : .42)) {
        const s = ch[(Math.random() * ch.length) | 0] + (Math.random() < .5 ? 12 : 24);
        tone(hz(s), 2.4, 'sine', .028, t + Math.random() * .08, 0, musBus, .01);
      }
      this.step++; this.next += 1; // dakikada 60 vuruş
    }
  },
};

let lastBuzz = 0;
function buzz(ms) {
  if (!cfg.haptic) return;
  const now = performance.now(); if (now - lastBuzz < 60) return; lastBuzz = now; // üst üste titreşimi engelle
  try {
    const cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      const style = ms >= 40 ? 'HEAVY' : ms >= 20 ? 'MEDIUM' : 'LIGHT';
      // @capacitor/core paketlenmediği için yerel eklentiye köprü üzerinden doğrudan ulaşılır
      if (cap.nativePromise) { cap.nativePromise('Haptics', 'impact', { style }).catch(() => {}); return; }
    }
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(Math.min(ms, 40));
  } catch {}
}

/* ---------- oyun mantığı ---------- */
let S = null; // oyun durumu (kaydedilir)
function rnd() { let x = (S.rng = (S.rng + 0x6D2B79F5) | 0); x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }
const fits = (g, sh, r, c) => { if (r < 0 || c < 0 || r + sh.h > N || c + sh.w > N) return false; for (const [y, x] of sh.cells) if (g[(r + y) * N + c + x]) return false; return true; };
const anyFit = (g, sh) => { for (let r = 0; r <= N - sh.h; r++) for (let c = 0; c <= N - sh.w; c++) if (fits(g, sh, r, c)) return true; return false; };
function fullLines(g) {
  const rows = [], cols = [];
  for (let i = 0; i < N; i++) { let a = true, b = true; for (let j = 0; j < N; j++) { if (!g[i * N + j]) a = false; if (!g[j * N + i]) b = false; } if (a) rows.push(i); if (b) cols.push(i); }
  return { rows, cols };
}
function simPlace(g, sh, r, c) {
  const o = g.slice(); for (const [y, x] of sh.cells) o[(r + y) * N + c + x] = 1;
  const { rows, cols } = fullLines(o);
  for (const i of rows) for (let j = 0; j < N; j++) o[i * N + j] = 0;
  for (const i of cols) for (let j = 0; j < N; j++) o[j * N + i] = 0;
  return o;
}
// Üç parçanın bir sırayla tamamen yerleştirilebildiğini doğrular (adil dağıtım)
function solvable(g, shs) {
  let budget = 4000;
  const go = (g, rest) => {
    if (!rest.length) return true;
    for (let i = 0; i < rest.length; i++) {
      const sh = rest[i], nx = rest.filter((_, k) => k !== i);
      for (let r = 0; r <= N - sh.h; r++) for (let c = 0; c <= N - sh.w; c++) {
        if (!fits(g, sh, r, c)) continue;
        if (--budget < 0) return false;
        if (go(simPlace(g, sh, r, c), nx)) return true;
      }
    }
    return false;
  };
  return go(g, shs);
}
function pickShape(fill) {
  let tot = 0;
  const ws = SHAPES.map(s => { let w = s.wt; if (fill > .5 && s.n >= 5) w *= .4; if (fill < .2 && s.n <= 2) w *= .4; tot += w; return w; });
  let x = rnd() * tot;
  for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return i; }
  return 0;
}
const mkPiece = si => ({ s: si, c: S.lastC && rnd() < .3 ? S.lastC : 1 + Math.floor(rnd() * 7), // %30 son rengin aynısı: tek renk satır kurulabilsin
  g: rnd() < (S.mode === 'adv' ? .35 : S.var ? S.var.gemRate : .22) ? Math.floor(rnd() * SHAPES[si].n) : -1 });
function genTray() {
  const fill = S.grid.filter(Boolean).length / 64;
  const tries = Math.max(2, 16 - (S.score / 1200 | 0)); // skor arttıkça cömertlik azalır
  let fb = null;
  for (let k = 0; k < tries; k++) {
    const tri = [pickShape(fill), pickShape(fill), pickShape(fill)], shs = tri.map(i => SHAPES[i]);
    if (solvable(S.grid, shs)) return tri.map(mkPiece);
    if (!fb && shs.some(s => anyFit(S.grid, s))) fb = tri;
  }
  if (!fb) { // son çare: sığan en büyük parçayı bul
    const ok = SHAPES.map((s, i) => i).filter(i => anyFit(S.grid, SHAPES[i]));
    fb = ok.length ? [ok[ok.length * rnd() | 0], pickShape(fill), pickShape(fill)] : [0, 0, 0];
  }
  return fb.map(mkPiece);
}
/* ---------- 100 gizli macera: Klasik oyunun içinde, oyuncuya hiçbir şey söylenmeden ----------
   Her yeni Klasik oyun sıradaki gizli maceradan başlar: farklı başlangıç deseni, farklı sembol, farklı puan
   kuralı ve gizli bir sembol hedefi (tamamlanınca sürpriz ödül). Oyun her açıldığında oynanmamış maceraların
   sırası yeniden karışır; 100'ü bitince yeni tur başlar. İnternet gerekmez, her şey cihazda saklanır. */
const JB_MAX = 5; // Joker çubuğu: 5 satırda dolar
const VAR_COUNT = 100, VAR_STEP = 3400; // her 3.400 puanda yeni gizli macera
// blok sembolleri: renkli emojiler. Telefonda çizilemeyen (kutu görünen) emojiler o cihazda kullanılmaz.
const EMOJI_SYMS = ['🌎', '🌛', '🌜', '🪐', '💫', '🌟', '✨', '⚡', '💥', '🔥', '🌈', '☀️', '❄️', '💦', '❤️‍🔥', '❤️', '🩷', '🧡', '💛', '💚', '🩵', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '💕', '💞', '💓', '💗', '💖', '💘', '💝'];
const emojiOK = (() => {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d', { willReadFrequently: true });
    return e => { // renkli piksel varsa emoji desteklenir; desteklenmeyen kutu tek renk çizilir
      x.clearRect(0, 0, 32, 32); x.font = '26px sans-serif'; x.textBaseline = 'top'; x.fillStyle = '#000'; x.fillText(e, 2, 2);
      const d = x.getImageData(0, 0, 32, 32).data;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 60 && (Math.abs(d[i] - d[i + 1]) > 24 || Math.abs(d[i + 1] - d[i + 2]) > 24)) return true;
      return /[🖤🤍]/u.test(e) ? true : false; // siyah/beyaz kalpler renksizdir, desteklendikleri varsayılır
    };
  } catch { return () => true; }
})();
// 100 bölüm ikonu (www/icons/1..100.png): nadirlik puanı ve oyun mantığına uygun hareket
const ICON_RARE = new Set([3, 4, 5, 12, 13, 14, 15, 16, 17, 30, 43, 45, 46, 47, 80, 81, 83, 84, 88, 89, 100]);
const ICON_MID = new Set([1, 2, 7, 8, 9, 10, 11, 18, 19, 20, 21, 24, 26, 38, 44, 58, 65, 76, 77, 82, 85, 90, 93, 94]);
const ICON_ANIM = {};
[[1, 58, 94, 52, 57], 'pulse', [11, 12, 45, 46, 85], 'spin', [13, 15, 16, 17, 18, 19, 81, 82, 83], 'wobble', [2, 7, 47, 65, 88, 93], 'twinkle',
 [9, 10, 24, 90], 'flicker', [8, 20, 21, 76, 77, 78], 'float', [38, 39, 40, 70, 84, 96], 'gear', [3, 4, 5, 6, 14, 80], 'shine']
  .forEach((v, i, a) => { if (i % 2 === 0) v.forEach(n => ICON_ANIM[n] = a[i + 1]); });
const ICON_IMG = {};
function iconImg(n) { if (!ICON_IMG[n]) { const im = new Image(); im.onload = () => bump(80); im.src = 'icons/' + n + '.png'; ICON_IMG[n] = im; } return ICON_IMG[n]; }
const iconNo = () => { const k = S && S.var ? String(S.var.sym) : ''; return k.startsWith('ic') ? +k.slice(2) : 0; };
// pil dostu: ikon hareketleri sürekli değil, birkaç saniyede bir kısa süre oynar
let iconAnimUntil = 0;
setInterval(() => { if (S && view === 'game' && !document.hidden && ICON_ANIM[iconNo()] && (S.gem.some(Boolean) || S.tray.some(p => p && p.g >= 0))) { iconAnimUntil = performance.now() + 1100; bump(1150); } }, 2600);
// özel blok değeri: ikonun nadirliğine göre 5/10/15 (emojide türüne göre), bitirilen her 10 bölümde +5
function emoVal() {
  const ic = iconNo(), ix = EMOJI_SYMS.indexOf(S && S.var ? S.var.sym : '');
  const tier = ic ? (ICON_RARE.has(ic) ? 2 : ICON_MID.has(ic) ? 1 : 0) : ix >= 0 ? ix % 3 : 0;
  return 5 * (tier + 1) + 5 * Math.floor((varState && varState.done ? varState.done.length : 0) / 10);
}
const VAR_SYMS = (s => s.length >= 8 ? s : ['star', '◆', '♥', '✚', '●', '▲', '☀', '☾', '♣', '✿', '⚡', '♛'])(EMOJI_SYMS.filter(emojiOK));
const VAR_PATTERNS = ['empty', 'scatter', 'corners', 'frame', 'diag', 'cross', 'pillars', 'steps', 'checker', 'heart', 'ring', 'zigzag'];
const VAR_BONUS = ['none', 'combo', 'clean', 'gem', 'line'];
function variant(id) {
  let a = seedOf('bz-var-' + id);
  const r = () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), a | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  return { id, sym: 'ic' + (id + 1), pattern: VAR_PATTERNS[(id * 5 + (r() * 4 | 0)) % VAR_PATTERNS.length],
    bonus: VAR_BONUS[(id * 3 + (r() * 2 | 0)) % VAR_BONUS.length], gemRate: .22 + r() * .16, need: 4 + (r() * 2 | 0) };
}
const varState = Object.assign({ order: [], pos: 0, round: 1, total: 0, done: [] }, LS.get('vars', {}));
if (!Array.isArray(varState.done)) varState.done = [];
// sıra: bitirilmemiş bölümler, her açılışta karışır. Bitmeyen bölüm sıranın sonuna döner; biten bölüm sıradan çıkar.
function shuffleVars() {
  const rest = [...Array(VAR_COUNT).keys()].filter(i => !varState.done.includes(i));
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [rest[i], rest[j]] = [rest[j], rest[i]]; }
  varState.order = rest; LS.set('vars', varState);
}
shuffleVars();
function nextVariant() {
  varState.order = varState.order.filter(i => !varState.done.includes(i));
  if (!varState.order.length) shuffleVars();
  const id = varState.order.shift(); varState.order.push(id);
  varState.pos++; varState.total++; LS.set('vars', varState); return id;
}
// gizli hedef tamamlandı: bölüm bitti sayılır, oyun sıradaki bölüme geçer. 100'ü bitince büyük kutlama + yeni tur.
function levelDone() {
  if (!varState.done.includes(S.var.id)) varState.done.push(S.var.id);
  varState.order = varState.order.filter(i => i !== S.var.id); S.varSwitch = true;
  let bonus = 0;
  if (varState.done.length >= VAR_COUNT) {
    varState.done = []; varState.round++; shuffleVars(); bonus = 1000;
    celebrate(() => { shower(90); parts.push({ kind: 'trophy', vx: 0, vy: 0, x: L.bx + L.bs / 2, y: L.by + L.bs * .42, s: L.cell * 3.2, txt: '+1000', t0: performance.now(), life: 4200 }); bump(4300); samp('record', .9) || sfx.clean(); }, 4300);
  }
  else if (varState.done.length % 3 === 0) { // her 3 bölümde küçük kupa kutlaması
    bonus = 100; const cx = L.bx + L.bs / 2, cy = L.by + L.bs * .42;
    celebrate(() => { parts.push({ kind: 'trophy', vx: 0, vy: 0, x: cx, y: cy, s: L.cell * 2.4, txt: '+100', t0: performance.now(), life: 3400 }); bump(3500); confetti(cx, cy, 30, 260); glow(cx, cy, L.cell * 2.4, '#FFE08A', 600); for (let q = 0; q < 14; q++) { const an = q / 14 * 6.283; parts.push({ kind: 'spark', s4: true, x: cx + Math.cos(an) * L.cell * 1.9, y: cy + Math.sin(an) * L.cell * 1.6, r: L.cell * (.16 + (q % 3) * .06), col: q % 2 ? '#FFFFFF' : '#FFE27A', t0: performance.now() + 250 + q * 40, life: 520 }); } samp('levelnext', .8); buzz(30); zia('joy', '🏆 +100', 2600, true); }, 3500);
  }
  LS.set('vars', varState); return bonus;
}
// başlangıç desenleri (tam çizgi oluşturan hücreler yerleştirilirken atlanır)
function patternCells(name) {
  const out = [], at = (y, x) => { if (y >= 0 && y < N && x >= 0 && x < N) out.push(y * N + x); };
  switch (name) {
    case 'scatter': for (let k = 0; k < 14; k++) at(rnd() * N | 0, rnd() * N | 0); break;
    case 'corners': for (const [y0, x0] of [[0, 0], [0, 6], [6, 0], [6, 6]]) for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) at(y0 + y, x0 + x); break;
    case 'frame': for (let k = 0; k < N; k++) if (k % 3) { at(0, k); at(N - 1, k); at(k, 0); at(k, N - 1); } break;
    case 'diag': for (let k = 0; k < N; k++) { at(k, k); if (k % 2) at(k, N - 1 - k); } break;
    case 'cross': for (let k = 1; k < N - 1; k++) { at(3, k); at(k, 4); } break;
    case 'pillars': for (const x of [1, 3, 5, 7]) for (let y = 3 + (x % 3); y < N; y++) at(y, x); break;
    case 'steps': for (let x = 0; x < N; x++) for (let y = N - 1; y >= N - 1 - (x >> 1); y--) at(y, x); break;
    case 'checker': for (let y = 2; y < 6; y++) for (let x = 1; x < 7; x++) if ((x + y) % 2) at(y, x); break;
    case 'heart': [[2, 2], [2, 5], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [4, 2], [4, 3], [4, 4], [4, 5], [5, 3], [5, 4]].forEach(([y, x]) => at(y, x)); break;
    case 'ring': for (let k = 2; k < 6; k++) { at(2, k); at(5, k); at(k, 2); at(k, 5); } break;
    case 'zigzag': for (let x = 0; x < N; x++) { at(2 + (x % 2), x); at(5 + (x % 2), x); } break;
  }
  return [...new Set(out)];
}
function setupVariant(forceId) {
  const v = variant(forceId === undefined ? nextVariant() : forceId);
  S.var = { id: v.id, sym: v.sym, bonus: v.bonus, gemRate: v.gemRate };
  S.hidden = { need: v.need, have: 0, done: false };
  // başlangıç deseni hafif kalır: zamanla biraz dolar ama en fazla 18 hücre (tahtanın ~%28'i)
  const keep = .45 + .2 * Math.min(1, varState.total / 40); let placed = 0;
  for (const i of patternCells(v.pattern)) {
    if (placed >= 18) break;
    if (S.grid[i] || rnd() > keep) continue; placed++;
    S.grid[i] = 1 + (rnd() * 7 | 0);
    const f = fullLines(S.grid); if (f.rows.length || f.cols.length) { S.grid[i] = 0; placed--; continue; }
    if (rnd() < v.gemRate) S.gem[i] = 1;
  }
}
const bestFor = mode => mode === 'adv' ? 0 : mode === 'daily' ? (stats.daily.date === dateKey() ? stats.daily.best : 0) : stats.best;
function newGame(mode) {
  S = { mode, grid: Array(64).fill(0), gem: Array(64).fill(0), tray: [null, null, null], hold: null, score: 0, streak: 0, since: 0, nova: 0,
    rng: mode === 'daily' ? seedOf(dateKey()) : (Math.random() * 2 ** 32) | 0, lines: 0, revived: false, over: false, date: dateKey(), prev: bestFor(mode) };
  if (mode === 'adv') {
    const lv = S.level = stats.adv; S.rng = seedOf('blokzia-adv-' + lv);
    S.goal = lv % 2 ? { type: 'star', need: 3 + Math.ceil(lv * 1.5), have: 0 } : { type: 'score', need: 200 + lv * 150 };
    // tahtayı hazır bloklarla doldur (tam çizgi oluşturmadan)
    for (let k = 0, want = Math.min(26, 4 + lv * 2), guard = 0; k < want && guard < 500; guard++) {
      const i = rnd() * 64 | 0; if (S.grid[i]) continue;
      S.grid[i] = 1 + (rnd() * 7 | 0); const f = fullLines(S.grid);
      if (f.rows.length || f.cols.length) { S.grid[i] = 0; continue; }
      if (S.goal.type === 'star' && rnd() < .25) S.gem[i] = 1; k++;
    }
  }
  if (mode === 'classic') setupVariant();
  S.joker = 1;
  S.tray = genTray(); S.next = genTray(); S.pu = -1; S.jbar = 0; stats.games++; save();
}
function save() {
  if (S.mode === 'daily') { if (stats.daily.date !== S.date) stats.daily = { date: S.date, best: 0 }; stats.daily.best = Math.max(stats.daily.best, S.score); }
  else if (S.mode !== 'adv') stats.best = Math.max(stats.best, S.score);
  LS.set('stats', stats);
  if (S.over) LS.del('game.' + S.mode); else LS.set('game.' + S.mode, S);
}
function loadGame(mode) { const g = LS.get('game.' + mode, null); return g && (mode !== 'daily' || g.date === dateKey()) ? g : null; }
function hasMove() {
  const ps = S.tray.filter(Boolean);
  if (S.nova >= NOVA_MAX && S.grid.some(Boolean)) return true;
  if (ps.some(p => anyFit(S.grid, SHAPES[p.s]))) return true;
  if (S.joker && ps.length && S.grid.some(v => !v)) return true;
  if (S.hold && anyFit(S.grid, SHAPES[S.hold.s])) return true;
  return !S.hold && ps.length === 1; // son parçayı cebe atıp yeni el almak mümkün
}

// Tek çıkış yolu son parçayı cebe atmak mı? (oyuncuya ipucu göstermek için)
const stuck = () => !S.over && !S.hold && S.nova < NOVA_MAX && S.tray.filter(Boolean).length === 1 && !S.tray.some(p => p && anyFit(S.grid, SHAPES[p.s]));

/* ---------- görsel durum ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let dpr = 1, L = null, C = {}, sprites = [], spritesF = [];
const placeT = new Float64Array(64).fill(-1e9);
let dying = [], parts = [], floats = [], beams = [], shakeEnd = 0, shakeAmp = 0, trayT = -1e9, punchEnd = 0, punchAmp = 0;
// büyük anlarda tahta bir an büyüyüp geri oturur (vuruş hissi)
const punch = (amp, ms = 360) => { punchAmp = Math.max(amp, performance.now() < punchEnd ? punchAmp : 0); punchEnd = performance.now() + ms; bump(ms + 50); };
let drag = null, fly = null, shown = 0, raf = 0, animUntil = 0, lastT = 0, view = 'home';
const ease = k => 1 - (1 - k) ** 3;
const back = k => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };

function path(x, X, Y, w, h, r) { r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function readTheme() { const cs = getComputedStyle(document.documentElement); for (const k of ['board', 'cell', 'text', 'muted', 'accent']) C[k] = cs.getPropertyValue('--' + k).trim(); C.ff = cs.getPropertyValue('--ff'); }
function layout() {
  const st = $('stage'), W = st.clientWidth, H = st.clientHeight; if (!W || !H) return;
  dpr = Math.min(window.devicePixelRatio || 1, 3); cv.width = W * dpr; cv.height = H * dpr;
  const cell = Math.floor(Math.max(16, Math.min((W - 28) / 8, (H - 52) / 13.6, 62))), bs = cell * 8, bx = (W - bs) / 2;
  const total = 13.4 * cell + 38, by = 12 + Math.max(0, (H - total) / 3);
  const jbY = by + bs + 14, jbH = cell * .5, trayY = jbY + jbH + 4, trayH = cell * 2.7, powY = trayY + trayH + 8, powH = cell * 2;
  L = { W, H, cell, bs, bx, by, trayY, trayH, jbar: { x: bx, y: jbY + jbH * .2, w: bs * .64, h: jbH * .6 }, jbtn: { x: bx + bs * .68, y: jbY, w: bs * .32, h: jbH }, slotW: bs / 3, mini: cell * .5, hs: cell * .28,
    hold: { x: bx, y: powY, w: bs * .48, h: powH }, nova: { x: bx + bs * .52, y: powY, w: bs * .48, h: powH } };
  const px = Math.ceil(cell * dpr);
  // jöle bloklar: parlak gövde, iç ışık, üst parlak şerit, ışıltı noktası; normal bloklarda sevimli yüz
  const mk = face => PALETTE.map(([b, l, d]) => {
    const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d');
    const m = px * .045, s = px - 2 * m, r = px * .26, g = x.createLinearGradient(0, m, 0, px - m);
    g.addColorStop(0, l); g.addColorStop(.5, b); g.addColorStop(1, d);
    path(x, m, m, s, s, r); x.fillStyle = g; x.fill();
    const rg = x.createRadialGradient(px * .5, px * .36, px * .04, px * .5, px * .5, px * .62);
    rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); path(x, m, m, s, s, r); x.fillStyle = rg; x.fill();
    path(x, m + s * .12, m + s * .07, s * .76, s * .28, r * .7); x.fillStyle = 'rgba(255,255,255,.36)'; x.fill();
    x.beginPath(); x.arc(m + s * .2, m + s * .19, s * .05, 0, 7); x.fillStyle = 'rgba(255,255,255,.9)'; x.fill();
    path(x, m, m, s, s, r); x.lineWidth = Math.max(1, px * .03); x.strokeStyle = 'rgba(0,0,0,.16)'; x.stroke();
    if (face) {
      const ey = m + s * .55, ex = s * .17, er = s * .072, ink = '#2A1840';
      x.fillStyle = ink; for (const sx of [-1, 1]) { x.beginPath(); x.ellipse(px / 2 + sx * ex, ey, er, er * 1.25, 0, 0, 7); x.fill(); }
      x.fillStyle = '#fff'; for (const sx of [-1, 1]) { x.beginPath(); x.arc(px / 2 + sx * ex - er * .3, ey - er * .5, er * .4, 0, 7); x.fill(); }
      x.strokeStyle = ink; x.lineWidth = Math.max(1, s * .05); x.lineCap = 'round';
      x.beginPath(); x.arc(px / 2, ey + s * .05, s * .085, .18 * Math.PI, .82 * Math.PI); x.stroke();
      x.fillStyle = 'rgba(255,110,150,.38)'; for (const sx of [-1, 1]) { x.beginPath(); x.ellipse(px / 2 + sx * s * .3, ey + s * .1, s * .075, s * .045, 0, 0, 7); x.fill(); }
    }
    return c;
  });
  sprites = mk(false); spritesF = sprites; // yüzler kaldırıldı (kullanıcı isteği); jöle görünüm kalır
  bump(50);
}
function star(cx, cy, R, col = '#fff') {
  ctx.beginPath();
  // 5 köşeli klasik yıldız (Joker'in 4 köşeli ✦ işaretinden ayırt edilsin)
  for (let k = 0; k < 10; k++) { const rad = k % 2 ? R * .45 : R, an = k * Math.PI / 5 - Math.PI / 2; ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(an) * rad, cy + Math.sin(an) * rad); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}
// Joker işareti: 4 köşeli ✦ (bloklardaki 5 köşeli yıldızdan ayrı)
function spark4(cx, cy, R, col = '#fff') {
  ctx.beginPath();
  for (let k = 0; k < 8; k++) { const rad = k % 2 ? R * .4 : R, an = k * Math.PI / 4 - Math.PI / 2; ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(an) * rad, cy + Math.sin(an) * rad); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}
// özel hücre sembolü: her gizli macerada farklı
// emoji görseli: yüksek çözünürlükte bir kez çizilip önbelleğe alınır (her ekranda keskin), ince beyaz kontur ve gölge
const EMO_IMG = {};
function emoImg(k) {
  if (EMO_IMG[k]) return EMO_IMG[k];
  const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d');
  x.font = '112px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 6; x.shadowOffsetY = 4; x.fillText(k, 80, 88);
  x.shadowColor = 'rgba(255,255,255,.95)'; x.shadowBlur = 5; x.shadowOffsetY = 0; x.fillText(k, 80, 86);
  return (EMO_IMG[k] = c);
}
// özel blok rozeti: blok renginde parlak halka, beyaz parlak iç, üst parıltı, keskin emoji
function ptTag(cx, cy, s) {
  ctx.save();
  // puan etiketi: emojinin vereceği puan (tepsideki küçük bloklarda gösterilmez)
  if (L && s >= L.cell * .7) {
    const txt = '+' + emoVal(), fs = s * .24; ctx.font = `900 ${fs}px ${C.ff}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const ph = fs * 1.25, pw = ctx.measureText(txt).width + fs * .6, x0 = cx + s * .5 - pw - s * .02, y0 = cy + s * .5 - ph - s * .02;
    const pg = ctx.createLinearGradient(0, y0, 0, y0 + ph); pg.addColorStop(0, '#FFF1A8'); pg.addColorStop(1, '#F5A300');
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = s * .05; path(ctx, x0, y0, pw, ph, ph / 2); ctx.fillStyle = pg; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.lineWidth = Math.max(1, s * .025); ctx.strokeStyle = '#8A4A00'; ctx.stroke();
    ctx.fillStyle = '#4A1A00'; ctx.fillText(txt, x0 + pw / 2, y0 + ph / 2 + fs * .04);
  }
  ctx.restore();
}
// ikon madalyonu: blok renginde parlak halka, daire ikon; hareket türüne göre oynar
function iconBadge(cx, cy, s, c, n, still) {
  const [, l, d] = PALETTE[(c || 1) - 1], im = iconImg(n), t = performance.now(), A = ICON_ANIM[n], ph = t / 1000 * 6 + n;
  let sx = 1, sy = 1, rot = 0, dy = 0, al = 1, shine = -1;
  if (!still && A && t < iconAnimUntil) {
    if (A === 'pulse') { sx = sy = 1 + .14 * Math.max(0, Math.sin(ph * 2)); }
    else if (A === 'spin') { sx = Math.max(.08, Math.abs(Math.cos(ph * 1.4))); }
    else if (A === 'wobble') { rot = Math.sin(ph * 3.2) * .28; }
    else if (A === 'twinkle') { rot = Math.sin(ph) * .35; sx = sy = 1 + .1 * Math.sin(ph * 2); }
    else if (A === 'flicker') { sx = sy = 1 + .07 * Math.sin(ph * 6); al = .82 + .18 * Math.sin(ph * 9); }
    else if (A === 'float') { dy = Math.sin(ph * 1.6) * s * .07; }
    else if (A === 'gear') { rot = (iconAnimUntil - t) / 1100 * -Math.PI; }
    else if (A === 'shine') { shine = 1 - (iconAnimUntil - t) / 1100; }
  }
  ctx.save();
  // 3D küre madalyon: koyu kenar, ışık alan parlak gövde, üst yansıma
  ctx.shadowColor = 'rgba(0,0,0,.38)'; ctx.shadowBlur = s * .1; ctx.shadowOffsetY = s * .05;
  ctx.beginPath(); ctx.arc(cx, cy, s * .4, 0, 6.283); ctx.fillStyle = d; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  const rg = ctx.createRadialGradient(cx - s * .12, cy - s * .15, s * .03, cx, cy, s * .38);
  rg.addColorStop(0, '#FFFFFF'); rg.addColorStop(.38, l); rg.addColorStop(1, d);
  ctx.beginPath(); ctx.arc(cx, cy - s * .012, s * .36, 0, 6.283); ctx.fillStyle = rg; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy - s * .2, s * .23, s * .09, 0, 0, 6.283); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
  // ikon: madalyondan hafif yüksekte, altında gölge (3D his)
  ctx.translate(cx, cy + dy - s * .02); ctx.rotate(rot); ctx.scale(sx, sy); ctx.globalAlpha = al;
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = s * .06; ctx.shadowOffsetY = s * .045;
  if (im.complete && im.naturalWidth) ctx.drawImage(im, -s * .34, -s * .34, s * .68, s * .68);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  if (shine >= 0) { ctx.beginPath(); ctx.arc(0, 0, s * .36, 0, 6.283); ctx.clip(); const sxp = (shine * 2 - 1) * s * .5;
    const lg = ctx.createLinearGradient(sxp - s * .12, 0, sxp + s * .12, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.65)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = lg; ctx.fillRect(-s * .4, -s * .4, s * .8, s * .8); }
  ctx.restore();
}
function sym(cx, cy, s, c = 1) {
  const k = S && S.var ? S.var.sym : 'star';
  if (k === 'star') return star(cx, cy, s * .26);
  if (String(k).startsWith('ic')) { iconBadge(cx, cy, s, c, +String(k).slice(2)); ptTag(cx, cy, s); return; }
  const [, l, d] = PALETTE[(c || 1) - 1];
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = s * .08; ctx.shadowOffsetY = s * .03;
  const rg = ctx.createLinearGradient(0, cy - s * .36, 0, cy + s * .36); rg.addColorStop(0, '#FFFFFF'); rg.addColorStop(1, l);
  ctx.beginPath(); ctx.arc(cx, cy, s * .36, 0, 6.283); ctx.fillStyle = rg; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  const bg = ctx.createRadialGradient(cx - s * .08, cy - s * .1, s * .02, cx, cy, s * .3);
  bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, 'rgba(255,255,255,.78)');
  ctx.beginPath(); ctx.arc(cx, cy, s * .3, 0, 6.283); ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = Math.max(1, s * .02); ctx.strokeStyle = d; ctx.globalAlpha = .35; ctx.stroke(); ctx.globalAlpha = 1;
  ctx.drawImage(emoImg(k), cx - s * .3, cy - s * .3, s * .6, s * .6);
  ctx.beginPath(); ctx.ellipse(cx - s * .1, cy - s * .2, s * .1, s * .045, -.5, 0, 6.283); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
  ctx.restore(); ptTag(cx, cy, s);
}
function tile(c, x, y, s, gem) { ctx.drawImage((gem ? sprites : spritesF)[c - 1], x, y, s, s); if (gem) sym(x + s / 2, y + s / 2, s, c); }
function drawPiece(p, cx, cy, cs) { const sh = SHAPES[p.s], x0 = cx - sh.w * cs / 2, y0 = cy - sh.h * cs / 2; sh.cells.forEach(([y, x], k) => tile(p.c, x0 + x * cs, y0 + y * cs, cs, k === p.g)); }
const center = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 + L.cell * .12 });
const slotC = i => ({ x: L.bx + L.slotW * (i + .5), y: L.trayY + L.trayH / 2 });
const inBox = (b, x, y, pad = 0) => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;

function geom(now) {
  const d = drag, sh = d.sh, k = ease(Math.min(1, (now - d.t0) / 130)), s = d.s0 + (L.cell - d.s0) * k;
  // dokunmatikte parça parmaktan 1,4 kat hızlı gider: tepsiden tahtaya kısa bir kaydırma yeter
  const G = d.touch ? 1.4 : 1, lift = d.touch ? (L.cell * 1.3 + sh.h * L.cell / 2) * k : 0;
  const cx = Math.max(0, Math.min(L.W, d.x0 + (d.px - d.x0) * G)), cy = Math.max(-L.cell, d.y0 + (d.py - d.y0) * G) - lift;
  const fr = (cy - sh.h * L.cell / 2 - L.by) / L.cell, fc = (cx - sh.w * L.cell / 2 - L.bx) / L.cell;
  // mevcut hücreden en az 0.65 hücre uzaklaşmadan hedef değişmez -> sınırda titreme olmaz
  const r = Math.abs(fr - d.pr) < .65 ? d.pr : Math.round(fr), c = Math.abs(fc - d.pc) < .65 ? d.pc : Math.round(fc);
  return { s, cx, cy, r, c };
}
function updatePreview(now) {
  const d = drag, g = geom(now);
  const hp = L.cell * .5, hb = L.hold;
  const wasHold = d.overHold;
  d.overHold = d.kind === 'tray' && (inBox(hb, g.cx, g.cy, hp) || inBox(hb, d.px, d.py, hp) || (d.px >= hb.x - hp && d.px <= hb.x + hb.w + hp && d.py > hb.y));
  // sürükleme sırasında ses çalmaz
  if (g.r === d.pr && g.c === d.pc) return;
  d.pr = g.r; d.pc = g.c; d.lines = null;
  if (d.kind === 'nova') {
    d.valid = g.r >= 0 && g.c >= 0 && g.r <= N - 3 && g.c <= N - 3 && NOVA_SHAPE.cells.some(([y, x]) => S.grid[(g.r + y) * N + g.c + x]);
  } else {
    d.valid = fits(S.grid, d.sh, g.r, g.c);
    if (d.valid) { const o = S.grid.slice(); for (const [y, x] of d.sh.cells) o[(g.r + y) * N + g.c + x] = 1; d.lines = fullLines(o); }
    // sürükleme sırasında ses çalmaz
    d.wasValid = d.valid;
  }
}

function box(b, label, hot, glow = 1) {
  path(ctx, b.x, b.y, b.w, b.h, L.cell * .32); ctx.globalAlpha = .45; ctx.fillStyle = C.cell; ctx.fill(); ctx.globalAlpha = 1;
  if (hot) { ctx.setLineDash([7, 6]); ctx.lineWidth = 3; ctx.strokeStyle = C.accent; ctx.globalAlpha = glow; ctx.stroke(); ctx.setLineDash([]); } else { ctx.lineWidth = 1; ctx.strokeStyle = C.muted; ctx.globalAlpha = .25; ctx.stroke(); } ctx.globalAlpha = 1;
  ctx.font = `800 ${Math.max(9, L.cell * .22)}px ${C.ff}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = hot ? C.accent : C.muted;
  ctx.fillText(label, b.x + L.cell * .22, b.y + L.cell * .16);
}

function draw(now) {
  const { cell, bx, by, bs } = L;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, L.W, L.H); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (drag) updatePreview(now);
  ctx.save();
  if (now < shakeEnd) { const e = 1 - (shakeEnd - now) / 260; ctx.translate(Math.sin(e * Math.PI * 3) * shakeAmp * (1 - e) ** 2, 0); }
  if (now < punchEnd) { const e = 1 - (punchEnd - now) / 360, z = 1 + punchAmp * Math.sin(Math.min(1, e) * Math.PI) * (1 - e * .5), cxp = bx + bs / 2, cyp = by + bs / 2; ctx.translate(cxp, cyp); ctx.scale(z, z); ctx.translate(-cxp, -cyp); }
  path(ctx, bx - 8, by - 8, bs + 16, bs + 16, cell * .34); ctx.fillStyle = C.board; ctx.fill();
  { const rg = ctx.createLinearGradient(0, by - 8, 0, by + bs + 8); rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(.12, 'rgba(255,255,255,.12)'); rg.addColorStop(.85, 'rgba(255,255,255,.06)'); rg.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.lineWidth = 3; ctx.strokeStyle = rg; ctx.stroke(); path(ctx, bx - 4, by - 4, bs + 8, bs + 8, cell * .3); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.stroke(); } // cam çerçeve
  ctx.fillStyle = C.cell;
  for (let i = 0; i < 64; i++) { path(ctx, bx + (i % N) * cell + 2, by + (i / N | 0) * cell + 2, cell - 4, cell - 4, cell * .2); ctx.fill(); }
  if (S.over) ctx.globalAlpha = .45;
  for (let i = 0; i < 64; i++) {
    const v = S.grid[i]; if (!v) continue;
    const x = bx + (i % N) * cell, y = by + (i / N | 0) * cell, k = (now - placeT[i]) / 200;
    if (k < 1) { const kk = Math.max(0, k), drop = kk < .45 ? (1 - ease(kk / .45)) * cell * .22 : 0, sq = kk >= .45 ? Math.sin((kk - .45) / .55 * Math.PI) * .09 : 0;
      ctx.save(); ctx.translate(x + cell / 2, y + cell - drop); ctx.scale(1 + sq, 1 - sq); tile(v, -cell / 2, -cell, cell, S.gem[i]); ctx.restore(); } else tile(v, x, y, cell, S.gem[i]);
  }
  ctx.globalAlpha = 1;
  if (S.streak >= 3 && !S.over) { const it = Math.min(1, (S.streak - 2) / 7), col = S.streak >= 9 ? '#5FD0FF' : S.streak >= 6 ? '#FF4FA0' : '#FF8A1E', fl = .65 + .35 * Math.sin(now / 70) * Math.sin(now / 131);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; path(ctx, bx - 9, by - 9, bs + 18, bs + 18, cell * .36);
    ctx.shadowColor = col; ctx.shadowBlur = cell * (.5 + it) * fl; ctx.lineWidth = 2 + it * 3; ctx.strokeStyle = col; ctx.globalAlpha = .55 + .4 * it * fl; ctx.stroke(); ctx.restore();
    if (Math.random() < .25 + it * .4) { const ex = bx + Math.random() * bs, top = Math.random() < .5; parts.push({ kind: 'spark', s4: true, x: top ? ex : (Math.random() < .5 ? bx - 6 : bx + bs + 6), y: top ? by - 8 : by + Math.random() * bs, r: cell * (.08 + Math.random() * .08), col, t0: now, life: 380 }); } }
  // altın güç-up yıldızı (nabız gibi atar)
  if (S.pu >= 0 && !S.grid[S.pu] && !S.over) {
    const x = bx + (S.pu % N + .5) * cell, y = by + ((S.pu / N | 0) + .5) * cell, pz = 1 + .09 * Math.sin(now / 170);
    const g = ctx.createRadialGradient(x, y, 0, x, y, cell * .62); g.addColorStop(0, 'rgba(255,214,90,.55)'); g.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, cell * .62, 0, 7); ctx.fill();
    star(x, y + cell * .02, cell * .36 * pz, '#E89A00'); star(x, y, cell * .34 * pz, '#FFC93C'); star(x - cell * .04, y - cell * .05, cell * .16 * pz, '#FFF3B0');
  }
  drawPK(now); drawLinks(now);
  // yerleştirme önizlemesi
  if (drag && drag.valid) {
    const d = drag;
    if (d.kind === 'nova') {
      path(ctx, bx + d.pc * cell, by + d.pr * cell, cell * 3, cell * 3, cell * .3); ctx.globalAlpha = .3; ctx.fillStyle = C.accent; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 3; ctx.strokeStyle = C.accent; ctx.stroke();
    } else {
      ctx.globalAlpha = .4; for (const [y, x] of d.sh.cells) tile(d.piece.c, bx + (d.pc + x) * cell, by + (d.pr + y) * cell, cell);
      ctx.globalAlpha = .2 + .08 * Math.sin(now / 120); ctx.fillStyle = '#fff';
      for (const r of d.lines.rows) { path(ctx, bx, by + r * cell, bs, cell, cell * .25); ctx.fill(); }
      for (const c of d.lines.cols) { path(ctx, bx + c * cell, by, cell, bs, cell * .25); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  dying = dying.filter(d => now < d.t0 + 300);
  for (const d of dying) {
    const k = Math.max(0, (now - d.t0) / 300), s = 1 - k * k, x = bx + (d.i % N) * cell, y = by + (d.i / N | 0) * cell, o = cell * (1 - s) / 2;
    ctx.globalAlpha = 1 - k; tile(d.c, x + o, y + o, cell * s, d.g);
  }
  beams = beams.filter(b => now < b.t0 + 380);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const b of beams) {
    const k = (now - b.t0) / 380; if (k < 0) continue;
    const th = cell * (1.05 - k * .6), o = (cell - th) / 2, core = cell * .14 * (1 - k);
    ctx.globalAlpha = (1 - k) * .35; ctx.fillStyle = '#9FD8FF';
    if (b.row) path(ctx, bx - 4, by + b.i * cell + o, bs + 8, th, th / 2); else path(ctx, bx + b.i * cell + o, by - 4, th, bs + 8, th / 2); ctx.fill();
    ctx.globalAlpha = 1 - k; ctx.fillStyle = '#FFFFFF';
    if (b.row) ctx.fillRect(bx, by + (b.i + .5) * cell - core / 2, bs, core); else ctx.fillRect(bx + (b.i + .5) * cell - core / 2, by, core, bs);
    const sw = Math.min(1, k / .55), fx = b.row ? bx + bs * sw : bx + (b.i + .5) * cell, fy = b.row ? by + (b.i + .5) * cell : by + bs * sw; // kayan parıltı
    if (sw < 1) { const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, cell * .9); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, cell * .9, 0, 6.283); ctx.fill(); spark4(fx, fy, cell * .32, '#FFFFFF'); }
  }
  ctx.restore();
  ctx.globalAlpha = 1; ctx.restore();

  // el (tepsi)
  for (let i = 0; i < 3; i++) {
    const p = S.tray[i]; if (!p || (drag && drag.kind === 'tray' && drag.idx === i) || (fly && fly.kind === 'tray' && fly.idx === i)) continue;
    const k = Math.min(1, (now - trayT - i * 70) / 220); if (k <= 0) continue;
    ctx.globalAlpha = S.over || anyFit(S.grid, SHAPES[p.s]) ? 1 : .35;
    // uzun bloklar tepsiye sığacak şekilde küçülür (JOKER yazısının üstüne taşmaz)
    const sh = SHAPES[p.s], fit = Math.min(L.mini, L.trayH * .82 / sh.h, L.slotW * .86 / sh.w);
    const sc = slotC(i); drawPiece(p, sc.x, sc.y, fit * (.4 + .6 * back(k))); ctx.globalAlpha = 1;
    if (S.joker && !S.over && !anyFit(S.grid, SHAPES[p.s])) spark4(sc.x + L.slotW * .3, sc.y - L.trayH * .28, L.cell * (.2 + .03 * Math.sin(now / 200)), C.accent);
  }
  // gökkuşağı Joker çubuğu + "+JOKER" düğmesi
  { const b = L.jbar, q = L.jbtn, fillK = S.joker ? 1 : Math.min(1, (S.jbar || 0) / JB_MAX);
    path(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.fillStyle = C.cell; ctx.fill();
    if (fillK > 0) { ctx.save(); path(ctx, b.x, b.y, b.w, b.h, b.h / 2); ctx.clip();
      const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0); ['#FF5C6C', '#FFA63D', '#FFD84D', '#5ED16A', '#4FB8FF', '#A77BFF'].forEach((c2, i) => g.addColorStop(i / 5, c2));
      ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w * fillK, b.h);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(b.x, b.y, b.w * fillK, b.h * .4);
      if (S.joker && now < shineUntil) { const sx = b.x + (1 - (shineUntil - now) / 900) * (b.w + 60) - 30; ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(sx, b.y, 18, b.h); }
      ctx.restore(); }
    path(ctx, q.x, q.y, q.w, q.h, q.h / 2); ctx.fillStyle = S.joker ? C.accent : C.cell; ctx.globalAlpha = S.joker ? 1 : .7; ctx.fill(); ctx.globalAlpha = 1;
    ctx.font = `900 ${Math.max(9, L.cell * .25)}px ${C.ff}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = S.joker ? '#2A1840' : C.muted; ctx.fillText('+' + t('joker'), q.x + q.w / 2, q.y + q.h / 2 + 1); }
  // cep
  box(L.hold, t('hold'), (drag && drag.overHold) || stuck(), stuck() && !(drag && drag.overHold) ? .55 + .45 * (.5 + .5 * Math.sin(now / 420)) : 1);
  if (S.hold && !(drag && drag.kind === 'hold') && !(fly && fly.kind === 'hold')) { const c = center(L.hold); drawPiece(S.hold, c.x, c.y, L.hs); }
  // nova
  const full = S.nova >= NOVA_MAX, nc = center(L.nova);
  box(L.nova, full ? 'NOVA · ' + t('drag') : 'NOVA', full);
  if (!(drag && drag.kind === 'nova')) for (let k = 0; k < NOVA_MAX; k++) {
    const on = k < S.nova, R = cell * .17 * (full ? 1 + .15 * Math.sin(now / 160 + k) : 1), x = nc.x + (k - (NOVA_MAX - 1) / 2) * cell * .5, ny = L.nova.y + L.nova.h * .4;
    if (on) star(x, ny, R * 1.25, C.accent); else { ctx.beginPath(); ctx.arc(x, ny, R * .55, 0, 7); ctx.fillStyle = C.muted; ctx.globalAlpha = .5; ctx.fill(); ctx.globalAlpha = 1; }
  }
  // NOVA paneli: sıradaki 3 bloğun küçük önizlemesi
  if (S.next) { const nb = L.nova, sw = nb.w / 3; ctx.globalAlpha = .9;
    S.next.forEach((p, i) => { if (!p) return; const sh = SHAPES[p.s], cs = Math.min(cell * .17, nb.h * .34 / sh.h, sw * .8 / sh.w); drawPiece(p, nb.x + sw * (i + .5), nb.y + nb.h * .76, cs); });
    ctx.globalAlpha = 1; }
  // geri uçan parça
  if (fly) {
    const k = Math.min(1, (now - fly.t0) / 170), e = ease(k), to = fly.kind === 'tray' ? slotC(fly.idx) : center(L.hold), ts = fly.kind === 'tray' ? L.mini : L.hs;
    drawPiece(fly.piece, fly.x0 + (to.x - fly.x0) * e, fly.y0 + (to.y - fly.y0) * e, fly.s0 + (ts - fly.s0) * e);
    if (k >= 1) fly = null;
  }
  // parçacıklar
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  parts = parts.filter(p => now < p.t0 + p.life);
  for (const p of parts) {
    if (now < p.t0) continue;
    const k = (now - p.t0) / p.life;
    if (p.kind === 'mark') { // gücün vuracağı hücreler: nabız gibi atan renkli dolgu, parlak kenar, köşe parantezleri
      const pz = .55 + .45 * Math.sin((now - p.t0) / 70), cell = L.cell, a = k > .9 ? (1 - k) / .1 : Math.min(1, k * 6);
      ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round';
      for (const i of p.cells) { const x = L.bx + (i % N) * cell, y = L.by + (i / N | 0) * cell, m = cell * .06;
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col; ctx.globalAlpha = a * .32 * pz; path(ctx, x + m, y + m, cell - 2 * m, cell - 2 * m, cell * .22); ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.lineWidth = cell * .07; ctx.strokeStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = cell * .35 * pz; ctx.stroke();
        ctx.shadowBlur = 0; ctx.lineWidth = Math.max(1, cell * .025); ctx.strokeStyle = 'rgba(255,255,255,.85)'; path(ctx, x + m * 2.2, y + m * 2.2, cell - 4.4 * m, cell - 4.4 * m, cell * .18); ctx.stroke(); }
      ctx.restore(); continue;
    }
    if (p.kind === 'diamond') { // Joker elması: yükselir, döner gibi parlar, ışınlar ve ışıltılar saçar
      const im = iconImg(3), e = back(Math.min(1, k / .25)), z = L.cell * 1.9 * e, y = p.y - ease(Math.min(1, k / .5)) * L.cell * 1.2, a = k > .8 ? (1 - k) / .2 : 1;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, y);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.rotate(k * 2); for (let q = 0; q < 10; q++) { ctx.rotate(Math.PI / 5); const g = ctx.createLinearGradient(0, 0, 0, -L.cell * 2.2); g.addColorStop(0, 'rgba(180,230,255,.7)'); g.addColorStop(1, 'rgba(180,230,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-L.cell * .16, -L.cell * 2.2); ctx.lineTo(L.cell * .16, -L.cell * 2.2); ctx.closePath(); ctx.fill(); } ctx.restore();
      ctx.scale(Math.max(.15, Math.abs(Math.cos(k * 7))) * .3 + .7, 1); ctx.shadowColor = 'rgba(120,200,255,.9)'; ctx.shadowBlur = L.cell * .6;
      if (im.complete && im.naturalWidth) ctx.drawImage(im, -z / 2, -z / 2, z, z); ctx.restore();
      for (let q = 0; q < 3; q++) { const an = now / 300 + q * 2.1; spark4(p.x + Math.cos(an) * L.cell * 1.1, y + Math.sin(an) * L.cell * .9, L.cell * .14, '#FFFFFF'); }
      continue;
    }
    if (p.kind === 'rainbow') { // renk kombosu: çizgi boyunca kayan gökkuşağı şeridi
      const sw = ease(Math.min(1, k / .5)), a = k < .6 ? 1 : (1 - k) / .4, cols = ['#FF4D6D', '#FF9F1C', '#FFE14D', '#5EDB6B', '#3FB6FF', '#A97BFF'], th = L.cell * .9;
      ctx.save(); ctx.globalAlpha = a * .85; ctx.globalCompositeOperation = 'lighter';
      cols.forEach((c2, q) => { ctx.fillStyle = c2; const o = -th / 2 + q * th / cols.length;
        if (p.row) ctx.fillRect(L.bx, L.by + (p.i + .5) * L.cell + o, L.bs * sw, th / cols.length); else ctx.fillRect(L.bx + (p.i + .5) * L.cell + o, L.by, th / cols.length, L.bs * sw); });
      const hx = p.row ? L.bx + L.bs * sw : L.bx + (p.i + .5) * L.cell, hy = p.row ? L.by + (p.i + .5) * L.cell : L.by + L.bs * sw; spark4(hx, hy, L.cell * .45, '#FFFFFF');
      ctx.restore(); continue;
    }
    if (p.kind === 'link') { // zincir: bloktan bloğa akan titreşen elektrik bağı
      let sd = (p.seed + Math.floor(now / 50) * 71) % 233280; const rr = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280) - .5;
      const e = ease(Math.min(1, k / .35)), ex = p.x0 + (p.x1 - p.x0) * e, ey = p.y0 + (p.y1 - p.y0) * e;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha = k < .7 ? 1 : (1 - k) / .3;
      const pts = [[p.x0, p.y0]]; for (let q = 1; q < 6; q++) { const f = q / 6; pts.push([p.x0 + (ex - p.x0) * f + rr() * L.cell * .3, p.y0 + (ey - p.y0) * f + rr() * L.cell * .3]); } pts.push([ex, ey]);
      for (const [w2, c2] of [[L.cell * .36, p.col], [L.cell * .12, '#FFFFFF']]) { ctx.globalAlpha *= w2 > L.cell * .2 ? .45 : 1; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineWidth = w2; ctx.strokeStyle = c2; ctx.stroke(); }
      ctx.restore(); continue;
    }
    if (p.kind === 'zap') { // satır boyunca çatırdayan elektrik arkları
      const a = k < .75 ? 1 : (1 - k) / .25; ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      let sd = Math.floor(now / 45) * 977 + 13; const rr = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280) - .5;
      const vert = p.x != null;
      for (let arc = 0; arc < 3; arc++) { ctx.beginPath(); if (vert) ctx.moveTo(p.x + rr() * L.cell * .3, L.by); else ctx.moveTo(L.bx, p.y + rr() * L.cell * .3);
        for (let q = 1; q <= 16; q++) vert ? ctx.lineTo(p.x + rr() * L.cell * .7, L.by + L.bs * q / 16) : ctx.lineTo(L.bx + L.bs * q / 16, p.y + rr() * L.cell * .7);
        ctx.lineWidth = arc ? L.cell * .05 : L.cell * .1; ctx.strokeStyle = arc ? '#BDEBFF' : '#FFFFFF'; ctx.shadowColor = '#3FB6FF'; ctx.shadowBlur = L.cell * .4; ctx.stroke(); }
      for (let q = 0; q < 3; q++) vert ? spark4(p.x + rr() * L.cell * .6, L.by + (rr() + .5) * L.bs, L.cell * (.12 + .1 * (rr() + .5)), '#FFFFFF') : spark4(L.bx + (rr() + .5) * L.bs, p.y + rr() * L.cell * .6, L.cell * (.12 + .1 * (rr() + .5)), '#FFFFFF');
      ctx.restore(); continue;
    }
    if (p.kind === 'bomb') { // bomba: düşer, zıplar, fitili kıvılcım saçar, kırmızı yanıp söner, şişer
      const el = now - p.t0, im = iconImg(19), s0 = L.cell * 1.7, drop = el < 260 ? back(el / 260) : 1, pulse = el > 260 ? Math.sin((el - 260) / 1000 * Math.PI * 2 * (3 + (el - 260) / 90)) : 0;
      const sw = 1 + (el > 520 ? (el - 520) / 200 * .35 : 0) + pulse * .05, thr = p.sx != null && el < 260, tk = Math.min(1, el / 260);
      const bxp = thr ? p.sx + (p.x - p.sx) * tk : p.x, y = thr ? p.sy + (p.y - p.sy) * tk - Math.sin(tk * Math.PI) * L.cell * 2.6 : p.sx != null ? p.y - Math.abs(Math.sin((el - 260) / 90)) * L.cell * .25 * Math.max(0, 1 - (el - 260) / 260) : p.y - (1 - drop) * L.cell * 4;
      ctx.save(); ctx.translate(bxp, y); ctx.rotate(thr ? tk * 9 : Math.sin(el / 60) * .08); ctx.scale(sw, sw);
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      if (im.complete && im.naturalWidth) ctx.drawImage(im, -s0 / 2, -s0 / 2, s0, s0);
      if (el > 260 && pulse > .2) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (pulse - .2) * .8; ctx.beginPath(); ctx.arc(0, s0 * .08, s0 * .36, 0, 6.283); ctx.fillStyle = '#FF3B30'; ctx.fill(); }
      ctx.restore();
      if (el > 200) for (let q = 0; q < 2; q++) { const a = Math.random() * 6.283, d0 = Math.random() * L.cell * .35; spark4(bxp + s0 * .3 * sw + Math.cos(a) * d0, y - s0 * .42 * sw + Math.sin(a) * d0, L.cell * (.07 + Math.random() * .08), Math.random() < .5 ? '#FFE45C' : '#FF9F1C'); }
      continue;
    }
    if (p.kind === 'fire') { // alev topu: beyaz çekirdek, turuncu-kırmızı halka, genişleyip söner
      const e = ease(Math.min(1, k * 1.6)), R2 = p.R * (.3 + .9 * e); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k < .3 ? 1 : (1 - k) / .7;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R2); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.25, '#FFE45C'); g.addColorStop(.55, '#FF7A1A'); g.addColorStop(.85, 'rgba(220,40,20,.5)'); g.addColorStop(1, 'rgba(220,40,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, R2, 0, 6.283); ctx.fill(); ctx.restore(); continue;
    }
    if (p.kind === 'smoke') { // duman: dışa ve yukarı süzülür, büyür, solar
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; const r2 = p.r * (1 + k * 1.4);
      ctx.save(); ctx.globalAlpha = (1 - k) * .6; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r2); g.addColorStop(0, 'rgba(70,60,80,1)'); g.addColorStop(.5, 'rgba(110,100,120,.7)'); g.addColorStop(1, 'rgba(120,110,140,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r2, 0, 6.283); ctx.fill(); ctx.restore(); continue;
    }
    if (p.kind === 'arrow') { // ok: kenardan yay çizerek hedefe uçar, arkasında ışık izi bırakır
      const e = k * k, x = p.x0 + (p.x1 - p.x0) * e, y = p.y0 + (p.y1 - p.y0) * e - Math.sin(k * Math.PI) * L.cell * .8;
      const e2 = Math.max(0, k - .08) ** 2, px2 = p.x0 + (p.x1 - p.x0) * e2, py2 = p.y0 + (p.y1 - p.y0) * e2 - Math.sin(Math.max(0, k - .08) * Math.PI) * L.cell * .8, an = Math.atan2(y - py2, x - px2);
      ctx.save(); const tg = ctx.createLinearGradient(px2, py2, x, y); tg.addColorStop(0, 'rgba(255,255,255,0)'); tg.addColorStop(1, 'rgba(255,230,160,.9)');
      ctx.strokeStyle = tg; ctx.lineWidth = L.cell * .16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x0 + (p.x1 - p.x0) * Math.max(0, k - .35) ** 2, p.y0 + (p.y1 - p.y0) * Math.max(0, k - .35) ** 2); ctx.lineTo(x, y); ctx.stroke();
      ctx.translate(x, y); ctx.rotate(an); ctx.scale(1.5, 1.5); const Lr = L.cell * 1.1;
      ctx.fillStyle = '#7A4A1E'; ctx.fillRect(-Lr, -L.cell * .05, Lr * .9, L.cell * .1);
      ctx.fillStyle = '#E8E8F0'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-L.cell * .3, -L.cell * .16); ctx.lineTo(-L.cell * .3, L.cell * .16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FF4D4D'; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-Lr, 0); ctx.lineTo(-Lr - L.cell * .2, sg * L.cell * .2); ctx.lineTo(-Lr + L.cell * .25, sg * L.cell * .02); ctx.closePath(); ctx.fill(); }
      ctx.restore(); continue;
    }
    if (p.kind === 'bolt') { // HD şimşek: gökten iner, dallanır, 55 ms'de bir titreşir; mavi hale + camgöbeği gövde + beyaz çekirdek
      const reach = Math.min(1, k / .22), fl = k < .72 ? .78 + .22 * Math.sin(now / 23 + p.seed) : (1 - k) / .28;
      if (k < .16) { ctx.save(); ctx.globalAlpha = (.16 - k) / .16 * .32; ctx.fillStyle = '#D8EEFF'; ctx.fillRect(0, 0, L.W, L.H); ctx.restore(); } // gökyüzü çakması
      let sd = (p.seed + Math.floor(now / 55) * 131) % 233280; const rr = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280) - .5;
      const segs = 14, x0 = p.sx !== undefined && p.sx !== null ? p.sx : p.row ? p.x + rr() * L.bs * .25 : p.x, y0 = p.sy !== undefined && p.sy !== null ? p.sy : -L.cell, pts = [];
      for (let q = 0; q <= segs; q++) { const f = q / segs, amp = Math.sin(f * Math.PI) * L.cell * 1.1; pts.push([x0 + (p.x - x0) * f + (q && q < segs ? rr() * amp : 0), y0 + (p.y - y0) * f]); }
      const upto = Math.max(1, Math.round(segs * reach)), paths = [pts.slice(0, upto + 1)];
      for (let b = 0; b < 4; b++) { const at = 2 + Math.floor((rr() + .5) * (upto - 3)); if (at < 1 || at >= upto) continue; // dallar
        let [bx2, by2] = pts[at]; const dir = rr() < 0 ? -1 : 1, br = [[bx2, by2]];
        for (let q = 0; q < 4; q++) { bx2 += dir * L.cell * (.35 + (rr() + .5) * .5); by2 += L.cell * (.4 + (rr() + .5) * .4); br.push([bx2, by2]); } paths.push(br); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const stroke = (pp, w2, col, a2) => { ctx.globalAlpha = a2 * fl; ctx.beginPath(); ctx.moveTo(pp[0][0], pp[0][1]); for (let q = 1; q < pp.length; q++) ctx.lineTo(pp[q][0], pp[q][1]); ctx.lineWidth = w2; ctx.strokeStyle = col; ctx.stroke(); };
      paths.forEach((pp, n) => { const m = n ? .45 : 1;
        stroke(pp, L.cell * .95 * m, 'rgba(70,150,255,.22)', 1); stroke(pp, L.cell * .42 * m, '#5FC8FF', .75); stroke(pp, L.cell * .17 * m, '#CFF4FF', 1); stroke(pp, L.cell * .065 * m, '#FFFFFF', 1); });
      if (reach >= 1) { // çarpma noktası: beyaz çekirdekli patlama ve kıvılcımlar
        const ik = Math.min(1, (k - .22) / .35), R2 = L.cell * (.6 + 1.6 * ease(ik)); ctx.globalAlpha = (1 - ik) * fl;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R2); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.3, 'rgba(160,225,255,.9)'); g.addColorStop(1, 'rgba(60,150,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, R2, 0, 6.283); ctx.fill();
        for (let q = 0; q < 10; q++) { const an = q / 10 * 6.283 + rr(), d0 = L.cell * (.4 + ik * 1.6) * (.7 + rr() * .6); ctx.globalAlpha = (1 - ik); spark4(p.x + Math.cos(an) * d0, p.y + Math.sin(an) * d0 * .7, L.cell * .12 * (1 - ik * .6), '#FFFFFF'); }
      }
      ctx.restore(); continue;
    }
    if (p.kind === 'disco') { // gerçekçi disko topu: elden atılır, zincirle asılı gibi döner; tahtada renkli ışık lekeleri ve hüzmeler dolaşır
      const el = now - p.t0, drop = el < 400 ? back(el / 400) : 1, a = k > .82 ? (1 - k) / .18 : 1, tk = Math.min(1, el / 380), thr = p.sx != null, R2 = p.s / 2;
      const dx = thr ? p.sx + (p.x - p.sx) * ease(tk) : p.x, y = thr ? p.sy + (p.y - p.sy) * ease(tk) - Math.sin(tk * Math.PI) * L.cell * 2.2 : p.y - (1 - drop) * L.cell * 5;
      const rot = el / 420, on = el > 360 ? Math.min(1, (el - 360) / 200) : 0;
      if (on) { // tahtada dönen renkli ışık lekeleri + tavandan hüzmeler (sadece tahta içinde)
        ctx.save(); path(ctx, L.bx - 8, L.by - 8, L.bs + 16, L.bs + 16, L.cell * .34); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
        const RB = ['#FF4D6D', '#FF9F1C', '#FFE14D', '#5EDB6B', '#3FB6FF', '#A97BFF', '#FF4FD8', p.col[1]];
        for (let q = 0; q < 16; q++) { const an = q * 2.39996 + rot * (q % 2 ? 1.3 : -1), dist = L.cell * (1.2 + (q * 37 % 100) / 100 * 3.6), sx2 = dx + Math.cos(an) * dist, sy2 = y + Math.sin(an) * dist * .82, c2 = RB[q % RB.length];
          ctx.globalAlpha = a * on * .16; ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(dx, y); ctx.lineTo(sx2 - L.cell * .25, sy2); ctx.lineTo(sx2 + L.cell * .25, sy2); ctx.closePath(); ctx.fill();
          const g = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, L.cell * .62); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.22, c2); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = a * on * (.7 + .3 * Math.sin(now / 90 + q)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx2, sy2, L.cell * .62, L.cell * .44, an, 0, 6.283); ctx.fill(); }
        ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = a;
      if (!thr || tk >= 1) { ctx.strokeStyle = 'rgba(220,225,240,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(dx, y - R2); ctx.lineTo(dx, L.by - 10); ctx.stroke(); ctx.setLineDash([]); } // asılı zincir
      mirrorBall(dx, y, R2 * (1 + .04 * Math.sin(now / 130) * on), thr && tk < 1 ? tk * 12 : rot, now, p.col);
      ctx.restore(); continue;
    }
    if (p.kind === 'aim') { // HD nişangah: dönen kesikli halka, içe kapanan köşe parantezleri, nabız gibi atan merkez, kilitlenince beyaz çakma
      const e = ease(Math.min(1, k / .75)), z = p.s * (1.7 - .7 * e), lock = k > .78; ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = k > .9 ? (1 - k) / .1 : 1;
      ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(255,60,60,.8)'; ctx.shadowBlur = L.cell * .3;
      ctx.save(); ctx.rotate(now / 260); ctx.setLineDash([L.cell * .22, L.cell * .14]); ctx.lineWidth = L.cell * .07; ctx.strokeStyle = lock ? '#FFFFFF' : '#FF5A5A'; ctx.beginPath(); ctx.arc(0, 0, z * .55, 0, 6.283); ctx.stroke(); ctx.restore();
      const bq = z * (.42 - .12 * e), bl = z * .16; ctx.lineWidth = L.cell * .11; ctx.strokeStyle = lock ? '#FFFFFF' : '#FF3B3B';
      for (let q = 0; q < 4; q++) { ctx.save(); ctx.rotate(q * Math.PI / 2 + (1 - e) * .8); ctx.beginPath(); ctx.moveTo(-bq, -bq + bl); ctx.lineTo(-bq, -bq); ctx.lineTo(-bq + bl, -bq); ctx.stroke(); ctx.restore(); }
      ctx.lineWidth = L.cell * .05; ctx.strokeStyle = 'rgba(255,255,255,.9)'; for (let q = 0; q < 4; q++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, z * .12); ctx.lineTo(0, z * .3); ctx.stroke(); }
      const pr = L.cell * (.09 + .04 * Math.sin(now / 70)); ctx.beginPath(); ctx.arc(0, 0, pr, 0, 6.283); ctx.fillStyle = '#FF2D2D'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
      if (lock) { const lk = (k - .78) / .22; ctx.globalAlpha = 1 - lk; ctx.lineWidth = L.cell * .08; ctx.strokeStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, z * (.3 + lk * .5), 0, 6.283); ctx.stroke(); }
      ctx.restore(); continue;
    }
    if (p.kind === 'crack') { // çarpma çatlakları: noktadan dışa doğru keskin ışık çizgileri
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; const e = ease(Math.min(1, k * 1.5));
      for (let q = 0; q < 10; q++) { const an = q / 10 * 6.283 + (q % 2) * .2, r1 = L.cell * .3 * e, r2 = L.cell * (q % 2 ? 1.1 : 1.7) * e;
        ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(an) * r1, p.y + Math.sin(an) * r1); ctx.lineTo(p.x + Math.cos(an) * r2, p.y + Math.sin(an) * r2);
        ctx.lineWidth = L.cell * (q % 2 ? .05 : .09) * (1 - k * .5); ctx.strokeStyle = q % 2 ? '#FFD0D0' : '#FFFFFF'; ctx.stroke(); }
      ctx.restore(); continue;
    }
    if (p.kind === 'rays') { // genişleyen ışık hüzmeleri
      const rr = p.R * ease(k); ctx.save(); ctx.globalAlpha = (1 - k) * .7; ctx.translate(p.x, p.y); ctx.rotate(k * .6);
      for (let q = 0; q < 14; q++) { ctx.rotate(Math.PI / 7); const g = ctx.createLinearGradient(0, 0, 0, -rr); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-rr * .06, -rr); ctx.lineTo(rr * .06, -rr); ctx.closePath(); ctx.fill(); }
      ctx.restore(); continue;
    }
    if (p.kind === 'ring') { // genişleyen parlama halkası
      const rr = p.r + (p.R - p.r) * ease(k); ctx.globalAlpha = (1 - k) * .9; ctx.lineWidth = Math.max(2, L.cell * .14 * (1 - k));
      ctx.strokeStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.stroke(); continue;
    }
    if (p.kind === 'spark') { const tw = Math.sin(k * Math.PI); ctx.globalAlpha = tw; (p.s4 ? spark4 : star)(p.x, p.y, p.r * (.6 + .6 * tw), p.col); continue; }
    if (p.kind === 'glow') { // yumuşak ışık patlaması
      const rr = p.r * (.6 + .4 * ease(k)), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      g.addColorStop(0, p.col); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = (1 - k) * .75; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.fill(); continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'conf') { // oyuncu konfeti: şerit, yıldız, kare, yuvarlak; salınarak süzülür
      p.vy += 430 * dt; p.vx *= 1 - 1.4 * dt; p.vy *= 1 - (p.vy > 0 ? 2.2 : .9) * dt; if (p.vy > 115) p.vy = 115; p.rot += p.vr * dt; p.vr *= 1 - .4 * dt;
      const el2 = (now - p.t0) / 1000, fq = p.fq || (p.fq = 2.5 + Math.random() * 2.5), sway = Math.sin(el2 * fq + (p.ph || 0)) * L.cell * (.12 + .3 * Math.min(1, el2 * 1.5)), z = p.w || L.cell * .16; p.x += Math.cos(el2 * fq + (p.ph || 0)) * L.cell * .6 * dt; // yaprak gibi salınım
      ctx.globalAlpha = k > .8 ? (1 - k) / .2 : 1; ctx.save(); ctx.translate(p.x + sway, p.y); ctx.rotate(p.rot);
      const flip = Math.cos(el2 * 6 + (p.ph || 0)), back2 = CONF_BACK[p.col] || (CONF_BACK[p.col] = shade(p.col, .68)), fc = flip > 0 ? p.col : back2;
      ctx.fillStyle = fc; ctx.strokeStyle = fc; ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1.5;
      if (p.shape === 'ribbon') { // kıvrımlı serpantin
        ctx.lineWidth = Math.max(3, (p.h || 4) * 1.25); ctx.lineCap = 'round'; ctx.beginPath();
        for (let q = 0; q <= 10; q++) { const u = q / 10, xx = (u - .5) * z * 3, yy = Math.sin(u * 7 + el2 * 8 + (p.ph || 0)) * z * .32; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke(); ctx.globalAlpha *= .45; ctx.strokeStyle = '#fff'; ctx.lineWidth *= .35; ctx.stroke();
      } else if (p.shape === 'star') { ctx.scale(1, Math.abs(flip) * .6 + .4); star(0, 0, z * .78, p.col); }
      else if (p.shape === 'circle') { ctx.scale(Math.abs(flip) * .6 + .4, 1); ctx.beginPath(); ctx.arc(0, 0, z * .32, 0, 6.283); ctx.fill(); }
      else { ctx.scale(Math.abs(Math.cos(el2 * 4.3 + (p.ph || 0))) * .55 + .45, Math.abs(flip) * .8 + .2); ctx.fillRect(-z / 2, -(p.h || 4) / 2, z, p.h || 4); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-z / 2, -(p.h || 4) / 2, z, (p.h || 4) * .35); }
      ctx.restore(); continue;
    }
    if (p.kind === 'iconfly') { // toplanan ikon yay çizerek skora uçar
      const e = ease(k), x = p.x0 + (p.x1 - p.x0) * e, y = p.y0 + (p.y1 - p.y0) * e - Math.sin(k * Math.PI) * L.cell * 1.3;
      ctx.globalAlpha = k > .8 ? (1 - k) / .2 : 1; iconBadge(x, y, L.cell * (1 - .45 * k), p.c, p.n, true); continue;
    }
    if (p.kind === 'gift') { // hediye paketi: düşer, sallanır, kapak fırlar, ışık ve konfeti, Joker rozeti
      const el = now - p.t0, s2 = p.s, a = p.life - el < 400 ? Math.max(0, (p.life - el) / 400) : 1;
      const drop = el < 500 ? back(el / 500) : 1, hopK = el > 500 && el < 1050 ? (el - 500) / 550 : 0, hop = hopK ? Math.abs(Math.sin(hopK * Math.PI * 2)) * L.cell * .55 : 0;
      const gy = p.y - (1 - drop) * L.cell * 4 - hop, shake = hopK ? Math.sin(el / 26) * .14 * (1 - hopK) : 0, sq = hopK ? 1 + .09 * Math.cos(hopK * Math.PI * 4) : 1;
      if (el >= 1050 && !p.burst) { p.burst = true; glow(p.x, p.y - s2 * .1, s2 * 1.1, '#FFE08A', 700); for (let q = 0; q < 12; q++) { const an = q / 12 * 6.283; parts.push({ kind: 'spark', s4: true, x: p.x + Math.cos(an) * s2 * .7, y: p.y - s2 * .1 + Math.sin(an) * s2 * .6, r: L.cell * (.15 + (q % 3) * .06), col: q % 2 ? '#FFFFFF' : '#FFE27A', t0: now + q * 35, life: 520 }); } confetti(p.x, p.y - s2 * .15, 34, 280);
        float('✦ ' + t('joker'), p.x, p.y - s2 * .75, L.cell * .56, C.accent, 0, 'badge'); float(t('surprise'), p.x, p.y + s2 * .8, L.cell * .48, '#FFD27A', 160, 'gold');
        samp('levelwin', .8) || sfx.clean();
        for (let q = 0; q < 18; q++) { const an = -Math.PI / 2 + (Math.random() - .5) * 2.2, v = 380 + Math.random() * 320; // paralar ve yıldızlar fışkırır
          parts.push({ kind: 'coin', n: q % 3 ? 11 : 2, x: p.x, y: p.y - s2 * .1, vx: Math.cos(an) * v, vy: Math.sin(an) * v, s: L.cell * (.5 + Math.random() * .25), ph: Math.random() * 6, t0: now + q * 25, life: 1300 }); } }
      ctx.save(); ctx.globalAlpha = a * .45; ctx.fillStyle = '#0B0620'; path(ctx, L.bx - 8, L.by - 8, L.bs + 16, L.bs + 16, L.cell * .34); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = a;
      if (p.burst) { // açılınca arkada dönen ışık
        const el2 = el - 1050; ctx.save(); ctx.globalAlpha = a * Math.min(1, el2 / 200) * .5; ctx.translate(p.x, gy - s2 * .05); ctx.rotate(el2 / 1500);
        for (let r = 0; r < 10; r++) { ctx.rotate(Math.PI / 5); const g = ctx.createLinearGradient(0, 0, 0, -s2 * .95); g.addColorStop(0, 'rgba(255,230,140,.9)'); g.addColorStop(1, 'rgba(255,230,140,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s2 * .1, -s2 * .95); ctx.lineTo(s2 * .1, -s2 * .95); ctx.closePath(); ctx.fill(); }
        ctx.restore(); }
      ctx.translate(p.x, gy + s2 * .43); ctx.rotate(shake); ctx.scale(1 / sq, sq); ctx.translate(-p.x, -(gy + s2 * .43));
      if (GIFT_B.complete && GIFT_B.naturalWidth) ctx.drawImage(GIFT_B, p.x - s2 / 2, gy - s2 / 2, s2, s2);
      if (GIFT_L.complete && GIFT_L.naturalWidth) {
        const el3 = Math.max(0, el - 1050), up = p.burst ? Math.min(1, el3 / 600) : 0, la = p.burst ? Math.max(0, 1 - el3 / 900) : 1;
        ctx.save(); ctx.globalAlpha = a * la; ctx.translate(p.x + up * s2 * .55, gy - up * s2 * 1.1); ctx.rotate(up * .9); ctx.drawImage(GIFT_L, -s2 / 2, -s2 / 2, s2, s2); ctx.restore();
      }
      ctx.restore(); continue;
    }
    if (p.kind === 'trophy') { // kupa: zıplayarak gelir, arkasında dönen ışık hüzmeleri, altında altın yazı
      const el = now - p.t0, pop = el < 450 ? back(el / 450) : 1, a = el < 150 ? el / 150 : p.life - el < 450 ? Math.max(0, (p.life - el) / 450) : 1;
      const s2 = p.s * pop, y2 = p.y + Math.sin(el / 380) * L.cell * .06;
      ctx.save(); ctx.globalAlpha = a * .45; ctx.fillStyle = '#0B0620'; path(ctx, L.bx - 8, L.by - 8, L.bs + 16, L.bs + 16, L.cell * .34); ctx.fill(); ctx.restore();

      ctx.save(); ctx.globalAlpha = a * .55; ctx.translate(p.x, y2); ctx.rotate(el / 1400);
      for (let r = 0; r < 12; r++) { ctx.rotate(Math.PI / 6); const g = ctx.createLinearGradient(0, 0, 0, -s2 * 1.1); g.addColorStop(0, 'rgba(255,226,120,.9)'); g.addColorStop(1, 'rgba(255,226,120,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s2 * .12, -s2 * 1.1); ctx.lineTo(s2 * .12, -s2 * 1.1); ctx.closePath(); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = a;
      // ışıltılar etrafında yanıp söner
      for (let q = 0; q < 6; q++) { const an = q * 1.047 + el / 900, tw = .5 + .5 * Math.sin(el / 160 + q * 2);
        spark4(p.x + Math.cos(an) * s2 * .62, y2 + Math.sin(an) * s2 * .55, L.cell * .16 * tw + 2, '#FFF6CF'); }
      // kupa sağa sola hafifçe sallanır; üzerinden parlak ışık geçer
      if (TROPHY.complete && TROPHY.naturalWidth) {
        ctx.save(); ctx.translate(p.x, y2 + s2 * .4); ctx.rotate(Math.sin(el / 260) * .08 * (el < 1600 ? 1 : .5)); ctx.translate(-p.x, -(y2 + s2 * .4));
        ctx.drawImage(TROPHY, p.x - s2 / 2, y2 - s2 / 2, s2, s2);
        const sw = ((el % 1300) / 1300) * s2 * 1.6 - s2 * .8;
        ctx.globalCompositeOperation = 'source-atop'; ctx.beginPath(); ctx.rect(p.x - s2 / 2, y2 - s2 / 2, s2, s2); ctx.clip();
        const lg = ctx.createLinearGradient(p.x + sw - s2 * .15, 0, p.x + sw + s2 * .15, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * .5; ctx.fillStyle = lg; ctx.fillRect(p.x - s2 / 2, y2 - s2 / 2, s2, s2 * .8);
        ctx.restore(); ctx.globalAlpha = a;
      }
      const fs = L.cell * .78 * pop; ctx.font = `900 ${fs}px ${C.ff}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const ty = y2 + s2 * .62, tg = ctx.createLinearGradient(0, ty - fs / 2, 0, ty + fs / 2); tg.addColorStop(0, '#FFF4C2'); tg.addColorStop(.5, '#FFD24A'); tg.addColorStop(1, '#E08A00');
      ctx.lineJoin = 'round'; ctx.lineWidth = fs * .16; ctx.strokeStyle = '#5A2400'; ctx.strokeText(p.txt, p.x, ty); ctx.fillStyle = tg; ctx.fillText(p.txt, p.x, ty); continue;
    }
    if (p.kind === 'coin') { // dönerek uçan para/yıldız
      p.vy += 1100 * dt; const im = iconImg(p.n), el = (now - p.t0) / 1000, z = p.s; ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1;
      if (im.complete && im.naturalWidth) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(Math.max(.1, Math.abs(Math.cos(el * 9 + p.ph))), 1);
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2; ctx.drawImage(im, -z / 2, -z / 2, z, z); ctx.restore(); }
      continue;
    }
    if (p.kind === 'cube') { // dönerek küçülen parlak mini küp
      p.vy += 900 * dt; p.rot += p.vr * dt; if (!p.bn && p.vy > 0 && p.y > L.by + L.bs + 4) { p.vy *= -.42; p.vx *= .7; p.vr *= -.6; p.bn = 1; } const z = p.s * (1 - k * .55); // tahtanın altına çarpınca seker ctx.globalAlpha = k > .65 ? (1 - k) / .35 : 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      const g = ctx.createLinearGradient(0, -z / 2, 0, z / 2); g.addColorStop(0, p.l); g.addColorStop(1, p.d);
      path(ctx, -z / 2, -z / 2, z, z, z * .28); ctx.fillStyle = g; ctx.fill();
      path(ctx, -z * .32, -z * .38, z * .64, z * .22, z * .1); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill(); ctx.restore(); continue;
    }
    if (p.kind === 'shard') { // kırılan blok parçası: dönen üçgen, parlak kenarlı
      p.vy += 900 * dt; p.rot += p.vr * dt; ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(p.s * .9, p.s * .6); ctx.lineTo(-p.s * .8, p.s * .5); ctx.closePath();
      ctx.fillStyle = p.col; ctx.fill(); ctx.lineWidth = Math.max(1, p.s * .12); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke(); ctx.restore(); continue;
    }
    p.vy += 900 * dt; ctx.globalAlpha = 1 - k; ctx.fillStyle = p.col;
    path(ctx, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2, p.r * .5); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // sürüklenen parça
  if (drag) {
    const g = geom(now);
    if (drag.kind === 'nova') { ctx.globalAlpha = .25; path(ctx, g.cx - g.s * 1.5, g.cy - g.s * 1.5, g.s * 3, g.s * 3, g.s * .3); ctx.fillStyle = C.accent; ctx.fill(); ctx.globalAlpha = 1; star(g.cx, g.cy, g.s * .7, C.accent); }
    else { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8; drawPiece(drag.piece, g.cx, g.cy, g.s * (drag.overHold ? .6 : 1)); ctx.restore(); }
  }
  // uçan yazılar
  floats = floats.filter(f => now < f.t0 + f.life);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const f of floats) {
    const el = now - f.t0, k = el / f.life; if (k < 0) continue;
    // sakin görünüm: zıplama ve kalın kontur yok; yumuşak belirme, kısa yükselme, yumuşak kaybolma
    const s = f.pill === 'gold3d' ? f.size * (k < .16 ? .3 + .7 * back(k / .16) : 1 + .04 * Math.sin(el / 90)) : f.pill === 'badge' || f.pill === 'gold' || f.pill === 'metal' ? f.size * (k < .14 ? .4 + .6 * back(k / .14) : 1) : f.size * (k < .18 ? .85 + .15 * ease(k / .18) : 1);
    ctx.globalAlpha = el < 120 ? el / 120 : f.life - el < 350 ? Math.max(0, (f.life - el) / 350) : 1; // sabit süreli belirme/kaybolma
    const big = f.pill === 'gold3d' || f.pill === 'badge' || f.pill === 'gold' || f.pill === 'metal'; ctx.font = `${big ? 900 : 800} ${s}px ${C.ff}`;
    const w = ctx.measureText(f.txt).width, padX = f.pill === 'gold3d' ? s * .1 : big ? s * .85 : f.pill ? s * .6 : 0, half = w / 2 + padX + 4;
    // yazı tahtanın dışına taşmasın
    const x = Math.min(Math.max(f.x, L.bx + half), L.bx + L.bs - half), y = f.y - ease(k) * 28;
    if (f.pill === 'metal') { // güç adı: koyu bronz metal levha, perçinler, parlak kenar, krem-altın harfler
      const h = s * 1.8, x0 = x - w / 2 - padX, bw = w + padX * 2, y0 = y - h / 2, r = h * .22;
      const mg = ctx.createLinearGradient(0, y0, 0, y0 + h); mg.addColorStop(0, '#7A6248'); mg.addColorStop(.48, '#3E3024'); mg.addColorStop(.52, '#2C2119'); mg.addColorStop(1, '#4A3A2B');
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = s * .7; ctx.shadowOffsetY = s * .15; path(ctx, x0, y0, bw, h, r); ctx.fillStyle = mg; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      const eg = ctx.createLinearGradient(0, y0, 0, y0 + h); eg.addColorStop(0, '#FFE2A8'); eg.addColorStop(.5, '#C08A45'); eg.addColorStop(1, '#7A4E20');
      ctx.lineWidth = Math.max(2.5, s * .13); ctx.strokeStyle = eg; ctx.stroke();
      path(ctx, x0 + s * .16, y0 + s * .16, bw - s * .32, h - s * .32, r * .7); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,230,180,.35)'; ctx.stroke();
      for (const [rx, ry] of [[x0 + s * .32, y0 + s * .32], [x0 + bw - s * .32, y0 + s * .32], [x0 + s * .32, y0 + h - s * .32], [x0 + bw - s * .32, y0 + h - s * .32]]) {
        const rg = ctx.createRadialGradient(rx - 1, ry - 1, 0, rx, ry, s * .11); rg.addColorStop(0, '#FFF3D0'); rg.addColorStop(1, '#8A6030'); ctx.beginPath(); ctx.arc(rx, ry, s * .1, 0, 6.283); ctx.fillStyle = rg; ctx.fill(); }
      if (el > 120 && el < 800) { ctx.save(); path(ctx, x0, y0, bw, h, r); ctx.clip(); const sx = x0 - h + (bw + h * 2) * ((el - 120) / 680), lg = ctx.createLinearGradient(sx - h * .5, 0, sx + h * .5, 0);
        lg.addColorStop(0, 'rgba(255,240,200,0)'); lg.addColorStop(.5, 'rgba(255,240,200,.45)'); lg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = lg; ctx.fillRect(x0, y0, bw, h); ctx.restore(); }
      const tg = ctx.createLinearGradient(0, y - s / 2, 0, y + s / 2); tg.addColorStop(0, '#FFFBEA'); tg.addColorStop(.5, '#FFE1A0'); tg.addColorStop(1, '#E9A646');
      ctx.lineJoin = 'round'; ctx.lineWidth = s * .2; ctx.strokeStyle = '#1E140C'; ctx.strokeText(f.txt, x, y + s * .05); ctx.fillStyle = tg; ctx.fillText(f.txt, x, y + s * .05);
    } else if (f.pill === 'gold3d') { // büyük altın 3D puan: alt katman gölgesi, kalın koyu kontur, altın degrade, parıltı
      ctx.lineJoin = 'round';
      for (let q = 4; q >= 1; q--) { ctx.fillStyle = '#7A3E00'; ctx.fillText(f.txt, x, y + q * s * .025); }
      ctx.shadowColor = 'rgba(255,190,60,.8)'; ctx.shadowBlur = s * .5; ctx.lineWidth = s * .2; ctx.strokeStyle = '#3A1A00'; ctx.strokeText(f.txt, x, y); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      const tg = ctx.createLinearGradient(0, y - s / 2, 0, y + s / 2); tg.addColorStop(0, '#FFFDE8'); tg.addColorStop(.35, '#FFE16A'); tg.addColorStop(.7, '#FFB21E'); tg.addColorStop(1, '#E07B00');
      ctx.fillStyle = tg; ctx.fillText(f.txt, x, y); spark4(x + w * .42, y - s * .38, s * .22 * (1 + .4 * Math.sin(el / 80)), '#FFFFFF');
    } else if (f.pill === 'badge' || f.pill === 'gold') { // modern rozet: canlı degrade hap, cam parlaklığı, beyaz iç + altın dış kenar, kayan ışık, uçlarda ışıltı
      const gold = f.pill === 'gold', h = s * 1.75, x0 = x - w / 2 - padX, bw = w + padX * 2, y0 = y - h / 2, bg = ctx.createLinearGradient(0, y0, 0, y0 + h);
      if (gold) { bg.addColorStop(0, '#FFF1A8'); bg.addColorStop(.5, '#FFC23C'); bg.addColorStop(1, '#F08A00'); } else { bg.addColorStop(0, '#9B5CFF'); bg.addColorStop(.55, '#6A3BE0'); bg.addColorStop(1, '#C2328A'); }
      ctx.shadowColor = gold ? 'rgba(240,140,0,.55)' : 'rgba(150,70,255,.6)'; ctx.shadowBlur = s * .9; ctx.shadowOffsetY = s * .1;
      path(ctx, x0, y0, bw, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.lineWidth = Math.max(2.5, s * .14); ctx.strokeStyle = gold ? '#8A4A00' : '#FFD24A'; ctx.stroke();
      path(ctx, x0 + s * .14, y0 + s * .14, bw - s * .28, h - s * .28, (h - s * .28) / 2); ctx.lineWidth = Math.max(1, s * .05); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke();
      path(ctx, x0 + h * .28, y0 + h * .12, bw - h * .56, h * .3, h * .15); ctx.fillStyle = 'rgba(255,255,255,.32)'; ctx.fill();
      if (el > 150 && el < 900) { ctx.save(); path(ctx, x0, y0, bw, h, h / 2); ctx.clip(); const sx = x0 - h + (bw + h * 2) * ((el - 150) / 750);
        const lg = ctx.createLinearGradient(sx - h * .6, 0, sx + h * .6, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, 'rgba(255,255,255,.7)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg; ctx.fillRect(x0, y0, bw, h); ctx.restore(); }
      for (const sx of [x0 + h * .1, x0 + bw - h * .1]) spark4(sx, y0 + h * .1, s * .2 * (1 + .35 * Math.sin(now / 110 + sx)), '#FFFFFF');
      if (gold) { ctx.lineWidth = s * .16; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(f.txt, x, y + s * .05); ctx.fillStyle = '#4A1A00'; ctx.fillText(f.txt, x, y + s * .05); }
      else { const tg = ctx.createLinearGradient(0, y - s / 2, 0, y + s / 2); tg.addColorStop(0, '#FFFFFF'); tg.addColorStop(.45, '#FFF0A8'); tg.addColorStop(1, '#FFC02E');
        ctx.lineJoin = 'round'; ctx.lineWidth = s * .22; ctx.strokeStyle = '#2A0E4A'; ctx.strokeText(f.txt, x, y + s * .05); ctx.fillStyle = tg; ctx.fillText(f.txt, x, y + s * .05); }
    } else if (f.pill) {
      const h = s * 1.55; path(ctx, x - w / 2 - padX, y - h / 2, w + padX * 2, h, h / 2);
      ctx.fillStyle = 'rgba(18,10,38,.62)'; ctx.fill();
      ctx.fillStyle = f.col; ctx.fillText(f.txt, x, y + s * .04);
    } else {
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = s * .35; ctx.shadowOffsetY = s * .06;
      ctx.fillStyle = f.col; ctx.fillText(f.txt, x, y);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
  }
  ctx.globalAlpha = 1;
}
// seri büyüdükçe süre kısalır (9 sn → en az 4,5 sn); duraklatma/arka planda süre durur
const HEAT_MS = st => Math.max(4500, 9000 - st * 350);
let heat = { end: 0, total: 1, last: 0 };
const heatOn = () => S && !S.over && S.streak >= 2 && heat.end > 0;
function heatStart() { const ms = HEAT_MS(S.streak); heat = { end: performance.now() + ms, total: ms, last: performance.now() }; }
function heatTick(now) {
  const el = $('heat'); if (!el) return;
  if (!heatOn()) { if (el.classList.contains('on')) el.classList.remove('on'); return; }
  if (view !== 'game' || document.hidden) { heat.end += now - heat.last; heat.last = now; return; } // duraklatmada süre durur
  heat.last = now; const left = Math.max(0, heat.end - now), k = left / heat.total;
  el.classList.add('on'); el.classList.toggle('hot', S.streak >= 6); el.firstChild.style.width = (k * 100).toFixed(1) + '%'; el.classList.toggle('low', k < .3);
  if (left <= 0) { S.streak = 0; heat.end = 0; const st = $('streak'); st.textContent = ''; st.classList.remove('on'); el.classList.remove('on'); save(); } // süre doldu: seri biter
}
setInterval(() => { if (heatOn()) bump(300); }, 250);
let hitStopUntil = 0;
const hitStop = ms => { hitStopUntil = Math.max(hitStopUntil, performance.now() + ms); };
function frame(now) {
  raf = 0; if (!S || !L) return;
  if (now < hitStopUntil) { raf = requestAnimationFrame(frame); return; } // vuruş anı: görüntü bir an donar
  heatTick(now);
  if (shown !== S.score) { shown += (S.score - shown) * .22; if (Math.abs(S.score - shown) < 1) shown = S.score; $('score').textContent = fmt(Math.round(shown)); }
  draw(now);
  if (now < animUntil || heatOn() || (S.streak >= 3 && !S.over) || (S.pk && !S.over) || (!S.over && symGroups().some(g => g.length === 2)) || drag || fly || shown !== S.score || S.nova >= NOVA_MAX || stuck() || (S.pu >= 0 && !S.over)) raf = requestAnimationFrame(frame);
}
function bump(ms = 700) { animUntil = Math.max(animUntil, performance.now() + ms); if (!raf) raf = requestAnimationFrame(frame); }

/* ---------- hamleler ---------- */
function kill(i, t0) {
  const c = S.grid[i]; if (!c) return;
  dying.push({ i, c, g: S.gem[i], t0 }); S.grid[i] = 0; S.gem[i] = 0;
  const x = L.bx + (i % N + .5) * L.cell, y = L.by + ((i / N | 0) + .5) * L.cell;
  for (let k = 0; k < 5; k++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 220; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 160, r: L.cell * (.06 + Math.random() * .08), col: PALETTE[c - 1][k % 2], t0, life: 500 + Math.random() * 300 }); }
}
// ekranda kalma süresi: puanlar kısa, yazılar okunacak kadar uzun, kupa en uzun
let floatNow = false; // güç başlığı/açıklaması ertelenmez, efektle birlikte görünür
function float(txt, x, y, size, col, delay = 0, pill = false) {
  if (!/^\+\d+$/.test(txt) && !floatNow) { const now = performance.now(); if (now + delay < charUntil) delay = charUntil - now; } // Zia/güç kartı ortadayken yazı üstüne binmez
  const life = /🏆/u.test(txt) ? 3200 : /^\+\d+$/.test(txt) ? 1000 : Math.min(2800, 1500 + txt.length * 60);
  floats.push({ txt, x, y, size, col, pill, life, t0: performance.now() + delay }); bump(delay + life + 100);
}
function hud() {
  document.querySelector('.best span').innerHTML = S.mode === 'adv' ? '' : CROWN(26);
  if (S.mode === 'adv') { const g = S.goal; $('best').textContent = g.type === 'star' ? `★ ${Math.min(g.have, g.need)}/${g.need}` : `◎ ${fmt(g.need)}`; }
  else $('best').textContent = fmt(Math.max(S.prev, S.score));
}
function afterMove() {
  if (S.tray.every(p => !p)) {
    // NOVA panelinde gösterilen sıradaki bloklar gelir (hiçbiri sığmıyorsa yenileri üretilir)
    S.tray = S.next && S.next.every(Boolean) && solvable(S.grid, S.next.map(p => SHAPES[p.s])) ? S.next : genTray();
    S.next = genTray(); trayT = performance.now() + 120;
  }
  if (!S.next) S.next = genTray();
  // güç-up yıldızı: ara sıra boş bir hücrede belirir, 8 hamle sonra kaybolur
  if (S.pu >= 0) { if (S.grid[S.pu] || --S.puLeft <= 0) S.pu = -1; }
  else if (!S.over && Math.random() < .12) {
    const e = []; for (let i = 0; i < 64; i++) if (!S.grid[i]) e.push(i);
    if (e.length > 8) { S.pu = e[Math.random() * e.length | 0]; S.puLeft = 8; bump(400); if (!stats.seenPU) { stats.seenPU = 1; LS.set('stats', stats); setTimeout(() => (!$('toast').classList.contains('show') && toast(t('puTip'), 5000)), 600); } }
  }
  spawnPower();
  hud();
  { const fill = S.grid.filter(Boolean).length / 64, dg = $('danger'); if (dg) dg.classList.toggle('on', !S.over && fill >= .75); // tahta dolunca kenarlarda kırmızı kalp atışı
    const bb = document.querySelector('.best'); if (bb) bb.classList.toggle('near', S.mode !== 'adv' && S.prev > 0 && S.score >= S.prev * .9 && S.score <= S.prev); }
  // "sığmıyor" / Joker ipucu, sorun çözülünce hemen kaybolur
  const te = $('toast');
  if (te.classList.contains('show') && (te.textContent === t('stuck') || te.textContent === t('jokerHint')) && !stuck()) { te.classList.remove('show'); clearTimeout(toastT); }
  const st = $('streak'); st.textContent = S.streak >= 2 ? `🔥 ${t('streak')} x${S.streak}` : ''; st.classList.toggle('on', S.streak >= 2);
  // oyun içi rekor kutlaması
  if (S.mode !== 'adv' && S.prev > 0 && !S.cheered && S.score > S.prev) {
    S.cheered = true; celebrate(() => { shower(34); zia('cool', t('zRec'), 2400, true); say(t('newBest'), T.en.newBest); float(t('newBest'), L.bx + L.bs / 2, L.by + L.bs * .56, L.cell * .8, C.accent, 450); setTimeout(() => samp('record', .9) || sfx.clean(), 400); buzz(30); }, 2300);
  }
  // macera: hedefe ulaşıldı mı?
  const g = S.goal;
  if (g && !S.won && (g.type === 'star' ? g.have >= g.need : S.score >= g.need)) {
    S.won = true; S.over = true; stats.adv = Math.max(stats.adv, S.level + 1);
    float(t('win'), L.bx + L.bs / 2, L.by + L.bs * .45, L.cell * .85, C.accent, 300); setTimeout(() => samp('levelwin', .9) || sfx.clean(), 300); buzz(60);
    setTimeout(() => { if (S.won) { view = 'win'; render(); } }, 1300); save(); bump(1500); return;
  }
  if (!hasMove()) { S.over = true; sfx.over(); buzz(60); setTimeout(() => zia('smirk', t('zOver'), 2600, true), 250); if (stats.games >= 3) setTimeout(() => Notif.ask(), 1500); setTimeout(() => { if (S.over) { view = 'over'; render(); } }, 1000); }
  else if (stuck()) { toast(t('stuck'), 8000); zia('think', t('zHold'), 2600); }
  else if (S.joker && !S.tray.some(p => p && anyFit(S.grid, SHAPES[p.s])) && !(S.hold && anyFit(S.grid, SHAPES[S.hold.s]))) toast(t('jokerHint'), 8000);
  save(); bump(1200);
}
function place(kind, idx, piece, r, c) {
  const sh = SHAPES[piece.s], now = performance.now(), cell = L.cell;
  sh.cells.forEach(([y, x], k) => { const i = (r + y) * N + c + x; S.grid[i] = piece.c; S.gem[i] = k === piece.g ? 1 : 0; placeT[i] = now; });
  sh.cells.forEach(([y, x]) => { if (sh.cells.some(([y2, x2]) => y2 === y + 1 && x2 === x)) return; // parçanın alt kenarından toz kalkar
    for (let q = 0; q < 2; q++) parts.push({ kind: 'spark', s4: true, x: L.bx + (c + x + .2 + q * .6) * L.cell, y: L.by + (r + y + 1) * L.cell - 3, r: L.cell * .07, col: 'rgba(255,255,255,.9)', t0: now + 80, life: 260 }); });
  if (kind === 'tray') S.tray[idx] = null; else S.hold = null;
  const pkHit = S.pk && sh.cells.some(([y, x]) => (r + y) * N + c + x === S.pk.i) ? S.pk : null; if (pkHit) { S.pk = null; S.pkCd = 4; }
  let gain = sh.n; S.lastC = piece.c; const fill0 = (S.grid.filter(Boolean).length - sh.n) / 64; // hamleden önceki doluluk
  // güç-up yıldızı: üstüne blok konunca toplanır → Nova +2, +50 puan
  if (S.pu >= 0 && sh.cells.some(([y, x]) => (r + y) * N + c + x === S.pu)) {
    const sx = L.bx + (S.pu % N + .5) * cell, sy = L.by + ((S.pu / N | 0) + .5) * cell;
    S.pu = -1; S.nova = Math.min(NOVA_MAX, S.nova + 2); gain += 50;
    float('⭐ ' + t('power') + ' +50', sx, sy - cell * .6, cell * .44, '#FFD27A', 0, true);
    glow(sx, sy, cell * 1.5, '#FFE08A', 520, now); confetti(sx, sy, 12, 200);
    samp('streak', .7) || sfx.coin(2); buzz(25);
  }
  const { rows, cols } = fullLines(S.grid), n = rows.length + cols.length;
  const px = L.bx + (c + sh.w / 2) * cell, py = L.by + (r + sh.h / 2) * cell;
  if (n) {
    const set = new Set(); rows.forEach(i => { for (let j = 0; j < N; j++) set.add(i * N + j); }); cols.forEach(i => { for (let j = 0; j < N; j++) set.add(j * N + i); });
    let gems = 0;
    // renk kombosu: tamamen tek renk çizgiler
    const monoR = rows.filter(rw => { const c0 = S.grid[rw * N]; for (let j = 1; j < N; j++) if (S.grid[rw * N + j] !== c0) return false; return true; });
    const monoC = cols.filter(cl => { const c0 = S.grid[cl]; for (let j = 1; j < N; j++) if (S.grid[j * N + cl] !== c0) return false; return true; });
    const mono = monoR.length + monoC.length, monoCol = mono ? S.grid[monoR.length ? monoR[0] * N : monoC[0]] : 0;
    let emoPts = 0; const emoCells = [];
    for (const i of set) if (S.gem[i]) { const v = emoVal(); emoPts += v; emoCells.push([i, v, S.grid[i]]); }
    const icn = iconNo(); if (icn) emoCells.slice(0, 6).forEach(([i, , cc], q) => parts.push({ kind: 'iconfly', vx: 0, vy: 0, x0: L.bx + (i % N + .5) * cell, y0: L.by + ((i / N | 0) + .5) * cell, x1: L.bx + L.bs / 2, y1: L.by - cell * .9, n: icn, c: cc, t0: now + 80 + q * 70, life: 750 }));
    for (const i of set) { gems += S.gem[i]; const t1 = now + 60 + Math.hypot((i % N) - (c + sh.w / 2 - .5), (i / N | 0) - (r + sh.h / 2 - .5)) * 28; if (S.grid[i]) { const gx = L.bx + (i % N + .5) * cell, gy = L.by + ((i / N | 0) + .5) * cell; shards(i, S.grid[i], t1, n >= 2 ? 8 : 6, true); glow(gx, gy, cell * .95, '#FFFFFF', 340, t1); glow(gx, gy, cell * .7, PALETTE[S.grid[i] - 1][1], 420, t1 + 40);
      parts.push({ kind: 'ring', x: gx, y: gy, r: cell * .15, R: cell * .75, col: '#FFFFFF', t0: t1, life: 300 }); parts.push({ kind: 'spark', s4: true, x: gx, y: gy, r: cell * .34, col: '#FFFFFF', t0: t1 + 30, life: 280 }); } kill(i, t1); }
    // patlayan çizgi boyunca sırayla yanan ışıltılar
    rows.forEach(rw => { for (let j = 0; j < N; j++) parts.push({ kind: 'spark', s4: true, x: L.bx + (j + .5) * cell, y: L.by + (rw + .5) * cell, r: cell * .16, col: '#FFFFFF', t0: now + 60 + j * 22, life: 420 }); });
    cols.forEach(cl => { for (let j = 0; j < N; j++) parts.push({ kind: 'spark', s4: true, x: L.bx + (cl + .5) * cell, y: L.by + (j + .5) * cell, r: cell * .16, col: '#FFFFFF', t0: now + 60 + j * 22, life: 420 }); });
    rows.forEach(i => beams.push({ row: true, i, t0: now + 40 })); cols.forEach(i => beams.push({ row: false, i, t0: now + 40 }));
    S.streak++; S.since = 0; S.lines += n; stats.lines += n; heatStart();
    if (S.goal && S.goal.type === 'star') S.goal.have += gems;
    const B = S.var ? S.var.bonus : 'none'; // gizli maceranın puan kuralı
    let pts = Math.round(10 * n * (n + 1) / 2 * S.streak * (B === 'combo' && S.streak >= 2 ? 1.5 : 1) + gems * (B === 'gem' ? 40 : 20) + (B === 'line' ? n * 15 : 0));
    const clean = S.grid.every(v => !v); if (clean) pts += B === 'clean' ? 500 : 200;
    const pairX2 = emoCells.some(([i, , cc]) => emoCells.some(([j, , c2]) => c2 === cc && ((j === i + 1 && j % N) || j === i + N))); // yan yana aynı renk sembol çifti
    if (pairX2 && emoPts) { emoPts *= 2; emoCells.forEach(e => { e[1] *= 2; }); float('🔗 x2', px, py - cell * 1.6, cell * .46, '#9FE7FF', 260, true); }
    if (emoPts) { // her patlayan emoji kendi puanını gösterir (çoksa tek toplam)
      pts += emoPts;
      if (emoCells.length <= 4) emoCells.forEach(([i, v], q) => float('+' + v, L.bx + (i % N + .5) * cell, L.by + ((i / N | 0) + .2) * cell, cell * .4, '#FFE27A', 180 + q * 90, true));
      else float('+' + emoPts, px, py - cell * .9, cell * .46, '#FFE27A', 200, true);
    }
    if (mono) { // tek renk çizginin puanı 3 katı, Joker çubuğu dolar, kutlama
      pts += Math.round(10 * n * (n + 1) / 2 * S.streak * 2 * mono / n); S.jbar = JB_MAX;
      const [, cl] = PALETTE[monoCol - 1], cy2 = L.by + L.bs * .2;
      float('🌈 ' + t('combo'), L.bx + L.bs / 2, cy2, cell * .52, C.accent, 60, 'badge');
      monoR.forEach(rw => { glow(L.bx + L.bs / 2, L.by + (rw + .5) * cell, L.bs * .55, cl, 600, now); parts.push({ kind: 'rainbow', row: true, i: rw, t0: now + 40, life: 800 }); });
      monoC.forEach(cc => { glow(L.bx + (cc + .5) * cell, L.by + L.bs / 2, L.bs * .55, cl, 600, now); parts.push({ kind: 'rainbow', row: false, i: cc, t0: now + 40, life: 800 }); });
      confetti(px, py, 26, 260); setTimeout(() => say(t('combo'), T.en.combo), 700); buzz(35); zia('joy', '🌈 ' + t('combo'), 2000, true, ['zwow', .9]);
    }
    // gizli sembol hedefi: oyuncu bilmez; tamamlanınca sürpriz ödül
    if (S.hidden && !S.hidden.done && gems) {
      S.hidden.have += gems;
      if (S.hidden.have >= S.hidden.need) {
        S.hidden.done = true; pts += 300 + levelDone(); S.joker = 1; hiddenGift();
      }
    }
    gain += pts; S.nova = Math.min(NOVA_MAX, S.nova + gems + (n >= 2 ? 1 : 0));
    float('+' + pts, px, py, cell * .48, '#FFFFFF', 0, true);
    // övgü: 2 satır "Güzel", 3 satır ya da 3'lü seri "Harika", 4 satır ya da 5'li seri "Muhteşem", 5 satır "Efsane"
    const pi = Math.min(5, Math.max(n, S.streak >= 5 ? 4 : S.streak >= 3 ? 3 : 0)), praise = clean ? t('clean') : t('praise')[pi];
    const praiseEn = clean ? T.en.clean : T.en.praise[pi];
    if (praise && (clean || pi >= 3)) zia(clean ? 'cool' : 'joy', praise);
    if (praise) { const prY = Math.abs(py - (L.by + L.bs * .36)) < cell * 1.4 ? L.by + L.bs * .66 : L.by + L.bs * .36; // patlama noktasındaki puanla çakışmasın
      if (!celebOn()) { const tn = performance.now(); for (const f of floats) if (!f.pill && f.praise && f.t0 + f.life > tn) f.life = Math.max(0, tn + 140 - f.t0); // önceki övgü hemen söner, üst üste binmez
        float(praise, L.bx + L.bs / 2, prY, cell * .78, C.accent, 120); floats[floats.length - 1].praise = true; } setTimeout(() => say(praise, praiseEn), 150); }
    if (n >= 3 || (n >= 2 && S.streak >= 3)) hitStop(70);
    if (n >= 2) { shakeEnd = now + 260; shakeAmp = Math.min(5, 1.5 + n); confetti(px, py, 10 + n * 6); punch(Math.min(.06, .015 * n + .005 * Math.min(S.streak, 6))); } else { confetti(px, py, 7, 170); if (S.streak >= 3) punch(.012); }
    if (clean) { shower(46); glow(L.bx + L.bs / 2, L.by + L.bs / 2, L.bs * .6, '#FFF3C4', 700, now); }
    if (S.streak >= 3) parts.push({ kind: 'ring', x: L.bx + L.bs / 2, y: L.by + L.bs / 2, r: L.bs * .3, R: L.bs * .6, col: '#FFB84D', t0: now, life: 650 });
    sfx.clear(n, S.streak); buzz(20 + n * 15);
    for (let k = 0; k < Math.min(3 + n, 6); k++) setTimeout(() => sfx.coin(k), 380 + k * 70);
    if (clean) setTimeout(sfx.clean, 250);
    if (!stats.seenJB && !S.joker) { stats.seenJB = 1; LS.set('stats', stats); setTimeout(() => (!$('toast').classList.contains('show') && toast(t('jbTip'), 5000)), 1200); }
    S.jbar = Math.min(JB_MAX, (S.jbar || 0) + n); if (n >= 2 || S.streak >= 3) S.jbar = JB_MAX; // çubuk: her satır doldurur, iyi hamle tamamlar
    if (!S.joker && S.jbar >= JB_MAX) { S.joker = 1; S.jbar = 0; parts.push({ kind: 'diamond', x: L.bx + L.bs / 2, y: L.by + L.bs * .62, t0: now + 700, life: 1500 }); float('✦ ' + t('jokerGot'), L.bx + L.bs / 2, L.by + L.bs * .82, cell * .52, C.accent, 900, 'badge'); setTimeout(sfx.joker, 550); }
  } else { S.since++; if (S.since >= 3) { S.streak = 0; heat.end = 0; } sfx.place(); buzz(12); }
  S.score += gain;
  { const sc = $('score'); if (gain >= 30) { sc.classList.remove('pop', 'pop2'); void sc.offsetWidth; sc.classList.add(gain >= 300 ? 'pop2' : 'pop'); } }
  if (pkHit) powerFx(pkHit.k, pkHit.i / N | 0, pkHit.i % N, piece.c, n);
  chainCheck();
  if (n && fill0 >= .75 && S.grid.filter(Boolean).length / 64 <= fill0 - .15) { // kritik anda alan açıldı
    S.score += 150; const cx2 = L.bx + L.bs / 2, cy2 = L.by + L.bs * .5;
    float(t('close'), cx2, L.by + L.bs * .82, cell * .56, C.accent, 380, 'metal'); float('+150', cx2, cy2, cell * .66, '#FFD24A', 560, 'gold3d');
    confetti(cx2, cy2, 22, 250); hitStop(70); setTimeout(() => samp('record', .6) || sfx.clean(), 300); zia('cool', t('close'), 1700, true, ['zyeah', .9]);
    stats.close = (stats.close || 0) + 1; }
  // her 3.400 puanda aynı oyun içinde sıradaki gizli maceraya geçilir (sembol, puan kuralı, gizli hedef değişir; duyurulmaz)
  if (S.var) {
    if (!S.nextVarAt) S.nextVarAt = VAR_STEP;
    const byScore = S.score >= S.nextVarAt;
    if (byScore || S.varSwitch) {
      S.varSwitch = false; if (byScore) S.nextVarAt += VAR_STEP * Math.max(1, Math.ceil((S.score - S.nextVarAt + 1) / VAR_STEP));
      const v = variant(nextVariant());
      S.var = { id: v.id, sym: v.sym, bonus: v.bonus, gemRate: v.gemRate }; S.hidden = { need: v.need, have: 0, done: false };
    }
  }
  afterMove();
}
// sembollü blokların bağlı grupları (aynı renk, yan yana / alt alta)
function symGroups() {
  const seen = new Uint8Array(64), out = [];
  for (let i = 0; i < 64; i++) { if (seen[i] || !S.grid[i] || !S.gem[i]) continue; const c = S.grid[i], g = [], q = [i]; seen[i] = 1;
    while (q.length) { const k = q.shift(); g.push(k); const x = k % N, y = k / N | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx;
        if (!seen[j] && S.grid[j] === c && S.gem[j]) { seen[j] = 1; q.push(j); } } }
    out.push(g); }
  return out;
}
const hiddenGift = () => celebrate(() => { parts.push({ kind: 'gift', vx: 0, vy: 0, x: L.bx + L.bs / 2, y: L.by + L.bs * .5, s: L.cell * 3.1, t0: performance.now(), life: 3800 }); bump(3900); setTimeout(() => buzz(40), 1050); }, 3900);
// 🔗 Sembol Zinciri: aynı renkte 3+ sembollü blok birbirine değerse zincir sırayla patlar, sembol puanları x2
function chainCheck() {
  const now = performance.now(), cell = L.cell; let total = 0, cnt = 0;
  for (const g of symGroups()) { if (g.length < 3) continue;
    const col = S.grid[g[0]], [, lc] = PALETTE[col - 1];
    g.forEach((i, q) => { const t1 = now + 260 + q * 95, x = L.bx + (i % N + .5) * cell, y = L.by + ((i / N | 0) + .5) * cell;
      if (q) { const j = g[q - 1]; parts.push({ kind: 'link', x0: L.bx + (j % N + .5) * cell, y0: L.by + ((j / N | 0) + .5) * cell, x1: x, y1: y, col: lc, t0: t1 - 120, life: 520, seed: Math.random() * 1e4 }); }
      glow(x, y, cell * .95, lc, 380, t1 - 60); glow(x, y, cell * .6, '#FFFFFF', 260, t1); parts.push({ kind: 'crack', x, y, t0: t1, life: 300 });
      const v = emoVal() * 2; total += v; cnt++; float('+' + v, x, y - cell * .3, cell * .4, '#FFE27A', t1 - now + 60, true);
      shards(i, col, t1, 5, true); kill(i, t1); });
  }
  if (!cnt) return 0;
  const cx = L.bx + L.bs / 2;
  S.score += total; S.nova = Math.min(NOVA_MAX, S.nova + cnt); if (S.goal && S.goal.type === 'star') S.goal.have += cnt;
  if (S.hidden && !S.hidden.done) { S.hidden.have += cnt; if (S.hidden.have >= S.hidden.need) { S.hidden.done = true; S.score += 300 + levelDone(); S.joker = 1; hiddenGift(); } }
  float('🔗 ' + t('chain') + ' x2!', cx, L.by + L.bs * .22, cell * .56, C.accent, 120, 'badge');
  zia('joy', '🔗 ' + t('chain') + ' x2!', 1800, true, ['zwow', .9], true);
  setTimeout(() => samp('combo', .8, 1.1), 260); for (let q = 0; q < Math.min(cnt, 6); q++) setTimeout(() => samp('coin', .6, 1 + q * .06), 300 + q * 95);
  shakeEnd = now + 300; shakeAmp = 4; buzz(40); bump(1500 + cnt * 100); punch(.035);
  stats.chains = (stats.chains || 0) + 1; LS.set('stats', stats);
  return total;
}
// tahtada 2'li aynı renk sembol çiftleri arasında parlayan ışık bağı: "bir tane daha getir, zincir patlasın"
function drawLinks(now) {
  if (S.over) return; const cell = L.cell;
  for (const g of symGroups()) { if (g.length !== 2) continue;
    const [a, b2] = g, x0 = L.bx + (a % N + .5) * cell, y0 = L.by + ((a / N | 0) + .5) * cell, x1 = L.bx + (b2 % N + .5) * cell, y1 = L.by + ((b2 / N | 0) + .5) * cell, [, lc] = PALETTE[S.grid[a] - 1];
    const pz = .55 + .45 * Math.sin(now / 260); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.globalAlpha = .35 * pz; ctx.strokeStyle = lc; ctx.lineWidth = cell * .34; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.globalAlpha = .9 * pz; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = cell * .07; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const f = (now / 900) % 1; spark4(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, cell * .13, '#FFFFFF'); ctx.restore(); }
}
// Nova ile kırılan bloğun rengindeki dönen cam parçaları
function shards(i, c, t0, n = 7, cube = false) {
  const x = L.bx + (i % N + .5) * L.cell, y = L.by + ((i / N | 0) + .5) * L.cell;
  if (cube) { // satır patlaması: blok, kendi renginde parlak mini küplere ayrılır
    const [, l, d] = PALETTE[c - 1];
    for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, v = 120 + Math.random() * 200;
      parts.push({ kind: 'cube', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 240, s: L.cell * (.22 + Math.random() * .14), rot: Math.random() * 6.28, vr: (Math.random() - .5) * 10, l, d, t0, life: 650 + Math.random() * 350 }); }
    return;
  }
  for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, v = 140 + Math.random() * 260;
    parts.push({ kind: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, s: L.cell * (.12 + Math.random() * .14), rot: Math.random() * 6.28, vr: (Math.random() - .5) * 16, col: PALETTE[c - 1][k % 3], t0, life: 700 + Math.random() * 400 }); }
}
// kutlama yardımcıları: konfeti patlaması, tahtaya konfeti yağmuru, yumuşak ışık parlaması
const TROPHY = new Image(); TROPHY.src = 'trophy.png';
const GIFT_B = new Image(); GIFT_B.src = 'gift-base.png'; const GIFT_L = new Image(); GIFT_L.src = 'gift-lid.png';
// büyük kutlamalar sıraya girer: biri bitmeden diğeri başlamaz, üst üste binmez
let celebBusyUntil = 0;
function celebrate(make, dur) {
  const now = performance.now(), start = Math.max(now, celebBusyUntil); celebBusyUntil = start + dur;
  setTimeout(() => { if (S && view === 'game') make(); }, start - now);
}
const celebOn = () => performance.now() < celebBusyUntil;
const CONF_COLS = ['#FFD34D', '#FF4F8B', '#3FB6FF', '#5EDB6B', '#A97BFF', '#FF9F1C', '#2EC4B6', '#FFFFFF'];
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };
const CONF_BACK = {}; // konfetinin arka yüzü bir ton koyu
const CONF_SHAPES = ['ribbon', 'rect', 'star', 'ribbon', 'rect', 'circle'];
function confetti(x, y, n, v0 = 240) {
  const R = Math.random, now = performance.now();
  for (let k = 0; k < n / 3; k++) parts.push({ kind: 'spark', s4: true, x: x + (R() - .5) * L.cell * 4, y: y - R() * L.cell * 3, r: L.cell * (.07 + R() * .08), col: '#FFFFFF', t0: now + 120 + R() * 800, life: 420 }); // simler
  for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (R() - .5) * 2.6, v = v0 + R() * v0;
    parts.push({ kind: 'conf', x, y, vx: Math.cos(a) * v * 1.25, vy: Math.sin(a) * v * 1.3, w: L.cell * (.16 + R() * .1), h: L.cell * (.08 + R() * .05), rot: R() * 6.28, vr: (R() - .5) * 14, col: CONF_COLS[k % CONF_COLS.length], shape: CONF_SHAPES[k % CONF_SHAPES.length], ph: R() * 6.28, t0: now + R() * 80, life: 1500 + R() * 800 }); }
  bump(2400);
}
function shower(n) {
  const R = Math.random, now = performance.now();
  for (let k = 0; k < n / 3; k++) parts.push({ kind: 'spark', s4: true, x: L.bx + R() * L.bs, y: L.by + R() * L.bs * .7, r: L.cell * (.07 + R() * .08), col: '#FFFFFF', t0: now + 120 + R() * 900, life: 420 }); // simler
  for (let k = 0; k < n; k++) parts.push({ kind: 'conf', x: L.bx + R() * L.bs, y: L.by - L.cell * (.3 + R() * 1.2), vx: (R() - .5) * 60, vy: 60 + R() * 120, w: L.cell * (.16 + R() * .1), h: L.cell * (.08 + R() * .05), rot: R() * 6.28, vr: (R() - .5) * 10, col: CONF_COLS[k % CONF_COLS.length], shape: CONF_SHAPES[k % CONF_SHAPES.length], ph: R() * 6.28, t0: now + R() * 700, life: 1700 + R() * 600 });
  bump(2600);
}
function glow(x, y, r, col, life = 450, t0 = performance.now()) { parts.push({ kind: 'glow', x, y, r, col, t0, life }); }
function novaBlast(r, c) {
  const now = performance.now(); let cnt = 0;
  for (const [y, x] of NOVA_SHAPE.cells) { const i = (r + y) * N + c + x, col = S.grid[i]; if (col) { cnt++; const t0 = now + Math.hypot(x - 1, y - 1) * 50; shards(i, col, t0, 4, true); shards(i, col, t0, 3); kill(i, t0); } }
  parts.push({ kind: 'ring', x: L.bx + (c + 1.5) * L.cell, y: L.by + (r + 1.5) * L.cell, r: L.cell * .5, R: L.cell * 2.6, col: '#FFFFFF', t0: now, life: 500 });
  glow(L.bx + (c + 1.5) * L.cell, L.by + (r + 1.5) * L.cell, L.cell * 2.2, '#FFFFFF', 420, now);
  { const nx = L.bx + (c + 1.5) * L.cell, ny = L.by + (r + 1.5) * L.cell;
    parts.push({ kind: 'ring', x: nx, y: ny, r: L.cell * .3, R: L.cell * 3.6, col: C.accent, t0: now + 110, life: 600 });
    parts.push({ kind: 'rays', x: nx, y: ny, R: L.cell * 3.2, t0: now, life: 520 }); parts.push({ kind: 'crack', x: nx, y: ny, t0: now, life: 400 });
    confetti(nx, ny, 16, 230); float('💥 NOVA!', nx, ny - L.cell * 1.9, L.cell * .55, C.accent, 60, 'badge'); }
  bump(1400);
  S.nova = 0; S.score += cnt * 5; shakeEnd = now + 380; shakeAmp = 8; punch(.05); hitStop(80); sfx.nova(); buzz(50);
  float('+' + cnt * 5, L.bx + (c + 1.5) * L.cell, L.by + (r + 1.5) * L.cell, L.cell * .48, '#FFFFFF', 0, true);
  afterMove();
}
function useJoker(idx) {
  const old = S.tray[idx]; let best = [], bestSc = -1;
  SHAPES.forEach((sh, si) => {
    let sc = -1;
    for (let r = 0; r <= N - sh.h; r++) for (let c = 0; c <= N - sh.w; c++) {
      if (!fits(S.grid, sh, r, c)) continue;
      const o = S.grid.slice(); for (const [y, x] of sh.cells) o[(r + y) * N + c + x] = 1;
      const f = fullLines(o); sc = Math.max(sc, (f.rows.length + f.cols.length) * 100 + sh.n);
    }
    if (sc > bestSc) { bestSc = sc; best = [si]; } else if (sc === bestSc && sc >= 0) best.push(si);
  });
  if (bestSc < 0) return false;
  const si = best[Math.random() * best.length | 0];
  S.tray[idx] = { s: si, c: old.c, g: old.g >= 0 ? Math.min(old.g, SHAPES[si].n - 1) : -1 }; S.joker = 0;
  const sc = slotC(idx), now = performance.now();
  // kutlama: iki parlama halkası, konfeti yağmuru ve ışıltılar
  const CF = ['#FFD34D', '#FF5C8A', '#4FC3FF', '#7CE38B', '#B78CFF', '#FFFFFF'], R = Math.random;
  parts.push({ kind: 'ring', x: sc.x, y: sc.y, r: L.cell * .4, R: L.cell * 2.3, col: '#FFE08A', t0: now, life: 560 });
  parts.push({ kind: 'ring', x: sc.x, y: sc.y, r: L.cell * .2, R: L.cell * 1.5, col: '#FFFFFF', t0: now + 90, life: 480 });
  for (let k = 0; k < 28; k++) { const a = -Math.PI / 2 + (R() - .5) * 2.4, v = 260 + R() * 280;
    parts.push({ kind: 'conf', x: sc.x, y: sc.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: L.cell * (.12 + R() * .08), h: L.cell * (.06 + R() * .05), rot: R() * 6.28, vr: (R() - .5) * 14, col: CF[k % 6], t0: now + R() * 60, life: 1000 + R() * 500 }); }
  glow(sc.x, sc.y, L.cell * 1.7, '#FFE08A', 520, now);
  for (let k = 0; k < 10; k++) parts.push({ kind: 'spark', s4: true, x: sc.x + (R() - .5) * L.cell * 2.6, y: sc.y + (R() - .5) * L.cell * 1.8, r: L.cell * (.12 + R() * .1), col: '#FFF4C2', t0: now + R() * 260, life: 520 });
  float('✦ ' + t('joker'), sc.x, sc.y - L.cell, L.cell * .56, C.accent, 0, 'badge');
  sfx.joker(); buzz(30); bump(1700); afterMove(); return true;
}
function toHold(idx) { const p = S.tray[idx]; S.tray[idx] = S.hold; S.hold = p; sfx.pocket(); buzz(10); afterMove(); }

/* ---------- Zia maskotu ---------- */
// tepkiler: kombo/çok satır → sevinç, rekor/temizlik → havalı, sıkışma → düşünür, oyun bitti → muzip. Sık çıkmaz, dokunmayı engellemez.
let ziaT = 0, ziaT2 = 0, ziaLast = 0, ziaWait = 0, charUntil = 0, pwfxUntil = 0;
// poza göre ses: sevinç "woo", havalı "yeah boy", muzip/işaret "motor gazı", düşünen sessiz
// tüm pozlar önceden yüklenir ve çözülür: ilk çıkışta boş/yarım kare görünmez, animasyon akıcı başlar
const ZIA_IMG = {}; for (const k of ['joy', 'cool', 'think', 'smirk', 'point']) { const im = new Image(); im.decoding = 'async'; im.src = 'zia/' + k + '.webp'; if (im.decode) im.decode().catch(() => {}); ZIA_IMG[k] = im; }
const ZIA_SND = { joy: ['zwoo', .85], cool: ['zyeah', .85], smirk: ['zengine', .5], point: ['zengine', .45] };
let ziaSide = 0, ziaLastSide = 'p-l', ziaShowAt = 0;
function zia(pose, text, ms = 2000, force = false, snd, now0 = false) {
  const el = $('zia'), now = performance.now();
  if (!el || (!force && now - ziaLast < 8000) || (view !== 'game' && view !== 'over')) return false;
  ziaLast = now;
  // üst üste binmesin: ekrandaki yazılar en az 1,1 sn okunsun, sonra solarak çekilsin; kupa/hediye/güç kartı bitene kadar beklesin
  let at = Math.max(now, celebBusyUntil, pwfxUntil);
  if (!now0) for (const f of floats) if (!/^\+\d+$/.test(f.txt) && f.t0 + f.life > now) at = Math.max(at, Math.min(f.t0 + f.life, f.t0 + 1100));
  if (at - now > 3500 && !force) return false;
  if (!now0) for (const f of floats) if (!/^\+\d+$/.test(f.txt) && f.t0 + f.life > at) f.life = Math.max(0, at + 250 - f.t0);
  const side = ziaSide++ % 2 ? 'p-r' : 'p-l'; ziaLastSide = side; ziaShowAt = at; // sırayla sol ve sağ kenar
  charUntil = at + ms + 300; const vs = snd || ZIA_SND[pose]; if (vs && vs[0] !== 'zengine') ziaVoiceAt = at;
  clearTimeout(ziaWait);
  ziaWait = setTimeout(() => {
    if (view !== 'game' && view !== 'over') return;
    const img = el.querySelector('img'), src = ZIA_IMG[pose] ? ZIA_IMG[pose].src : 'zia/' + pose + '.webp'; el.querySelector('.zb').textContent = text || '';
    if (img.src !== src) img.src = src;
    el.className = pose + ' ' + side; void el.offsetWidth; requestAnimationFrame(() => el.classList.add('show'));
    if (vs) samp(vs[0], vs[1]);
    clearTimeout(ziaT); clearTimeout(ziaT2);
    ziaT = setTimeout(() => { el.classList.add('out'); ziaT2 = setTimeout(() => { el.className = ''; }, 360); }, ms);
  }, Math.max(0, at - now));
  return true;
}
// Zia'nın uzattığı elin tuval üzerindeki konumu (güçler buradan çıkar)
function ziaHand() {
  const el = $('zia'), app = $('app').getBoundingClientRect(), cvr = cv.getBoundingClientRect();
  const ih = Math.min(118, innerHeight * .145), iw = ih * .9, top = app.height * .34 + 34;
  const x = ziaLastSide === 'p-r' ? app.width - iw * .62 : iw * .62, y = top + ih * .42;
  return { x: x - (cvr.left - app.left), y: y - (cvr.top - app.top) };
}
const ziaHide = () => { const el = $('zia'); clearTimeout(ziaWait); charUntil = 0; if (el) { el.className = ''; clearTimeout(ziaT); clearTimeout(ziaT2); } };
/* ---------- güç kutuları ---------- */
// Tahtada ara sıra parlayan bir güç kutusu belirir; üstüne blok konunca güç o noktada kendiliğinden patlar.
// ⚡ şimşek: o hücrenin satırı + sütunu · 🌈 disko: konan bloğun rengi · 🎯 hedef: çevresindeki 3x3 · 🔀 karıştır: tepsi yenilenir
// ⚡ şimşek: kutunun satırı · 💣 bomba: çevresindeki 3x3 (Nova gibi) · 🪩 disko: konan bloğun rengindeki tüm bloklar · 🎯 hedef: tahtadaki en yalnız bloğu vurur
const PW = { z: [10, 'pZap'], b: [19, 'pBomb'], d: [0, 'pDisco'], t: [35, 'pAim'] };
const PK_W = ['z', 'z', 'z', 'b', 'b', 'b', 'd', 'd', 't', 't'];
function spawnPower() {
  if (S.pk) { if (S.grid[S.pk.i] || --S.pk.left <= 0) { S.pk = null; S.pkCd = 4; } return; }
  if (S.pkCd > 0) { S.pkCd--; return; }
  if (S.over || Math.random() > .11) return;
  const e = []; for (let i = 0; i < 64; i++) if (!S.grid[i] && i !== S.pu) e.push(i);
  if (e.length < 10) return;
  S.pk = { i: e[Math.random() * e.length | 0], k: PK_W[Math.random() * PK_W.length | 0], left: 9, t0: performance.now() }; bump(600);
  const x = L.bx + (S.pk.i % N + .5) * L.cell, y = L.by + ((S.pk.i / N | 0) + .5) * L.cell;
  parts.push({ kind: 'ring', x, y, r: L.cell * .2, R: L.cell * 1.1, col: '#FFE08A', t0: performance.now(), life: 450 });
  if (!stats.seenPK) { stats.seenPK = 1; LS.set('stats', stats); setTimeout(() => { if (view === 'game') { toast(t('pkTip'), 5500); zia('point', t(PW[S.pk ? S.pk.k : 'z'][1]) + '!', 2600, true); } }, 500); }
}
// güç anı: Zia ekranın kenarından çıkar (pozu ve sesi güce göre), tahtada güce özel hareketli efekt oynar
const PW_ZIA = { z: ['cool', ['zengine', .7]], b: ['smirk', ['zwow', .9]], d: ['joy', ['zwoo', .9]], t: ['point', ['zyeah', .9]] };
let lastPowerAt = 0;
function powerFx(k, r0, c0, col, nLines = 0) {
  const [pose, snd] = PW_ZIA[k], shown = zia(pose, t(PW[k][1]) + '!', 1900, true, snd, true) && ziaShowAt - performance.now() < 80;
  const D = shown ? 340 : 0, hand = shown ? ziaHand() : null, later = (fn, ms) => setTimeout(fn, ms + D);
  const now = performance.now() + D, cell = L.cell, cx = L.bx + (c0 + .5) * cell, cy = L.by + (r0 + .5) * cell; let pts = 0;
  if (hand) { glow(hand.x, hand.y, cell * 1.1, { z: '#BDEBFF', b: '#FFB347', d: '#FF8BF0', t: '#FF6B6B' }[k], 380, now - 120); for (let q = 0; q < 6; q++) parts.push({ kind: 'spark', s4: true, x: hand.x + (Math.random() - .5) * cell, y: hand.y + (Math.random() - .5) * cell, r: cell * .14, col: '#FFFFFF', t0: now - 140 + q * 25, life: 380 }); }
  const pop = (i, t1, n = 4) => { if (!S.grid[i]) return 0; shards(i, S.grid[i], t1, n, true); kill(i, t1); return 1; };
  // hedef hücreler vuruştan önce güç renginde parlayarak işaretlenir (ne olacağı net görünür)
  const mark = (cells, mc, hit) => { if (cells.length) parts.push({ kind: 'mark', cells: cells.slice(), col: mc, t0: now - D, life: D + hit }); };
  { const tg = k === 'z' ? [...new Set([...Array(N).keys()].flatMap(q => [r0 * N + q, q * N + c0]))].filter(i => S.grid[i] || i === r0 * N + c0)
      : k === 'b' ? [-1, 0, 1].flatMap(dy => [-1, 0, 1].map(dx => [r0 + dy, c0 + dx])).filter(([y, x]) => y >= 0 && x >= 0 && y < N && x < N).map(([y, x]) => y * N + x)
      : k === 'd' ? S.grid.map((v, i) => v === col ? i : -1).filter(i => i >= 0) : [];
    if (tg.length) mark(tg, { z: '#5FC8FF', b: '#FF6B3D', d: PALETTE[col - 1][1] }[k], { z: 260, b: 700, d: 520 }[k]); }
  if (!stats.pwSeen) stats.pwSeen = {}; const seenN = stats.pwSeen[k] = (stats.pwSeen[k] || 0) + 1; // ilk 3 kullanımda kısa açıklama
  floatNow = true; float(t(PW[k][1]) + '!', L.bx + L.bs / 2, L.by + cell * .75, cell * .56, C.accent, 0, 'metal');
  if (seenN <= 3) float(t('pwd')[k], L.bx + L.bs / 2, L.by + cell * 1.6, cell * .38, '#FFFFFF', 120, true); floatNow = false;
  if (k === 'z') { // şimşek: elden çıkar, çarpar; satır ve sütun boyunca elektrik dört bir yana yayılır, bloklar beyaz parlayıp dağılır
    parts.push({ kind: 'bolt', x: cx, y: cy, row: true, t0: now, life: 700, seed: Math.random() * 1e4, sx: hand && hand.x, sy: hand && hand.y });
    parts.push({ kind: 'zap', y: cy, t0: now + 140, life: 650 }); parts.push({ kind: 'zap', x: cx, t0: now + 160, life: 650 });
    glow(cx, cy, L.bs * .55, '#DDF3FF', 420, now + 120); beams.push({ row: true, i: r0, t0: now + 150 }); beams.push({ row: false, i: c0, t0: now + 170 });
    const hit = new Set();
    for (let q = 0; q < N; q++) for (const [i, d] of [[r0 * N + q, Math.abs(q - c0)], [q * N + c0, Math.abs(q - r0)]]) { if (hit.has(i)) continue; hit.add(i);
      const t1 = now + 260 + d * 45; if (S.grid[i]) glow(L.bx + (i % N + .5) * cell, L.by + ((i / N | 0) + .5) * cell, cell * .75, '#FFFFFF', 300, t1 - 120); pts += 8 * pop(i, t1, 6); }
    shakeEnd = now + 420; shakeAmp = 7; later(() => { samp('nova', .7) || sfx.nova(); buzz(50); }, 0); later(() => hitStop(70), 160);
  } else if (k === 'b') { // bomba: düşer, fitili yanar, kızarır ve patlar: alev topu, şok dalgası, duman, enkaz
    parts.push({ kind: 'bomb', x: cx, y: cy, t0: now, life: 720, sx: hand && hand.x, sy: hand && hand.y });
    const T = now + 700;
    parts.push({ kind: 'fire', x: cx, y: cy, R: cell * 3.4, t0: T, life: 650 }); glow(cx, cy, cell * 4.2, '#FFE2B0', 320, T); parts.push({ kind: 'fire', x: cx, y: cy, R: cell * 1.8, t0: T + 90, life: 450 }); parts.push({ kind: 'crack', x: cx, y: cy, t0: T, life: 380 });
    parts.push({ kind: 'ring', x: cx, y: cy, r: cell * .4, R: cell * 3.4, col: '#FFB347', t0: T, life: 520 });
    parts.push({ kind: 'ring', x: cx, y: cy, r: cell * .2, R: cell * 2.4, col: '#FFFFFF', t0: T + 60, life: 420 });
    for (let q = 0; q < 15; q++) { const a = q / 15 * 6.283 + Math.random() * .5, v = cell * (1.1 + Math.random() * 1.1);
      parts.push({ kind: 'smoke', x: cx + Math.cos(a) * cell * .4, y: cy + Math.sin(a) * cell * .4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - cell * .6, r: cell * (.35 + Math.random() * .25), t0: T + 80 + q * 20, life: 900 }); }
    for (let y = r0 - 1; y <= r0 + 1; y++) for (let x = c0 - 1; x <= c0 + 1; x++) { if (y < 0 || x < 0 || y >= N || x >= N) continue; const i = y * N + x;
      if (S.grid[i]) { shards(i, S.grid[i], T + Math.hypot(x - c0, y - r0) * 40, 3); pts += 10 * pop(i, T + Math.hypot(x - c0, y - r0) * 40, 5); } }
    later(() => { samp('zboom', 1) || samp('nova', .9) || sfx.nova(); shakeEnd = performance.now() + 450; shakeAmp = 10; buzz(70); bump(900); punch(.06); hitStop(90); }, 700); // bomba patlama sesi
    later(() => samp('press', .5, 1.6), 250); later(() => samp('press', .5, 1.9), 450);
  } else if (k === 'd') { // disko: top iner, döner, ışık saçar; aynı renkteki bloklar ritimle parlayıp sırayla patlar
    parts.push({ kind: 'disco', x: cx, y: cy, s: cell * 2.6, col: PALETTE[col - 1], t0: now, life: 1500, sx: hand && hand.x, sy: hand && hand.y });
    S.grid.forEach((v, i) => { if (v !== col) return; const x = L.bx + (i % N + .5) * cell, y = L.by + ((i / N | 0) + .5) * cell, t1 = now + 500 + Math.hypot(x - cx, y - cy) / cell * 55;
      glow(x, y, cell * .9, PALETTE[col - 1][1], 380, t1 - 160); glow(x, y, cell * .7, '#FFFFFF', 260, t1); pts += 6 * pop(i, t1); });
    later(() => samp('combo', .8) || sfx.clean(), 480); later(() => { buzz(40); confetti(cx, cy, 26, 260); }, 520);
  } else if (k === 't') { // hedef: en yalnız 4 blok kilitlenir; Zia'nın elinden 4 ok sırayla uçar, her biri tam ortadan vurur
    const sc = []; S.grid.forEach((v, i) => { if (!v || i === r0 * N + c0) return; const x = i % N, y = i / N | 0;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => x + dx >= 0 && x + dx < N && y + dy >= 0 && y + dy < N && S.grid[(y + dy) * N + x + dx]).length;
      sc.push([nb * 10 - Math.hypot(x - c0, y - r0) * .5 + Math.random(), i]); });
    sc.sort((a2, b2) => a2[0] - b2[0]); const tgs = sc.slice(0, 4).map(e => e[1]); if (!tgs.length) tgs.push(r0 * N + c0);
    mark(tgs, '#FF3B3B', 630 + (tgs.length - 1) * 170);
    tgs.forEach((best, q) => { const tx = L.bx + (best % N + .5) * cell, ty = L.by + ((best / N | 0) + .5) * cell, fromL = tx > L.W / 2, o = q * 170, T = now + 630 + o;
      parts.push({ kind: 'aim', x: tx, y: ty, s: cell * 2.4, t0: now + o, life: 520 });
      parts.push({ kind: 'arrow', x0: hand ? hand.x : fromL ? -cell : L.W + cell, y0: hand ? hand.y : ty - cell * 2.2, x1: tx, y1: ty, t0: now + 300 + o, life: 330 });
      parts.push({ kind: 'ring', x: tx, y: ty, r: cell * .2, R: cell * 1.8, col: '#FF4D4D', t0: T, life: 450 }); parts.push({ kind: 'crack', x: tx, y: ty, t0: T, life: 420 });
      parts.push({ kind: 'ring', x: tx, y: ty, r: cell * .1, R: cell * 1.1, col: '#FFFFFF', t0: T + 70, life: 360 }); glow(tx, ty, cell * 1.3, '#FFD0D0', 380, T);
      if (S.grid[best]) { shards(best, S.grid[best], T, 6); pts += 25 * pop(best, T, 7); }
      later(() => samp('whoosh', .7, 1 + q * .08), 300 + o); later(() => { samp('nova', .5, 1 + q * .05) || sfx.nova(); shakeEnd = performance.now() + 200; shakeAmp = 4; buzz(35); }, 630 + o); });
  }
  if (pts) { S.score += pts; float('+' + pts, cx, cy + cell * .4, cell * .62, '#FFD24A', 750 + D, 'gold3d'); }
  const megaNow = performance.now(), mega = nLines >= 2 || megaNow - lastPowerAt < 6000; lastPowerAt = megaNow;
  if (mega) { // nadir büyük an: konfeti yağmuru, altın bonus, metal başlık
    later(() => { S.score += 250; shower(70); float(t('mega'), L.bx + L.bs / 2, L.by + L.bs * .45, cell * .62, C.accent, 0, 'metal'); float('+250', L.bx + L.bs / 2, L.by + L.bs * .62, cell * .78, '#FFD24A', 150, 'gold3d');
      punch(.06); hitStop(90); samp('levelwin', .8) || sfx.clean(); buzz(60); stats.mega = (stats.mega || 0) + 1; LS.set('stats', stats); hud(); }, 1900); } // güç puanı söndükten sonra gelir, üst üste binmez
  stats.powers = (stats.powers || 0) + 1; LS.set('stats', stats); bump(1800); return pts;
}

// mini disko topu (güç kutusunun içinde döner)
function discoBall(x, y, R2, now, col) { mirrorBall(x, y, R2, now / 700, now, col); }
// 3D ayna küre: enlem-boylam aynacıkları küre üzerine izdüşürülür, her biri ışığa göre parlar; dönerken renkli yansımalar ve ışıltılar çakar
function mirrorBall(x, y, R2, rot, now, col) {
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = R2 * .35; ctx.shadowOffsetY = R2 * .12; ctx.beginPath(); ctx.arc(0, 0, R2, 0, 6.283); ctx.fillStyle = '#3A4060'; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R2, 0, 6.283); ctx.clip();
  const bg = ctx.createRadialGradient(-R2 * .35, -R2 * .4, R2 * .05, 0, 0, R2 * 1.05); bg.addColorStop(0, '#E8ECF8'); bg.addColorStop(.6, '#7C86A8'); bg.addColorStop(1, '#262B44');
  ctx.fillStyle = bg; ctx.fillRect(-R2, -R2, R2 * 2, R2 * 2);
  const rows = R2 > 20 ? 10 : 7, Lx = -.45, Ly = -.55, Lz = .7, RB = ['#FF4D6D', '#FFE14D', '#5EDB6B', '#3FB6FF', '#A97BFF', '#FF4FD8'];
  for (let r = 0; r < rows; r++) {
    const la0 = -Math.PI / 2 + Math.PI * r / rows, la1 = la0 + Math.PI / rows, la = (la0 + la1) / 2, cl = Math.cos(la), cols = Math.max(4, Math.round(rows * 2 * cl));
    for (let c = 0; c < cols; c++) {
      const lo = (c + .5) / cols * Math.PI * 2 + rot, sl = Math.sin(lo), co = Math.cos(lo); if (co <= .05) continue; // arka yüz görünmez
      const nx = cl * sl, ny = Math.sin(la), nz = cl * co, px = R2 * nx, py = R2 * ny, w = R2 * cl * (Math.PI * 2 / cols) * co * .86, h = R2 * (Math.PI / rows) * Math.cos(la) * .86 + R2 * .02;
      const lam = Math.max(0, nx * Lx + ny * Ly + nz * Lz), spec = Math.pow(Math.max(0, lam), 12), hs = Math.abs(Math.sin(r * 12.9898 + c * 78.233 + Math.floor(now / 120)) * 43758.5) % 1;
      const g = Math.round(60 + 170 * lam); ctx.fillStyle = hs > .9 ? RB[(r + c) % RB.length] : hs > .78 ? col[1] : `rgb(${g},${g + 6},${Math.min(255, g + 22)})`;
      ctx.globalAlpha = .55 + .45 * lam; ctx.fillRect(px - w / 2, py - h / 2, w, h);
      if (spec > .35 || hs > .97) { ctx.globalAlpha = Math.min(1, spec + .3); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(px - w / 2, py - h / 2, w, h); }
    }
  }
  ctx.globalAlpha = 1; const hl = ctx.createRadialGradient(-R2 * .38, -R2 * .42, 0, -R2 * .38, -R2 * .42, R2 * .55); hl.addColorStop(0, 'rgba(255,255,255,.75)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl; ctx.fillRect(-R2, -R2, R2 * 2, R2 * 2);
  const rim = ctx.createRadialGradient(0, 0, R2 * .75, 0, 0, R2); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(10,12,30,.55)'); ctx.fillStyle = rim; ctx.fillRect(-R2, -R2, R2 * 2, R2 * 2);
  ctx.restore();
  ctx.lineWidth = Math.max(1, R2 * .05); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(0, 0, R2, 0, 6.283); ctx.stroke();
  for (let q = 0; q < 3; q++) { const an = q * 2.1 + now / 400, rr2 = R2 * (.35 + .25 * ((q * 37) % 3)), tw = .5 + .5 * Math.sin(now / 70 + q * 2); if (tw > .55) spark4(Math.cos(an) * rr2, Math.sin(an) * rr2 * .9, R2 * .2 * tw, '#FFFFFF'); }
  ctx.restore();
}
// güç kutusu çizimi: altın çerçeveli parlak kutu, içinde zıplayan ikon, etrafında dönen ışıltı; kaybolmadan önce yanıp söner
function drawPK(now) {
  const pk = S.pk; if (!pk || S.over || S.grid[pk.i]) return;
  const cell = L.cell, x = L.bx + (pk.i % N + .5) * cell, y = L.by + ((pk.i / N | 0) + .5) * cell, ap = Math.min(1, Math.max(0, (now - (pk.t0 || 0)) / 350));
  const blink = pk.left <= 3 ? .55 + .45 * Math.sin(now / 90) : 1, pz = (1 + .07 * Math.sin(now / 180)) * Math.max(.05, back(ap)), s2 = cell * .86 * pz;
  ctx.save(); ctx.globalAlpha = blink;
  const g = ctx.createRadialGradient(x, y, 0, x, y, cell * .8); g.addColorStop(0, 'rgba(255,220,110,.6)'); g.addColorStop(1, 'rgba(255,220,110,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, cell * .8, 0, 7); ctx.fill();
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = cell * .12; ctx.shadowOffsetY = cell * .05;
  const bg = ctx.createLinearGradient(0, y - s2 / 2, 0, y + s2 / 2); bg.addColorStop(0, '#FFF1A8'); bg.addColorStop(.5, '#FFC23C'); bg.addColorStop(1, '#E07B00');
  path(ctx, x - s2 / 2, y - s2 / 2, s2, s2, s2 * .28); ctx.fillStyle = bg; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineWidth = Math.max(1.5, cell * .05); ctx.strokeStyle = '#FFFBE0'; ctx.stroke();
  path(ctx, x - s2 * .38, y - s2 * .38, s2 * .76, s2 * .76, s2 * .2); ctx.fillStyle = '#3A1E66'; ctx.fill();
  const z = s2 * .66, dy = Math.sin(now / 220) * cell * .04;
  if (pk.k === 'd') discoBall(x, y + dy, z * .44, now, PALETTE[(now / 400 | 0) % PALETTE.length]);
  else { const im = iconImg(PW[pk.k][0]); if (im.complete && im.naturalWidth) ctx.drawImage(im, x - z / 2, y - z / 2 + dy, z, z); }
  for (let q = 0; q < 2; q++) { const an = now / 600 + q * Math.PI; spark4(x + Math.cos(an) * s2 * .62, y + Math.sin(an) * s2 * .62, cell * .1 * (1 + .3 * Math.sin(now / 120 + q)), '#FFFFFF'); }
  ctx.restore();
}
/* ---------- girdi ---------- */
const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
cv.addEventListener('pointerdown', e => {
  if (!S || S.over || view !== 'game') return;
  drag = null; // yarım kalmış bir sürükleme varsa bırak
  const [x, y] = pos(e); let kind = null, idx = 0, piece = null, s0 = L.mini;
  if (y >= L.trayY && y <= L.trayY + L.trayH && x >= L.bx && x < L.bx + L.bs) { idx = Math.min(2, (x - L.bx) / L.slotW | 0); if (S.tray[idx]) { kind = 'tray'; piece = S.tray[idx]; } }
  else if (inBox(L.hold, x, y) && S.hold) { kind = 'hold'; piece = S.hold; s0 = L.hs; }
  else if (inBox(L.nova, x, y) && S.nova >= NOVA_MAX) { kind = 'nova'; s0 = L.cell * .5; }
  if (!kind && inBox(L.jbtn, x, y, 6)) { // +JOKER düğmesi: sığmayan ilk bloğa Joker uygular
    const ji = S.tray.findIndex(p => p && !anyFit(S.grid, SHAPES[p.s]));
    if (!S.joker) { toast(t('jokerNone'), 4000); sfx.bad(); } else if (ji < 0) toast(t('jokerHint'), 4000); else useJoker(ji);
    return;
  }
  if (!kind) return;
  fly = null;
  drag = { kind, idx, piece, sh: kind === 'nova' ? NOVA_SHAPE : SHAPES[piece.s], px: x, py: y, t0: performance.now(), s0, touch: e.pointerType !== 'mouse', pr: -99, pc: -99, valid: false, lines: null, overHold: false, id: e.pointerId, x0: x, y0: y, moved: false };
  try { cv.setPointerCapture(e.pointerId); } catch {}
  samp('press', .8, .97 + Math.random() * .06); buzz(8); bump();
});
cv.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; [drag.px, drag.py] = pos(e); if (Math.hypot(drag.px - drag.x0, drag.py - drag.y0) > 12) drag.moved = true; });
function drop(e, cancel) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag, now = performance.now(); if (!cancel) { [d.px, d.py] = pos(e); updatePreview(now); }
  const g = geom(now); drag = null;
  if (!cancel && d.valid) { d.kind === 'nova' ? novaBlast(d.pr, d.pc) : place(d.kind, d.idx, d.piece, d.pr, d.pc); }
  else if (!cancel && d.overHold) toHold(d.idx);
  else if (!cancel && d.kind === 'tray' && !d.moved && !anyFit(S.grid, d.sh)) { // sığmayan bloğa dokunuş
    if (stuck()) toHold(d.idx); else if (S.joker) useJoker(d.idx); else { toast(t('jokerNone'), 4000); sfx.bad(); }
  }
  else { if (d.kind !== 'nova') fly = { kind: d.kind, idx: d.idx, piece: d.piece, x0: g.cx, y0: g.cy, s0: g.s, t0: now }; sfx.bad(); bump(300); if (stuck()) toast(t('stuck'), 8000); }
}
cv.addEventListener('pointerup', e => drop(e, false));
cv.addEventListener('pointercancel', e => drop(e, true));
cv.addEventListener('lostpointercapture', e => drop(e, true));

/* ---------- arayüz ---------- */
// özgün altın taç simgesi (rekor): her telefonda aynı ve keskin görünür
const CROWN = s => `<svg width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true" style="vertical-align:-0.22em;flex:none">
  <defs>
    <linearGradient id="bzG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".35" stop-color="#FFD24A"/><stop offset=".75" stop-color="#F2A100"/><stop offset="1" stop-color="#C77700"/></linearGradient>
    <linearGradient id="bzG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFDB6B"/><stop offset="1" stop-color="#B86A00"/></linearGradient>
    <radialGradient id="bzP" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".4" stop-color="#FFE9A3"/><stop offset="1" stop-color="#D99000"/></radialGradient>
    <radialGradient id="bzR" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFC2D2"/><stop offset=".45" stop-color="#FF3D6E"/><stop offset="1" stop-color="#9E1238"/></radialGradient>
    <radialGradient id="bzB" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#D6F1FF"/><stop offset=".45" stop-color="#2FA8FF"/><stop offset="1" stop-color="#0B5DA8"/></radialGradient>
  </defs>
  <path d="M4.5 11.5L10 16.2 16 7.6l6 8.6 5.5-4.7-2.1 12H6.6z" fill="url(#bzG1)" stroke="#9A5800" stroke-width="1" stroke-linejoin="round"/>
  <path d="M7.6 14.6l2.6 2.2L16 9.6" fill="none" stroke="#FFF8DC" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
  <rect x="6" y="23" width="20" height="4.2" rx="2" fill="url(#bzG2)" stroke="#9A5800" stroke-width="1"/>
  <rect x="8" y="23.9" width="9" height="1.1" rx=".55" fill="#FFF3C4" opacity=".7"/>
  <circle cx="4.5" cy="11" r="2.3" fill="url(#bzP)" stroke="#9A5800" stroke-width=".8"/>
  <circle cx="16" cy="6.6" r="2.5" fill="url(#bzP)" stroke="#9A5800" stroke-width=".8"/>
  <circle cx="27.5" cy="11" r="2.3" fill="url(#bzP)" stroke="#9A5800" stroke-width=".8"/>
  <ellipse cx="16" cy="18.6" rx="2.3" ry="2.6" fill="url(#bzR)" stroke="#7A0E2B" stroke-width=".6"/>
  <circle cx="10.4" cy="20" r="1.5" fill="url(#bzB)" stroke="#08467E" stroke-width=".5"/>
  <circle cx="21.6" cy="20" r="1.5" fill="url(#bzB)" stroke="#08467E" stroke-width=".5"/></svg>`;
const IC = (d, extra = '') => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;
const ICONS = {
  sound: IC('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18.3 6.3a8 8 0 0 1 0 11.4"/>'),
  mute: IC('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  vib: IC('<rect x="7.5" y="4" width="9" height="16" rx="2.2"/><path d="M11 17h2"/><path d="M4 9v6M20 9v6M1.8 10.5v3M22.2 10.5v3"/>'),
  bell: IC('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" fill="currentColor"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>'),
  belloff: IC('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/><path d="M3.5 3.5l17 17"/>'),
  moon: IC('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor"/>'),
  sun: IC('<circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'),
};
const togs = () => `<div class="togs">
  <button class="ic ${cfg.sound ? 'on' : ''}" data-act="tSound" aria-label="sound">${cfg.sound ? ICONS.sound : ICONS.mute}</button>
  <button class="ic ${cfg.haptic ? 'on' : ''}" data-act="tHaptic" aria-label="vibration">${ICONS.vib}</button>
  <button class="ic ${cfg.notif ? 'on' : ''}" data-act="tNotif" aria-label="notifications">${cfg.notif ? ICONS.bell : ICONS.belloff}</button>
  <button class="ic on" data-act="tTheme" aria-label="theme">${cfg.theme === 'dark' ? ICONS.moon : ICONS.sun}</button>
  <button class="ic on" data-act="tLang">${cfg.lang.toUpperCase()}</button></div>${Ads.privacy ? `<button class="link" data-act="privacy">${t('privacy')}</button>` : ''}`;
function render() {
  document.documentElement.dataset.theme = cfg.theme; document.documentElement.lang = cfg.lang; document.documentElement.dir = cfg.lang === 'ar' ? 'rtl' : 'ltr'; readTheme();
  const home = $('home'), modal = $('modal'), sheet = $('sheet');
  home.hidden = view !== 'home'; modal.hidden = view !== 'pause' && view !== 'over' && view !== 'win' && view !== 'lang';
  if (view === 'home') {
    const sv = loadGame('classic'), dv = loadGame('daily'), db = bestFor('daily');
    home.innerHTML = `<div class="hero"><img class="hlogo" src="logo.jpg" alt="Block Zia"><img class="hzia" src="zia/full.webp" alt="Zia" data-act="ziaTap"><div class="hbub" id="hbub">${t('zPlay')}</div></div>
      <div class="tag">${t('tag')}</div>${stats.best ? `<div class="homebest">${CROWN(26)} ${fmt(stats.best)}</div><div style="margin-top:-6px;text-align:center;font-size:12px;font-weight:800;letter-spacing:.14em;color:var(--accent);opacity:.8">${t('record')}</div>` : `<div class="homebest">${CROWN(26)} <span style="font-size:.8em">${t('firstRec')}</span></div>`}
      <button class="btn" data-act="classic">${sv ? t('cont') : t('play')}<small>${t('classic')}${sv ? ' · ' + fmt(sv.score) : ''}</small></button>      <button class="btn alt" data-act="daily">${t('daily')}<small>${t('today')}${dv ? ' · ' + fmt(dv.score) : db ? ' · ' + CROWN(13) + ' ' + fmt(db) : ''}</small></button>${togs()}
      ${window.BLOKZIA_BUILD ? `<div style="margin-top:10px;font-size:11px;opacity:.45">sürüm ${window.BLOKZIA_BUILD}</div>` : ''}`;
  } else if (view === 'pause') {
    sheet.innerHTML = `<h2>${t('paused')}</h2><button class="btn" data-act="resume">${t('resume')}</button>
      <button class="btn ghost" data-act="again">${t('restart')}</button><button class="btn ghost" data-act="home">${t('home')}</button>${togs()}`;
  } else if (view === 'lang') { // dil seçimi: 14 dil, iki sütun
    sheet.innerHTML = `<h2>🌐</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%">${LANGS.map(([c, n]) =>
      `<button class="btn ${c === cfg.lang ? '' : 'ghost'}" style="margin:0;padding:10px 6px;font-size:15px" data-act="setLang" data-lang="${c}">${n}</button>`).join('')}</div>`;
  } else if (view === 'over') {
    sheet.innerHTML = `<h2>${t('over')}</h2>${S.mode === 'adv' ? `<div class="nb">${t('level')} ${S.level}</div>` : S.score > S.prev ? `<div class="nb">${t('newBest')}</div>` : ''}<div class="big">${fmt(S.score)}</div>
      <div class="sub">${CROWN(16)} ${t('record')}: ${fmt(Math.max(S.prev, S.score))} · ${t('lines')}: ${S.lines}</div>
      ${breakLine()}
      ${S.revived ? '' : `<button class="btn alt" data-act="revive">♥ ${t('revive')}</button>`}
      <button class="btn" data-act="again">${t('again')}</button><button class="btn ghost" data-act="home">${t('home')}</button>`;
    // hamle kalmadı: 4 sn sonra oyun kendiliğinden yeniden başlar (bir düğmeye basılırsa iptal)
    sheet.insertAdjacentHTML('beforeend', `<div class="sub" id="auto"></div>`);
    let left = 4; const tick = () => { const el = document.getElementById('auto'); if (view !== 'over' || !el) return clearInterval(autoT);
      if (left <= 0) { clearInterval(autoT); acts.again(false); return; } el.textContent = t('newIn') + left + '…'; left--; };
    clearInterval(autoT); autoT = setInterval(tick, 1000); tick();
  } else if (view === 'win') {
    sheet.innerHTML = `<h2>${t('win')}</h2><div class="nb">${t('level')} ${S.level}</div><div class="big">${fmt(S.score)}</div>
      <button class="btn green" data-act="next">${t('next')} →</button><button class="btn ghost" data-act="home">${t('home')}</button>`;
  }
  if (view === 'home' || view === 'pause') ziaHide();
  Music.sync();
  if (S) { $('mode').textContent = S.mode === 'adv' ? `${t('level')} ${S.level}` : t(S.mode === 'daily' ? 'dailyS' : 'classic'); hud(); $('score').textContent = fmt(Math.round(shown)); bump(100); }
}
let toastT = 0, autoT = 0, langBack = 'home', shineUntil = 0;
// pil dostu: Joker hazırken çubuktaki parlama sürekli değil, 4 saniyede bir kısa süre çalışır
setInterval(() => { if (S && S.joker && view === 'game' && !document.hidden) { shineUntil = performance.now() + 900; bump(950); } }, 4000);
function toast(msg, ms = 3500) { const el = $('toast'); el.textContent = msg; placeToast(el); el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
// oyun ekranında ipucu kutusu tahtanın hemen üstünde durur, tahta çerçevesini kapatmaz
function placeToast(el) {
  el.style.top = '';
  if (view !== 'game' || !L) return;
  const app = $('app').getBoundingClientRect(), cvr = $('cv').getBoundingClientRect();
  const boardTop = cvr.top + L.by - 8 - app.top; // çerçeve hücrelerin 8 px üstünden başlar
  el.style.top = Math.max(4, boardTop - el.offsetHeight - 6) + 'px';
}
// nazik mola önerisi: oyun ekranında toplam 45 dk oynanınca, günde bir kez, bir oyun bittiğinde küçük bir not olarak çıkar.
// Oyun ortasında kesinti yok, bildirim yok, sayaç ya da baskı yok.
let playMin = 0, breakDue = false;
setInterval(() => { if (view === 'game' && ++playMin >= 45 && stats.breakDay !== dateKey()) breakDue = true; }, 60000);
function breakLine() {
  if (!breakDue) return '';
  breakDue = false; stats.breakDay = dateKey(); LS.set('stats', stats);
  return `<div class="sub">${t('breakTip')}</div>`;
}
function start(mode, fresh) {
  const sv = fresh ? null : loadGame(mode);
  if (sv) S = sv; else newGame(mode);
  if (S.joker === undefined) S.joker = 1; // eski kayıtlar
  dying = []; parts = []; floats = []; beams = []; drag = fly = null; placeT.fill(-1e9); trayT = performance.now(); shown = S.score;
  view = 'game'; render(); layout();
  $('streak').classList.remove('on');
  $('toast').classList.remove('show'); clearTimeout(toastT); // önceki oyundan kalan ipucu yeni oyunda görünmesin
  if (stuck()) toast(t('stuck'), 8000);
  else if (S.goal && !sv) toast(S.goal.type === 'star' ? t('goalStar')(S.goal.need) : t('goalScore')(S.goal.need), 4000);
  try { history.pushState({ g: 1 }, ''); } catch {}
  ziaHide(); { const dg = $('danger'); if (dg) dg.classList.remove('on'); }
  if (stats.games <= 3 && !sv) setTimeout(() => zia('point', t('zHi'), 3200, true), 700);
  if (stats.games <= 1 && !sv && !S.goal) { toast(t('tip')); setTimeout(() => view === 'game' && toast(t('tip2')), 9000); }
}
const flip = k => () => { cfg[k] = !cfg[k]; LS.set('cfg', cfg); render(); };
const acts = {
  classic: () => start('classic'), daily: () => start('daily'), adv: () => start('adv'),
  next: () => { Ads.gameEnded(false); samp('levelnext', .8); LS.del('game.adv'); start('adv', true); },
  pause: () => { if (S && !S.over) { view = 'pause'; render(); } },
  resume: () => { view = 'game'; render(); },
  again: (user = true) => { if (S.over) Ads.gameEnded(user === true); S.over = true; LS.del('game.' + S.mode); start(S.mode, true); },
  home: () => { view = 'home'; render(); },
  revive: async () => {
    if (!(await Ads.secondChance())) return;
    S.over = false; S.revived = true;
    const ok = SHAPES.map((s, i) => i).filter(i => SHAPES[i].n <= 3 && anyFit(S.grid, SHAPES[i]));
    S.tray = [0, 1, 2].map(() => mkPiece(ok.length ? ok[ok.length * rnd() | 0] : 0)); trayT = performance.now();
    view = 'game'; save(); render(); bump(); setTimeout(() => zia('point', t('zGo'), 2000, true), 300);
  },
  ziaTap: () => { // ana ekrandaki Zia'ya dokununca zıplar, poz değiştirir, konuşur
    const im = document.querySelector('.hzia'), bb = $('hbub'); if (!im) return;
    const k = (acts.ziaN = ((acts.ziaN || 0) + 1) % 4), pose = ['joy', 'cool', 'smirk', 'full'][k]; im.classList.toggle('bust', pose === 'cool' || pose === 'smirk'), lines = [t('zPlay'), t('zRec'), t('zGo'), t('zHi')];
    im.src = 'zia/' + pose + '.webp'; im.classList.remove('hop'); void im.offsetWidth; im.classList.add('hop');
    if (bb) { bb.textContent = lines[k]; bb.style.animation = 'none'; void bb.offsetWidth; bb.style.animation = 'bubIn .35s cubic-bezier(.2,1.4,.4,1) both'; }
    samp('pick', .8); buzz(15);
  },
  privacy: () => Ads.privacyOptions(),
  tNotif: () => { cfg.notif = !cfg.notif; if (cfg.notif) { cfg.notifAsked = false; LS.set('cfg', cfg); Notif.ask(); } else { LS.set('cfg', cfg); Notif.cancel(); } render(); },
  tSound: flip('sound'), tMusic: flip('music'), tHaptic: flip('haptic'),
  tTheme: () => { cfg.theme = cfg.theme === 'dark' ? 'light' : 'dark'; LS.set('cfg', cfg); render(); },
  tLang: () => { if (view !== 'lang') langBack = view; view = 'lang'; render(); },
  setLang: () => { LS.set('cfg', cfg); view = langBack || 'home'; render(); },
};
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); clearInterval(autoT); if (b && acts[b.dataset.act]) { sfx.ui(); if (b.dataset.lang && LANG_CODES.includes(b.dataset.lang)) cfg.lang = b.dataset.lang; acts[b.dataset.act](); } });
document.addEventListener('pointerdown', () => { try { audio(); } catch {} setTimeout(() => Music.sync(), 50); }, { passive: true });
window.addEventListener('popstate', () => {
  if (view === 'home') return; // ana ekranda bir sonraki geri uygulamadan çıkar
  if (view === 'game' && S && !S.over) acts.pause(); else if (view === 'pause') acts.resume(); else { view = 'home'; render(); return; }
  try { history.pushState({ g: 1 }, ''); } catch {}
});
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (ac) document.hidden ? ac.suspend() : ac.resume(); Music.sync(); if (document.hidden && S && view === 'game' && !S.over) { save(); view = 'pause'; render(); } });
new ResizeObserver(() => { if (S) layout(); }).observe($('stage'));
render();
window.__blokzia = { Ads, ADS, toast, float, nova: (r, c) => novaBlast(r, c), fxGift: () => { parts.push({ kind: 'gift', vx: 0, vy: 0, x: L.bx + L.bs / 2, y: L.by + L.bs * .5, s: L.cell * 3.1, t0: performance.now(), life: 3800 }); bump(3900); }, fxTrophy: txt => { parts.push({ kind: 'trophy', vx: 0, vy: 0, x: L.bx + L.bs / 2, y: L.by + L.bs * .42, s: L.cell * 2.4, txt, t0: performance.now(), life: 3400 }); bump(3500); }, play: (i, r, c) => place('tray', i, S.tray[i], r, c), get smp() { return Object.keys(SMP); }, loadSamples, T, LANG_CODES, hasMove: () => hasMove(), get stats() { return stats; }, get vars() { return varState; }, variant, get audio() { return { ctx: ac && ac.state, music: Music.on }; }, get S() { return S; }, get L() { return L; }, SHAPES, fits, zia, powerFx, spawnPower, chainCheck, symGroups, get heat() { return heat; }, heatTick: n => heatTick(n), floatsLast: () => floats[floats.length - 1], iconImg, clearFx: () => { parts = []; floats = []; beams = []; dying = []; celebBusyUntil = 0; ziaHide(); $('toast').classList.remove('show'); bump(100); }, fullLines: g => fullLines(g), emoVal: () => emoVal(), newVar: id => { S.grid.fill(0); S.gem.fill(0); S.pk = null; S.pu = -1; S.over = false; S.won = false; setupVariant(id); S.tray = genTray(); S.next = genTray(); bump(300); } }; // test/hata ayıklama
Ads.init();
})();
