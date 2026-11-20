// Template gallery copy (_specs/70-PRD-seo.md §3.F, S10): one page per template the picker offers, BM only.
// Every page has its own text (tested: no long sentence shared between pages). Field labels are NOT
// here: the pages read them from the template schema (src/templates/schema.ts).
import { PICKER_KEYS, type PickerKey } from "@/templates";

export interface TemplatePage {
  key: PickerKey;
  /** URL segment: /templat/<slug>/ */
  slug: string;
  /** <title> (≤ 60, ends with " · Masjid View") and meta description (120–155). */
  title: string;
  description: string;
  h1: string;
  /** Answer first: what it is for (40–60 words). */
  intro: string;
  /** Bila menggunakannya */
  when: string;
  /** Bagaimana ia dipaparkan */
  display: string;
  /** One line under the field list. */
  fieldsNote: string;
  tips: string[];
  relatedTemplates: PickerKey[];
  /** Article slugs; drafts are left out when rendering. */
  relatedArticles: string[];
  /** "layout": no real render yet (Ayat: the verse list awaits review), the layout thumbnail instead. */
  render: "real" | "layout";
}

const CARA_PASANG = "cara-pasang-skrin-waktu-solat-tv-masjid";
const RAMADAN = "ramadan-2027-tarikh-jangkaan";
const SENARAI_SEMAK = "senarai-semak-ramadan-ajk-masjid";

export const TEMPLATE_PAGES: Record<PickerKey, TemplatePage> = {
  pengumuman: {
    key: "pengumuman",
    slug: "pengumuman-am",
    title: "Templat pengumuman am untuk skrin masjid · Masjid View",
    description: "Templat pengumuman am untuk TV masjid dan surau: tajuk, isi ringkas dan tarikh sah. Sesuai untuk gotong-royong, makluman AJK dan notis umum kepada jemaah.",
    h1: "Templat Pengumuman Am untuk skrin masjid",
    intro: "Templat Pengumuman Am ialah cara paling cepat untuk memaklumkan sesuatu kepada jemaah di TV masjid: gotong-royong, penutupan tempat letak kereta, kutipan barang atau sebarang makluman AJK. Isikan tajuk dan beberapa ayat, dan skrin menyusunnya mengikut tema yang dipilih. Ia sesuai untuk masjid besar dan surau kecil.",
    when: "Gunakan templat ini apabila makluman tidak sesuai dengan templat lain, contohnya notis kebersihan, perubahan waktu pejabat masjid atau makluman bekalan air terputus. Isi medan Daripada supaya jemaah tahu biro mana yang mengeluarkan notis, dan Sah sehingga supaya mereka tahu berapa lama makluman itu berkuat kuasa. Untuk acara yang bertarikh dan bertempat, templat Program lebih sesuai kerana ia menambah kiraan detik.",
    display: "Di skrin, tajuk dipaparkan besar di bahagian atas, diikuti isi pengumuman dalam teks yang mudah dibaca dari jauh. Nama pengeluar dan tarikh sah diletakkan di bahagian bawah, berasingan daripada isi supaya tidak bercampur.",
    fieldsNote: "Hanya tajuk dan isi pengumuman wajib diisi.",
    tips: [
      "Satu pengumuman, satu perkara: jika ada dua makluman, buat dua slaid.",
      "Hadkan isi kepada dua atau tiga ayat; jemaah membaca skrin sekilas sahaja.",
      "Tandakan Keutamaan untuk makluman segera supaya ia dipaparkan dua kali lebih kerap.",
    ],
    relatedTemplates: ["program", "mesyuarat", "ucapan"],
    relatedArticles: [CARA_PASANG],
    render: "real",
  },
  kuliah: {
    key: "kuliah",
    slug: "kuliah-ceramah",
    title: "Templat kuliah & ceramah untuk skrin masjid · Masjid View",
    description: "Templat poster kuliah dan ceramah untuk TV masjid: isi tajuk, penceramah, tarikh dan masa, skrin memaparkannya dengan kiraan detik. Percuma untuk AJK.",
    h1: "Templat Kuliah / Ceramah untuk skrin masjid",
    intro: "Templat Kuliah / Ceramah memaparkan kuliah Maghrib, kuliah Dhuha, tazkirah atau ceramah khas di TV masjid. AJK hanya mengisi tajuk, nama penceramah, tarikh, masa dan tempat; Masjid View menyusunnya mengikut tema skrin dan menambah kiraan detik secara automatik sebelum kuliah bermula.",
    when: "Gunakan templat ini untuk kuliah berjadual mingguan dan untuk ceramah jemputan. Pilih siri seperti Kuliah Maghrib atau Kuliah Subuh supaya jemaah mengenal pasti program tetap dengan cepat, dan tambah foto penceramah jika ada. Jika kuliah ditangguhkan, tekan Tangguhkan pada slaid yang sama; cop DITANGGUHKAN dan tarikh baharu terus dipaparkan tanpa poster baharu. Untuk ceramah sempena Maulidur Rasul atau Israk dan Mikraj, pilih siri Ceramah Khas dan tandakan Keutamaan supaya slaid itu dipaparkan dua kali lebih kerap.",
    display: "Di skrin, siri kuliah muncul di bahagian atas, diikuti tajuk dalam huruf besar dan nama penceramah. Tarikh, masa dan tempat diletakkan di bawah, dan sehari sebelum kuliah baris kiraan detik seperti “Esok · Selepas Maghrib” atau “Bermula dalam 45 minit” ditambah secara automatik.",
    fieldsNote: "Medan bertanda * wajib diisi; yang lain boleh dibiarkan kosong.",
    tips: [
      "Tulis tajuk yang ringkas, sebaik-baiknya kurang daripada lapan patah perkataan, supaya boleh dibaca dari belakang dewan.",
      "Bagi siri mingguan, tekan Duplikasi untuk minggu depan: tarikh beralih tujuh hari dan maklumat lain kekal sama.",
      "Tetapkan tarikh tamat pada hari kuliah supaya slaid hilang sendiri selepas program selesai.",
    ],
    relatedTemplates: ["program", "penangguhan", "mesyuarat"],
    relatedArticles: [CARA_PASANG],
    render: "real",
  },
  kematian: {
    key: "kematian",
    slug: "notis-kematian",
    title: "Templat notis kematian untuk skrin masjid · Masjid View",
    description: "Templat notis kematian untuk TV masjid: nama Allahyarham, waktu dan tempat solat jenazah dan tanah perkuburan. Paparan tenang tanpa hiasan, tamat sendiri.",
    h1: "Templat notis kematian untuk skrin masjid",
    intro: "Templat Kematian memaklumkan jemaah tentang kematian ahli kariah dan waktu solat jenazah. Paparannya sengaja ringkas dan tenang: tiada warna terang dan tiada hiasan, hanya nama Allahyarham atau Allahyarhamah, butiran solat jenazah dan tanah perkuburan, supaya maklumat sampai dengan penuh hormat.",
    when: "Gunakan templat ini sebaik sahaja keluarga bersetuju makluman dibuat. Isikan masa dan tempat solat jenazah dengan jelas, contohnya Selepas Zohor di masjid ini, kerana itulah maklumat yang paling dicari oleh jemaah. Notis kematian dipaparkan paling lama tujuh hari dan dipadam secara automatik selepas itu, jadi AJK tidak perlu mengingati untuk membuangnya. Jika solat jenazah diadakan di masjid lain, nyatakan nama masjid itu dalam medan tempat supaya jemaah tidak tersilap.",
    display: "Di skrin, notis bermula dengan kalimah istirja’ dalam tulisan Arab, diikuti nama Allahyarham atau Allahyarhamah. Butiran solat jenazah dan tanah perkuburan dipaparkan dalam warna kelabu yang lembut, sama dalam setiap tema, tanpa ikon atau warna aksen.",
    fieldsNote: "Medan bertanda * wajib diisi; umur dan alamat hanya dipaparkan jika diisi.",
    tips: [
      "Dapatkan izin keluarga sebelum memaparkan umur atau alamat; kedua-duanya pilihan.",
      "Semak ejaan nama bersama keluarga, termasuk bin atau binti, sebelum menekan Terbit.",
      "Tetapkan tarikh tamat sehari selepas pengebumian; sistem tidak membenarkan notis melebihi tujuh hari.",
    ],
    relatedTemplates: ["pengumuman"],
    relatedArticles: [CARA_PASANG],
    render: "real",
  },
  program: {
    key: "program",
    slug: "program",
    title: "Templat program masjid untuk skrin TV · Masjid View",
    description: "Templat program untuk TV masjid: nama, tarikh, masa, tempat dan penganjur, dengan kiraan detik sebelum bermula. Sesuai untuk hari keluarga dan majlis.",
    h1: "Templat Program untuk skrin masjid",
    intro: "Templat Program mengiklankan aktiviti masjid yang bertarikh dan bertempat, seperti hari keluarga, kursus pengurusan jenazah, majlis berbuka puasa atau gotong-royong perdana. AJK mengisi nama program, tarikh, masa dan tempat, dan skrin menambah kiraan hari atau minit sebelum program bermula. Penganjur dan nombor untuk dihubungi turut dipaparkan.",
    when: "Pilih templat ini untuk acara sekali-sekala yang memerlukan kehadiran jemaah. Medan Penerangan sesuai untuk satu atau dua ayat tentang pengisian program, manakala Penganjur dan Hubungi membantu jemaah yang ingin bertanya atau mendaftar. Jika program dibatalkan kerana cuaca atau sebab lain, tekan Batalkan pada slaid yang sama dan cop DIBATALKAN dipaparkan bersama sebabnya.",
    display: "Di skrin, nama program menjadi tajuk utama dengan tarikh dan masa yang mudah dilihat. Penerangan ringkas dipaparkan di bawah tajuk, diikuti tempat, penganjur dan nombor untuk dihubungi, serta baris kiraan detik apabila tarikh program semakin hampir.",
    fieldsNote: "Medan bertanda * wajib; penerangan, penganjur dan hubungi boleh dikosongkan.",
    tips: [
      "Pilih tarikh daripada kalendar dalam borang, bukan menaipnya sebagai teks seperti Ahad ini, supaya kiraan detik berfungsi.",
      "Mulakan paparan dua atau tiga minggu sebelum program, dan tamatkan pada hari program itu sendiri.",
      "Gunakan nombor telefon pejabat masjid di medan Hubungi, bukan nombor peribadi, jika boleh.",
    ],
    relatedTemplates: ["kuliah", "penangguhan", "pengumuman"],
    relatedArticles: [SENARAI_SEMAK, CARA_PASANG],
    render: "real",
  },
  infaq: {
    key: "infaq",
    slug: "kutipan-infaq",
    title: "Templat kutipan infaq & tabung masjid · Masjid View",
    description: "Templat kutipan infaq untuk TV masjid: nama tabung, sasaran, jumlah terkumpul dengan bar kemajuan dan kod QR DuitNow. Jemaah nampak kemajuan setiap minggu.",
    h1: "Templat Kutipan / Infaq untuk skrin masjid",
    intro: "Templat Kutipan / Infaq menunjukkan kemajuan tabung masjid kepada jemaah: nama tabung, sasaran, jumlah yang telah terkumpul dan peratusnya dalam bentuk bar. Kod QR DuitNow boleh ditambah supaya jemaah boleh menyumbang terus dari telefon semasa berada di masjid. Ia sesuai untuk tabung jangka panjang dan kutipan segera.",
    when: "Gunakan templat ini untuk tabung pembangunan, tabung kebajikan anak yatim, kutipan bantuan banjir atau dana korban. Kemas kini jumlah terkumpul setiap minggu selepas kiraan tabung Jumaat, dan isi medan Dikemas kini supaya jemaah tahu angka itu terkini. Nama dan nombor akaun membantu penderma yang lebih suka membuat pindahan bank biasa.",
    display: "Di skrin, nama tabung dipaparkan di atas, diikuti jumlah terkumpul dalam ringgit, bar kemajuan dan peratus daripada sasaran. Jika kod QR dimuat naik, ia dipaparkan di sisi supaya mudah diimbas oleh jemaah yang berdiri berhampiran skrin.",
    fieldsNote: "Terkumpul dan sasaran ditulis dalam ringgit; peratus dikira secara automatik.",
    tips: [
      "Gunakan kod QR DuitNow rasmi akaun masjid sahaja, dan semak semula sebelum menerbitkannya.",
      "Kemas kini jumlah pada hari yang sama setiap minggu supaya jemaah membiasakan diri.",
      "Apabila sasaran tercapai, tukar slaid kepada ucapan terima kasih menggunakan Pengumuman Am.",
    ],
    relatedTemplates: ["kewangan", "pengumuman"],
    relatedArticles: [CARA_PASANG],
    render: "real",
  },
  mesyuarat: {
    key: "mesyuarat",
    slug: "mesyuarat",
    title: "Templat notis mesyuarat AJK masjid · Masjid View",
    description: "Templat notis mesyuarat untuk TV masjid: mesyuarat agung, mesyuarat AJK atau taklimat kariah, dengan tarikh, masa, tempat dan kiraan detik sebelum bermula.",
    h1: "Templat notis Mesyuarat untuk skrin masjid",
    intro: "Templat Mesyuarat ialah notis rasmi untuk mesyuarat agung tahunan, mesyuarat AJK atau taklimat kepada ahli kariah. Ia memaparkan nama mesyuarat, ayat jemputan, tarikh, masa dan tempat dalam susunan yang formal, dan menambah kiraan detik apabila mesyuarat semakin hampir. Notis ini sesuai untuk masjid dan surau.",
    when: "Gunakan templat ini apabila kehadiran ahli kariah diperlukan, terutamanya untuk mesyuarat agung yang memerlukan korum. Medan Jemputan sesuai untuk ayat seperti Semua ahli kariah dijemput hadir, dan medan Daripada untuk nama setiausaha atau jawatan yang mengeluarkan notis. Jika mesyuarat ditunda, gunakan Tangguhkan pada slaid itu supaya tarikh baharu jelas kepada semua. Untuk mesyuarat agung, sertakan juga agenda utama secara ringkas dalam medan Jemputan.",
    display: "Di skrin, nama mesyuarat dipaparkan sebagai tajuk, diikuti ayat jemputan. Tarikh, masa dan tempat disusun di bahagian bawah, bersama nama pengeluar notis dan baris kiraan detik apabila tarikh mesyuarat menghampiri.",
    fieldsNote: "Medan bertanda * wajib; jemputan dan pengeluar notis pilihan.",
    tips: [
      "Paparkan notis mesyuarat agung sekurang-kurangnya dua minggu lebih awal.",
      "Nyatakan tempat dengan tepat, contohnya Bilik Mesyuarat Tingkat 1, bukan sekadar nama masjid.",
      "Selepas mesyuarat, gunakan Pengumuman Am untuk memaklumkan keputusan penting kepada jemaah.",
    ],
    relatedTemplates: ["pengumuman", "penangguhan", "kewangan"],
    relatedArticles: [CARA_PASANG],
    render: "real",
  },
  kewangan: {
    key: "kewangan",
    slug: "penyata-kewangan",
    title: "Templat penyata kewangan mingguan masjid · Masjid View",
    description: "Templat penyata kewangan untuk TV masjid: kutipan, perbelanjaan dan baki akaun mingguan dalam jadual yang mudah dibaca. Telus kepada jemaah setiap minggu.",
    h1: "Templat Penyata Kewangan untuk skrin masjid",
    intro: "Templat Penyata Kewangan memaparkan kutipan dan perbelanjaan masjid bagi satu minggu, beserta baki akaun, dalam jadual yang kemas. Ia membantu AJK berkongsi maklumat kewangan secara telus dengan jemaah tanpa perlu menampal penyata bercetak di papan kenyataan. Jumlah dikira terus daripada butiran yang dimasukkan, jadi tiada kiraan manual.",
    when: "Gunakan templat ini sekali seminggu, biasanya selepas kutipan Jumaat dikira. Senaraikan sehingga lapan baris kutipan, seperti tabung Jumaat dan tabung harian, dan sehingga lapan baris perbelanjaan, seperti bil elektrik dan penyelenggaraan. Jumlah setiap bahagian dikira secara automatik, jadi AJK hanya perlu memasukkan angka bagi setiap baris. Jika ada perbelanjaan besar seperti pembaikan bumbung, nyatakan butirannya supaya jemaah faham perubahan baki.",
    display: "Di skrin, minggu yang dilaporkan dinyatakan di atas, diikuti butiran kutipan dan perbelanjaan serta jumlah masing-masing. Baki akaun dipaparkan dengan jelas supaya jemaah nampak kedudukan kewangan masjid sepintas lalu.",
    fieldsNote: "Kutipan dan perbelanjaan masing-masing antara satu hingga lapan baris.",
    tips: [
      "Tekan Duplikasi untuk minggu depan: minggu beralih tujuh hari dan senarai butiran kekal untuk dikemas kini.",
      "Gunakan nama butiran yang sama setiap minggu supaya jemaah mudah membandingkan.",
      "Pastikan penyata disemak oleh bendahari sebelum menekan Terbit.",
    ],
    relatedTemplates: ["infaq", "mesyuarat", "pengumuman"],
    relatedArticles: [CARA_PASANG],
    render: "real",
  },
  ayat: {
    key: "ayat",
    slug: "ayat-hadith",
    title: "Templat ayat al-Quran & hadith untuk masjid · Masjid View",
    description: "Templat ayat al-Quran dan hadith untuk TV masjid: teks Arab, terjemahan dan rujukan daripada senarai yang disediakan. Tiada teks taipan sendiri.",
    h1: "Templat Ayat / Hadith untuk skrin masjid",
    intro: "Templat Ayat / Hadith memaparkan petikan al-Quran atau hadith di TV masjid, lengkap dengan teks Arab, terjemahan dan rujukan. AJK memilih petikan daripada senarai yang telah disediakan; teks tidak boleh ditaip atau diubah sendiri, supaya setiap petikan yang dipaparkan tepat.",
    when: "Gunakan templat ini sebagai peringatan di antara pengumuman, contohnya ayat tentang kesabaran semasa musim peperiksaan atau ayat tentang puasa pada bulan Ramadan. Senarai ayat dan hadith sedang disemak oleh ustaz sebelum digunakan secara meluas, dan setiap terjemahan datang daripada sumber yang dinyatakan bersamanya.",
    display: "Di skrin, teks Arab dipaparkan dari kanan ke kiri dalam saiz besar, diikuti terjemahan bahasa Melayu dan rujukan surah atau kitab hadith. Contoh di halaman ini hanya menunjukkan susun atur, kerana teks ayat dipaparkan selepas senarai selesai disemak.",
    fieldsNote: "AJK hanya memilih satu petikan; teks Arab, terjemahan dan rujukan diisi secara automatik.",
    tips: [
      "Pilih petikan yang berkaitan dengan musim semasa supaya peringatan lebih bermakna.",
      "Paparkan satu petikan untuk tempoh seminggu dan tukar secara berkala.",
      "Jika ada ayat atau hadith yang ingin ditambah ke senarai, hantar cadangan melalui Maklum balas di panel AJK.",
    ],
    relatedTemplates: ["ucapan", "pengumuman"],
    relatedArticles: [],
    render: "layout",
  },
  ucapan: {
    key: "ucapan",
    slug: "ucapan-perayaan",
    title: "Templat ucapan Hari Raya & perayaan Islam · Masjid View",
    description: "Templat ucapan perayaan untuk TV masjid: Aidilfitri, Aidiladha, Maal Hijrah dan Maulidur Rasul, dengan mesej ringkas daripada AJK. Siap dalam satu minit.",
    h1: "Templat Ucapan Perayaan untuk skrin masjid",
    intro: "Templat Ucapan Perayaan memaparkan ucapan sempena Hari Raya Aidilfitri, Hari Raya Aidiladha, Maal Hijrah dan Maulidur Rasul di TV masjid. AJK memilih perayaan, menulis mesej ringkas dan nama pengirim, dan skrin memaparkannya dalam susunan yang sesuai untuk hari perayaan. Mesej yang sama boleh digunakan semula setiap tahun.",
    when: "Gunakan templat ini beberapa hari sebelum dan selepas hari perayaan. Untuk Aidilfitri, mesej seperti Maaf zahir dan batin sudah memadai; ucapan yang panjang sukar dibaca dari jauh. Medan Daripada boleh diisi dengan AJK Masjid atau nama pengerusi, dan tarikh tamat boleh ditetapkan seminggu selepas hari raya. Bagi Maal Hijrah dan Maulidur Rasul, mesej ringkas seperti doa atau selawat sesuai dipaparkan sepanjang hari itu.",
    display: "Di skrin, nama perayaan seperti Selamat Hari Raya Aidilfitri dipaparkan sebagai tajuk, diikuti mesej dalam huruf besar dan nama pengirim di bawahnya. Teks perayaan dipilih daripada senarai, jadi ejaannya sentiasa betul.",
    fieldsNote: "Mesej dihadkan kepada 160 aksara supaya kekal ringkas di skrin.",
    tips: [
      "Sediakan slaid ucapan awal dan tetapkan tarikh mula supaya ia muncul sendiri pada masa yang betul.",
      "Untuk Hari Raya, gunakan bersama slaid Hari Kebesaran Islam yang mengira hari menjelang perayaan.",
      "Selepas perayaan, gantikan dengan Pengumuman Am tentang program seterusnya.",
    ],
    relatedTemplates: ["hari_kebesaran", "ayat", "pengumuman"],
    relatedArticles: [RAMADAN],
    render: "real",
  },
  penangguhan: {
    key: "penangguhan",
    slug: "penangguhan",
    title: "Templat notis tangguh & batal program masjid · Masjid View",
    description: "Templat notis penangguhan atau pembatalan untuk TV masjid: tajuk aktiviti, tarikh asal, tarikh baharu dan sebab, dengan cop DITANGGUHKAN atau DIBATALKAN.",
    h1: "Templat notis Penangguhan / Pembatalan untuk skrin masjid",
    intro: "Templat Penangguhan / Pembatalan memaklumkan jemaah bahawa sesuatu aktiviti ditangguhkan ke tarikh lain atau dibatalkan. Ia memaparkan cop DITANGGUHKAN atau DIBATALKAN yang jelas, tarikh asal yang dipotong, tarikh baharu jika ada, serta sebab perubahan. Jemaah terus tahu apa yang berubah tanpa perlu bertanya kepada AJK.",
    when: "Gunakan templat ini apabila aktiviti asal tidak mempunyai slaid di skrin, contohnya kuliah yang diumumkan secara lisan atau melalui WhatsApp sahaja. Jika slaid kuliah, program atau mesyuarat sudah ada, lebih mudah tekan Tangguhkan atau Batalkan pada slaid itu terus. Tarikh baharu boleh dibiarkan kosong jika belum ditetapkan, dan skrin akan menyatakan bahawa tarikh baharu akan dimaklumkan.",
    display: "Di skrin, cop berwarna menonjol di bahagian atas, diikuti tajuk aktiviti. Tarikh dan masa asal dipaparkan dengan garis potong, dan tarikh baharu ditulis dengan jelas di bawahnya bersama nama penceramah atau penganjur dan sebab, jika diisi.",
    fieldsNote: "Pilih jenis notis dahulu; tarikh baharu hanya berkaitan dengan penangguhan.",
    tips: [
      "Nyatakan sebab secara ringkas dan sopan, contohnya Penceramah uzur, supaya jemaah faham.",
      "Biarkan notis dipaparkan sehingga tarikh asal berlalu; ia tamat sendiri selepas itu.",
      "Apabila tarikh baharu ditetapkan, kemas kini notis yang sama dan bukannya membuat notis kedua.",
    ],
    relatedTemplates: ["kuliah", "program", "mesyuarat"],
    relatedArticles: [SENARAI_SEMAK],
    render: "real",
  },
  hari_kebesaran: {
    key: "hari_kebesaran",
    slug: "hari-kebesaran-islam",
    title: "Templat hari kebesaran Islam untuk masjid · Masjid View",
    description: "Kiraan hari ke Ramadan, Aidilfitri, Israk dan Mikraj dan hari kebesaran Islam lain di TV masjid. Tarikh dikemas kini untuk anda; Ramadan ditanda jangkaan.",
    h1: "Templat Hari Kebesaran Islam untuk skrin masjid",
    intro: "Templat Hari Kebesaran Islam mengira hari ke peristiwa penting seperti Israk dan Mikraj, Nisfu Syaaban, Ramadan, Aidilfitri dan Aidiladha, dan memaparkannya di TV masjid secara automatik. AJK hanya menerbitkan slaid sekali; tarikh setiap tahun dikemas kini oleh Masjid View. Tiada tarikh perlu ditaip oleh AJK.",
    when: "Terbitkan slaid ini sekali dan biarkan ia berjalan sepanjang tahun. Ia mula dipaparkan 60 hari sebelum sesuatu peristiwa, atau mengikut tetapan Mula papar, dan tidak dipaparkan langsung apabila tiada peristiwa dalam tempoh itu. Pada malam Israk dan Mikraj, Nisfu Syaaban dan Nuzul al-Quran ia memaparkan Malam ini, sepanjang Ramadan ia memaparkan bilangan hari puasa, dan pada hari perayaan ia bertukar kepada ucapan.",
    display: "Di skrin, bilangan hari dipaparkan dalam angka besar, diikuti nama peristiwa serta tarikh Hijrah dan Masihi. Sehingga dua peristiwa seterusnya disenaraikan di bawah, dan tarikh yang belum diumumkan secara rasmi, seperti awal Ramadan dan Syawal, ditanda jangkaan.",
    fieldsNote: "Kedua-dua tetapan pilihan: lalai 60 hari dan dua peristiwa seterusnya.",
    tips: [
      "Satu slaid sudah cukup untuk sepanjang tahun; tidak perlu membuat slaid baharu bagi setiap peristiwa.",
      "Jika ruang skrin terhad, tetapkan Acara seterusnya kepada 0 supaya hanya peristiwa terdekat dipaparkan.",
      "Gunakan bersama templat Ucapan Perayaan untuk mesej daripada AJK pada hari raya.",
    ],
    relatedTemplates: ["ucapan", "ayat"],
    relatedArticles: [RAMADAN],
    render: "real",
  },
  jadual_petugas: {
    key: "jadual_petugas",
    slug: "jadual-imam-bilal",
    title: "Templat jadual imam & bilal untuk masjid · Masjid View",
    description: "Paparkan jadual imam dan bilal di TV masjid: isi nama petugas sekali, susun mengikut hari atau waktu, dan skrin menyerlahkan siapa bertugas hari ini.",
    h1: "Templat Jadual Imam & Bilal untuk skrin masjid",
    intro: "Templat Jadual Imam & Bilal memaparkan siapa imam dan bilal yang bertugas, sama ada untuk seminggu atau untuk setiap waktu solat hari ini. Nama petugas diisi sekali di halaman Petugas, dan skrin menyerlahkan hari ini secara automatik tanpa perlu membuat poster baharu setiap minggu.",
    when: "Gunakan paparan Mingguan jika masjid menetapkan seorang imam dan bilal bagi setiap hari, dan paparan Hari ini jika petugas bertukar mengikut waktu solat. Pada hari Jumaat, baris Zohor memaparkan Jumaat. Jika jadual masih kosong, slaid tidak dipaparkan langsung, jadi skrin tidak pernah menunjukkan jadual yang separuh siap. Masjid yang ada dua TV boleh memaparkan jadual ini di TV pengumuman sambil mengekalkan waktu solat di TV utama.",
    display: "Paparan Mingguan menyusun Isnin hingga Ahad dalam tiga lajur, iaitu hari, imam dan bilal, dengan baris hari ini ditebalkan dan diberi latar. Hari yang ada petugas berbeza mengikut waktu ditanda “+ ikut waktu”. Paparan Hari ini menyenaraikan lima waktu solat dan petugas esok di bawahnya.",
    fieldsNote: "Di slaid, AJK hanya memilih paparan dan tajuk; nama dan jadual petugas diurus di halaman Petugas.",
    tips: [
      "Masukkan gelaran seperti Ust. atau Hj. dalam medan gelaran, bukan dalam nama, supaya paparan kemas.",
      "Jika imam bercuti, kemas kini jadual di halaman Petugas; TV dikemas kini sendiri dalam beberapa minit.",
      "Untuk Ramadan, tetapkan imam tarawih sebagai petugas waktu Isyak bagi setiap malam.",
    ],
    relatedTemplates: ["kuliah", "pengumuman"],
    relatedArticles: [SENARAI_SEMAK, CARA_PASANG],
    render: "real",
  },
};

export const templatePath = (slug: string) => `/templat/${slug}/`;

/** The gallery pages in picker order. */
export const templatePages = (): TemplatePage[] => PICKER_KEYS.map((k) => TEMPLATE_PAGES[k]);
