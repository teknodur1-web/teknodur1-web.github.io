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
const t = k => (T[cfg.lang] && T[cfg.lang][k] !== undefined ? T[cfg.lang][k] : T.en[k]);
// sesli övgü: telefonun kendi seslendirme motoru, seçili dilde (internet gerekmez)
const VOICE = { tr: 'tr-TR', en: 'en-US', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', ru: 'ru-RU', ar: 'ar-SA', hi: 'hi-IN', id: 'id-ID', ja: 'ja-JP', zh: 'zh-CN', ko: 'ko-KR' };
let lastSay = 0;
const voiceOK = {}; // dil başına: telefonda o dilin sesi var mı
function say(text, enText) {
  if (!cfg.sound || !text) return;
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
const SMP_NAMES = ['press','whoosh','pick','ui','clear','combo','coin','streak','joker','nova','clean','levelwin','levelnext','record','over','bad'];
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
    if (navigator.vibrate) navigator.vibrate(Math.min(ms, 40));
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
// emoji değeri: türüne göre 5/10/15, bitirilen her 10 bölümde +5
function emoVal() {
  const ix = EMOJI_SYMS.indexOf(S && S.var ? S.var.sym : ''); const tier = ix >= 0 ? ix % 3 : 0;
  return 5 * (tier + 1) + 5 * Math.floor((varState && varState.done ? varState.done.length : 0) / 10);
}
const VAR_SYMS = (s => s.length >= 8 ? s : ['star', '◆', '♥', '✚', '●', '▲', '☀', '☾', '♣', '✿', '⚡', '♛'])(EMOJI_SYMS.filter(emojiOK));
const VAR_PATTERNS = ['empty', 'scatter', 'corners', 'frame', 'diag', 'cross', 'pillars', 'steps', 'checker', 'heart', 'ring', 'zigzag'];
const VAR_BONUS = ['none', 'combo', 'clean', 'gem', 'line'];
function variant(id) {
  let a = seedOf('bz-var-' + id);
  const r = () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), a | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  return { id, sym: VAR_SYMS[(id * 13 + (r() * 5 | 0)) % VAR_SYMS.length], pattern: VAR_PATTERNS[(id * 5 + (r() * 4 | 0)) % VAR_PATTERNS.length],
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
    celebrate(() => { parts.push({ kind: 'trophy', vx: 0, vy: 0, x: cx, y: cy, s: L.cell * 2.4, txt: '+100', t0: performance.now(), life: 3400 }); bump(3500); confetti(cx, cy, 30, 260); glow(cx, cy, L.cell * 2.4, '#FFE08A', 600); samp('levelnext', .8); buzz(30); }, 3500);
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
function setupVariant() {
  const v = variant(nextVariant());
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
let dying = [], parts = [], floats = [], beams = [], shakeEnd = 0, shakeAmp = 0, trayT = -1e9;
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
function sym(cx, cy, s, c = 1) {
  const k = S && S.var ? S.var.sym : 'star';
  if (k === 'star') return star(cx, cy, s * .26);
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
  ctx.restore();
}
function tile(c, x, y, s, gem) { ctx.drawImage((gem ? sprites : spritesF)[c - 1], x, y, s, s); if (gem) sym(x + s / 2, y + s / 2, s, c); }
function drawPiece(p, cx, cy, cs) { const sh = SHAPES[p.s], x0 = cx - sh.w * cs / 2, y0 = cy - sh.h * cs / 2; sh.cells.forEach(([y, x], k) => tile(p.c, x0 + x * cs, y0 + y * cs, cs, k === p.g)); }
const center = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 + L.cell * .12 });
const slotC = i => ({ x: L.bx + L.slotW * (i + .5), y: L.trayY + L.trayH / 2 });
const inBox = (b, x, y, pad = 0) => x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;

function geom(now) {
  const d = drag, sh = d.sh, k = ease(Math.min(1, (now - d.t0) / 130)), s = d.s0 + (L.cell - d.s0) * k;
  const lift = d.touch ? (L.cell * 1.3 + sh.h * L.cell / 2) * k : 0, cx = d.px, cy = d.py - lift;
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
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, L.W, L.H);
  if (drag) updatePreview(now);
  ctx.save();
  if (now < shakeEnd) { const e = 1 - (shakeEnd - now) / 260; ctx.translate(Math.sin(e * Math.PI * 3) * shakeAmp * (1 - e) ** 2, 0); }
  path(ctx, bx - 8, by - 8, bs + 16, bs + 16, cell * .34); ctx.fillStyle = C.board; ctx.fill();
  ctx.fillStyle = C.cell;
  for (let i = 0; i < 64; i++) { path(ctx, bx + (i % N) * cell + 2, by + (i / N | 0) * cell + 2, cell - 4, cell - 4, cell * .2); ctx.fill(); }
  if (S.over) ctx.globalAlpha = .45;
  for (let i = 0; i < 64; i++) {
    const v = S.grid[i]; if (!v) continue;
    const x = bx + (i % N) * cell, y = by + (i / N | 0) * cell, k = (now - placeT[i]) / 200;
    if (k < 1) { const s = .55 + .45 * back(Math.max(0, k)), o = cell * (1 - s) / 2; tile(v, x + o, y + o, cell * s, S.gem[i]); } else tile(v, x, y, cell, S.gem[i]);
  }
  ctx.globalAlpha = 1;
  // altın güç-up yıldızı (nabız gibi atar)
  if (S.pu >= 0 && !S.grid[S.pu] && !S.over) {
    const x = bx + (S.pu % N + .5) * cell, y = by + ((S.pu / N | 0) + .5) * cell, pz = 1 + .09 * Math.sin(now / 170);
    const g = ctx.createRadialGradient(x, y, 0, x, y, cell * .62); g.addColorStop(0, 'rgba(255,214,90,.55)'); g.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, cell * .62, 0, 7); ctx.fill();
    star(x, y + cell * .02, cell * .36 * pz, '#E89A00'); star(x, y, cell * .34 * pz, '#FFC93C'); star(x - cell * .04, y - cell * .05, cell * .16 * pz, '#FFF3B0');
  }
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
  beams = beams.filter(b => now < b.t0 + 350);
  ctx.fillStyle = '#fff';
  for (const b of beams) {
    const k = (now - b.t0) / 350; if (k < 0) continue;
    const th = cell * (1 - k * .7), o = (cell - th) / 2; ctx.globalAlpha = (1 - k) * .7;
    if (b.row) path(ctx, bx, by + b.i * cell + o, bs, th, th / 2); else path(ctx, bx + b.i * cell + o, by, th, bs, th / 2);
    ctx.fill();
  }
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
      p.vy += 520 * dt; p.vx *= 1 - 1.6 * dt; p.vy *= 1 - 1.1 * dt; if (p.vy > 190) p.vy = 190; p.rot += p.vr * dt;
      const el2 = (now - p.t0) / 1000, sway = Math.sin(el2 * 4 + (p.ph || 0)) * L.cell * .18, z = p.w || L.cell * .16;
      ctx.globalAlpha = k > .8 ? (1 - k) / .2 : 1; ctx.save(); ctx.translate(p.x + sway, p.y); ctx.rotate(p.rot);
      const flip = Math.cos(el2 * 6 + (p.ph || 0)); ctx.fillStyle = p.col; ctx.strokeStyle = p.col; ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1.5;
      if (p.shape === 'ribbon') { // kıvrımlı serpantin
        ctx.lineWidth = Math.max(3, (p.h || 4) * 1.25); ctx.lineCap = 'round'; ctx.beginPath();
        for (let q = 0; q <= 10; q++) { const u = q / 10, xx = (u - .5) * z * 3, yy = Math.sin(u * 7 + el2 * 8 + (p.ph || 0)) * z * .32; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke(); ctx.globalAlpha *= .45; ctx.strokeStyle = '#fff'; ctx.lineWidth *= .35; ctx.stroke();
      } else if (p.shape === 'star') { ctx.scale(1, Math.abs(flip) * .6 + .4); star(0, 0, z * .78, p.col); }
      else if (p.shape === 'circle') { ctx.scale(Math.abs(flip) * .6 + .4, 1); ctx.beginPath(); ctx.arc(0, 0, z * .32, 0, 6.283); ctx.fill(); }
      else { ctx.scale(1, Math.abs(flip) * .8 + .2); ctx.fillRect(-z / 2, -(p.h || 4) / 2, z, p.h || 4); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-z / 2, -(p.h || 4) / 2, z, (p.h || 4) * .35); }
      ctx.restore(); continue;
    }
    if (p.kind === 'gift') { // hediye paketi: düşer, sallanır, kapak fırlar, ışık ve konfeti, Joker rozeti
      const el = now - p.t0, s2 = p.s, a = p.life - el < 400 ? Math.max(0, (p.life - el) / 400) : 1;
      const drop = el < 500 ? back(el / 500) : 1, gy = p.y - (1 - drop) * L.cell * 4, shake = el > 500 && el < 1050 ? Math.sin(el / 28) * .12 * (1 - (el - 500) / 550) : 0;
      if (el >= 1050 && !p.burst) { p.burst = true; glow(p.x, p.y - s2 * .1, s2 * 1.1, '#FFE08A', 700); confetti(p.x, p.y - s2 * .15, 34, 280);
        float('✦ ' + t('joker'), p.x, p.y - s2 * .75, L.cell * .56, C.accent, 0, 'badge'); float(t('surprise'), p.x, p.y + s2 * .78, L.cell * .44, '#FFD27A', 120, true);
        samp('levelwin', .8) || sfx.clean(); }
      ctx.save(); ctx.globalAlpha = a * .45; ctx.fillStyle = '#0B0620'; path(ctx, L.bx - 8, L.by - 8, L.bs + 16, L.bs + 16, L.cell * .34); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = a;
      if (p.burst) { // açılınca arkada dönen ışık
        const el2 = el - 1050; ctx.save(); ctx.globalAlpha = a * Math.min(1, el2 / 200) * .5; ctx.translate(p.x, gy - s2 * .05); ctx.rotate(el2 / 1500);
        for (let r = 0; r < 10; r++) { ctx.rotate(Math.PI / 5); const g = ctx.createLinearGradient(0, 0, 0, -s2 * .95); g.addColorStop(0, 'rgba(255,230,140,.9)'); g.addColorStop(1, 'rgba(255,230,140,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s2 * .1, -s2 * .95); ctx.lineTo(s2 * .1, -s2 * .95); ctx.closePath(); ctx.fill(); }
        ctx.restore(); }
      ctx.translate(p.x, gy + s2 * .43); ctx.rotate(shake); ctx.translate(-p.x, -(gy + s2 * .43));
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
    if (p.kind === 'cube') { // dönerek küçülen parlak mini küp
      p.vy += 900 * dt; p.rot += p.vr * dt; const z = p.s * (1 - k * .55); ctx.globalAlpha = k > .65 ? (1 - k) / .35 : 1;
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
    const s = f.size * (k < .18 ? .85 + .15 * ease(k / .18) : 1);
    ctx.globalAlpha = el < 120 ? el / 120 : f.life - el < 350 ? Math.max(0, (f.life - el) / 350) : 1; // sabit süreli belirme/kaybolma
    ctx.font = `800 ${s}px ${C.ff}`;
    const w = ctx.measureText(f.txt).width, padX = f.pill === 'badge' ? s * .85 : f.pill ? s * .6 : 0, half = w / 2 + padX + 4;
    // yazı tahtanın dışına taşmasın
    const x = Math.min(Math.max(f.x, L.bx + half), L.bx + L.bs - half), y = f.y - ease(k) * 28;
    if (f.pill === 'badge') { // Joker rozeti: mor-pembe parlak hap, altın kenar, altın harfler
      const h = s * 1.7, x0 = x - w / 2 - padX, bw = w + padX * 2, bg = ctx.createLinearGradient(x0, 0, x0 + bw, 0);
      bg.addColorStop(0, '#6A3BE0'); bg.addColorStop(1, '#E0428E');
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = s * .5; ctx.shadowOffsetY = s * .12;
      path(ctx, x0, y - h / 2, bw, h, h / 2); ctx.fillStyle = bg; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.lineWidth = Math.max(2, s * .12); ctx.strokeStyle = '#FFD24A'; ctx.stroke();
      path(ctx, x0 + h * .3, y - h * .42, bw - h * .6, h * .32, h * .16); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill();
      const tg = ctx.createLinearGradient(0, y - s / 2, 0, y + s / 2); tg.addColorStop(0, '#FFF4C2'); tg.addColorStop(.55, '#FFD24A'); tg.addColorStop(1, '#F29A00');
      ctx.lineJoin = 'round'; ctx.lineWidth = s * .2; ctx.strokeStyle = '#4A1A00'; ctx.strokeText(f.txt, x, y + s * .04); ctx.fillStyle = tg; ctx.fillText(f.txt, x, y + s * .04);
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
function frame(now) {
  raf = 0; if (!S || !L) return;
  if (shown !== S.score) { shown += (S.score - shown) * .22; if (Math.abs(S.score - shown) < 1) shown = S.score; $('score').textContent = fmt(Math.round(shown)); }
  draw(now);
  if (now < animUntil || drag || fly || shown !== S.score || S.nova >= NOVA_MAX || stuck() || (S.pu >= 0 && !S.over)) raf = requestAnimationFrame(frame);
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
function float(txt, x, y, size, col, delay = 0, pill = false) {
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
  hud();
  // "sığmıyor" / Joker ipucu, sorun çözülünce hemen kaybolur
  const te = $('toast');
  if (te.classList.contains('show') && (te.textContent === t('stuck') || te.textContent === t('jokerHint')) && !stuck()) { te.classList.remove('show'); clearTimeout(toastT); }
  const st = $('streak'); st.textContent = S.streak >= 2 ? `🔥 ${t('streak')} x${S.streak}` : ''; st.classList.toggle('on', S.streak >= 2);
  // oyun içi rekor kutlaması
  if (S.mode !== 'adv' && S.prev > 0 && !S.cheered && S.score > S.prev) {
    S.cheered = true; celebrate(() => { shower(34); say(t('newBest'), T.en.newBest); float(t('newBest'), L.bx + L.bs / 2, L.by + L.bs * .56, L.cell * .8, C.accent, 450); setTimeout(() => samp('record', .9) || sfx.clean(), 400); buzz(30); }, 2300);
  }
  // macera: hedefe ulaşıldı mı?
  const g = S.goal;
  if (g && !S.won && (g.type === 'star' ? g.have >= g.need : S.score >= g.need)) {
    S.won = true; S.over = true; stats.adv = Math.max(stats.adv, S.level + 1);
    float(t('win'), L.bx + L.bs / 2, L.by + L.bs * .45, L.cell * .85, C.accent, 300); setTimeout(() => samp('levelwin', .9) || sfx.clean(), 300); buzz(60);
    setTimeout(() => { if (S.won) { view = 'win'; render(); } }, 1300); save(); bump(1500); return;
  }
  if (!hasMove()) { S.over = true; sfx.over(); buzz(60); if (stats.games >= 3) setTimeout(() => Notif.ask(), 1500); setTimeout(() => { if (S.over) { view = 'over'; render(); } }, 1000); }
  else if (stuck()) toast(t('stuck'), 8000);
  else if (S.joker && !S.tray.some(p => p && anyFit(S.grid, SHAPES[p.s])) && !(S.hold && anyFit(S.grid, SHAPES[S.hold.s]))) toast(t('jokerHint'), 8000);
  save(); bump(1200);
}
function place(kind, idx, piece, r, c) {
  const sh = SHAPES[piece.s], now = performance.now(), cell = L.cell;
  sh.cells.forEach(([y, x], k) => { const i = (r + y) * N + c + x; S.grid[i] = piece.c; S.gem[i] = k === piece.g ? 1 : 0; placeT[i] = now; });
  if (kind === 'tray') S.tray[idx] = null; else S.hold = null;
  let gain = sh.n; S.lastC = piece.c;
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
    for (const i of set) if (S.gem[i]) { const v = emoVal(); emoPts += v; emoCells.push([i, v]); }
    for (const i of set) { gems += S.gem[i]; const t1 = now + 60 + Math.hypot((i % N) - (c + sh.w / 2 - .5), (i / N | 0) - (r + sh.h / 2 - .5)) * 28; if (S.grid[i]) { shards(i, S.grid[i], t1, 4, true); glow(L.bx + (i % N + .5) * cell, L.by + ((i / N | 0) + .5) * cell, cell * .75, '#FFFFFF', 320, t1); } kill(i, t1); }
    // patlayan çizgi boyunca sırayla yanan ışıltılar
    rows.forEach(rw => { for (let j = 0; j < N; j++) parts.push({ kind: 'spark', s4: true, x: L.bx + (j + .5) * cell, y: L.by + (rw + .5) * cell, r: cell * .16, col: '#FFFFFF', t0: now + 60 + j * 22, life: 420 }); });
    cols.forEach(cl => { for (let j = 0; j < N; j++) parts.push({ kind: 'spark', s4: true, x: L.bx + (cl + .5) * cell, y: L.by + (j + .5) * cell, r: cell * .16, col: '#FFFFFF', t0: now + 60 + j * 22, life: 420 }); });
    rows.forEach(i => beams.push({ row: true, i, t0: now + 40 })); cols.forEach(i => beams.push({ row: false, i, t0: now + 40 }));
    S.streak++; S.since = 0; S.lines += n; stats.lines += n;
    if (S.goal && S.goal.type === 'star') S.goal.have += gems;
    const B = S.var ? S.var.bonus : 'none'; // gizli maceranın puan kuralı
    let pts = Math.round(10 * n * (n + 1) / 2 * S.streak * (B === 'combo' && S.streak >= 2 ? 1.5 : 1) + gems * (B === 'gem' ? 40 : 20) + (B === 'line' ? n * 15 : 0));
    const clean = S.grid.every(v => !v); if (clean) pts += B === 'clean' ? 500 : 200;
    if (emoPts) { // her patlayan emoji kendi puanını gösterir (çoksa tek toplam)
      pts += emoPts;
      if (emoCells.length <= 4) emoCells.forEach(([i, v], q) => float('+' + v, L.bx + (i % N + .5) * cell, L.by + ((i / N | 0) + .2) * cell, cell * .4, '#FFE27A', 180 + q * 90, true));
      else float('+' + emoPts, px, py - cell * .9, cell * .46, '#FFE27A', 200, true);
    }
    if (mono) { // tek renk çizginin puanı 3 katı, Joker çubuğu dolar, kutlama
      pts += Math.round(10 * n * (n + 1) / 2 * S.streak * 2 * mono / n); S.jbar = JB_MAX;
      const [, cl] = PALETTE[monoCol - 1], cy2 = L.by + L.bs * .2;
      float('🌈 ' + t('combo'), L.bx + L.bs / 2, cy2, cell * .52, C.accent, 60, 'badge');
      monoR.forEach(rw => glow(L.bx + L.bs / 2, L.by + (rw + .5) * cell, L.bs * .55, cl, 600, now));
      monoC.forEach(cc => glow(L.bx + (cc + .5) * cell, L.by + L.bs / 2, L.bs * .55, cl, 600, now));
      confetti(px, py, 26, 260); setTimeout(() => say(t('combo'), T.en.combo), 700); buzz(35);
    }
    // gizli sembol hedefi: oyuncu bilmez; tamamlanınca sürpriz ödül
    if (S.hidden && !S.hidden.done && gems) {
      S.hidden.have += gems;
      if (S.hidden.have >= S.hidden.need) {
        S.hidden.done = true; pts += 300 + levelDone(); S.joker = 1;
        celebrate(() => { parts.push({ kind: 'gift', vx: 0, vy: 0, x: L.bx + L.bs / 2, y: L.by + L.bs * .5, s: L.cell * 3.1, t0: performance.now(), life: 3800 }); bump(3900); setTimeout(() => buzz(40), 1050); }, 3900);
      }
    }
    gain += pts; S.nova = Math.min(NOVA_MAX, S.nova + gems + (n >= 2 ? 1 : 0));
    float('+' + pts, px, py, cell * .48, '#FFFFFF', 0, true);
    if (S.streak >= 2) float(`🔥 ${t('streak')} x${S.streak}`, px, py + cell * .88, cell * .46, '#FFD27A', 90, true);
    // övgü: 2 satır "Güzel", 3 satır ya da 3'lü seri "Harika", 4 satır ya da 5'li seri "Muhteşem", 5 satır "Efsane"
    const pi = Math.min(5, Math.max(n, S.streak >= 5 ? 4 : S.streak >= 3 ? 3 : 0)), praise = clean ? t('clean') : t('praise')[pi];
    const praiseEn = clean ? T.en.clean : T.en.praise[pi];
    if (praise) { if (!celebOn()) float(praise, L.bx + L.bs / 2, L.by + L.bs * .36, cell * .78, C.accent, 120); setTimeout(() => say(praise, praiseEn), 150); }
    if (n >= 2) { shakeEnd = now + 260; shakeAmp = Math.min(5, 1.5 + n); confetti(px, py, 10 + n * 6); } else confetti(px, py, 7, 170);
    if (clean) { shower(46); glow(L.bx + L.bs / 2, L.by + L.bs / 2, L.bs * .6, '#FFF3C4', 700, now); }
    if (S.streak >= 3) parts.push({ kind: 'ring', x: L.bx + L.bs / 2, y: L.by + L.bs / 2, r: L.bs * .3, R: L.bs * .6, col: '#FFB84D', t0: now, life: 650 });
    sfx.clear(n, S.streak); buzz(20 + n * 15);
    for (let k = 0; k < Math.min(3 + n, 6); k++) setTimeout(() => sfx.coin(k), 380 + k * 70);
    if (clean) setTimeout(sfx.clean, 250);
    if (!stats.seenJB && !S.joker) { stats.seenJB = 1; LS.set('stats', stats); setTimeout(() => (!$('toast').classList.contains('show') && toast(t('jbTip'), 5000)), 1200); }
    S.jbar = Math.min(JB_MAX, (S.jbar || 0) + n); if (n >= 2 || S.streak >= 3) S.jbar = JB_MAX; // çubuk: her satır doldurur, iyi hamle tamamlar
    if (!S.joker && S.jbar >= JB_MAX) { S.joker = 1; S.jbar = 0; float('✦ ' + t('jokerGot'), L.bx + L.bs / 2, L.by + L.bs * .82, cell * .52, C.accent, 900, 'badge'); setTimeout(sfx.joker, 550); }
  } else { S.since++; if (S.since >= 3) S.streak = 0; sfx.place(); buzz(12); }
  S.score += gain;
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
const CONF_SHAPES = ['ribbon', 'rect', 'star', 'ribbon', 'rect', 'circle'];
function confetti(x, y, n, v0 = 240) {
  const R = Math.random, now = performance.now();
  for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (R() - .5) * 2.6, v = v0 + R() * v0;
    parts.push({ kind: 'conf', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: L.cell * (.16 + R() * .1), h: L.cell * (.08 + R() * .05), rot: R() * 6.28, vr: (R() - .5) * 12, col: CONF_COLS[k % CONF_COLS.length], shape: CONF_SHAPES[k % CONF_SHAPES.length], ph: R() * 6.28, t0: now + R() * 80, life: 1000 + R() * 500 }); }
  bump(1700);
}
function shower(n) {
  const R = Math.random, now = performance.now();
  for (let k = 0; k < n; k++) parts.push({ kind: 'conf', x: L.bx + R() * L.bs, y: L.by - L.cell * (.3 + R() * 1.2), vx: (R() - .5) * 60, vy: 60 + R() * 120, w: L.cell * (.16 + R() * .1), h: L.cell * (.08 + R() * .05), rot: R() * 6.28, vr: (R() - .5) * 10, col: CONF_COLS[k % CONF_COLS.length], shape: CONF_SHAPES[k % CONF_SHAPES.length], ph: R() * 6.28, t0: now + R() * 700, life: 1700 + R() * 600 });
  bump(2600);
}
function glow(x, y, r, col, life = 450, t0 = performance.now()) { parts.push({ kind: 'glow', x, y, r, col, t0, life }); }
function novaBlast(r, c) {
  const now = performance.now(); let cnt = 0;
  for (const [y, x] of NOVA_SHAPE.cells) { const i = (r + y) * N + c + x, col = S.grid[i]; if (col) { cnt++; const t0 = now + Math.hypot(x - 1, y - 1) * 50; shards(i, col, t0); kill(i, t0); } }
  parts.push({ kind: 'ring', x: L.bx + (c + 1.5) * L.cell, y: L.by + (r + 1.5) * L.cell, r: L.cell * .5, R: L.cell * 2.6, col: '#FFFFFF', t0: now, life: 500 });
  glow(L.bx + (c + 1.5) * L.cell, L.by + (r + 1.5) * L.cell, L.cell * 2.2, '#FFFFFF', 420, now);
  bump(1400);
  S.nova = 0; S.score += cnt * 5; shakeEnd = now + 260; shakeAmp = 5; sfx.nova(); buzz(50);
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
    home.innerHTML = `<img class="hlogo" src="logo.jpg" alt="Block Zia">
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
    view = 'game'; save(); render(); bump();
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
window.__blokzia = { Ads, ADS, toast, float, fxGift: () => { parts.push({ kind: 'gift', vx: 0, vy: 0, x: L.bx + L.bs / 2, y: L.by + L.bs * .5, s: L.cell * 3.1, t0: performance.now(), life: 3800 }); bump(3900); }, fxTrophy: txt => { parts.push({ kind: 'trophy', vx: 0, vy: 0, x: L.bx + L.bs / 2, y: L.by + L.bs * .42, s: L.cell * 2.4, txt, t0: performance.now(), life: 3400 }); bump(3500); }, play: (i, r, c) => place('tray', i, S.tray[i], r, c), get smp() { return Object.keys(SMP); }, loadSamples, T, LANG_CODES, hasMove: () => hasMove(), get stats() { return stats; }, get vars() { return varState; }, variant, get audio() { return { ctx: ac && ac.state, music: Music.on }; }, get S() { return S; }, get L() { return L; }, SHAPES, fits }; // test/hata ayıklama
Ads.init();
})();
